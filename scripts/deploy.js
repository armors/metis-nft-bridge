const ethers = require('ethers')

const { predeploys, getContractInterface } = require('@metis.io/contracts')

const demo721Artifact = require(`../artifacts/contracts/mock/ERC721Mock.sol/ERC721Mock.json`)
const demo721 = new ethers.ContractFactory(demo721Artifact.abi, demo721Artifact.bytecode)

const demo1155Artifact = require(`../artifacts/contracts/mock/ERC1155Mock.sol/ERC1155Mock.json`)
const demo1155 = new ethers.ContractFactory(demo1155Artifact.abi, demo1155Artifact.bytecode)

const l1NFTBridgeArtifact = require(`../artifacts/contracts/L1/L1NFTBridge.sol/L1NFTBridge.json`)
const L1NFTBridge = new ethers.ContractFactory(l1NFTBridgeArtifact.abi, l1NFTBridgeArtifact.bytecode)

const l2NFTBridgeArtifact = require(`../artifacts/contracts/L2/L2NFTBridge.sol/L2NFTBridge.json`)
const L2NFTBridge = new ethers.ContractFactory(l2NFTBridgeArtifact.abi, l2NFTBridgeArtifact.bytecode)

const l1MVM_DiscountOracleArtifact = require(`../node_modules/@metis.io/contracts/artifacts/contracts/MVM/MVM_DiscountOracle.sol/MVM_DiscountOracle.json`)
const l1MVM_DiscountOracle = new ethers.ContractFactory(l1MVM_DiscountOracleArtifact.abi, l1MVM_DiscountOracleArtifact.bytecode)

const l1Lib_AddressManagerArtifact = require(`../node_modules/@metis.io/contracts/artifacts/contracts/libraries/resolver/Lib_AddressManager.sol/Lib_AddressManager.json`)
const l1Lib_AddressManager = new ethers.ContractFactory(l1Lib_AddressManagerArtifact.abi, l1Lib_AddressManagerArtifact.bytecode)

const NFTDepositArtifact = require(`../artifacts/contracts/NFTDeposit.sol/NFTDeposit.json`)
const NFTDeposit = new ethers.ContractFactory(NFTDepositArtifact.abi, NFTDepositArtifact.bytecode)

const factoryArtifact = require(`../artifacts/contracts/BridgeFactory.sol/BridgeFactory.json`)
const factory = new ethers.ContractFactory(factoryArtifact.abi, factoryArtifact.bytecode)

const rinkey = {
    rpc: {
        L1: {
            name: "rinkeby",
            id: "002b45ebf4f94bb0b7ec6107671af2d6",
            key: "c8e3cd891d324ae4ad19160761a9e4da",
            rpc: "https://rinkeby.infura.io/v3/002b45ebf4f94bb0b7ec6107671af2d6"
        },
        L2: "https://stardust.metis.io/?owner=588"
    },
    own: '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80',

    gasLimit: {
        L1: 30000000,
        L2: 30000000
    },
    gas:{
        L1: 3_200_000,
        L2: 3_200_000,
    },
    wait:{
        v1: 3000,
        v2: 15000,
    },
    nftStandard: {
        ERC721: 0,
        ERC1155: 1,
    }
}

const dev = {
    rpc: {
        L1: "http://localhost:9545",
        L2: "http://localhost:8545"
    },
    own: '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80', // 10k ETH

    gasLimit: {
        L1: 30000000,
        L2: 30000000
    },
    gas:{
        L1: 3_200_000,
        L2: 3_200_000,
    },
    wait:{
        v1: 3000,
        v2: 20000,
    },
    nftStandard: {
        ERC721: 0,
        ERC1155: 1,
    }
}

let accounts = [];

let configENV = [];
configENV["dev"] = dev;
configENV["rinkey"] = rinkey;


async function initWallet(config, l1RpcProvider, l2RpcProvider) {
   
    const L1_wallet_own = new ethers.Wallet(config.own, l1RpcProvider)
    const L2_wallet_own = new ethers.Wallet(config.own, l2RpcProvider)

    let L1_wallet_balance = await L1_wallet_own.getBalance();
    let L2_wallet_balance = await L2_wallet_own.getBalance();

    console.log(
        "owner", L1_wallet_own.address,
        "initWallet:",
        "\n L1 balances: ",
        L1_wallet_balance.toString(), 
        "\n L2 balances: ",
        L2_wallet_balance.toString(),
        "\n"
    );

    return {
        L1: {
            owner : L1_wallet_own,
        },
        L2: {
            owner : L2_wallet_own,
        }
    };
}

