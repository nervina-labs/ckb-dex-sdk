import { serializeOutPoint } from '@nervosnetwork/ckb-sdk-utils'
import { Collector } from '../src/collector'
import { addressFromP256PrivateKey, keyFromP256Private } from '../src/utils'
import { Aggregator } from '../src/aggregator'
import { ConnectResponseData } from '@joyid/ckb'
import { CKBAsset, JoyIDConfig } from '../src/types'
import { buildCancelTx } from '../src/order'
import { signSecp256r1Tx } from './secp256r1'

// SECP256R1 private key
const SELLER_MAIN_PRIVATE_KEY = '0x0000000000000000000000000000000000000000000000000000000000000001'

const cancel = async () => {
  const collector = new Collector({
    ckbNodeUrl: 'https://testnet.ckb.dev/rpc',
    ckbIndexerUrl: 'https://testnet.ckb.dev/indexer',
  })
  const seller = addressFromP256PrivateKey(SELLER_MAIN_PRIVATE_KEY)
  // ckt1qrfrwcdnvssswdwpn3s9v8fp87emat306ctjwsm3nmlkjg8qyza2cqgqq98mx5lm42zd7mwyq54pg49cln850mj2957np7az
  console.log('seller address: ', seller)

  const aggregator = new Aggregator('https://cota.nervina.dev/aggregator')
  // The connectData is the response of the connect with @joyid/ckb
  const connectData: ConnectResponseData = {
    address: seller,
    ethAddress: '',
    nostrPubkey: '',
    pubkey: '',
    keyType: 'main_key',
    alg: -7,
  }
  // The JoyIDConfig is needed if the dapps use JoyID Wallet to connect and sign ckb transaction
  const joyID: JoyIDConfig = {
    aggregator,
    connectData,
  }

  const orderOutPoints: CKBComponents.OutPoint[] = [
    {
      txHash: '0x1e618ded1c00458cc6721841b995fb1032ddab6e530d6c4b6d51f69bcf6c6116',
      index: '0x0',
    },
  ]

  const { rawTx, txFee, witnessIndex } = await buildCancelTx({
    collector,
    joyID,
    seller,
    orderOutPoints: orderOutPoints.map(serializeOutPoint),
    ckbAsset: CKBAsset.SPORE,
  })

  const key = keyFromP256Private(SELLER_MAIN_PRIVATE_KEY)
  const signedTx = signSecp256r1Tx(key, rawTx, witnessIndex)

  // You can call the `signRawTransaction` method to sign the raw tx with JoyID wallet through @joyid/ckb SDK
  // please make sure the buyer address is the JoyID wallet ckb address
  // const signedTx = await signRawTransaction(rawTx as CKBTransaction, seller)

  let txHash = await collector.getCkb().rpc.sendTransaction(signedTx, 'passthrough')
  console.info(`The Spore asset has been cancelled with tx hash: ${txHash}`)
}

cancel()
