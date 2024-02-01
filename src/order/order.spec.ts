import { describe, it, expect } from 'vitest'

describe('dex test cases', () => {
  it('BigInt', async () => {
    const num1 = '0xab'
    const num2 = 171
    expect(BigInt(num1)).toBe(BigInt(num2))
  })
})
