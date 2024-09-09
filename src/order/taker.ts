import { addressToScript, blake160, getTransactionSize, serializeScript, serializeWitnessArgs } from '@nervosnetwork/ckb-sdk-utils'
import {
  getCotaTypeScript,
  getJoyIDCellDep,
  getDexCellDep,
  MAX_FEE,
  JOYID_ESTIMATED_WITNESS_SIZE,
  CKB_UNIT,
  DEFAULT_ESTIMATED_WITNESS_SIZE,
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
  getAssetCellDep,
} from './helper'
import { OrderArgs } from './orderArgs'
import { CKBTransaction } from '@joyid/ckb'

export const matchOrderOutputs = (orderCells: CKBComponents.LiveCell[]) => {
  const sellerOutputs: CKBComponents.CellOutput[] = []
  const sellerOutputsData: Hex[] = []
  let sumSellerCapacity = BigInt(0)

  for (const orderCell of orderCells) {
    const orderArgs = OrderArgs.fromHex(orderCell.output.lock.args)
    // The UDT price DOES NOT include list package fee, so the output cell capacity of the seller in the taker transaction includes
    // the UDT price and the capacity of the UDT DEX input capacity
    const paySellerCapacity = orderArgs.totalValue + BigInt(append0x(orderCell.output.capacity))
    sumSellerCapacity += paySellerCapacity
    const output: CKBComponents.CellOutput = {
      lock: orderArgs.ownerLock,
      capacity: append0x(paySellerCapacity.toString(16)),
    }
    sellerOutputs.push(output)
    sellerOutputsData.push('0x')
  }
  return { sellerOutputs, sellerOutputsData, sumSellerCapacity }
}

export const matchNftOrderCells = (orderCells: CKBComponents.LiveCell[], buyerLock: CKBComponents.Script) => {
  let dexOutputs: CKBComponents.CellOutput[] = []
  let dexOutputsData: Hex[] = []
  let dexSellerOutputsCapacity = BigInt(0)
  let dexSumOutputsCapacity = BigInt(0)
  const buyerOutputs: CKBComponents.CellOutput[] = []
  const buyerOutputsData: Hex[] = []

  for (const orderCell of orderCells) {
    const orderArgs = OrderArgs.fromHex(orderCell.output.lock.args)
    const sellerLock = orderArgs.ownerLock
    // The NFT price includes list package fee, so the output cell capacity of the seller in the taker transaction is same as the NFT price
    dexSellerOutputsCapacity += orderArgs.totalValue
    const output: CKBComponents.CellOutput = {
      lock: sellerLock,
      capacity: append0x(orderArgs.totalValue.toString(16)),
    }
    dexOutputs.push(output)
    dexOutputsData.push('0x')

    const buyerNftCapacity = calculateNFTCellCapacity(buyerLock, orderCell)
    dexSumOutputsCapacity += buyerNftCapacity
    buyerOutputs.push({
      lock: buyerLock,
      type: orderCell.output.type,
      capacity: `0x${buyerNftCapacity.toString(16)}`,
    })
    buyerOutputsData.push(orderCell.data?.content!)
  }
  dexSumOutputsCapacity += dexSellerOutputsCapacity
  dexOutputs = dexOutputs.concat(buyerOutputs)
  dexOutputsData = dexOutputsData.concat(buyerOutputsData)

  return { dexOutputs, dexOutputsData, dexSumOutputsCapacity, dexSellerOutputsCapacity }
}

