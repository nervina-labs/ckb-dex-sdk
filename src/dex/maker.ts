import { addressToScript, blake160, serializeScript, serializeWitnessArgs } from '@nervosnetwork/ckb-sdk-utils'
import { FEE, getDexLockScript, getCotaTypeScript, getXudtDep, getJoyIDCellDep } from '../constants'
import { Hex, SubkeyUnlockReq, MakerParams } from '../types'
import { append0x, remove0x, u128ToBe, u128ToLe } from '../utils'
import { XudtException, NoCotaCellException, NoLiveCellException } from '../exceptions'
import { calculateEmptyCellMinCapacity, calculateXudtCellCapacity } from './helper'

export const buildMakerTx = async ({
  collector,
  joyID,
  from,
  listAmount,
  totalValue,
  xudtType,
  fee,
}: MakerParams): Promise<CKBComponents.RawTransaction> => {
  const txFee = fee ?? FEE
  const isMainnet = from.startsWith('ckb')
  const fromLock = addressToScript(from)

  const emptyCells = await collector.getCells({
    lock: fromLock,
  })
  if (!emptyCells || emptyCells.length === 0) {
    throw new NoLiveCellException('The address has no empty cells')
  }
  const emptyCellCapacity = calculateEmptyCellMinCapacity(fromLock)
  const { inputs: emptyInputs, capacity: emptyInputsCapacity } = collector.collectInputs(
    emptyCells,
    emptyCellCapacity,
    txFee,
  )

  const xudtCells = await collector.getCells({
    lock: fromLock,
    type: xudtType,
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

  const dexLock: CKBComponents.Script = {
    ...getDexLockScript(isMainnet),
    args: `0x${remove0x(serializeScript(fromLock))}00${u128ToBe(totalValue)}`,
  }
  const dexCellCapacity = calculateXudtCellCapacity(dexLock, xudtType)
  outputs.push({
    lock: dexLock,
    type: xudtType,
    capacity: append0x(dexCellCapacity.toString(16)),
  })
  outputsData.push(append0x(u128ToLe(listAmount)))

  let changeCapacity = emptyInputsCapacity + xudtInputsCapacity - dexCellCapacity - txFee
  if (inputsAmount > listAmount) {
    const xudtCellCapacity = calculateXudtCellCapacity(fromLock, xudtType)
    changeCapacity -= xudtCellCapacity
    outputs.push({
      lock: fromLock,
      type: xudtType,
      capacity: append0x(xudtCellCapacity.toString(16)),
    })
    outputsData.push(append0x(u128ToLe(inputsAmount - listAmount)))
  }
  outputs.push({
    lock: fromLock,
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
      lockScript: serializeScript(fromLock),
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
    const cotaCells = await collector.getCells({ lock: fromLock, type: cotaType })
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
