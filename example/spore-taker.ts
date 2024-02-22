import { serializeOutPoint } from '@nervosnetwork/ckb-sdk-utils'
import { Collector } from '../src/collector'
import { addressFromP256PrivateKey, keyFromP256Private } from '../src/utils'
import { Aggregator } from '../src/aggregator'
import { ConnectResponseData } from '@joyid/ckb'
import { CKBAsset, JoyIDConfig } from '../src/types'
import { buildTakerTx } from '../src/order'
import { signSecp256r1Tx } from './secp256r1'

// SECP256R1 private key
const BUYER_MAIN_PRIVATE_KEY = '0x0000000000000000000000000000000000000000000000000000000000000001'

const taker = async () => {
  const collector = new Collector({
    ckbNodeUrl: 'https://testnet.ckb.dev/rpc',
    ckbIndexerUrl: 'https://testnet.ckb.dev/indexer',
  })
  const buyer = addressFromP256PrivateKey(BUYER_MAIN_PRIVATE_KEY)
  // ckt1qrfrwcdnvssswdwpn3s9v8fp87emat306ctjwsm3nmlkjg8qyza2cqgqq9kxr7vy7yknezj0vj0xptx6thk6pwyr0sxamv6q
  console.log('buyer address: ', buyer)

  const aggregator = new Aggregator('https://cota.nervina.dev/aggregator')
  // The connectData is the response of the connect with @joyid/ckb
  const connectData: ConnectResponseData = {
    address: buyer,
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
      txHash: '0xf37c614c31b4d2d34fb71b0a0b8dc4e797151bdee36fc25446a682326a77242f',
      index: '0x0',
    },
  ]

  const { rawTx, txFee, witnessIndex } = await buildTakerTx({
    collector,
    joyID,
    buyer,
    orderOutPoints: orderOutPoints.map(serializeOutPoint),
    ckbAsset: CKBAsset.SPORE,
  })

  const key = keyFromP256Private(BUYER_MAIN_PRIVATE_KEY)
  const signedTx = signSecp256r1Tx(key, rawTx, witnessIndex)

  let txHash = await collector.getCkb().rpc.sendTransaction(signedTx, 'passthrough')
  console.info(`The taker of udt asset has been finished with tx hash: ${txHash}`)
}

taker()
