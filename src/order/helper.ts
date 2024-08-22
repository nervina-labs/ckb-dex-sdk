import BigNumber from 'bignumber.js'
import { assembleTransferSporeAction, assembleCobuildWitnessLayout } from '@spore-sdk/core/lib/cobuild'
import { CKB_UNIT, getCCBTCDep, getMNftDep, getSporeDep, getSudtDep, getXudtDep } from '../constants'
import { append0x, leToU128, remove0x, u128ToLe } from '../utils'
import { CKBAsset, Hex, IndexerCell } from '../types'
import { blockchain, Cell as LumosCell } from '@ckb-lumos/base'
import { serializeScript } from '@nervosnetwork/ckb-sdk-utils'

// minimum occupied capacity and 1 ckb for transaction fee
// assume UDT cell data size is 16bytes
export const calculateUdtCellCapacity = (lock: CKBComponents.Script, udtType?: CKBComponents.Script): bigint => {
  const lockArgsSize = remove0x(lock.args).length / 2
  const typeArgsSize = udtType ? remove0x(udtType.args).length / 2 : 32
  const cellSize = 33 + lockArgsSize + 33 + typeArgsSize + 8 + 16
  return BigInt(cellSize + 1) * CKB_UNIT
}

// minimum occupied capacity and 1 ckb for transaction fee
export const calculateNFTCellCapacity = (lock: CKBComponents.Script, cell: IndexerCell | CKBComponents.LiveCell): bigint => {
  const lockArgsSize = remove0x(lock.args).length / 2
  const cellDataSize = remove0x('outputData' in cell ? cell.outputData : cell.data?.content!).length / 2
  let cellSize = 33 + lockArgsSize + 8 + cellDataSize

  if (cell.output.type) {
    const typeArgsSize = remove0x(cell.output.type.args).length / 2
    cellSize += 33 + typeArgsSize
  }
  return BigInt(cellSize + 1) * CKB_UNIT
}

// minimum occupied capacity and 1 ckb for transaction fee
export const calculateEmptyCellMinCapacity = (lock: CKBComponents.Script): bigint => {
  const lockArgsSize = remove0x(lock.args).length / 2
  const cellSize = 33 + lockArgsSize + 8
  return BigInt(cellSize + 1) * CKB_UNIT
}

export const calculateTransactionFee = (txSize: number): bigint => {
  const ratio = BigNumber(1000)
  const defaultFeeRate = BigNumber(1100)
  const fee = BigNumber(txSize).multipliedBy(defaultFeeRate).div(ratio)
  return BigInt(fee.toFixed(0, BigNumber.ROUND_CEIL).toString())
}

export const deserializeOutPoints = (outPointHexList: Hex[]) => {
  const outPoints = outPointHexList.map(outPoint => {
    const op = blockchain.OutPoint.unpack(outPoint)
    return {
      txHash: op.txHash,
      index: op.index,
    } as CKBComponents.OutPoint
  })
  return outPoints
}

export const cleanUpUdtOutputs = (orderCells: CKBComponents.LiveCell[], buyerLock: CKBComponents.Script) => {
  const orderUdtTypeHexSet = new Set(orderCells.map(cell => serializeScript(cell.output.type!)))
  const orderUdtTypes: CKBComponents.Script[] = []
  for (const orderUdtTypeHex of orderUdtTypeHexSet) {
    orderUdtTypes.push(blockchain.Script.unpack(orderUdtTypeHex) as CKBComponents.Script)
  }

  const buyerUdtOutputs: CKBComponents.CellOutput[] = []
  const buyerUdtOutputsData: Hex[] = []
  let buyerUdtOutputsCapacity = BigInt(0)

  for (const orderUdtType of orderUdtTypes) {
    buyerUdtOutputsCapacity += calculateUdtCellCapacity(buyerLock, orderUdtType!)
    buyerUdtOutputs.push({
      lock: buyerLock,
      type: orderUdtType,
      capacity: append0x(calculateUdtCellCapacity(buyerLock, orderUdtType!).toString(16)),
    })
    const udtAmount = orderCells
      .filter(cell => serializeScript(cell.output.type!) === serializeScript(orderUdtType))
      .map(cell => leToU128(cell.data?.content!))
      .reduce((prev, current) => prev + current, BigInt(0))
    buyerUdtOutputsData.push(append0x(u128ToLe(udtAmount)))
  }

  return { buyerUdtOutputs, buyerUdtOutputsData, buyerUdtOutputsCapacity }
}

export const isUdtAsset = (asset: CKBAsset) => {
  return asset === CKBAsset.XUDT || asset === CKBAsset.SUDT || asset === CKBAsset.XUDT_CC
}

export const generateSporeCoBuild = (
  sporeCells: IndexerCell[] | CKBComponents.LiveCell[],
  outputCells: CKBComponents.CellOutput[],
): string => {
  if (sporeCells.length !== outputCells.length) {
    throw new Error('The length of spore input cells length and spore output cells are not same')
  }
  let sporeActions: any[] = []
  for (let index = 0; index < sporeCells.length; index++) {
    const sporeCell = sporeCells[index]
    const outputData = 'outputData' in sporeCell ? sporeCell.outputData : sporeCell.data?.content!
    const sporeInput = {
      cellOutput: sporeCells[index].output,
      data: outputData,
    } as LumosCell
    const sporeOutput = {
      cellOutput: outputCells[index],
      data: outputData,
    } as LumosCell
    const { actions } = assembleTransferSporeAction(sporeInput, sporeOutput)
    sporeActions = sporeActions.concat(actions)
  }
  return assembleCobuildWitnessLayout(sporeActions)
}

export const getAssetCellDep = (asset: CKBAsset, isMainnet: boolean) => {
  switch (asset) {
    case CKBAsset.XUDT:
      return getXudtDep(isMainnet)
    case CKBAsset.SUDT:
      return getSudtDep(isMainnet)
    case CKBAsset.SPORE:
      return getSporeDep(isMainnet)
    case CKBAsset.MNFT:
      return getMNftDep(isMainnet)
    case CKBAsset.XUDT_CC:
      return getCCBTCDep(isMainnet)
    default:
      return getXudtDep(isMainnet)
  }
}
