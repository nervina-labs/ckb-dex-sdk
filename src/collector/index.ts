import axios from 'axios'
import CKB from '@nervosnetwork/ckb-sdk-core'
import { toCamelcase } from '../utils/case-parser'
import { IndexerCell, CollectResult, IndexerCapacity, CollectXudtResult } from '../types/collector'
import { CKB_UNIT, MIN_CAPACITY } from '../constants'
import { CapacityNotEnoughException, IndexerException, XudtAmountNotEnoughException } from '../exceptions'
import { leToU128 } from '../utils'

export class Collector {
  private ckbNodeUrl: string
  private ckbIndexerUrl: string

  constructor({ ckbNodeUrl, ckbIndexerUrl }: { ckbNodeUrl: string; ckbIndexerUrl: string }) {
    this.ckbNodeUrl = ckbNodeUrl
    this.ckbIndexerUrl = ckbIndexerUrl
  }

  getCkb() {
    return new CKB(this.ckbNodeUrl)
  }

  async getCells({ lock, type }: { lock?: CKBComponents.Script; type?: CKBComponents.Script }): Promise<IndexerCell[] | undefined> {
    let param: any
    if (lock) {
      const filter = type
        ? {
            script: {
              code_hash: type.codeHash,
              hash_type: type.hashType,
              args: type.args,
            },
          }
        : {
            script: null,
            output_data_len_range: ['0x0', '0x1'],
          }
      param = {
        script: {
          code_hash: lock.codeHash,
          hash_type: lock.hashType,
          args: lock.args,
        },
        script_type: 'lock',
        script_search_mode: 'exact',
        filter,
      }
    } else if (type) {
      param = {
        script: {
          code_hash: type.codeHash,
          hash_type: type.hashType,
          args: type.args,
        },
        script_search_mode: 'exact',
        script_type: 'type',
      }
    }
    let payload = {
      id: 1,
      jsonrpc: '2.0',
      method: 'get_cells',
      params: [param, 'asc', '0x3E8'],
    }
    const body = JSON.stringify(payload, null, '  ')
    let response = (
      await axios({
        method: 'post',
        url: this.ckbIndexerUrl,
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 20000,
        data: body,
      })
    ).data
    if (response.error) {
      console.error(response.error)
      throw new IndexerException('Get cells error')
    } else {
      return toCamelcase(response.result.objects)
    }
  }

  async getCapacity(lock: CKBComponents.Script): Promise<IndexerCapacity | undefined> {
    let payload = {
      id: 1,
      jsonrpc: '2.0',
      method: 'get_cells_capacity',
      params: [
        {
          script: {
            code_hash: lock.codeHash,
            hash_type: lock.hashType,
            args: lock.args,
          },
          script_type: 'lock',
        },
      ],
    }
    const body = JSON.stringify(payload, null, '  ')
    let response = (
      await axios({
        method: 'post',
        url: this.ckbIndexerUrl,
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 20000,
        data: body,
      })
    ).data
    if (response.error) {
      console.error(response.error)
      throw new IndexerException('Get cells capacity error')
    } else {
      return toCamelcase(response.result)
    }
  }

  collectInputs(liveCells: IndexerCell[], needCapacity: bigint, fee: bigint, minCapacity?: bigint, errMsg?: string): CollectResult {
    const changeCapacity = minCapacity ?? MIN_CAPACITY
    let inputs: CKBComponents.CellInput[] = []
    let sum = BigInt(0)
    for (let cell of liveCells) {
      inputs.push({
        previousOutput: {
          txHash: cell.outPoint.txHash,
          index: cell.outPoint.index,
        },
        since: '0x0',
      })
      sum = sum + BigInt(cell.output.capacity)
      if (sum >= needCapacity + changeCapacity + fee) {
        break
      }
    }
    if (sum < needCapacity + changeCapacity + fee) {
      const message = errMsg ?? 'Insufficient free CKB balance'
      throw new CapacityNotEnoughException(message)
    }
    return { inputs, capacity: sum }
  }

  collectXudtInputs(liveCells: IndexerCell[], needAmount: bigint): CollectXudtResult {
    let inputs: CKBComponents.CellInput[] = []
    let sumCapacity = BigInt(0)
    let sumAmount = BigInt(0)
    for (let cell of liveCells) {
      inputs.push({
        previousOutput: {
          txHash: cell.outPoint.txHash,
          index: cell.outPoint.index,
        },
        since: '0x0',
      })
      sumCapacity = sumCapacity + BigInt(cell.output.capacity)
      sumAmount += leToU128(cell.outputData)
      if (sumAmount >= needAmount) {
        break
      }
    }
    if (sumAmount < needAmount) {
      throw new XudtAmountNotEnoughException('Insufficient Xudt balance')
    }
    return { inputs, capacity: sumCapacity, amount: sumAmount }
  }

  async getLiveCell(outPoint: CKBComponents.OutPoint): Promise<CKBComponents.LiveCell> {
    const ckb = new CKB(this.ckbNodeUrl)
    const { cell } = await ckb.rpc.getLiveCell(outPoint, true)
    return cell
  }
}