export const buildTakerTx = async ({
  collector,
  joyID,
  buyer,
  orderOutPoints,
  fee,
  estimateWitnessSize,
  ckbAsset = CKBAsset.XUDT,
  excludePoolTx,
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

  let dexInputsCapacity = BigInt(0)

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
    dexInputsCapacity += BigInt(cell.output.capacity)
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
    const {
      udtOutputs: buyerUdtOutputs,
      udtOutputsData: buyerUdtOutputsData,
      sumUdtCapacity: buyerUdtOutputsCapacity,
    } = cleanUpUdtOutputs(orderCells, buyerLock)

    // The needExtraInputsCapacity doesn't include dex inputs capacity
    const needExtraInputsCapacity = sumSellerCapacity + buyerUdtOutputsCapacity - dexInputsCapacity
    outputs = [...sellerOutputs, ...buyerUdtOutputs]
    outputsData = [...sellerOutputsData, ...buyerUdtOutputsData]

    const minCellCapacity = calculateEmptyCellMinCapacity(buyerLock)
    const needCKB = ((needExtraInputsCapacity + minCellCapacity + CKB_UNIT) / CKB_UNIT).toString()
    const errMsg = `At least ${needCKB} free CKB is required to take the order.`
    const { inputs: emptyInputs, capacity: inputsCapacity } = collector.collectInputs(emptyCells, needExtraInputsCapacity, txFee, {
      minCellCapacity,
      errMsg,
      excludePoolTx,
    })
    inputs = [...orderInputs, ...emptyInputs]

    changeCapacity = inputsCapacity - needExtraInputsCapacity - txFee

    const changeOutput: CKBComponents.CellOutput = {
      lock: buyerLock,
      capacity: append0x(changeCapacity.toString(16)),
    }
    outputs.push(changeOutput)
    outputsData.push('0x')
  } else {
    const { dexOutputs, dexOutputsData, dexSumOutputsCapacity, dexSellerOutputsCapacity } = matchNftOrderCells(orderCells, buyerLock)
    outputs = dexOutputs
    outputsData = dexOutputsData

    const minCellCapacity = calculateEmptyCellMinCapacity(buyerLock)
    const needCKB = ((dexSellerOutputsCapacity + minCellCapacity + CKB_UNIT) / CKB_UNIT).toString()
    const errMsg = `At least ${needCKB} free CKB is required to take the order.`
    const { inputs: emptyInputs, capacity: emptyInputsCapacity } = collector.collectInputs(emptyCells, dexSellerOutputsCapacity, txFee, {
      minCellCapacity,
      errMsg,
      excludePoolTx,
    })
    inputs = [...orderInputs, ...emptyInputs]
    const sumInputsCapacity = dexInputsCapacity + emptyInputsCapacity

    if (ckbAsset === CKBAsset.SPORE) {
      const sporeOutputs = dexOutputs.slice(orderCells.length)
      sporeCoBuild = generateSporeCoBuild(orderCells, sporeOutputs)
    }

    changeCapacity = sumInputsCapacity - dexSumOutputsCapacity - txFee

    const changeOutput: CKBComponents.CellOutput = {
      lock: buyerLock,
      capacity: append0x(changeCapacity.toString(16)),
    }
    outputs.push(changeOutput)
    outputsData.push('0x')
  }

  cellDeps.push(getAssetCellDep(ckbAsset, isMainnet))
  if (joyID) {
    cellDeps.push(getJoyIDCellDep(isMainnet))
  }

  const emptyWitness = { lock: '', inputType: '', outputType: '' }
  const witnesses = inputs.map((_, index) => (index === orderInputs.length ? serializeWitnessArgs(emptyWitness) : '0x'))
  if (ckbAsset === CKBAsset.SPORE) {
    witnesses.push(sporeCoBuild)
  } else if (ckbAsset === CKBAsset.MNFT) {
    // MNFT must not be held and transferred by anyone-can-pay lock
    witnesses[0] = serializeWitnessArgs({ lock: '0x00', inputType: '', outputType: '' })
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
    const txSize = getTransactionSize(tx) + (joyID ? JOYID_ESTIMATED_WITNESS_SIZE : estimateWitnessSize ?? DEFAULT_ESTIMATED_WITNESS_SIZE)
    const estimatedTxFee = calculateTransactionFee(txSize)
    txFee = estimatedTxFee
    const estimatedChangeCapacity = changeCapacity + (MAX_FEE - estimatedTxFee)
    tx.outputs[tx.outputs.length - 1].capacity = append0x(estimatedChangeCapacity.toString(16))
  }

  return { rawTx: tx as CKBTransaction, txFee, witnessIndex: orderInputs.length }
}
