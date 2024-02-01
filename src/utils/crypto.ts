import { blake160, hexToBytes, scriptToAddress } from '@nervosnetwork/ckb-sdk-utils'
import { ec as EC } from 'elliptic'
import { getJoyIDLockScript } from '../constants'
import { Address, Hex } from '../types'
import { append0x, remove0x } from './hex'

export const keyFromP256Private = (privateKey: Uint8Array | Hex): EC.KeyPair => {
  const privkey = typeof privateKey == 'string' ? remove0x(privateKey) : privateKey
  const ec = new EC('p256')
  return ec.keyFromPrivate(privkey)
}

// uncompressed pubkey without 0x
export const getPublicKey = (key: EC.KeyPair) => key.getPublic(false, 'hex').substring(2)

export const addressFromP256PrivateKey = (privateKey: Uint8Array | Hex, isMainnet = false): Address => {
  const pubkey = append0x(getPublicKey(keyFromP256Private(privateKey)))
  const lock = {
    ...getJoyIDLockScript(isMainnet),
    args: `0x0001${blake160(hexToBytes(pubkey), 'hex')}`,
  }
  return scriptToAddress(lock, isMainnet)
}

export const pubkeyFromP256PrivateKey = (privateKey: Uint8Array | Hex) => {
  return append0x(getPublicKey(keyFromP256Private(privateKey)))
}