async function getChainID(l1RpcProvider, l2RpcProvider) {
    let l1_net = await l1RpcProvider.getNetwork();
    let l2_net = await l2RpcProvider.getNetwork();

    let chainIDs = {
        L1 : l1_net.chainId,
        L2 : l2_net.chainId,
    }

    console.log(
        "getChainID:",
        "\n chainIDs: ",
        chainIDs, 
        "\n"
    );
    return chainIDs;
    
}

async function getGas(l1RpcProvider, l2RpcProvider) {
    const l1GasPrice = await l1RpcProvider.getGasPrice()
    const l2GasPrice = await l2RpcProvider.getGasPrice()

    let gas = {
        L1: {
            GasPrice: l1GasPrice.toString(),
        },
        L2: {
            GasPrice: l2GasPrice.toString(),
        }
    }

    console.log(
        "getGas:",
        "\n gas: ",
        gas, 
        "\n"
    );
    return gas;
}

async function getMessenger(l1RpcProvider, l2RpcProvider) {
    const L2Messenger = new ethers.Contract(
        predeploys.L2CrossDomainMessenger,
        getContractInterface('L2CrossDomainMessenger'),
        l2RpcProvider
    )

    const L1Messenger = new ethers.Contract(
        await L2Messenger.l1CrossDomainMessenger(),
        getContractInterface('L1CrossDomainMessenger'),
        l1RpcProvider
    )

    let messengerLog = {
        L1 : L1Messenger.address,
        L2 : L2Messenger.address
    }
    let messenger = {
        L1 : L1Messenger,
        L2 : L2Messenger
    }

    console.log(
        "getMessenger:",
        "\n messenger: ",
        messengerLog, 
        "\n"
    );

    return messenger;
}

async function setCrossDomain(L1Messenger, L1Owner, env) {
    let L1LibAddressManager = await L1Messenger.libAddressManager();
    if(env == "dev"){
        const L1LibAddressManagerObj = l1Lib_AddressManager.connect(L1Owner).attach(L1LibAddressManager)
        let METIS_MANAGER = await L1LibAddressManagerObj.getAddress("METIS_MANAGER");
    
        console.log("\n  METIS_MANAGER role: ", METIS_MANAGER);
    
        let MVM_DiscountOracle = await L1LibAddressManagerObj.getAddress("MVM_DiscountOracle");
        const MVM_DiscountOracleObj = l1MVM_DiscountOracle.connect(L1Owner).attach(MVM_DiscountOracle)
        L1_init = await MVM_DiscountOracleObj.setAllowAllXDomainSenders(true);
        L1_init.wait();
        console.log("\n  L1 METIS_MANAGER role set white list done.")
    }
    let crossDomain = {
        L1LibAddressManager: L1LibAddressManager
    }
    return crossDomain;
}

async function deployBridge(L1BridgeOwner, L2BridgeOwner, L1Factory, L1LibAddressManager, L1MessengerAddress, L2MessengerAddress) {
    // L1 bridge
    const L1Bridge = await L1NFTBridge.connect(L1BridgeOwner).deploy(
        L1BridgeOwner.address, // owner
        L1Factory.address,     // factory
        L1BridgeOwner.address, //rollback
        L1LibAddressManager,
        L1MessengerAddress
    )
    await L1Bridge.deployTransaction.wait();
    console.log(`\n  bridge deployed on L1 @ ${L1Bridge.address}`)

    // L1 deposit
    const L1Deposit = await NFTDeposit.connect(L1BridgeOwner).deploy(
        L1BridgeOwner.address, // owner
        L1Bridge.address // withdraw
    )
    await L1Deposit.deployTransaction.wait();
    console.log(`\n  bridge deposit deployed on L1 @ ${L1Deposit.address}`)


    // L2 bridge
    const L2Bridge = await L2NFTBridge.connect(L2BridgeOwner).deploy(
        L2BridgeOwner.address, // owner
        L2BridgeOwner.address, //rollback
        L2MessengerAddress
    )
    await L2Bridge.deployTransaction.wait();
    console.log(`\n  bridge deployed on L2 @ ${L2Bridge.address}`)

    // L2 deposit
    const L2Deposit = await NFTDeposit.connect(L2BridgeOwner).deploy(
        L2BridgeOwner.address, // owner
        L2Bridge.address // withdraw
    ) 
    await L2Deposit.deployTransaction.wait();
    console.log(`\n  bridge deposit deployed on L2 @ ${L2Deposit.address}`)
    
    // return 
    accounts[L1Bridge.address] = "L1 bridge contract";
    accounts[L1Deposit.address] = "L1 deposit contract";
    accounts[L2Bridge.address] = "L2 bridge contract";
    accounts[L2Deposit.address] = "L2 deposit contract";

    return {
        L1: {
            bridge : L1Bridge,
            deposit: L1Deposit
        },
        L2 : {
            bridge : L2Bridge,
            deposit: L2Deposit
        }
    }
}

