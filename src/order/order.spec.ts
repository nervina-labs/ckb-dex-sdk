import { describe, it, expect } from 'vitest'
import {
  calculateUdtCellCapacity,
  calculateEmptyCellMinCapacity,
  calculateTransactionFee,
  deserializeOutPoints,
  cleanUpUdtOutputs,
} from './helper'
import { matchOrderOutputs } from './taker'
import { Hex } from '../types'
import { OrderArgs } from './orderArgs'
import { serializeScript } from '@nervosnetwork/ckb-sdk-utils'
import { calculateUDTMakerListPackage } from './maker'

describe('dex test cases', () => {
  it('calculateUdtCellCapacity', async () => {
    const joyIDLock: CKBComponents.Script = {
      codeHash: '0xd23761b364210735c19c60561d213fb3beae2fd6172743719eff6920e020baac',
      hashType: 'type',
      args: '0x0001f21be6c96d2103946d37a1ee882011f7530a92a7',
    }
    const xudtType: CKBComponents.Script = {
      codeHash: '0x25c29dc317811a6f6f3985a7a9ebc4838bd388d19d0feeecf0bcd60f6c0975bb',
      hashType: 'type',
      args: '0x06ec22c2def100bba3e295a1ff279c490d227151bf3166a4f3f008906c849399',
    }
    const capacity = calculateUdtCellCapacity(joyIDLock, xudtType)
    expect(BigInt(145_0000_0000)).toBe(capacity)
  })

  it('calculateOrderUdtCellCapacity', async () => {
    const orderLock: CKBComponents.Script = {
      codeHash: '0x493510d54e815611a643af97b5ac93bfbb45ddc2aae0f2dceffaf3408b4fcfcd',
      hashType: 'type',
      args: '0x4b000000100000003000000031000000d23761b364210735c19c60561d213fb3beae2fd6172743719eff6920e020baac011600000000014fb353fbaa84df6dc4052a1454b8fccf47ee4a2d0000000000000000000000003a35294400',
    }
    const xudtType: CKBComponents.Script = {
      codeHash: '0x25c29dc317811a6f6f3985a7a9ebc4838bd388d19d0feeecf0bcd60f6c0975bb',
      hashType: 'type',
      args: '0x06ec22c2def100bba3e295a1ff279c490d227151bf3166a4f3f008906c849399',
    }
    const capacity = calculateUdtCellCapacity(orderLock, xudtType)
    expect(BigInt(215_0000_0000)).toBe(capacity)
  })

  it('calculateUDTMakerListPackage', async () => {
    const joyIDLock: CKBComponents.Script = {
      codeHash: '0xd23761b364210735c19c60561d213fb3beae2fd6172743719eff6920e020baac',
      hashType: 'type',
      args: '0x0001f21be6c96d2103946d37a1ee882011f7530a92a7',
    }
    const xudtType: CKBComponents.Script = {
      codeHash: '0x25c29dc317811a6f6f3985a7a9ebc4838bd388d19d0feeecf0bcd60f6c0975bb',
      hashType: 'type',
      args: '0x06ec22c2def100bba3e295a1ff279c490d227151bf3166a4f3f008906c849399',
    }
    const capacity = calculateUDTMakerListPackage(joyIDLock, xudtType)
    expect(BigInt(215_0000_0000)).toBe(capacity)
  })

  it('calculateEmptyCellMinCapacity', async () => {
    const joyIDLock: CKBComponents.Script = {
      codeHash: '0xd23761b364210735c19c60561d213fb3beae2fd6172743719eff6920e020baac',
      hashType: 'type',
      args: '0x0001f21be6c96d2103946d37a1ee882011f7530a92a7',
    }
    const capacity = calculateEmptyCellMinCapacity(joyIDLock)
    expect(BigInt(64_0000_0000)).toBe(capacity)
  })

  it('calculateTransactionFee', async () => {
    const fee = calculateTransactionFee(1245)
    expect(BigInt(1370)).toBe(fee)
  })

  it('OrderArgs', async () => {
    const lock: CKBComponents.Script = {
      codeHash: '0xd23761b364210735c19c60561d213fb3beae2fd6172743719eff6920e020baac',
      hashType: 'type',
      args: '0x0001f21be6c96d2103946d37a1ee882011f7530a92a7',
    }
    const orderArgs = new OrderArgs(lock, 0, BigInt(2000))
    const expectedHex =
      '0x4b000000100000003000000031000000d23761b364210735c19c60561d213fb3beae2fd6172743719eff6920e020baac01160000000001f21be6c96d2103946d37a1ee882011f7530a92a700000000000000000000000000000007d0'
    const expectedArgs = OrderArgs.fromHex(expectedHex)
    expect(expectedHex).toBe(orderArgs.toHex())
    expect(serializeScript(expectedArgs.ownerLock)).toBe(serializeScript(orderArgs.ownerLock))
    expect(expectedArgs.setup).toBe(orderArgs.setup)
    expect(expectedArgs.totalValue).toBe(orderArgs.totalValue)
  })

  it('deserializeOutPoints', async () => {
    const outPoint = deserializeOutPoints([
      '0xa29277aba50cb1ef2e37f61ac29b422a565307c3c1b8e9790349d660d39b208801000000',
      '0x59ffc29a0794c4a875a82f3fd76c8be61f242310874cc6d3cf032e12538bdd1512000000',
    ])
    const expected: CKBComponents.OutPoint[] = [
      {
        txHash: '0xa29277aba50cb1ef2e37f61ac29b422a565307c3c1b8e9790349d660d39b2088',
        index: '0x1',
      },
      { txHash: '0x59ffc29a0794c4a875a82f3fd76c8be61f242310874cc6d3cf032e12538bdd15', index: '0x12' },
    ]
    expect(JSON.stringify(expected)).toBe(JSON.stringify(outPoint))
  })

  const orderCells: CKBComponents.LiveCell[] = [
    {
      output: {
        capacity: '0x360447100',
        lock: {
          args: '0x4b000000100000003000000031000000d23761b364210735c19c60561d213fb3beae2fd6172743719eff6920e020baac01160000000001f21be6c96d2103946d37a1ee882011f7530a92a70000000000000000000000001d1a94a200',
          codeHash: '0x493510d54e815611a643af97b5ac93bfbb45ddc2aae0f2dceffaf3408b4fcfcd',
          hashType: 'type',
        },
        type: {
          args: '0xaafd7e7eab79726c669d7565888b194dc06bd1dbec16749a721462151e4f1762',
          codeHash: '0x25c29dc317811a6f6f3985a7a9ebc4838bd388d19d0feeecf0bcd60f6c0975bb',
          hashType: 'type',
        },
      },
      data: { content: '0x00e87648170000000000000000000000', hash: '' },
    },
    {
      output: {
        capacity: '0x360447100',
        lock: {
          args: '0x4b000000100000003000000031000000d23761b364210735c19c60561d213fb3beae2fd6172743719eff6920e020baac01160000000001f21be6c96d2103946d37a1ee882011f7530a92a70000000000000000000000003a35294400',
          codeHash: '0x493510d54e815611a643af97b5ac93bfbb45ddc2aae0f2dceffaf3408b4fcfcd',
          hashType: 'type',
        },
        type: {
          args: '0xaafd7e7eab79726c669d7565888b194dc06bd1dbec16749a721462151e4f1762',
          codeHash: '0x25c29dc317811a6f6f3985a7a9ebc4838bd388d19d0feeecf0bcd60f6c0975bb',
          hashType: 'type',
        },
      },
      data: { content: '0x00e87648170000000000000000000000', hash: '' },
    },
    {
      output: {
        capacity: '0x360447100',
        lock: {
          args: '0x4b000000100000003000000031000000d23761b364210735c19c60561d213fb3beae2fd6172743719eff6920e020baac01160000000001f21be6c96d2103946d37a1ee882011f7530a92a7000000000000000000000000574fbde600',
          codeHash: '0x493510d54e815611a643af97b5ac93bfbb45ddc2aae0f2dceffaf3408b4fcfcd',
          hashType: 'type',
        },
        type: {
          args: '0xaafd7e7eab79726c669d7565888b194dc06bd1dbec16749a721462151e4f1762',
          codeHash: '0x25c29dc317811a6f6f3985a7a9ebc4838bd388d19d0feeecf0bcd60f6c0975bb',
          hashType: 'type',
        },
      },
      data: { content: '0x00e87648170000000000000000000000', hash: '' },
    },
    {
      output: {
        capacity: '0x360447100',
        lock: {
          args: '0x4b000000100000003000000031000000d23761b364210735c19c60561d213fb3beae2fd6172743719eff6920e020baac01160000000001f21be6c96d2103946d37a1ee882011f7530a92a70000000000000000000000001d1a94a200',
          codeHash: '0x493510d54e815611a643af97b5ac93bfbb45ddc2aae0f2dceffaf3408b4fcfcd',
          hashType: 'type',
        },
        type: {
          args: '0x06ec22c2def100bba3e295a1ff279c490d227151bf3166a4f3f008906c849399',
          codeHash: '0x25c29dc317811a6f6f3985a7a9ebc4838bd388d19d0feeecf0bcd60f6c0975bb',
          hashType: 'type',
        },
      },
      data: { content: '0x00e87648170000000000000000000000', hash: '' },
    },
    {
      output: {
        capacity: '0x360447100',
        lock: {
          args: '0x4b000000100000003000000031000000d23761b364210735c19c60561d213fb3beae2fd6172743719eff6920e020baac01160000000001f21be6c96d2103946d37a1ee882011f7530a92a7000000000000000000000000574fbde600',
          codeHash: '0x493510d54e815611a643af97b5ac93bfbb45ddc2aae0f2dceffaf3408b4fcfcd',
          hashType: 'type',
        },
        type: {
          args: '0x6a5a8762fc76d5854e69d8a13611acfede063e77d15e964e3a88660e86cff1af',
          codeHash: '0x25c29dc317811a6f6f3985a7a9ebc4838bd388d19d0feeecf0bcd60f6c0975bb',
          hashType: 'type',
        },
      },
      data: { content: '0x00e87648170000000000000000000000', hash: '' },
    },
  ]

  it('cleanUpUdtOutputs', async () => {
    const joyIDLock: CKBComponents.Script = {
      codeHash: '0xd23761b364210735c19c60561d213fb3beae2fd6172743719eff6920e020baac',
      hashType: 'type',
      args: '0x00010748fce626e566ab4dbd1c95498bf10518443fc1',
    }
    const { buyerUdtOutputs, buyerUdtOutputsData, buyerUdtOutputsCapacity } = cleanUpUdtOutputs(orderCells, joyIDLock)

    const expectedOutputs = [
      {
        lock: {
          codeHash: '0xd23761b364210735c19c60561d213fb3beae2fd6172743719eff6920e020baac',
          hashType: 'type',
          args: '0x00010748fce626e566ab4dbd1c95498bf10518443fc1',
        },
        type: {
          codeHash: '0x25c29dc317811a6f6f3985a7a9ebc4838bd388d19d0feeecf0bcd60f6c0975bb',
          hashType: 'type',
          args: '0xaafd7e7eab79726c669d7565888b194dc06bd1dbec16749a721462151e4f1762',
        },
        capacity: '0x360447100',
      },
      {
        lock: {
          codeHash: '0xd23761b364210735c19c60561d213fb3beae2fd6172743719eff6920e020baac',
          hashType: 'type',
          args: '0x00010748fce626e566ab4dbd1c95498bf10518443fc1',
        },
        type: {
          codeHash: '0x25c29dc317811a6f6f3985a7a9ebc4838bd388d19d0feeecf0bcd60f6c0975bb',
          hashType: 'type',
          args: '0x06ec22c2def100bba3e295a1ff279c490d227151bf3166a4f3f008906c849399',
        },
        capacity: '0x360447100',
      },
      {
        lock: {
          codeHash: '0xd23761b364210735c19c60561d213fb3beae2fd6172743719eff6920e020baac',
          hashType: 'type',
          args: '0x00010748fce626e566ab4dbd1c95498bf10518443fc1',
        },
        type: {
          codeHash: '0x25c29dc317811a6f6f3985a7a9ebc4838bd388d19d0feeecf0bcd60f6c0975bb',
          hashType: 'type',
          args: '0x6a5a8762fc76d5854e69d8a13611acfede063e77d15e964e3a88660e86cff1af',
        },
        capacity: '0x360447100',
      },
    ]
    const expectedOutputsData: Hex[] = [
      '0x00b864d9450000000000000000000000',
      '0x00e87648170000000000000000000000',
      '0x00e87648170000000000000000000000',
    ]
    const expectedCapacity = BigInt(435_0000_0000)
    expect(JSON.stringify(expectedOutputs)).toBe(JSON.stringify(buyerUdtOutputs))
    expect(JSON.stringify(expectedOutputsData)).toBe(JSON.stringify(buyerUdtOutputsData))
    expect(expectedCapacity).toBe(buyerUdtOutputsCapacity)
  })

  it('matchOrderOutputs', async () => {
    const { sellerOutputs, sellerOutputsData, sumSellerCapacity } = matchOrderOutputs(orderCells)

    const expectedOutputs = [
      {
        lock: {
          codeHash: '0xd23761b364210735c19c60561d213fb3beae2fd6172743719eff6920e020baac',
          hashType: 'type',
          args: '0x0001f21be6c96d2103946d37a1ee882011f7530a92a7',
        },
        capacity: '0x207ad91300',
      },
      {
        lock: {
          codeHash: '0xd23761b364210735c19c60561d213fb3beae2fd6172743719eff6920e020baac',
          hashType: 'type',
          args: '0x0001f21be6c96d2103946d37a1ee882011f7530a92a7',
        },
        capacity: '0x3d956db500',
      },
      {
        lock: {
          codeHash: '0xd23761b364210735c19c60561d213fb3beae2fd6172743719eff6920e020baac',
          hashType: 'type',
          args: '0x0001f21be6c96d2103946d37a1ee882011f7530a92a7',
        },
        capacity: '0x5ab0025700',
      },
      {
        lock: {
          codeHash: '0xd23761b364210735c19c60561d213fb3beae2fd6172743719eff6920e020baac',
          hashType: 'type',
          args: '0x0001f21be6c96d2103946d37a1ee882011f7530a92a7',
        },
        capacity: '0x207ad91300',
      },
      {
        lock: {
          codeHash: '0xd23761b364210735c19c60561d213fb3beae2fd6172743719eff6920e020baac',
          hashType: 'type',
          args: '0x0001f21be6c96d2103946d37a1ee882011f7530a92a7',
        },
        capacity: '0x5ab0025700',
      },
    ]
    const expectedOutputsData: Hex[] = ['0x', '0x', '0x', '0x', '0x']
    const expectedCapacity = BigInt(13225_0000_0000)
    expect(JSON.stringify(expectedOutputs)).toBe(JSON.stringify(sellerOutputs))
    expect(JSON.stringify(expectedOutputsData)).toBe(JSON.stringify(sellerOutputsData))
    expect(expectedCapacity).toBe(sumSellerCapacity)
  })
})
