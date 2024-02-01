import { describe, it, expect } from 'vitest'
import { calcXudtCapacity } from './mint'
import { calcInscriptionInfoCapacity } from './deploy'
import { InscriptionInfo } from '../types'
import { calcSingleRebaseMintCapacity } from './rebase'
import { calculateRebaseTxFee, calculateTransactionFee, getXudtHashFromInfo } from './helper'
import BigNumber from 'bignumber.js'

describe('inscription test cases', () => {
  it('calcXudtCapacity with JoyID lock', async () => {
    const expected = calcXudtCapacity(
      'ckt1qrfrwcdnvssswdwpn3s9v8fp87emat306ctjwsm3nmlkjg8qyza2cqgqq9sfrkfah2cj79nyp7e6p283ualq8779rscnjmrj',
    )
    expect(BigInt(14500000000)).toBe(expected)
  })

  it('calcXudtCapacity with Secp256k1 lock', async () => {
    const expected = calcXudtCapacity(
      'ckt1qzda0cr08m85hc8jlnfp3zer7xulejywt49kt2rr0vthywaa50xwsqdelcxw9t8sa5q695g65eer5awxvtg0nhsk4ahkx',
    )
    expect(BigInt(14300000000)).toBe(expected)
  })

  it('calcInscriptionInfoCapacity with JoyID lock', async () => {
    const info: InscriptionInfo = {
      maxSupply: BigInt(2100_0000),
      mintLimit: BigInt(1000),
      xudtHash: '',
      mintStatus: 0,
      decimal: 8,
      name: 'CKB Fist Inscription',
      symbol: 'CKBI',
    }
    const expected = calcInscriptionInfoCapacity(
      'ckt1qrfrwcdnvssswdwpn3s9v8fp87emat306ctjwsm3nmlkjg8qyza2cqgqq9sfrkfah2cj79nyp7e6p283ualq8779rscnjmrj',
      info,
    )
    expect(BigInt(22100000000)).toBe(expected)
  })

  it('calcRebaseMintCapacity with JoyID lock', async () => {
    const { rebasedXudtCapacity, minChangeCapacity } = calcSingleRebaseMintCapacity(
      'ckt1qrfrwcdnvssswdwpn3s9v8fp87emat306ctjwsm3nmlkjg8qyza2cqgqq9sfrkfah2cj79nyp7e6p283ualq8779rscnjmrj',
    )
    expect(BigInt(14500000000)).toBe(rebasedXudtCapacity)
    expect(BigInt(6300000000)).toBe(minChangeCapacity)
  })

  it('getXudtHashFromInfo', async () => {
    const xudtHash = getXudtHashFromInfo(
      '0x0814434b42204669737420496e736372697074696f6e04434b42494cf658d0fea4d2ac028cefe008e97a701f4c3f2ec7207ece34ddfc9dab6046d90040075af0750700000000000000000000e8764817000000000000000000000000',
    )
    expect('0x4cf658d0fea4d2ac028cefe008e97a701f4c3f2ec7207ece34ddfc9dab6046d9').toBe(xudtHash)
  })

  it('calculateTransactionFee', async () => {
    const fee = calculateTransactionFee(BigInt(1234))
    expect(BigInt(2468)).toBe(fee)
  })

  it('calculateRebaseTxFee', async () => {
    const fee = calculateRebaseTxFee(13, BigInt(1234))
    expect(BigInt(9255)).toBe(fee)
  })

  it('rebase amount', async () => {
    const preAmount = BigInt(34000)
    const exceptedSupply = BigInt(2100_0000)
    const actualSupply = BigInt(234_8793_4000)

    const expectedAmount = BigNumber((preAmount * exceptedSupply).toString(), 10)
    const actualAmount = expectedAmount
      .dividedBy(BigNumber(actualSupply.toString(), 10))
      .toFixed(0, BigNumber.ROUND_FLOOR)
    // 30.398586780770074
    expect('30').toBe(actualAmount)
  })

  it('rebase amount', async () => {
    const preAmount = BigInt(15000)
    const exceptedSupply = BigInt(2100_0000)
    const actualSupply = BigInt(1237_9000)

    const expectedAmount = BigNumber((preAmount * exceptedSupply).toString(), 10)
    const actualAmount = expectedAmount
      .dividedBy(BigNumber(actualSupply.toString(), 10))
      .toFixed(0, BigNumber.ROUND_FLOOR)
    // 25446.320381290894
    expect('25446').toBe(actualAmount)
  })
})
