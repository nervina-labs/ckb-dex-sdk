import { serializeScript } from '@nervosnetwork/ckb-sdk-utils'
import { Collector } from '../src/collector'
import { addressFromP256PrivateKey, append0x, keyFromP256Private } from '../src/utils'
import { Aggregator } from '../src/aggregator'
import { ConnectResponseData } from '@joyid/ckb'
import { CKBAsset, JoyIDConfig } from '../src/types'
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
  // ckt1qrfrwcdnvssswdwpn3s9v8fp87emat306ctjwsm3nmlkjg8qyza2cqgqqxqyukftmpfang0z2ks6w6syjutass94fujlf09a
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

  const listAmount = BigInt(200_0000_0000)
  const totalValue = BigInt(500_0000_0000)
  const xudtType: CKBComponents.Script = {
    codeHash: '0x25c29dc317811a6f6f3985a7a9ebc4838bd388d19d0feeecf0bcd60f6c0975bb',
    hashType: 'type',
    args: '0x562e4e8a2f64a3e9c24beb4b7dd002d0ad3b842d0cc77924328e36ad114e3ebe',
  }

  const { rawTx, listPackage, txFee } = await buildMakerTx({
    collector,
    joyID,
    seller,
    // The UDT amount to list and it's optional for NFT asset
    listAmount,
    // The price whose unit is shannon for CKB native token
    totalValue,
    assetType: append0x(serializeScript(xudtType)),
    ckbAsset: CKBAsset.XUDT,
    // If you want to continually list xUDT without blockchain committed, excludePoolTx should be true
    // excludePoolTx: true
  })

  const key = keyFromP256Private(SELLER_MAIN_PRIVATE_KEY)
  const signedTx = signSecp256r1Tx(key, rawTx)

  // You can call the `signRawTransaction` method to sign the raw tx with JoyID wallet through @joyid/ckb SDK
  // please make sure the seller address is the JoyID wallet ckb address
  // const signedTx = await signRawTransaction(rawTx as CKBTransaction, seller)

  let txHash = await collector.getCkb().rpc.sendTransaction(signedTx, 'passthrough')
  console.info(`The udt asset has been listed with tx hash: ${txHash}`)

  // You can list xUDT continually without blockchain committed when the transactions of the pool are excluded
  // setTimeout(async () => {
  //   const { rawTx, listPackage, txFee } = await buildMakerTx({
  //     collector,
  //     joyID,
  //     seller,
  //     // The UDT amount to list and it's optional for NFT asset
  //     listAmount,
  //     // The price whose unit is shannon for CKB native token
  //     totalValue,
  //     assetType: append0x(serializeScript(xudtType)),
  //     ckbAsset: CKBAsset.XUDT,
  //     excludePoolTx: true,
  //   })

  //   const key = keyFromP256Private(SELLER_MAIN_PRIVATE_KEY)
  //   const signedTx = signSecp256r1Tx(key, rawTx)

  //   let txHash = await collector.getCkb().rpc.sendTransaction(signedTx, 'passthrough')
  //   console.info(`The udt asset has been continually listed with tx hash: ${txHash}`)
  // }, 500)
}

maker()