async function mockDeployERC721(originWallet, destWallet, presetTokenIds, destBridge){
    // L1
    const L1Mock = await demo721.connect(originWallet).deploy("L1 name", "L1 symbol", "ipfs://erc721.io/L1/");
    await L1Mock.deployTransaction.wait();
    console.log(`\n  mockERC721 deployed on L1 @ ${L1Mock.address}`)
    
    // L2
    const L2Mock = await demo721.connect(destWallet).deploy("L1 name to L2", "L1 symbol to L2", "ipfs://erc721.io/L1/to/L2/");
    await L2Mock.deployTransaction.wait();
    console.log(`\n  mockERC721 deployed on L2 @ ${L2Mock.address}`)

    // grant role
    let mintRole = await L2Mock.MINTER_ROLE();
    L2MockGrant = await L2Mock.grantRole(mintRole, destBridge.address);
    await L2MockGrant.wait()
    console.log('\n  Grant [mint role] to bridge on L2 done.')
    
    // L1 mint token
    for(let index = 0; index < presetTokenIds.length; index++) {
        await L1Mock.mint(originWallet.address, presetTokenIds[index]);
    }

    console.log(`\n  mockERC721 mint tokens{ ${presetTokenIds} } on L1`)

    // return 
    accounts[L1Mock.address] = "L1 ERC721 Contract";
    accounts[L2Mock.address] = "L2 ERC721 Contract";

    return {
        L1: L1Mock,
        L2: L2Mock
    }
}

async function bridgeSet(L1Bridge, L2Bridge, L1Deposit, L2Deposit){
    console.log(`\n  call set on L1 and L2`)
    L1_TX1 = await L1Bridge.set(L1Deposit.address,L2Bridge.address);
    await L1_TX1.wait()
    L1_TX2 = await L1Bridge.setL2ChainID(588);
    await L1_TX2.wait()
    L2_TX1 = await L2Bridge.set(L2Deposit.address, L1Bridge.address);
    await L2_TX1.wait()
    console.log(`\n  set done.`) 
  
}

async function NFTConfig(L1Bridge, L2Bridge, L1Mock, L2Mock, L1ChainId, L2Gas, wait, L1Factory){
    console.log(`\n  project config clone nft.`)
    // {gasLimit: 3200000000000000}
    L1_TX2 = await L1Bridge.connect(L1Factory).configNFT(L1Mock.address, L2Mock.address, L1ChainId, L2Gas);
    await L1_TX2.wait()
    console.log('\n  waiting peer L1 => L2 configNFT ')
    await new Promise((resolve) => setTimeout(resolve, wait));

    let log = {
        L1: [
            accounts[await L1Bridge.clone(L1Mock.address)],
            await L1Bridge.isOrigin(L1Mock.address),
        ],
        L2: [
            accounts[await L2Bridge.clone(L2Mock.address)],
            await L2Bridge.isOrigin(L2Mock.address),
        ]
    }

    console.log("\n  clone and origin:", log);
}

async function factoryDeploy(L1BridgeOwner, L2BridgeOwner, bridgeL1, bridgeL2) {
    const bridgeFactoryL1 = await factory.connect(L1BridgeOwner).deploy();
    await bridgeFactoryL1.deployTransaction.wait();
    console.log(`\n  bridgeFactoryL1 deployed on L1 @ ${bridgeFactoryL1.address}`)

    const bridgeFactoryL2 = await factory.connect(L2BridgeOwner).deploy();
    await bridgeFactoryL2.deployTransaction.wait();
    console.log(`\n  bridgeFactoryL2 deployed on L2 @ ${bridgeFactoryL2.address}`)

    console.log("\n  set bridget")
    await bridgeFactoryL1.setbridge(bridgeL1.address)
    await bridgeFactoryL2.setbridge(bridgeL2.address)
    console.log("\n  set bridget done")


    return {
        L1: {
            factory : bridgeFactoryL1
        },
        L2 : {
            factory : bridgeFactoryL2
        }
    }
}

