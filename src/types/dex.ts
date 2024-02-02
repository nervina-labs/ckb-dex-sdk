import { CKBTransaction, ConnectResponseData } from '@joyid/ckb'
import { Aggregator } from '../aggregator'
import { Collector } from '../collector'
import { Address, Hex, U8 } from './common'

export interface JoyIDConfig {
  aggregator: Aggregator
  connectData: ConnectResponseData
}

interface BaseParams {
  collector: Collector
  fee?: bigint
  joyID?: JoyIDConfig
}

export interface MakerParams extends BaseParams {
  seller: Address
  // Unit is shannon for CKB native token
  totalValue: bigint
  // The UDT amount to list
  listAmount: bigint
  xudtType: Hex
}

export interface MakerResult {
  rawTx: CKBTransaction
  // The capacity(shannon) for packaging the order cell
  listPackage: bigint
  // Unit is shannon
  txFee: bigint
}

export interface TakerParams extends BaseParams {
  orderOutPoints: Hex[]
  buyer: Address
}

export interface TakerResult {
  rawTx: CKBTransaction
  // Unit is shannon
  txFee: bigint
}

export interface CancelParams extends BaseParams {
  orderOutPoints: Hex[]
  seller: Address
}

export interface CancelResult {
  rawTx: CKBTransaction
  // Unit is shannon
  txFee: bigint
}
