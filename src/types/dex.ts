import { CKBTransaction, ConnectResponseData } from '@joyid/ckb'
import { Aggregator } from '../aggregator'
import { Collector } from '../collector'
import { Address, Hex } from './common'

export interface JoyIDConfig {
  aggregator: Aggregator
  connectData: ConnectResponseData
}

export enum CKBAsset {
  XUDT,
  SUDT,
  XUDT_CC,
  SPORE,
  MNFT,
}

interface BaseParams {
  collector: Collector
  fee?: bigint
  joyID?: JoyIDConfig
  ckbAsset?: CKBAsset
}

export interface MakerParams extends BaseParams {
  seller: Address
  // Unit is shannon for CKB native token
  totalValue: bigint
  // The UDT amount to list and it's optional for NFT asset
  listAmount?: bigint
  // The deserialized string of UDT and NFT(spore NFT, mNFT, CoTA NFT, etc.) type script
  assetType: Hex
}

export interface MakerResult {
  rawTx: CKBTransaction
  // The capacity(shannon) for packaging the order cell
  listPackage: bigint
  // Unit is shannon
  txFee: bigint
  // The position of WitnessArgs in witnesses for lock script to sign transaction
  witnessIndex?: number
}

export interface TakerParams extends BaseParams {
  orderOutPoints: Hex[]
  buyer: Address
}

export interface TakerResult {
  rawTx: CKBTransaction
  // Unit is shannon
  txFee: bigint
  // The position of WitnessArgs in witnesses for lock script to sign transaction
  witnessIndex?: number
}

export interface CancelParams extends BaseParams {
  orderOutPoints: Hex[]
  seller: Address
}

export interface CancelResult {
  rawTx: CKBTransaction
  // Unit is shannon
  txFee: bigint
  // The position of WitnessArgs in witnesses for lock script to sign transaction
  witnessIndex?: number
}
