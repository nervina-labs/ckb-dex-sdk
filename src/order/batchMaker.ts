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
import { Hex, SubkeyUnlockReq, MakerParams, CKBAsset } from '../types'
import { append0x } from '../utils'
import { NoCotaCellException, NoLiveCellException, NFTException, NoSupportUDTAssetException } from '../exceptions'
import {
  calculateEmptyCellMinCapacity,
  calculateNFTCellCapacity,
  calculateTransactionFee,
  generateSporeCoBuild,
  getAssetCellDep,
  isUdtAsset,
} from './helper'
import { CKBTransaction } from '@joyid/ckb'
import { OrderArgs } from './orderArgs'
import { calculateNFTMakerListPackage } from './maker'

export const buildMultiNftsMakerTx = async (
  { collector, joyID, seller, fee, estimateWitnessSize, ckbAsset = CKBAsset.SPORE, excludePoolTx }: MakerParams,
  nfts: { totalValue: bigint; assetType: string }[],
) => {
  let txFee = fee ?? MAX_FEE
  const isMainnet = seller.startsWith('ckb')
  const sellerLock = addressToScript(seller)

  const emptyCells = await collector.getCells({
    lock: sellerLock,
  })
  if (!emptyCells || emptyCells.length === 0) {
    throw new NoLiveCellException('The address has no empty cells')
  }
  if (isUdtAsset(ckbAsset)) {
    throw new NoSupportUDTAssetException('Ony support NFT asset')
  }

  const minCellCapacity = calculateEmptyCellMinCapacity(sellerLock)

  let inputs: CKBComponents.CellInput[] = []
  let outputs: CKBComponents.CellOutput[] = []
  let outputsData: Hex[] = []
  let cellDeps: CKBComponents.CellDep[] = []
  let changeCapacity = BigInt(0)
  let sporeCoBuild: string = ''

  let orderNeedCapacity = BigInt(0)
  let nftCellList = []
  for (let nft of nfts) {
    const assetTypeScript = blockchain.Script.unpack(nft.assetType) as CKBComponents.Script
    const setup = isUdtAsset(ckbAsset) ? 0 : 4
    const orderArgs = new OrderArgs(sellerLock, setup, nft.totalValue)
    const orderLock: CKBComponents.Script = {
      ...getDexLockScript(isMainnet),
      args: orderArgs.toHex(),
    }

    const nftCells = await collector.getCells({
      lock: sellerLock,
      type: assetTypeScript,
    })
    if (!nftCells || nftCells.length === 0) {
      throw new NFTException('The address has no NFT cells')
    }
    const nftCell = nftCells[0]
    const orderCellCapacity = calculateNFTCellCapacity(orderLock, nftCell)
    const nftInputCapacity = BigInt(nftCell.output.capacity)
    const oneOrderNeedCellCapacity = orderCellCapacity - nftInputCapacity
    orderNeedCapacity = orderNeedCapacity + oneOrderNeedCellCapacity
    nftCellList.push({
      nftCell,
      orderLock,
      orderCellCapacity,
    })
  }

  const needCKB = ((orderNeedCapacity + minCellCapacity + CKB_UNIT) / CKB_UNIT).toString()
  const errMsg = `At least ${needCKB} free CKB (refundable) is required to place a sell order.`
  const { inputs: emptyInputs, capacity: emptyInputsCapacity } = collector.collectInputs(emptyCells, orderNeedCapacity, txFee, {
    minCellCapacity,
    errMsg,
    excludePoolTx,
  })
  const nftInputList: CKBComponents.CellInput[] = []
  let sporeCoBuildNftCellList = []
  let sporeCoBuildOutputList = []
  for (let i = 0; i < nftCellList.length; i++) {
    const { nftCell, orderLock, orderCellCapacity } = nftCellList[i]

    const nftInput: CKBComponents.CellInput = {
      previousOutput: nftCell.outPoint,
      since: '0x0',
    }
    nftInputList.push(nftInput)

    const orderOutput = {
      lock: orderLock,
      capacity: append0x(orderCellCapacity.toString(16)),
      type: nftCell.output.type,
    }
    outputs.push(orderOutput)
    outputsData.push(nftCell.outputData)

    if (ckbAsset === CKBAsset.SPORE) {
      sporeCoBuildNftCellList.push(nftCell)
      sporeCoBuildOutputList.push(orderOutput)
    }
  }
  inputs = [...emptyInputs, ...nftInputList]

  if (ckbAsset === CKBAsset.SPORE) {
    sporeCoBuild = generateSporeCoBuild(sporeCoBuildNftCellList, sporeCoBuildOutputList)
  }

  changeCapacity = emptyInputsCapacity - orderNeedCapacity - txFee
  outputs.push({
    lock: sellerLock,
    capacity: append0x(changeCapacity.toString(16)),
  })
  outputsData.push('0x')

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

  const listPackage = calculateNFTMakerListPackage(seller)

  return { rawTx: tx as CKBTransaction, txFee, listPackage, witnessIndex: 0 }
}