async function init(config, env) {

    // Set up our RPC provider connections.
    let l1RpcProvider;
    if(env == 'dev'){
        l1RpcProvider = new ethers.providers.JsonRpcProvider(config.rpc.L1)
    }else{
        l1RpcProvider = new ethers.providers.InfuraProvider(config.rpc.L1.name, {
            projectId: config.rpc.L1.id,
            projectSecret: config.rpc.L1.key
        })
    }
    const l2RpcProvider = new ethers.providers.JsonRpcProvider(config.rpc.L2)
    
    // call
    let wallets = await initWallet(config, l1RpcProvider, l2RpcProvider);

    let ChainIDs = await getChainID(l1RpcProvider, l2RpcProvider);
  
    let messengers = await getMessenger(l1RpcProvider, l2RpcProvider);
    
    let crossDomain = await setCrossDomain(messengers.L1, wallets.L1.owner, env);

    let bridges = await deployBridge(wallets.L1.owner, wallets.L2.owner, wallets.L1.owner, crossDomain.L1LibAddressManager, messengers.L1.address, messengers.L2.address);

    await bridgeSet(bridges.L1.bridge, bridges.L2.bridge, bridges.L1.deposit, bridges.L2.deposit);
    
    let factoryOBJ = await factoryDeploy(wallets.L1.owner, wallets.L2.owner, bridges.L1.bridge, bridges.L2.bridge);

    let NFT_FACTORY_ROLE = await bridges.L1.bridge.NFT_FACTORY_ROLE();

    await bridges.L1.bridge.grantRole(NFT_FACTORY_ROLE, factoryOBJ.L1.factory.address);

    let isHasRole = await bridges.L1.bridge.hasRole(NFT_FACTORY_ROLE, factoryOBJ.L1.factory.address);

    console.log("\n  NFT_FACTORY_ROLE - isHasRole", NFT_FACTORY_ROLE, isHasRole, factoryOBJ.L1.factory.address);

}

async function getContract(contract, contractAddress, wallet){
     return contract.connect(wallet).attach(contractAddress)
}

async function checks(){
    let env = "rinkey";
    // let env = "dev";
    let config = configENV[env];

    // Set up our RPC provider connections.
    let l1RpcProvider;
    if(env == 'dev'){
        l1RpcProvider = new ethers.providers.JsonRpcProvider(config.rpc.L1)
    }else{
        l1RpcProvider = new ethers.providers.InfuraProvider(config.rpc.L1.name, {
            projectId: config.rpc.L1.id,
            projectSecret: config.rpc.L1.key
        })
    }
    const l2RpcProvider = new ethers.providers.JsonRpcProvider(config.rpc.L2)
    
    let wallets = await initWallet(config, l1RpcProvider, l2RpcProvider);

    L1Bridge = await getContract(L1NFTBridge, "0x5126F650ca04bc6cB0C47ea2654e997ae5670120", wallets.L1.owner);

    let NFT_FACTORY_ROLE = await L1Bridge.NFT_FACTORY_ROLE();
    
    let isHasRole = await L1Bridge.hasRole(NFT_FACTORY_ROLE, "0x4076654b188345A61Ad93143F7E64c4427B4531f");

    console.log("\n  NFT_FACTORY_ROLE - isHasRole", NFT_FACTORY_ROLE, isHasRole, "0x4076654b188345A61Ad93143F7E64c4427B4531f");
}

async function main() {
    try{
        let env = "rinkey";
        // let env = "dev";
        let config = configENV[env];
        await init(config, env);
    }catch(e){
        console.error("dev-debug:", e, "run error!");
    }
}

// main();
checks();

// -> % node scripts/deploy.js
// owner 0xB3b765AC9DD4A9Bde5B157fDDc492b1F5BB8547f initWallet:
//  L1 balances:  9620888810549196250
//  L2 balances:  9687218949000000000

// getChainID:
//  chainIDs:  { L1: 4, L2: 588 }

// getMessenger:
//  messenger:  {
//   L1: '0xfD1b91066D27345023eBE2FE0D4C59d78c46129f',
//   L2: '0x4200000000000000000000000000000000000007'
// }


//   bridge deployed on L1 @ 0x5126F650ca04bc6cB0C47ea2654e997ae5670120

//   bridge deposit deployed on L1 @ 0x77b92F4545DcC9394c68bC33907F6a3f202402C2

//   bridge deployed on L2 @ 0x831844F04c26241a62eCb074Cc27075bA1686DE9

//   bridge deposit deployed on L2 @ 0xe14651CFaad9d1C58be3b12b22031Ed933bdBcF3

//   call set on L1 and L2

//   set done.

//   bridgeFactoryL1 deployed on L1 @ 0x4076654b188345A61Ad93143F7E64c4427B4531f

//   bridgeFactoryL2 deployed on L2 @ 0x631c6A5f50666f68F4C1A1E8e4c868b04935dD87

//   set bridget

//   set bridget done

//   NFT_FACTORY_ROLE - isHasRole 0x1b7da5516641e905bc4dbd58b8ca9c7bcb4ffdf55f79c2b6444df9ca56d37be2 false 0x4076654b188345A61Ad93143F7E64c4427B4531f