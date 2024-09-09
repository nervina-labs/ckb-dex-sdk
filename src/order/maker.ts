import { addressToScript, blake160, getTransactionSize, serializeScript, serializeWitnessArgs } from '@nervosnetwork/ckb-sdk-utils'
import { blockchain } from '@ckb-lumos/base'
import {
  getDexLockScript,
  getCotaTypeScript,
  getJoyIDCellDep,
  MAX_FEE,
  JOYID_ESTIMATED_WITNESS_SIZE,
  CKB_UNIT,
  DEFAULT_ESTIMATED_WITNESS_SIZE,
} from '../constants'
import { Hex, SubkeyUnlockReq, MakerParams, MakerResult, CKBAsset } from '../types'
import { append0x, remove0x, u128ToLe } from '../utils'
import { AssetException, NoCotaCellException, NoLiveCellException, NFTException } from '../exceptions'
import {
  calculateEmptyCellMinCapacity,
  calculateNFTCellCapacity,
  calculateTransactionFee,
  calculateUdtCellCapacity,
  generateSporeCoBuild,
  getAssetCellDep,
  isUdtAsset,
} from './helper'
import { CKBTransaction } from '@joyid/ckb'
import { OrderArgs } from './orderArgs'

// The difference between the capacity occupied by the owner lock and the seller lock and the result may be negative
export const calculateNFTMakerListPackage = (seller: string | CKBComponents.Script, buyer?: CKBComponents.Script): bigint => {
  const sellerLock = typeof seller === 'string' ? addressToScript(seller) : seller
  const buyerLockArgsSize = remove0x(buyer?.args ?? sellerLock.args).length / 2

  // The setup and totalValue are only used as a placeholder and does not affect the final size calculation.
  const setup = 4
  const totalValue = BigInt(0)
  const orderArgs = new OrderArgs(sellerLock, setup, totalValue)
  const orderArgsSize = remove0x(orderArgs.toHex()).length / 2

  return BigInt(orderArgsSize - buyerLockArgsSize) * CKB_UNIT
}

export const calculateUDTMakerListPackage = (seller: string | CKBComponents.Script, assetType?: Hex | CKBComponents.Script): bigint => {
  const sellerLock = typeof seller === 'string' ? addressToScript(seller) : seller

  // The setup and totalValue are only used as a placeholder and does not affect the final size calculation.
  const setup = 4
  const totalValue = BigInt(0)
  const orderArgs = new OrderArgs(sellerLock, setup, totalValue)
  // The CKB network does not affect the final orderLock size calculation.
  const orderLock: CKBComponents.Script = {
    ...getDexLockScript(false),
    args: orderArgs.toHex(),
  }
  const typeScript = typeof assetType === 'string' ? (blockchain.Script.unpack(assetType) as CKBComponents.Script) : assetType

  return calculateUdtCellCapacity(orderLock, typeScript)
}

