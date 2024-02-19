import { addressToScript, blake160, getTransactionSize, serializeScript, serializeWitnessArgs } from '@nervosnetwork/ckb-sdk-utils'
import {
  getCotaTypeScript,
  getXudtDep,
  getJoyIDCellDep,
  getDexCellDep,
  MAX_FEE,
  JOYID_ESTIMATED_WITNESS_LOCK_SIZE,
  CKB_UNIT,
  getSudtDep,
} from '../constants'
import { CKBAsset, CancelParams, Hex, SubkeyUnlockReq, TakerResult } from '../types'
import { append0x } from '../utils'
import { UdtException, NoCotaCellException, NoLiveCellException } from '../exceptions'
import {
  calculateEmptyCellMinCapacity,
  calculateTransactionFee,
  cleanUpUdtOutputs as cleanUpUdtOutputs,
  deserializeOutPoints,
} from './helper'
import { CKBTransaction } from '@joyid/ckb'
import { OrderArgs } from './orderArgs'

export const buildCancelTx = async ({
  collector,
  joyID,
  seller,
  orderOutPoints,
  fee,
  ckbAsset = CKBAsset.XUDT,
}: CancelParams): Promise<TakerResult> => {
  let txFee = fee ?? MAX_FEE
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
  // Fetch udt order cells with outPoints
  const orderCells: CKBComponents.LiveCell[] = []
  for await (const outPoint of outPoints) {
    const cell = await collector.getLiveCell(outPoint)
    if (!cell) {
      throw new UdtException('The udt cell specified by the out point has been spent')
    }
    const orderArgs = OrderArgs.fromHex(cell.output.lock.args)
    if (serializeScript(orderArgs.ownerLock) !== serializeScript(sellerLock)) {
      throw new UdtException('The udt cell does not belong to the seller address')
    }
    if (!cell.output.type || !cell.data) {
      throw new UdtException('The udt cell specified by the out point must have type script')
    }
    orderInputsCapacity += BigInt(cell.output.capacity)
    orderCells.push(cell)
  }

  let inputs: CKBComponents.CellInput[] = []
  const outputs: CKBComponents.CellOutput[] = []
  const outputsData: Hex[] = []
  let cellDeps: CKBComponents.CellDep[] = [getDexCellDep(isMainnet)]
  let changeCapacity = BigInt(0)

  const orderInputs: CKBComponents.CellInput[] = outPoints.map(outPoint => ({
    previousOutput: outPoint,
    since: '0x0',
  }))
  if (ckbAsset === CKBAsset.XUDT || ckbAsset === CKBAsset.SUDT) {
    const { udtOutputs, udtOutputsData, sumUdtCapacity } = cleanUpUdtOutputs(orderCells, sellerLock)

    const outputs = udtOutputs
    const outputsData = udtOutputsData

    const minCellCapacity = calculateEmptyCellMinCapacity(sellerLock)
    const needCKB = ((minCellCapacity + minCellCapacity + CKB_UNIT) / CKB_UNIT).toString()
    const errMsg = `At least ${needCKB} free CKB (refundable) is required to cancel the sell order.`
    const { inputs: emptyInputs, capacity: inputsCapacity } = collector.collectInputs(
      emptyCells,
      minCellCapacity,
      txFee,
      minCellCapacity,
      errMsg,
    )
    inputs = [...orderInputs, ...emptyInputs]

    const changeCapacity = inputsCapacity + orderInputsCapacity - sumUdtCapacity - txFee
    const changeOutput: CKBComponents.CellOutput = {
      lock: sellerLock,
      capacity: append0x(changeCapacity.toString(16)),
    }
    outputs.push(changeOutput)
    outputsData.push('0x')

    cellDeps.push(ckbAsset === CKBAsset.XUDT ? getXudtDep(isMainnet) : getSudtDep(isMainnet))
  }

  if (joyID) {
    cellDeps.push(getJoyIDCellDep(isMainnet))
  }

  const emptyWitness = { lock: '', inputType: '', outputType: '' }
  const witnesses = inputs.map((_, index) => (index === orderInputs.length ? serializeWitnessArgs(emptyWitness) : '0x'))
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
    witnesses[orderInputs.length] = serializeWitnessArgs(emptyWitness)

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
    txFee = estimatedTxFee
    const estimatedChangeCapacity = changeCapacity + (MAX_FEE - estimatedTxFee)
    tx.outputs[tx.outputs.length - 1].capacity = append0x(estimatedChangeCapacity.toString(16))
  }

  return { rawTx: tx as CKBTransaction, txFee, witnessIndex: orderInputs.length }
}
