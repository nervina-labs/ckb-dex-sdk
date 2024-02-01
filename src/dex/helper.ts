import BigNumber from 'bignumber.js'
import { MAX_TX_SIZE } from '../constants'
import { remove0x } from '../utils'

export const calculateTransactionFee = (feeRate: bigint, txSize?: number): bigint => {
  const ratio = BigNumber(1000)
  const transactionSize = txSize ?? MAX_TX_SIZE
  const fee = BigNumber(transactionSize).multipliedBy(BigNumber(feeRate.toString())).div(ratio)
  return BigInt(fee.toFixed(0, BigNumber.ROUND_CEIL).toString())
}

// minimum occupied capacity and 1 ckb for transaction fee
export const calculateXudtCellCapacity = (lock: CKBComponents.Script, xudtType: CKBComponents.Script): bigint => {
  const lockArgsSize = remove0x(lock.args).length / 2
  const typeArgsSize = remove0x(xudtType.args).length / 2
  const cellSize = 33 + lockArgsSize + 33 + typeArgsSize + 8 + 16
  const capacity = BigInt(cellSize + 1)
  return capacity
}

// minimum occupied capacity and 1 ckb for transaction fee
export const calculateEmptyCellMinCapacity = (lock: CKBComponents.Script): bigint => {
  const lockArgsSize = remove0x(lock.args).length / 2
  const cellSize = 33 + lockArgsSize + 8
  return BigInt(cellSize)
}
