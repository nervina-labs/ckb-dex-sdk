import BigNumber from 'bignumber.js'
import { CKB_UNIT } from '../constants'
import { append0x, remove0x } from '../utils'
import { getTransactionSize } from '@nervosnetwork/ckb-sdk-utils'
import { Hex } from '../types'
import { blockchain } from '@ckb-lumos/base'

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
