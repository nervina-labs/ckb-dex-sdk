# CKB DEX SDK

[![CI](https://github.com/nervina-labs/ckb-dex-sdk/actions/workflows/build.yml/badge.svg?branch=master)](https://github.com/nervina-labs/ckb-dex-sdk/actions)
[![NPM](https://img.shields.io/npm/v/@nervina-labs/ckb-dex/latest.svg)](https://www.npmjs.com/package/@nervina-labs/ckb-dex)

CKB DEX SDK is a comprehensive web development kit, which helps developers interact with the CKB DEX contract in JavaScript/TypeScript environments.

The SDK provides methods for making orders, taking orders, and canceling orders. Developers can use common lock scripts, such as official secp256k1/blake160 lock, JoyID lock, etc., to interact with the CKB DEX contract.

## Installation

```
$ npm i @nervina-labs/ckb-dex
# or
$ yarn add @nervina-labs/ckb-dex
# or
$ pnpm add @nervina-labs/ckb-dex
```

## Development

### Toolchain & utilities

- [@nervina-labs/ckb-dex](https://www.npmjs.com/package/@nervina-labs/ckb-dex) - Provides essential tools for constructing maker, taker and cancel transactions on CKB DEX

### Reference

- [Examples](https://github.com/nervina-labs/ckb-dex-sdk/tree/master/example) - Maker, taker, and cancel examples with JoyID lock script
