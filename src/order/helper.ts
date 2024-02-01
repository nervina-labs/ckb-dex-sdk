import { remove0x } from '../utils'

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
