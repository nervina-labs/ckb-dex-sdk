import { addressToScript, blake160, serializeScript, serializeWitnessArgs } from '@nervosnetwork/ckb-sdk-utils'
import { blockchain } from '@ckb-lumos/base'
import { FEE, getDexLockScript, getCotaTypeScript, getXudtDep, getJoyIDCellDep } from '../constants'
import { Hex, SubkeyUnlockReq, MakerParams } from '../types'
import { append0x, remove0x, u128ToBe, u128ToLe } from '../utils'
import { XudtException, NoCotaCellException, NoLiveCellException } from '../exceptions'
import { calculateEmptyCellMinCapacity, calculateXudtCellCapacity } from './helper'

export const buildMakerTx = async ({
  collector,
  joyID,
  seller,
  listAmount,
  totalValue,
  xudtType,
  fee,
}: MakerParams): Promise<CKBComponents.RawTransaction> => {
  const txFee = fee ?? FEE
  const isMainnet = seller.startsWith('ckb')
  const sellerLock = addressToScript(seller)
  const xudtTypeScript = blockchain.Script.unpack(xudtType) as CKBComponents.Script

  const emptyCells = await collector.getCells({
    lock: sellerLock,
  })
  if (!emptyCells || emptyCells.length === 0) {
    throw new NoLiveCellException('The address has no empty cells')
  }
  const emptyCellCapacity = calculateEmptyCellMinCapacity(sellerLock)
  const { inputs: emptyInputs, capacity: emptyInputsCapacity } = collector.collectInputs(
    emptyCells,
    emptyCellCapacity,
    txFee,
  )

  const xudtCells = await collector.getCells({
    lock: sellerLock,
    type: xudtTypeScript,
  })
  if (!xudtCells || xudtCells.length === 0) {
    throw new XudtException('The address has no xudt cells')
  }
  let {
    inputs,
    capacity: xudtInputsCapacity,
    amount: inputsAmount,
  } = collector.collectXudtInputs(xudtCells, listAmount)
  inputs = [...emptyInputs, ...inputs]

  // build dex and other outputs and outputsData
  const outputs: CKBComponents.CellOutput[] = []
  const outputsData: Hex[] = []

  const orderLock: CKBComponents.Script = {
    ...getDexLockScript(isMainnet),
    args: `0x${remove0x(serializeScript(sellerLock))}00${u128ToBe(totalValue)}`,
  }
  const orderCellCapacity = calculateXudtCellCapacity(orderLock, xudtTypeScript)
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
  const rawTx: CKBComponents.RawTransaction = {
    version: '0x0',
    cellDeps,
    headerDeps: [],
    inputs,
    outputs,
    outputsData,
    witnesses,
  }

  return rawTx
}
