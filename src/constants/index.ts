export const CKB_UNIT = BigInt(10000_0000)
export const MAX_FEE = BigInt(2000_0000)
export const MIN_CAPACITY = BigInt(63) * BigInt(10000_0000)
export const WITNESS_NATIVE_MODE = '01'
export const WITNESS_SUBKEY_MODE = '02'
export const SECP256R1_PUBKEY_SIG_LEN = (1 + 64 + 64) * 2
export const JOYID_ESTIMATED_WITNESS_LOCK_SIZE = 129 + 1000

const TestnetInfo = {
  JoyIDLockScript: {
    codeHash: '0xd23761b364210735c19c60561d213fb3beae2fd6172743719eff6920e020baac',
    hashType: 'type',
    args: '',
  } as CKBComponents.Script,

  JoyIDLockDep: {
    outPoint: {
      txHash: '0x4dcf3f3b09efac8995d6cbee87c5345e812d310094651e0c3d9a730f32dc9263',
      index: '0x0',
    },
    depType: 'depGroup',
  } as CKBComponents.CellDep,

  CotaTypeScript: {
    codeHash: '0x89cd8003a0eaf8e65e0c31525b7d1d5c1becefd2ea75bb4cff87810ae37764d8',
    hashType: 'type',
    args: '0x',
  } as CKBComponents.Script,

  CotaTypeDep: {
    outPoint: {
      txHash: '0x636a786001f87cb615acfcf408be0f9a1f077001f0bbc75ca54eadfe7e221713',
      index: '0x0',
    },
    depType: 'depGroup',
  } as CKBComponents.CellDep,

  DexLockScript: {
    codeHash: '0x493510d54e815611a643af97b5ac93bfbb45ddc2aae0f2dceffaf3408b4fcfcd',
    hashType: 'type',
    args: '',
  } as CKBComponents.Script,

  DexLockDep: {
    outPoint: {
      txHash: '0x70accc6114f425fc7cc0b25a8cfc435580b6dc6c529b26ecd36be6056b76661c',
      index: '0x0',
    },
    depType: 'code',
  } as CKBComponents.CellDep,

  XUDTTypeScript: {
    codeHash: '0x25c29dc317811a6f6f3985a7a9ebc4838bd388d19d0feeecf0bcd60f6c0975bb',
    hashType: 'type',
    args: '',
  } as CKBComponents.Script,

  XUDTTypeDep: {
    outPoint: {
      txHash: '0xbf6fb538763efec2a70a6a3dcb7242787087e1030c4e7d86585bc63a9d337f5f',
      index: '0x0',
    },
    depType: 'code',
  } as CKBComponents.CellDep,

  SUDTTypeScript: {
    codeHash: '0xc5e5dcf215925f7ef4dfaf5f4b4f105bc321c02776d6e7d52a1db3fcd9d011a4',
    hashType: 'type',
    args: '',
  } as CKBComponents.Script,

  SUDTTypeDep: {
    outPoint: {
      txHash: '0xe12877ebd2c3c364dc46c5c992bcfaf4fee33fa13eebdf82c591fc9825aab769',
      index: '0x0',
    },
    depType: 'code',
  } as CKBComponents.CellDep,

  SporeTypeScript: {
    codeHash: '0x5e063b4c0e7abeaa6a428df3b693521a3050934cf3b0ae97a800d1bc31449398',
    hashType: 'data1',
    args: '',
  } as CKBComponents.Script,

  SporeTypeDep: {
    outPoint: {
      txHash: '0x06995b9fc19461a2bf9933e57b69af47a20bf0a5bc6c0ffcb85567a2c733f0a1',
      index: '0x0',
    },
    depType: 'code',
  } as CKBComponents.CellDep,
}

