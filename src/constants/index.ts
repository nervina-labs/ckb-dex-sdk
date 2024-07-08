export const CKB_UNIT = BigInt(10000_0000)
export const MAX_FEE = BigInt(2000_0000)
export const MIN_CAPACITY = BigInt(63) * BigInt(10000_0000)
export const WITNESS_NATIVE_MODE = '01'
export const WITNESS_SUBKEY_MODE = '02'
export const SECP256R1_PUBKEY_SIG_LEN = (1 + 64 + 64) * 2
export const JOYID_ESTIMATED_WITNESS_SIZE = 129 + 1000
export const DEFAULT_ESTIMATED_WITNESS_SIZE = 129

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
      txHash: '0xc17040a3723df8f27c344d5e86e254f1d27e1181a5484cb3722416ef09d246ec',
      index: '0x0',
    },
    depType: 'code',
  } as CKBComponents.CellDep,

  XUDTTypeDep: {
    outPoint: {
      txHash: '0xbf6fb538763efec2a70a6a3dcb7242787087e1030c4e7d86585bc63a9d337f5f',
      index: '0x0',
    },
    depType: 'code',
  } as CKBComponents.CellDep,

  SUDTTypeDep: {
    outPoint: {
      txHash: '0xe12877ebd2c3c364dc46c5c992bcfaf4fee33fa13eebdf82c591fc9825aab769',
      index: '0x0',
    },
    depType: 'code',
  } as CKBComponents.CellDep,

  SporeTypeDep: {
    outPoint: {
      txHash: '0x5e8d2a517d50fd4bb4d01737a7952a1f1d35c8afc77240695bb569cd7d9d5a1f',
      index: '0x0',
    },
    depType: 'code',
  } as CKBComponents.CellDep,

  MNftTypeDep: {
    outPoint: {
      txHash: '0xf11ccb6079c1a4b3d86abe2c574c5db8d2fd3505fdc1d5970b69b31864a4bd1c',
      index: '0x2',
    },
    depType: 'code',
  } as CKBComponents.CellDep,

  CCBTCTypeDep: {
    outPoint: {
      txHash: '0x877c4c3c6f7159f29ea711f0cd21a54f93dcf950642c6a3a5abc9c070051372e',
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
    codeHash: '0xab0ede4350a201bd615892044ea9edf12180189572e49a7ff3f78cce179ae09f',
    hashType: 'type',
    args: '',
  } as CKBComponents.Script,

  DexLockDep: {
    outPoint: {
      txHash: '0xaab4fef7338c7108d4d2507c29122768126f9303f173db9f6ef59b9af84186b7',
      index: '0x0',
    },
    depType: 'code',
  } as CKBComponents.CellDep,

  XUDTTypeDep: {
    outPoint: {
      txHash: '0xc07844ce21b38e4b071dd0e1ee3b0e27afd8d7532491327f39b786343f558ab7',
      index: '0x0',
    },
    depType: 'code',
  } as CKBComponents.CellDep,

  SUDTTypeDep: {
    outPoint: {
      txHash: '0xc7813f6a415144643970c2e88e0bb6ca6a8edc5dd7c1022746f628284a9936d5',
      index: '0x0',
    },
    depType: 'code',
  } as CKBComponents.CellDep,

  SporeTypeDep: {
    outPoint: {
      txHash: '0x96b198fb5ddbd1eed57ed667068f1f1e55d07907b4c0dbd38675a69ea1b69824',
      index: '0x0',
    },
    depType: 'code',
  } as CKBComponents.CellDep,

  MNftTypeDep: {
    outPoint: {
      txHash: '0x5dce8acab1750d4790059f22284870216db086cb32ba118ee5e08b97dc21d471',
      index: '0x2',
    },
    depType: 'code',
  } as CKBComponents.CellDep,

  CCBTCTypeDep: {
    outPoint: {
      txHash: '0x3ceb520f240b168e0bddf0d89b4bcabbe7d4fa69751057cbe8e4f27239fad0e9',
      index: '0x0',
    },
    depType: 'code',
  } as CKBComponents.CellDep,
}

export const getJoyIDLockScript = (isMainnet: boolean) => (isMainnet ? MainnetInfo.JoyIDLockScript : TestnetInfo.JoyIDLockScript)
export const getJoyIDCellDep = (isMainnet: boolean) => (isMainnet ? MainnetInfo.JoyIDLockDep : TestnetInfo.JoyIDLockDep)

export const getCotaTypeScript = (isMainnet: boolean) => (isMainnet ? MainnetInfo.CotaTypeScript : TestnetInfo.CotaTypeScript)
export const getCotaCellDep = (isMainnet: boolean) => (isMainnet ? MainnetInfo.CotaTypeDep : TestnetInfo.CotaTypeDep)

export const getDexLockScript = (isMainnet: boolean) => (isMainnet ? MainnetInfo.DexLockScript : TestnetInfo.DexLockScript)
export const getDexCellDep = (isMainnet: boolean) => (isMainnet ? MainnetInfo.DexLockDep : TestnetInfo.DexLockDep)

export const getXudtDep = (isMainnet: boolean) => (isMainnet ? MainnetInfo.XUDTTypeDep : TestnetInfo.XUDTTypeDep)

export const getSudtDep = (isMainnet: boolean) => (isMainnet ? MainnetInfo.SUDTTypeDep : TestnetInfo.SUDTTypeDep)

export const getSporeDep = (isMainnet: boolean) => (isMainnet ? MainnetInfo.SporeTypeDep : TestnetInfo.SporeTypeDep)

export const getMNftDep = (isMainnet: boolean) => (isMainnet ? MainnetInfo.MNftTypeDep : TestnetInfo.MNftTypeDep)

export const getCCBTCDep = (isMainnet: boolean) => (isMainnet ? MainnetInfo.CCBTCTypeDep : TestnetInfo.CCBTCTypeDep)
