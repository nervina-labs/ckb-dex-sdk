import { addressToScript, blake160, getTransactionSize, serializeScript, serializeWitnessArgs } from '@nervosnetwork/ckb-sdk-utils'
import {
  getCotaTypeScript,
  getXudtDep,
  getJoyIDCellDep,
  getDexCellDep,
  MAX_FEE,
  JOYID_ESTIMATED_WITNESS_LOCK_SIZE,
  CKB_UNIT,
} from '../constants'
import { Hex, SubkeyUnlockReq, TakerParams, TakerResult } from '../types'
import { append0x } from '../utils'
import { UdtException, NoCotaCellException, NoLiveCellException } from '../exceptions'
import { calculateEmptyCellMinCapacity, calculateTransactionFee, deserializeOutPoints, cleanUpUdtOutputs } from './helper'
import { OrderArgs } from './orderArgs'
import { CKBTransaction } from '@joyid/ckb'

export const matchOrderOutputs = (orderCells: CKBComponents.LiveCell[]) => {
  const orderOutputs: CKBComponents.CellOutput[] = []
  const orderOutputsData: Hex[] = []
  let sumOrderCapacity = BigInt(0)

  for (const orderCell of orderCells) {
    const orderArgs = OrderArgs.fromHex(orderCell.output.lock.args)
    sumOrderCapacity += orderArgs.totalValue
    const payCapacity = orderArgs.totalValue + BigInt(append0x(orderCell.output.capacity))
    const output: CKBComponents.CellOutput = {
      lock: orderArgs.ownerLock,
      capacity: append0x(payCapacity.toString(16)),
    }
    orderOutputs.push(output)
    orderOutputsData.push('0x')
  }
  return { orderOutputs, orderOutputsData, sumOrderCapacity }
}

export const buildTakerTx = async ({ collector, joyID, buyer, orderOutPoints, fee }: TakerParams): Promise<TakerResult> => {
  let txFee = fee ?? MAX_FEE
  const isMainnet = buyer.startsWith('ckb')
  const buyerLock = addressToScript(buyer)

  const emptyCells = await collector.getCells({
    lock: buyerLock,
  })
  if (!emptyCells || emptyCells.length === 0) {
    throw new NoLiveCellException('The address has no empty cells')
  }

  // Deserialize outPointHex array to outPoint array
  const outPoints = deserializeOutPoints(orderOutPoints)

  // Fetch udt order cells with outPoints
  const orderCells: CKBComponents.LiveCell[] = []
  for await (const outPoint of outPoints) {
    const cell = await collector.getLiveCell(outPoint)
    if (!cell) {
      throw new UdtException('The udt cell specified by the out point has been spent')
    }
    if (!cell.output.type || !cell.data) {
      throw new UdtException('The udt cell specified by the out point must have type script')
    }
    orderCells.push(cell)
  }

  const { orderOutputs, orderOutputsData, sumOrderCapacity } = matchOrderOutputs(orderCells)
  const { udtOutputs, udtOutputsData, sumUdtCapacity } = cleanUpUdtOutputs(orderCells, buyerLock)

  const needInputsCapacity = sumOrderCapacity + sumUdtCapacity
  const outputs = [...orderOutputs, ...udtOutputs]
  const outputsData = [...orderOutputsData, ...udtOutputsData]

  const minCellCapacity = calculateEmptyCellMinCapacity(buyerLock)
  const needCKB = ((needInputsCapacity + minCellCapacity + CKB_UNIT) / CKB_UNIT).toString()
  const errMsg = `At least ${needCKB} free CKB is required to take the order.`
  const { inputs: emptyInputs, capacity: inputsCapacity } = collector.collectInputs(
    emptyCells,
    needInputsCapacity,
    txFee,
    minCellCapacity,
    errMsg,
  )
  const orderInputs: CKBComponents.CellInput[] = outPoints.map(outPoint => ({
    previousOutput: outPoint,
    since: '0x0',
  }))
  const inputs = [...orderInputs, ...emptyInputs]

  const changeCapacity = inputsCapacity - needInputsCapacity - txFee
  const changeOutput: CKBComponents.CellOutput = {
    lock: buyerLock,
    capacity: append0x(changeCapacity.toString(16)),
  }
  outputs.push(changeOutput)
  outputsData.push('0x')

  let cellDeps: CKBComponents.CellDep[] = [getXudtDep(isMainnet), getDexCellDep(isMainnet)]
  if (joyID) {
    cellDeps.push(getJoyIDCellDep(isMainnet))
  }

  const emptyWitness = { lock: '', inputType: '', outputType: '' }
  const witnesses = inputs.map((_, index) => (index === orderInputs.length ? serializeWitnessArgs(emptyWitness) : '0x'))
  if (joyID && joyID.connectData.keyType === 'sub_key') {
    const pubkeyHash = append0x(blake160(append0x(joyID.connectData.pubkey), 'hex'))
    const req: SubkeyUnlockReq = {
      lockScript: serializeScript(buyerLock),
      pubkeyHash,
      algIndex: 1, // secp256r1
    }
    const { unlockEntry } = await joyID.aggregator.generateSubkeyUnlockSmt(req)
    const emptyWitness = {
      lock: '',
      inputType: '',
      outputType: append0x(unlockEntry),
    }
    witnesses[orderInputs.length] = serializeWitnessArgs(emptyWitness)

    const cotaType = getCotaTypeScript(isMainnet)
    const cotaCells = await collector.getCells({ lock: buyerLock, type: cotaType })
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
    txFee = estimatedTxFee
    const estimatedChangeCapacity = changeCapacity + (MAX_FEE - estimatedTxFee)
    tx.outputs[tx.outputs.length - 1].capacity = append0x(estimatedChangeCapacity.toString(16))
  }

  return { rawTx: tx as CKBTransaction, txFee, witnessIndex: orderInputs.length }
}