const MainnetInfo = {
  JoyIDLockScript: {
    codeHash: '0xd00c84f0ec8fd441c38bc3f87a371f547190f2fcff88e642bc5bf54b9e318323',
    hashType: 'type',
    args: '',
  } as CKBComponents.Script,

  JoyIDLockDep: {
    outPoint: {
      txHash: '0xf05188e5f3a6767fc4687faf45ba5f1a6e25d3ada6129dae8722cb282f262493',
      index: '0x0',
    },
    depType: 'depGroup',
  } as CKBComponents.CellDep,

  CotaTypeScript: {
    codeHash: '0x1122a4fb54697cf2e6e3a96c9d80fd398a936559b90954c6e88eb7ba0cf652df',
    hashType: 'type',
    args: '0x',
  } as CKBComponents.Script,

  CotaTypeDep: {
    outPoint: {
      txHash: '0xabaa25237554f0d6c586dc010e7e85e6870bcfd9fb8773257ecacfbe1fd738a0',
      index: '0x0',
    },
    depType: 'depGroup',
  } as CKBComponents.CellDep,

  DexLockScript: {
    codeHash: '0x493510d54e815611a643af97b5ac93bfbb45ddc2aae0f2dceffaf3408b4fcfcd',
    hashType: 'type',
    args: '',
  } as CKBComponents.Script,

  DexLockDep: {
    outPoint: {
      txHash: '0x9305b2af4567255bfa7df7c9e9ebb531b26ce8b6779ffe01d51416d8bc620613',
      index: '0x0',
    },
    depType: 'code',
  } as CKBComponents.CellDep,

  XUDTTypeScript: {
    codeHash: '0x50bd8d6680b8b9cf98b73f3c08faf8b2a21914311954118ad6609be6e78a1b95',
    hashType: 'data1',
    args: '',
  } as CKBComponents.Script,

  XUDTTypeDep: {
    outPoint: {
      txHash: '0xc07844ce21b38e4b071dd0e1ee3b0e27afd8d7532491327f39b786343f558ab7',
      index: '0x0',
    },
    depType: 'code',
  } as CKBComponents.CellDep,

  SUDTTypeScript: {
    codeHash: '0x5e7a36a77e68eecc013dfa2fe6a23f3b6c344b04005808694ae6dd45eea4cfd5',
    hashType: 'type',
    args: '',
  } as CKBComponents.Script,

  SUDTTypeDep: {
    outPoint: {
      txHash: '0xc7813f6a415144643970c2e88e0bb6ca6a8edc5dd7c1022746f628284a9936d5',
      index: '0x0',
    },
    depType: 'code',
  } as CKBComponents.CellDep,

  SporeTypeScript: {
    codeHash: '0x4a4dce1df3dffff7f8b2cd7dff7303df3b6150c9788cb75dcf6747247132b9f5',
    hashType: 'data1',
    args: '',
  } as CKBComponents.Script,

  SporeTypeDep: {
    outPoint: {
      txHash: '0x96b198fb5ddbd1eed57ed667068f1f1e55d07907b4c0dbd38675a69ea1b69824',
      index: '0x0',
    },
    depType: 'code',
  } as CKBComponents.CellDep,
}

export const getJoyIDLockScript = (isMainnet = false) => (isMainnet ? MainnetInfo.JoyIDLockScript : TestnetInfo.JoyIDLockScript)
export const getJoyIDCellDep = (isMainnet = false) => (isMainnet ? MainnetInfo.JoyIDLockDep : TestnetInfo.JoyIDLockDep)

export const getCotaTypeScript = (isMainnet = false) => (isMainnet ? MainnetInfo.CotaTypeScript : TestnetInfo.CotaTypeScript)
export const getCotaCellDep = (isMainnet = false) => (isMainnet ? MainnetInfo.CotaTypeDep : TestnetInfo.CotaTypeDep)

export const getDexLockScript = (isMainnet = false) => (isMainnet ? MainnetInfo.DexLockScript : TestnetInfo.DexLockScript)
export const getDexCellDep = (isMainnet = false) => (isMainnet ? MainnetInfo.DexLockDep : TestnetInfo.DexLockDep)

export const getXudtTypeScript = (isMainnet = false) => (isMainnet ? MainnetInfo.XUDTTypeScript : TestnetInfo.XUDTTypeScript)
export const getXudtDep = (isMainnet = false) => (isMainnet ? MainnetInfo.XUDTTypeDep : TestnetInfo.XUDTTypeDep)

export const getSudtTypeScript = (isMainnet = false) => (isMainnet ? MainnetInfo.SUDTTypeScript : TestnetInfo.SUDTTypeScript)
export const getSudtDep = (isMainnet = false) => (isMainnet ? MainnetInfo.SUDTTypeDep : TestnetInfo.SUDTTypeDep)

export const getSporeTypeScript = (isMainnet = false) => (isMainnet ? MainnetInfo.SporeTypeScript : TestnetInfo.SporeTypeScript)
export const getSporeDep = (isMainnet = false) => (isMainnet ? MainnetInfo.SporeTypeDep : TestnetInfo.SporeTypeDep)
