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
  getSporeDep,
} from '../constants'
import { CKBAsset, Hex, SubkeyUnlockReq, TakerParams, TakerResult } from '../types'
import { append0x } from '../utils'
import { AssetException, NoCotaCellException, NoLiveCellException } from '../exceptions'
import {
  calculateEmptyCellMinCapacity,
  calculateTransactionFee,
  deserializeOutPoints,
  cleanUpUdtOutputs,
  isUdtAsset,
  calculateNFTCellCapacity,
  generateSporeCoBuild,
} from './helper'
import { OrderArgs } from './orderArgs'
import { CKBTransaction } from '@joyid/ckb'

export const matchOrderOutputs = (orderCells: CKBComponents.LiveCell[]) => {
  const sellerOutputs: CKBComponents.CellOutput[] = []
  const sellerOutputsData: Hex[] = []
  let sumSellerCapacity = BigInt(0)

  for (const orderCell of orderCells) {
    const orderArgs = OrderArgs.fromHex(orderCell.output.lock.args)
    sumSellerCapacity += orderArgs.totalValue
    const payCapacity = orderArgs.totalValue + BigInt(append0x(orderCell.output.capacity))
    const output: CKBComponents.CellOutput = {
      lock: orderArgs.ownerLock,
      capacity: append0x(payCapacity.toString(16)),
    }
    sellerOutputs.push(output)
    sellerOutputsData.push('0x')
  }
  return { sellerOutputs, sellerOutputsData, sumSellerCapacity }
}

export const matchNftOrderOutputs = (orderCells: CKBComponents.LiveCell[], buyerLock: CKBComponents.Script) => {
  let requiredOutputs: CKBComponents.CellOutput[] = []
  let requiredOutputsData: Hex[] = []
  let sumRequiredOutputsCapacity = BigInt(0)
  const buyerOutputs: CKBComponents.CellOutput[] = []
  const buyerOutputsData: Hex[] = []

  for (const orderCell of orderCells) {
    const orderArgs = OrderArgs.fromHex(orderCell.output.lock.args)
    sumRequiredOutputsCapacity += orderArgs.totalValue
    const output: CKBComponents.CellOutput = {
      lock: orderArgs.ownerLock,
      capacity: append0x(orderArgs.totalValue.toString(16)),
    }
    requiredOutputs.push(output)
    requiredOutputsData.push('0x')

    const buyerNftCapacity = calculateNFTCellCapacity(buyerLock, orderCell)
    buyerOutputs.push({
      lock: buyerLock,
      type: orderCell.output.type,
      capacity: `0x${buyerNftCapacity.toString(16)}`,
    })
    buyerOutputsData.push(orderCell.data?.content!)
  }
  requiredOutputs = requiredOutputs.concat(buyerOutputs)
  requiredOutputsData = requiredOutputsData.concat(buyerOutputsData)

  return { requiredOutputs, requiredOutputsData, sumRequiredOutputsCapacity }
}

export const buildTakerTx = async ({
  collector,
  joyID,
  buyer,
  orderOutPoints,
  fee,
  ckbAsset = CKBAsset.XUDT,
}: TakerParams): Promise<TakerResult> => {
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
      throw new AssetException('The udt cell specified by the out point has been spent')
    }
    if (!cell.output.type || !cell.data) {
      throw new AssetException('The udt cell specified by the out point must have type script')
    }
    orderCells.push(cell)
  }
  const orderInputs: CKBComponents.CellInput[] = outPoints.map(outPoint => ({
    previousOutput: outPoint,
    since: '0x0',
  }))

  let inputs: CKBComponents.CellInput[] = []
  let outputs: CKBComponents.CellOutput[] = []
  let outputsData: Hex[] = []
  let cellDeps: CKBComponents.CellDep[] = [getDexCellDep(isMainnet)]
  let changeCapacity = BigInt(0)
  let sporeCoBuild = '0x'

  if (isUdtAsset(ckbAsset)) {
    const { sellerOutputs, sellerOutputsData, sumSellerCapacity } = matchOrderOutputs(orderCells)
    const { udtOutputs, udtOutputsData, sumUdtCapacity } = cleanUpUdtOutputs(orderCells, buyerLock)

    const needInputsCapacity = sumSellerCapacity + sumUdtCapacity
    outputs = [...sellerOutputs, ...udtOutputs]
    outputsData = [...sellerOutputsData, ...udtOutputsData]

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
    inputs = [...orderInputs, ...emptyInputs]

    changeCapacity = inputsCapacity - needInputsCapacity - txFee
    const changeOutput: CKBComponents.CellOutput = {
      lock: buyerLock,
      capacity: append0x(changeCapacity.toString(16)),
    }
    outputs.push(changeOutput)
    outputsData.push('0x')

    cellDeps.push(ckbAsset === CKBAsset.XUDT ? getXudtDep(isMainnet) : getSudtDep(isMainnet))
  } else {
    const { requiredOutputs, requiredOutputsData, sumRequiredOutputsCapacity } = matchNftOrderOutputs(orderCells, buyerLock)

    outputs = requiredOutputs
    outputsData = requiredOutputsData

    const minCellCapacity = calculateEmptyCellMinCapacity(buyerLock)
    const needCKB = ((sumRequiredOutputsCapacity + minCellCapacity + CKB_UNIT) / CKB_UNIT).toString()
    const errMsg = `At least ${needCKB} free CKB is required to take the order.`
    const { inputs: emptyInputs, capacity: inputsCapacity } = collector.collectInputs(
      emptyCells,
      sumRequiredOutputsCapacity,
      txFee,
      minCellCapacity,
      errMsg,
    )
    inputs = [...orderInputs, ...emptyInputs]

    if (ckbAsset === CKBAsset.SPORE) {
      const sporeOutputs = requiredOutputs.slice(orderCells.length)
      sporeCoBuild = generateSporeCoBuild(orderCells, sporeOutputs)
    }

    changeCapacity = inputsCapacity - sumRequiredOutputsCapacity - txFee
    const changeOutput: CKBComponents.CellOutput = {
      lock: buyerLock,
      capacity: append0x(changeCapacity.toString(16)),
    }
    outputs.push(changeOutput)
    outputsData.push('0x')

    cellDeps.push(getSporeDep(isMainnet))
  }

  if (joyID) {
    cellDeps.push(getJoyIDCellDep(isMainnet))
  }

  const emptyWitness = { lock: '', inputType: '', outputType: '' }
  const witnesses = inputs.map((_, index) => (index === orderInputs.length ? serializeWitnessArgs(emptyWitness) : '0x'))
  if (ckbAsset === CKBAsset.SPORE) {
    witnesses.push(sporeCoBuild)
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

  if (txFee === MAX_FEE) {
    const txSize = getTransactionSize(tx) + (joyID ? JOYID_ESTIMATED_WITNESS_LOCK_SIZE : 0)
    const estimatedTxFee = calculateTransactionFee(txSize)
    txFee = estimatedTxFee
    const estimatedChangeCapacity = changeCapacity + (MAX_FEE - estimatedTxFee)
    tx.outputs[tx.outputs.length - 1].capacity = append0x(estimatedChangeCapacity.toString(16))
  }

  return { rawTx: tx as CKBTransaction, txFee, witnessIndex: orderInputs.length }
}
