import { Aggregator } from '../aggregator'
import { Collector } from '../collector'
import { Bytes, Hex, Byte2 } from './common'

export interface BaseReq {}
export interface BaseResp {}

export interface SubkeyUnlockReq extends BaseReq {
  lockScript: Bytes
  pubkeyHash: Hex
  algIndex: Byte2
}

export interface SubkeyUnlockResp extends BaseResp {
  unlockEntry: Bytes
  blockNumber: bigint
}

export interface Servicer {
  collector: Collector
  aggregator: Aggregator
}
