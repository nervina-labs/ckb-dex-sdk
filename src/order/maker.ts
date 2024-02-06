import { addressToScript, blake160, getTransactionSize, serializeScript, serializeWitnessArgs } from '@nervosnetwork/ckb-sdk-utils'
import { blockchain } from '@ckb-lumos/base'
import { getDexLockScript, getCotaTypeScript, getXudtDep, getJoyIDCellDep, MAX_FEE, JOYID_ESTIMATED_WITNESS_LOCK_SIZE } from '../constants'
import { Hex, SubkeyUnlockReq, MakerParams, MakerResult } from '../types'
import { append0x, u128ToLe } from '../utils'
import { XudtException, NoCotaCellException, NoLiveCellException } from '../exceptions'
import { calculateEmptyCellMinCapacity, calculateTransactionFee, calculateXudtCellCapacity } from './helper'
import { CKBTransaction } from '@joyid/ckb'
import { OrderArgs } from './orderArgs'

export const buildMakerTx = async ({
  collector,
  joyID,
  seller,
  listAmount,
  totalValue,
  xudtType,
  fee,
}: MakerParams): Promise<MakerResult> => {
  let txFee = fee ?? MAX_FEE
  const isMainnet = seller.startsWith('ckb')
  const sellerLock = addressToScript(seller)
  const xudtTypeScript = blockchain.Script.unpack(xudtType) as CKBComponents.Script

  const emptyCells = await collector.getCells({
    lock: sellerLock,
  })
  if (!emptyCells || emptyCells.length === 0) {
    throw new NoLiveCellException('The address has no empty cells')
  }
  const orderArgs = new OrderArgs(sellerLock, 0, totalValue)
  const orderLock: CKBComponents.Script = {
    ...getDexLockScript(isMainnet),
    args: orderArgs.toHex(),
  }
  const orderCellCapacity = calculateXudtCellCapacity(orderLock, xudtTypeScript)

  const minCellCapacity = calculateEmptyCellMinCapacity(sellerLock)
  const { inputs: emptyInputs, capacity: emptyInputsCapacity } = collector.collectInputs(
    emptyCells,
    orderCellCapacity,
    txFee,
    minCellCapacity,
  )

  const xudtCells = await collector.getCells({
    lock: sellerLock,
    type: xudtTypeScript,
  })
  if (!xudtCells || xudtCells.length === 0) {
    throw new XudtException('The address has no xudt cells')
  }
  let { inputs, capacity: xudtInputsCapacity, amount: inputsAmount } = collector.collectXudtInputs(xudtCells, listAmount)
  inputs = [...emptyInputs, ...inputs]

  // build dex and other outputs and outputsData
  const outputs: CKBComponents.CellOutput[] = []
  const outputsData: Hex[] = []

  outputs.push({
    lock: orderLock,
    type: xudtTypeScript,
    capacity: append0x(orderCellCapacity.toString(16)),
  })
  outputsData.push(append0x(u128ToLe(listAmount)))

  let changeCapacity = emptyInputsCapacity + xudtInputsCapacity - orderCellCapacity - txFee
  if (inputsAmount > listAmount) {
    const xudtCellCapacity = calculateXudtCellCapacity(sellerLock, xudtTypeScript)
    changeCapacity -= xudtCellCapacity
    outputs.push({
      lock: sellerLock,
      type: xudtTypeScript,
      capacity: append0x(xudtCellCapacity.toString(16)),
    })
    outputsData.push(append0x(u128ToLe(inputsAmount - listAmount)))
  }
  outputs.push({
    lock: sellerLock,
    capacity: append0x(changeCapacity.toString(16)),
  })
  outputsData.push('0x')

  let cellDeps: CKBComponents.CellDep[] = [getXudtDep(isMainnet)]
  if (joyID) {
    cellDeps.push(getJoyIDCellDep(isMainnet))
  }

  const emptyWitness = { lock: '', inputType: '', outputType: '' }
  let witnesses = [serializeWitnessArgs(emptyWitness)]
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
    witnesses[0] = serializeWitnessArgs(emptyWitness)

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

  return { rawTx: tx as CKBTransaction, txFee, listPackage: orderCellCapacity, witnessIndex: 0 }
}
