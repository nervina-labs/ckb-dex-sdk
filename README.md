# CKB DEX SDK

[![CI](https://github.com/nervina-labs/ckb-dex-sdk/actions/workflows/build.yml/badge.svg?branch=master)](https://github.com/nervina-labs/ckb-dex-sdk/actions)
[![NPM](https://img.shields.io/npm/v/@nervina-labs/ckb-dex/latest.svg)](https://www.npmjs.com/package/@nervina-labs/ckb-dex)

CKB DEX SDK is a comprehensive web development kit, which helps developers interact with the CKB DEX contract in JavaScript/TypeScript environments.

The SDK provides methods for making orders, taking orders, and canceling orders. Developers can use common lock scripts, such as official secp256k1/blake160 lock, JoyID lock, etc., to interact with the CKB DEX contract.

You can use the DEX to swap fungible tokens([SUDT](https://github.com/nervosnetwork/rfcs/blob/master/rfcs/0025-simple-udt/0025-simple-udt.md), [XUDT](https://talk.nervos.org/t/rfc-extensible-udt/5337), etc.) and non-fungible tokens([Spore](https://docs.spore.pro/), [mNFT](https://talk.nervos.org/t/rfc-multi-purpose-nft-draft-spec/5434), [ccBTC](https://www.crosschain.network/assets?token=ccbtc), etc.) with CKB native asset and JoyID lock is recommended to hold and swap CKB assets.

You can build the maker transactions to transfer FT or NFT assets to DEX lock script whose args contains owner address, price(based on CKB native asset), setup, etc. Anyone can build a taker transaction, as long as the price required in the DEX lock args is met. You can cancel the maker transactions at any time before the taker transactions are executed.

## Installation

```
$ npm i @nervina-labs/ckb-dex
# or
$ yarn add @nervina-labs/ckb-dex
# or
$ pnpm add @nervina-labs/ckb-dex
```

## Development

### Connect the JoyID Wallet

You can [connect JoyID wallet](https://docs.joyid.dev/guide/ckb/connect) using [@joyid/ckb](https://www.npmjs.com/package/@joyid/ckb) SDK `connect` function and then you can get the ConnectResponseData to build maker and taker transactions later.

### Build and Sign transactions

You can use [`buildMakerTx`](./src/order/maker.ts), [`buildCancelTx`](./src/order/cancel.ts) and [`buildTakerTx`](./src/order/taker.ts) methods to place, cancel and take orders with the ConnectResponseData and the methods will generate CKB raw transaction for you to be signed later.

You must set the asset type(CKBAsset) when calling `buildXXXTx` methods and the CKBAsset is defined as follows:

```typescript
export enum CKBAsset {
  XUDT,
  SUDT,
  XUDT_CC, // ccBTC
  SPORE,
  MNFT,
}
```

The [examples](./example/) demonstrate how to build FT and NFT maker, taker transactions with JoyID lock and the local test private keys are for simplicity, please DON'T use the local private keys in your production DApp.

You can call the [`signRawTransaction`](https://docs.joyid.dev/apis/ckb/sign-raw-tx) method to sign the raw tx with JoyID wallet through [@joyid/ckb](https://www.npmjs.com/package/@joyid/ckb) SDK, and you can send the signed transaction through CKB RPC.
