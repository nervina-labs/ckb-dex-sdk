import { addressToScript, blake160, getTransactionSize, serializeScript, serializeWitnessArgs } from '@nervosnetwork/ckb-sdk-utils'
import { getCotaTypeScript, getXudtDep, getJoyIDCellDep, getDexCellDep, MAX_FEE, JOYID_ESTIMATED_WITNESS_LOCK_SIZE } from '../constants'
import { CancelParams, Hex, SubkeyUnlockReq, TakerResult } from '../types'
import { append0x, leToU128, u128ToLe } from '../utils'
import { XudtException, NoCotaCellException, NoLiveCellException } from '../exceptions'
import { calculateEmptyCellMinCapacity, calculateTransactionFee, calculateXudtCellCapacity, deserializeOutPoints } from './helper'
import { CKBTransaction } from '@joyid/ckb'

export const cleanUpXudtOutputs = (orderCells: CKBComponents.LiveCell[], sellerLock: CKBComponents.Script) => {
  const orderXudtTypes = new Set(orderCells.map(cell => cell.output.type))
  const xudtOutputs: CKBComponents.CellOutput[] = []
  const xudtOutputsData: Hex[] = []
  let sumXudtCapacity = BigInt(0)

  for (const orderXudtType of orderXudtTypes) {
    sumXudtCapacity += calculateXudtCellCapacity(sellerLock, orderXudtType!)
    xudtOutputs.push({
      lock: sellerLock,
      type: orderXudtType,
      capacity: append0x(calculateXudtCellCapacity(sellerLock, orderXudtType!).toString(16)),
    })
    const xudtAmount = orderCells
      .filter(cell => cell.output.type === orderXudtType)
      .map(cell => leToU128(cell.data?.content!))
      .reduce((prev, current) => prev + current, BigInt(0))
    xudtOutputsData.push(append0x(u128ToLe(xudtAmount)))
  }
  return { xudtOutputs, xudtOutputsData, sumXudtCapacity }
}

export const buildCancelTx = async ({ collector, joyID, seller, orderOutPoints, fee }: CancelParams): Promise<TakerResult> => {
  const txFee = fee ?? MAX_FEE
  const isMainnet = seller.startsWith('ckb')
  const sellerLock = addressToScript(seller)

  const emptyCells = await collector.getCells({
    lock: sellerLock,
  })
  if (!emptyCells || emptyCells.length === 0) {
    throw new NoLiveCellException('The address has no empty cells')
  }

  const outPoints = deserializeOutPoints(orderOutPoints)

  let orderInputsCapacity = BigInt(0)
  // Fetch xudt order cells with outPoints
  const orderCells: CKBComponents.LiveCell[] = []
  for await (const outPoint of outPoints) {
    const cell = await collector.getLiveCell(outPoint)
    if (cell.output.lock !== sellerLock) {
      throw new XudtException('The xudt cell does not belong to the seller address')
    }
    if (!cell.output.type || !cell.data) {
      throw new XudtException('Xudt cell must have type script')
    }
    orderInputsCapacity += BigInt(cell.output.capacity)
    orderCells.push(cell)
  }

  const { xudtOutputs, xudtOutputsData, sumXudtCapacity } = cleanUpXudtOutputs(orderCells, sellerLock)

  const outputs = xudtOutputs
  const outputsData = xudtOutputsData

  const minCellCapacity = calculateEmptyCellMinCapacity(sellerLock)
  const { inputs: emptyInputs, capacity: inputsCapacity } = collector.collectInputs(emptyCells, minCellCapacity, txFee, minCellCapacity)
  const orderInputs: CKBComponents.CellInput[] = outPoints.map(outPoint => ({
    previousOutput: outPoint,
    since: '0x0',
  }))
  const inputs = [...emptyInputs, ...orderInputs]

  const changeCapacity = inputsCapacity + orderInputsCapacity - sumXudtCapacity - txFee
  const changeOutput: CKBComponents.CellOutput = {
    lock: sellerLock,
    capacity: append0x(changeCapacity.toString(16)),
  }
  outputs.push(changeOutput)
  outputsData.push('0x')

  let cellDeps: CKBComponents.CellDep[] = [getXudtDep(isMainnet), getDexCellDep(isMainnet)]
  if (joyID) {
    cellDeps.push(getJoyIDCellDep(isMainnet))
  }

  const emptyWitness = { lock: '', inputType: '', outputType: '' }
  const witnesses = inputs.map((_, index) => (index === 0 ? serializeWitnessArgs(emptyWitness) : '0x'))
  if (joyID && joyID.connectData.keyType === 'sub_key') {
    const pubkeyHash = append0x(blake160(append0x(joyID.connectData.pubkey), 'hex'))
    const req: SubkeyUnlockReq = {
      lockScript: serializeScript(sellerLock),
      pubkeyHash,
      algIndex: 1, // secp256r1
    }
    const { unlockEntry } = await joyID.aggregator.generateSubkeyUnlockSmt(req)
    const emptyWitness = {
      lock: '',
      inputType: '',
      outputType: append0x(unlockEntry),
    }
    witnesses[0] = serializeWitnessArgs(emptyWitness)

    const cotaType = getCotaTypeScript(isMainnet)
    const cotaCells = await collector.getCells({ lock: sellerLock, type: cotaType })
    if (!cotaCells || cotaCells.length === 0) {
      throw new NoCotaCellException("Cota cell doesn't exist")
    }
    const cotaCell = cotaCells[0]
    const cotaCellDep: CKBComponents.CellDep = {
      outPoint: cotaCell.outPoint,
      depType: 'code',
    }
    cellDeps = [cotaCellDep, ...cellDeps]
  }
  const tx: CKBComponents.RawTransaction = {
    version: '0x0',
    cellDeps,
    headerDeps: [],
    inputs,
    outputs,
    outputsData,
    witnesses,
  }

  if (txFee === MAX_FEE) {
    const txSize = getTransactionSize(tx) + (joyID ? JOYID_ESTIMATED_WITNESS_LOCK_SIZE : 0)
    const estimatedTxFee = calculateTransactionFee(txSize)
    const estimatedChangeCapacity = changeCapacity + (MAX_FEE - estimatedTxFee)
    tx.outputs[tx.outputs.length - 1].capacity = append0x(estimatedChangeCapacity.toString(16))
  }

  return { rawTx: tx as CKBTransaction, txFee }
}
