import { ConnectResponseData } from '@joyid/ckb'
import { Aggregator } from '../aggregator'
import { Collector } from '../collector'
import { Address, U8 } from './common'

export interface JoyIDConfig {
  aggregator: Aggregator
  connectData: ConnectResponseData
}

interface BaseParams {
  collector: Collector
  address: Address
  fee?: bigint
}

export interface MakerParams extends BaseParams {
  from: Address
  // Unit is shannon for CKB native token
  totalValue: bigint
  xudtType: CKBComponents.Script
  // The UDT amount to list
  listAmount: bigint
  joyID?: JoyIDConfig
}
