import BigNumber from 'bignumber.js'
import { CKB_UNIT } from '../constants'
import { append0x, leToU128, remove0x, u128ToLe } from '../utils'
import { Hex } from '../types'
import { blockchain } from '@ckb-lumos/base'
import { serializeScript } from '@nervosnetwork/ckb-sdk-utils'

// minimum occupied capacity and 1 ckb for transaction fee
export const calculateXudtCellCapacity = (lock: CKBComponents.Script, xudtType: CKBComponents.Script): bigint => {
  const lockArgsSize = remove0x(lock.args).length / 2
  const typeArgsSize = remove0x(xudtType.args).length / 2
  const cellSize = 33 + lockArgsSize + 33 + typeArgsSize + 8 + 16
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
      index: append0x(op.index.toString(16)),
    } as CKBComponents.OutPoint
  })
  return outPoints
}

export const cleanUpXudtOutputs = (orderCells: CKBComponents.LiveCell[], lock: CKBComponents.Script) => {
  const orderXudtTypeHexSet = new Set(orderCells.map(cell => serializeScript(cell.output.type!)))
  const orderXudtTypes: CKBComponents.Script[] = []
  for (const orderXudtTypeHex of orderXudtTypeHexSet) {
    orderXudtTypes.push(blockchain.Script.unpack(orderXudtTypeHex) as CKBComponents.Script)
  }

  const xudtOutputs: CKBComponents.CellOutput[] = []
  const xudtOutputsData: Hex[] = []
  let sumXudtCapacity = BigInt(0)

  for (const orderXudtType of orderXudtTypes) {
    sumXudtCapacity += calculateXudtCellCapacity(lock, orderXudtType!)
    xudtOutputs.push({
      lock: lock,
      type: orderXudtType,
      capacity: append0x(calculateXudtCellCapacity(lock, orderXudtType!).toString(16)),
    })
    const xudtAmount = orderCells
      .filter(cell => serializeScript(cell.output.type!) === serializeScript(orderXudtType))
      .map(cell => leToU128(cell.data?.content!))
      .reduce((prev, current) => prev + current, BigInt(0))
    xudtOutputsData.push(append0x(u128ToLe(xudtAmount)))
  }

  return { xudtOutputs, xudtOutputsData, sumXudtCapacity }
}
