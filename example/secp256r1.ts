import { bytesToHex, hexToBytes, PERSONAL, rawTransactionToHash, serializeWitnessArgs, toUint64Le } from '@nervosnetwork/ckb-sdk-utils'
import { ec as EC } from 'elliptic'
import sha256 from 'fast-sha256'
import blake2b from '@nervosnetwork/ckb-sdk-utils/lib/crypto/blake2b'
import { append0x, getPublicKey, remove0x } from '../src/utils'
import { Hex } from '../src/types'
import { SECP256R1_PUBKEY_SIG_LEN, WITNESS_NATIVE_MODE } from '../src/constants'
import { blockchain } from '@ckb-lumos/base'
import { CKBTransaction } from '@joyid/ckb'

const calcSignedWitnessLock = (key: EC.KeyPair, tx: CKBTransaction, witnessIndex = 0, mode = WITNESS_NATIVE_MODE): Hex => {
  if (!key) throw new Error('Private key or address object')

  const witnessGroup = tx.witnesses

  if (witnessGroup.length === 0) {
    throw new Error('WitnessGroup cannot be empty')
  }

  const transactionHash = rawTransactionToHash(tx)

  const witnessArgs = blockchain.WitnessArgs.unpack(tx.witnesses[witnessIndex])
  const emptyWitness = {
    ...witnessArgs,
    lock: `0x${'0'.repeat(SECP256R1_PUBKEY_SIG_LEN)}`,
  }

  const serializedEmptyWitnessBytes = blockchain.WitnessArgs.pack(emptyWitness)
  const serializedEmptyWitnessSize = serializedEmptyWitnessBytes.length

  const hasher = blake2b(32, null, null, PERSONAL)
  hasher.update(hexToBytes(transactionHash))
  hasher.update(hexToBytes(toUint64Le(`0x${serializedEmptyWitnessSize.toString(16)}`)))
  hasher.update(serializedEmptyWitnessBytes)

  witnessGroup.slice(witnessIndex + 1).forEach(w => {
    const bytes = hexToBytes(typeof w === 'string' ? w : serializeWitnessArgs(w))
    hasher.update(hexToBytes(toUint64Le(`0x${bytes.length.toString(16)}`)))
    hasher.update(bytes)
  })

  const message = `${hasher.digest('hex')}`

  const base64 = Buffer.from(message).toString('base64url')
  const sighashAll = Buffer.from(base64, 'utf8').toString('hex')

  const pubKey = getPublicKey(key)

  const authData = '49960de5880e8c687434170f6476605b8fe4aeb9a28632c7995cf3ba831d97630162f9fb77'
  const clientData = `7b2274797065223a22776562617574686e2e676574222c226368616c6c656e6765223a22${sighashAll}222c226f726967696e223a22687474703a2f2f6c6f63616c686f73743a38303030222c2263726f73734f726967696e223a66616c73657d`

  const clientDataHash = sha256Hash(clientData)
  const signData = `0x${authData}${clientDataHash}`
  const signature = signSecp256r1Message(key, signData)

  return `${mode}${pubKey}${signature}${authData}${clientData}`
}

export const signSecp256r1Tx = (
  key: EC.KeyPair,
  transaction: CKBComponents.RawTransaction,
  witnessIndex = 0,
  mode = WITNESS_NATIVE_MODE,
): CKBTransaction => {
  const tx = transaction as CKBTransaction
  const witnessGroup = tx.witnesses
  if (witnessGroup.length === 0) {
    throw new Error('WitnessGroup cannot be empty')
  }
  const witnessArgs = blockchain.WitnessArgs.unpack(tx.witnesses[witnessIndex])
  const emptyWitness = {
    ...witnessArgs,
    lock: `0x${calcSignedWitnessLock(key, tx, witnessIndex, mode)}`,
  }
  const signedWitness = bytesToHex(blockchain.WitnessArgs.pack(emptyWitness))

  witnessGroup.splice(witnessIndex, 1, signedWitness)

  return {
    ...tx,
    witnesses: witnessGroup,
  }
}

export const signSecp256r1Message = (key: EC.KeyPair, message: Hex) => {
  if (!message.startsWith('0x')) {
    throw new Error('Message format error')
  }

  const msg = sha256(hexToBytes(message))
  const sig = key.sign(msg)

  const fmtR = sig.r.toString(16).padStart(64, '0')
  const fmtS = sig.s.toString(16).padStart(64, '0')
  return `${fmtR}${fmtS}`
}

export const sha256Hash = (message: Hex): Hex => {
  let hash = sha256(hexToBytes(append0x(message)))
  return remove0x(bytesToHex(hash))
}