export const buildMakerTx = async ({
  collector,
  joyID,
  seller,
  listAmount = BigInt(0),
  totalValue,
  assetType,
  fee,
  estimateWitnessSize,
  ckbAsset = CKBAsset.XUDT,
  excludePoolTx,
}: MakerParams): Promise<MakerResult> => {
  let txFee = fee ?? MAX_FEE
  const isMainnet = seller.startsWith('ckb')
  const sellerLock = addressToScript(seller)
  const assetTypeScript = blockchain.Script.unpack(assetType) as CKBComponents.Script

  const emptyCells = await collector.getCells({
    lock: sellerLock,
  })
  if (!emptyCells || emptyCells.length === 0) {
    throw new NoLiveCellException('The address has no empty cells')
  }
  const setup = isUdtAsset(ckbAsset) ? 0 : 4
  const orderArgs = new OrderArgs(sellerLock, setup, totalValue)
  const orderLock: CKBComponents.Script = {
    ...getDexLockScript(isMainnet),
    args: orderArgs.toHex(),
  }
  const minCellCapacity = calculateEmptyCellMinCapacity(sellerLock)

  let inputs: CKBComponents.CellInput[] = []
  let outputs: CKBComponents.CellOutput[] = []
  let outputsData: Hex[] = []
  let cellDeps: CKBComponents.CellDep[] = []
  let changeCapacity = BigInt(0)
  let orderCellCapacity = BigInt(0)
  let sporeCoBuild = '0x'

  if (isUdtAsset(ckbAsset)) {
    const udtCells = await collector.getCells({
      lock: sellerLock,
      type: assetTypeScript,
    })
    if (!udtCells || udtCells.length === 0) {
      throw new AssetException('The address has no UDT cells')
    }
    let {
      inputs: udtInputs,
      capacity: sumInputsCapacity,
      amount: inputsAmount,
    } = collector.collectUdtInputs(udtCells, listAmount, excludePoolTx)

    orderCellCapacity = calculateUdtCellCapacity(orderLock, assetTypeScript)
    const udtCellCapacity = calculateUdtCellCapacity(sellerLock, assetTypeScript)
    if (sumInputsCapacity < orderCellCapacity + udtCellCapacity + minCellCapacity + txFee) {
      const needCKB = ((orderCellCapacity + minCellCapacity + CKB_UNIT) / CKB_UNIT).toString()
      const errMsg = `At least ${needCKB} free CKB (refundable) is required to place a sell order.`
      const { inputs: emptyInputs, capacity: emptyInputsCapacity } = collector.collectInputs(emptyCells, orderCellCapacity, txFee, {
        minCellCapacity,
        errMsg,
        excludePoolTx,
      })
      inputs = [...emptyInputs, ...udtInputs]
      sumInputsCapacity += emptyInputsCapacity
    } else {
      inputs = udtInputs
    }

    outputs.push({
      lock: orderLock,
      type: assetTypeScript,
      capacity: append0x(orderCellCapacity.toString(16)),
    })
    outputsData.push(append0x(u128ToLe(listAmount)))

    changeCapacity = sumInputsCapacity - orderCellCapacity - txFee
    if (inputsAmount > listAmount) {
      changeCapacity -= udtCellCapacity
      outputs.push({
        lock: sellerLock,
        type: assetTypeScript,
        capacity: append0x(udtCellCapacity.toString(16)),
      })
      outputsData.push(append0x(u128ToLe(inputsAmount - listAmount)))
    }
    outputs.push({
      lock: sellerLock,
      capacity: append0x(changeCapacity.toString(16)),
    })
    outputsData.push('0x')
  } else {
    const nftCells = await collector.getCells({
      lock: sellerLock,
      type: assetTypeScript,
    })
    if (!nftCells || nftCells.length === 0) {
      throw new NFTException('The address has no NFT cells')
    }
    const nftCell = nftCells[0]
    orderCellCapacity = calculateNFTCellCapacity(orderLock, nftCell)
    const nftInputCapacity = BigInt(nftCell.output.capacity)
    const orderNeedCapacity = orderCellCapacity > nftInputCapacity ? orderCellCapacity - nftInputCapacity : BigInt(0)

    const needCKB = ((orderNeedCapacity + minCellCapacity + CKB_UNIT) / CKB_UNIT).toString()
    const errMsg = `At least ${needCKB} free CKB (refundable) is required to place a sell order.`
    const { inputs: emptyInputs, capacity: emptyInputsCapacity } = collector.collectInputs(emptyCells, orderNeedCapacity, txFee, {
      minCellCapacity,
      errMsg,
      excludePoolTx,
    })
    const nftInput: CKBComponents.CellInput = {
      previousOutput: nftCell.outPoint,
      since: '0x0',
    }
    inputs = [...emptyInputs, nftInput]
    const orderOutput = {
      lock: orderLock,
      capacity: append0x(orderCellCapacity.toString(16)),
      type: nftCell.output.type,
    }
    outputs.push(orderOutput)
    outputsData.push(nftCell.outputData)

    changeCapacity = emptyInputsCapacity - orderNeedCapacity - txFee
    outputs.push({
      lock: sellerLock,
      capacity: append0x(changeCapacity.toString(16)),
    })
    outputsData.push('0x')

    if (ckbAsset === CKBAsset.SPORE) {
      sporeCoBuild = generateSporeCoBuild([nftCell], [orderOutput])
    }
  }

  cellDeps.push(getAssetCellDep(ckbAsset, isMainnet))
  if (joyID) {
    cellDeps.push(getJoyIDCellDep(isMainnet))
  }

  const emptyWitness = { lock: '', inputType: '', outputType: '' }
  let witnesses = inputs.map((_, index) => (index === 0 ? serializeWitnessArgs(emptyWitness) : '0x'))
  if (ckbAsset === CKBAsset.SPORE) {
    witnesses.push(sporeCoBuild)
  }
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
    const txSize = getTransactionSize(tx) + (joyID ? JOYID_ESTIMATED_WITNESS_SIZE : estimateWitnessSize ?? DEFAULT_ESTIMATED_WITNESS_SIZE)
    const estimatedTxFee = calculateTransactionFee(txSize)
    txFee = estimatedTxFee
    const estimatedChangeCapacity = changeCapacity + (MAX_FEE - estimatedTxFee)
    tx.outputs[tx.outputs.length - 1].capacity = append0x(estimatedChangeCapacity.toString(16))
  }

  const listPackage = isUdtAsset(ckbAsset) ? orderCellCapacity : calculateNFTMakerListPackage(seller)

  return { rawTx: tx as CKBTransaction, txFee, listPackage, witnessIndex: 0 }
}
