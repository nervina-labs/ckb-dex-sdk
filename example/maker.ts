import { serializeScript } from '@nervosnetwork/ckb-sdk-utils'
import { Collector } from '../src/collector'
import { addressFromP256PrivateKey, append0x, keyFromP256Private } from '../src/utils'
import { Aggregator } from '../src/aggregator'
import { ConnectResponseData } from '@joyid/ckb'
import { JoyIDConfig } from '../src/types'
import { buildMakerTx } from '../src/order'
import { signSecp256r1Tx } from './secp256r1'

// SECP256R1 private key
const SELLER_MAIN_PRIVATE_KEY = '0x0000000000000000000000000000000000000000000000000000000000000001'

const maker = async () => {
  const collector = new Collector({
    ckbNodeUrl: 'https://testnet.ckb.dev/rpc',
    ckbIndexerUrl: 'https://testnet.ckb.dev/indexer',
  })
  const seller = addressFromP256PrivateKey(SELLER_MAIN_PRIVATE_KEY)
  // ckt1qrfrwcdnvssswdwpn3s9v8fp87emat306ctjwsm3nmlkjg8qyza2cqgqq98mx5lm42zd7mwyq54pg49cln850mj2957np7az
  console.log('buyer address: ', seller)

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

  const listAmount = BigInt(200_0000_0000)
  const totalValue = BigInt(1000_0000_0000)
  const xudtType: CKBComponents.Script = {
    codeHash: '0x25c29dc317811a6f6f3985a7a9ebc4838bd388d19d0feeecf0bcd60f6c0975bb',
    hashType: 'type',
    args: '0xaafd7e7eab79726c669d7565888b194dc06bd1dbec16749a721462151e4f1762',
  }

  const { rawTx, listPackage, txFee } = await buildMakerTx({
    collector,
    joyID,
    seller,
    listAmount,
    totalValue,
    xudtType: append0x(serializeScript(xudtType)),
  })

  const key = keyFromP256Private(SELLER_MAIN_PRIVATE_KEY)
  const signedTx = signSecp256r1Tx(key, rawTx)

  let txHash = await collector.getCkb().rpc.sendTransaction(signedTx, 'passthrough')
  console.info(`The xudt asset has been listed with tx hash: ${txHash}`)
}

maker()
