# 部署说明

TIP: 合约License默认 // SPDX-License-Identifier: MIT 

├── BridgeFactory.sol
├── CommonEvent.sol
├── ICrollDomain.sol
├── ICrollDomainConfig.sol
├── INFTDeposit.sol
├── IStandarERC1155.sol
├── IStandarERC721.sol
├── L1
│   └── L1NFTBridge.sol
├── L2
│   └── L2NFTBridge.sol
├── NFTDeposit.sol
├── gateway
│   ├── CrossDomainEnabled.sol
│   ├── ICrossDomainMessenger.sol
│   ├── Lib_PredeployAddresses.sol
│   ├── iLib_AddressManager.sol
│   ├── iMVM_DiscountOracle.sol
│   └── iOVM_GasPriceOracle.sol
├── mock
│   ├── ERC1155Mock.sol
│   └── ERC721Mock.sol
└── wrap
    ├── ERC1155Mock.sol
    └── ERC721Mock.sol


##  L1 部署合约

L1/L1NFTBridge.sol
NFTDeposit.sol
BridgeFactory.sol

```
# 部署参数说明伪代码

// L1 factory (部署用户为合约owner)
await factory.connect(L1BridgeOwner).deploy();


// L1 bridge
await L1NFTBridge.connect(L1BridgeOwner).deploy(
    L1BridgeOwner.address, // owner role
    L1Factory.address,     // factory contract address （工厂合约地址）
    L1BridgeOwner.address, // rollback role 
    L1LibAddressManager, 
    L1MessengerAddress
)

// L1 deposit
await NFTDeposit.connect(L1BridgeOwner).deploy(
    L1BridgeOwner.address, // owner role
    L1Bridge.address // L1Bridge contract address(上面部署的L1桥合约地址)
)

# L1 bridge 配置参数说明伪代码
await L1Bridge.set(
    L1Deposit.address, // 上面部署的 L1 deposit合约地址
    L2Bridge.address  //  部署在 L2 上的合约地址
)

# L1 factory 配置参数说明伪代码
await bridgeFactoryL1.setbridge(
    bridgeL1.address // L1Bridge contract address(上面部署的L1桥合约地址)
)

```

##  L2 部署合约

L2/L2NFTBridge.sol
NFTDeposit.sol
BridgeFactory.sol
```
# 部署参数说明伪代码

// L2 factory (部署用户为合约owner)
await factory.connect(L2BridgeOwner).deploy();

// L2 bridge
await L2NFTBridge.connect(L2BridgeOwner).deploy(
    L2BridgeOwner.address, // owner role
    L2BridgeOwner.address, // rollback role
    L2MessengerAddress
)

// L2 deposit
await NFTDeposit.connect(L2BridgeOwner).deploy(
    L2BridgeOwner.address, // owner role
    L2Bridge.address // L2Bridge contract address(上面部署的L2桥合约地址) 
) 
# L2 bridge 配置参数说明伪代码
await L2Bridge.set(
    L2Deposit.address, // 上面部署的 L2 deposit合约地址
    L1Bridge.address //  部署在 L1 上的合约地址
);

# L2 factory 配置参数说明伪代码
await bridgeFactoryL2.setbridge(
    bridgeL2.address // L2Bridge contract address(上面部署的L2桥合约地址)
)
```