import {
  addressToScript,
  blake160,
  getTransactionSize,
  serializeScript,
  serializeWitnessArgs,
} from '@nervosnetwork/ckb-sdk-utils'
import {
  getCotaTypeScript,
  getXudtDep,
  getJoyIDCellDep,
  getDexCellDep,
  MAX_FEE,
  JOYID_ESTIMATED_WITNESS_LOCK_SIZE,
} from '../constants'
import { Hex, SubkeyUnlockReq, TakerParams, TakerResult } from '../types'
import { append0x, leToU128, u128ToLe } from '../utils'
import { XudtException, NoCotaCellException, NoLiveCellException } from '../exceptions'
import { calculateEmptyCellMinCapacity, calculateTransactionFee, calculateXudtCellCapacity } from './helper'
import { blockchain } from '@ckb-lumos/base'
import { OrderArgs } from './orderArgs'
import { CKBTransaction } from '@joyid/ckb'

export const cleanUpXudtOutputs = (orderCells: CKBComponents.LiveCell[], buyerLock: CKBComponents.Script) => {
  const orderXudtTypes = new Set(orderCells.map(cell => cell.output.type))
  const xudtOutputs: CKBComponents.CellOutput[] = []
  const xudtOutputsData: Hex[] = []
  let sumXudtCapacity = BigInt(0)

  for (const orderXudtType of orderXudtTypes) {
    sumXudtCapacity += calculateXudtCellCapacity(buyerLock, orderXudtType!)
    xudtOutputs.push({
      lock: buyerLock,
      type: orderXudtType,
      capacity: append0x(calculateXudtCellCapacity(buyerLock, orderXudtType!).toString(16)),
    })
    const xudtAmount = orderCells
      .filter(cell => cell.output.type === orderXudtType)
      .map(cell => leToU128(cell.data?.content!))
      .reduce((prev, current) => prev + current, BigInt(0))
    xudtOutputsData.push(append0x(u128ToLe(xudtAmount)))
  }
  return { xudtOutputs, xudtOutputsData, sumXudtCapacity }
}

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

export const buildTakerTx = async ({
  collector,
  joyID,
  buyer,
  orderOutPoints,
  fee,
}: TakerParams): Promise<TakerResult> => {
  const txFee = fee ?? MAX_FEE
  const isMainnet = buyer.startsWith('ckb')
  const buyerLock = addressToScript(buyer)

  const emptyCells = await collector.getCells({
    lock: buyerLock,
  })
  if (!emptyCells || emptyCells.length === 0) {
    throw new NoLiveCellException('The address has no empty cells')
  }

  // Deserialize outPointHex array to outPoint array
  const outPoints = orderOutPoints.map(outPoint => {
    const outPoint_ = blockchain.OutPoint.unpack(outPoint)
    return {
      txHash: outPoint_.txHash,
      index: append0x(outPoint_.index.toString(16)),
    } as CKBComponents.OutPoint
  })

  // Fetch xudt order cells with outPoints
  const orderCells: CKBComponents.LiveCell[] = []
  for await (const outPoint of outPoints) {
    const cell = await collector.getLiveCell(outPoint)
    if (!cell.output.type || !cell.data) {
      throw new XudtException('Xudt cell must have type script')
    }
    orderCells.push(cell)
  }

  const { orderOutputs, orderOutputsData, sumOrderCapacity } = matchOrderOutputs(orderCells)
  const { xudtOutputs, xudtOutputsData, sumXudtCapacity } = cleanUpXudtOutputs(orderCells, buyerLock)

  const needInputsCapacity = sumOrderCapacity + sumXudtCapacity
  const outputs = [...orderOutputs, ...xudtOutputs]
  const outputsData = [...orderOutputsData, ...xudtOutputsData]

  const minCellCapacity = calculateEmptyCellMinCapacity(buyerLock)
  const { inputs: emptyInputs, capacity: inputsCapacity } = collector.collectInputs(
    emptyCells,
    needInputsCapacity,
    txFee,
    minCellCapacity,
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

  const witnesses = []
  for (let index = 0; index < inputs.length; index++) {
    if (index === orderInputs.length) {
      const emptyWitness = { lock: '', inputType: '', outputType: '' }
      witnesses.push(serializeWitnessArgs(emptyWitness))
      continue
    }
    witnesses.push('0x')
  }
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

  let txSize = getTransactionSize(tx)
  if (joyID) {
    txSize += JOYID_ESTIMATED_WITNESS_LOCK_SIZE
  }

  if (txFee === MAX_FEE) {
    const estimatedTxFee = calculateTransactionFee(txSize)
    const estimatedChangeCapacity = changeCapacity + (MAX_FEE - estimatedTxFee)
    tx.outputs[tx.outputs.length - 1].capacity = append0x(estimatedChangeCapacity.toString(16))
  }

  return { rawTx: tx as CKBTransaction, txFee }
}
