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
      txHash: '0x9305b2af4567255bfa7df7c9e9ebb531b26ce8b6779ffe01d51416d8bc620613',
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
}

export const getJoyIDLockScript = (isMainnet = false) => (isMainnet ? MainnetInfo.JoyIDLockScript : TestnetInfo.JoyIDLockScript)
export const getJoyIDCellDep = (isMainnet = false) => (isMainnet ? MainnetInfo.JoyIDLockDep : TestnetInfo.JoyIDLockDep)

export const getCotaTypeScript = (isMainnet = false) => (isMainnet ? MainnetInfo.CotaTypeScript : TestnetInfo.CotaTypeScript)
export const getCotaCellDep = (isMainnet = false) => (isMainnet ? MainnetInfo.CotaTypeDep : TestnetInfo.CotaTypeDep)

export const getDexLockScript = (isMainnet = false) => (isMainnet ? MainnetInfo.DexLockScript : TestnetInfo.DexLockScript)
export const getDexCellDep = (isMainnet = false) => (isMainnet ? MainnetInfo.DexLockDep : TestnetInfo.DexLockDep)

export const getXudtTypeScript = (isMainnet = false) => (isMainnet ? MainnetInfo.XUDTTypeScript : TestnetInfo.XUDTTypeScript)
export const getXudtDep = (isMainnet = false) => (isMainnet ? MainnetInfo.XUDTTypeDep : TestnetInfo.XUDTTypeDep)
