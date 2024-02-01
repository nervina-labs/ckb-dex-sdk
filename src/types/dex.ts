import { ConnectResponseData } from '@joyid/ckb'
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

export interface TakerParams extends BaseParams {
  orderOutPoints: Hex[]
  buyer: Address
}
