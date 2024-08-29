import { serializeOutPoint } from '@nervosnetwork/ckb-sdk-utils'
import { Collector } from '../src/collector'
import { addressFromP256PrivateKey, keyFromP256Private } from '../src/utils'
import { Aggregator } from '../src/aggregator'
import { ConnectResponseData } from '@joyid/ckb'
import { JoyIDConfig } from '../src/types'
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
    taproot: { address: '', pubkey: '' },
    nativeSegwit: { address: '', pubkey: '' },
  }
  // The JoyIDConfig is needed if the dapps use JoyID Wallet to connect and sign ckb transaction
  const joyID: JoyIDConfig = {
    aggregator,
    connectData,
  }

  const xudtOrderOutPoints: CKBComponents.OutPoint[] = [
    {
      txHash: '0x81176763a95aa71d59be015c9769bf65302520ac11b6d668630071d841659b66',
      index: '0x0',
    },
    // {
    //   txHash: '0x48d64acadc78709ac2de78c88ec3cd015c5d1cb02a0afa986d408b30e82a2eb6',
    //   index: '0x0',
    // },
  ]

  console.log('Queue first state', collector.getQueue())

  const { rawTx, txFee, witnessIndex } = await buildCancelTx({
    collector,
    joyID,
    seller,
    orderOutPoints: xudtOrderOutPoints.map(serializeOutPoint),
    excludePoolTx: true,
  })

  console.log('First', JSON.stringify(rawTx))
  console.log('Queue second state', collector.getQueue())

  // const key = keyFromP256Private(SELLER_MAIN_PRIVATE_KEY)
  // const signedTx = signSecp256r1Tx(key, rawTx, witnessIndex)

  // // You can call the `signRawTransaction` method to sign the raw tx with JoyID wallet through @joyid/ckb SDK
  // // please make sure the seller address is the JoyID wallet ckb address
  // // const signedTx = await signRawTransaction(rawTx as CKBTransaction, seller)

  // let txHash = await collector.getCkb().rpc.sendTransaction(signedTx, 'passthrough')
  // console.info(`The udt asset has been cancelled with tx hash: ${txHash}`)

  setTimeout(async () => {
    const xudtOrderOutPoints: CKBComponents.OutPoint[] = [
      {
        txHash: '0x6669bb0a0bdcdb2e3a467ec3379155872182fa6df4472fc113313008ec5e255c',
        index: '0x0',
      },
    ]
    const { rawTx, txFee, witnessIndex } = await buildCancelTx({
      collector,
      joyID,
      seller,
      orderOutPoints: xudtOrderOutPoints.map(serializeOutPoint),
      excludePoolTx: true,
    })

    console.log('Second', JSON.stringify(rawTx))
    console.log('Queue last state', collector.getQueue())
  }, 500)
}

cancel()
