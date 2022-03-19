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

const mainnet = {
    rpc: {
        L1: {
            name: "mainnet",
            id: "002b45ebf4f94bb0b7ec6107671af2d6",
            key: "c8e3cd891d324ae4ad19160761a9e4da",
            rpc: "https://mainnet.infura.io/v3/002b45ebf4f94bb0b7ec6107671af2d6"
        },
        L2: "https://andromeda.metis.io/?owner=1088"
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
configENV["mainnet"] = mainnet;


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

async function getContract(contract, contractAddress, wallet){
     return contract.connect(wallet).attach(contractAddress)
}


let contracts = {
    L1 : {
        bridge: "0x5EA23Cb3D609F4522a21ADcC9Ca366e76C23c40f",
        deposit: "0xB64585Bd0d686EaeD47eE986190eA8abE610ae33",
        factory: "0xc6c9efe77E8De46452DDfFcE8718a8186c661380",
    },
    L2 : {
        bridge: "0xea5eFa4f721DEB7cA4E4ed990F12A97577d8a287",
        deposit: "0xe4D4719a18607EFea2c1D99352383bd92f18D83c",
        factory: "0xDb3439640a0C8273E9c81bB2D9D4fa34fa180e17",
    }
}

async function verfiy(){
    
    let env = "mainnet"; //dev
    let config = configENV[env];

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

    console.log("contracts:", contracts);
    // ------------------------------------------------------------------------------------
    L1Bridge = await getContract(L1NFTBridge, contracts.L1.bridge, wallets.L1.owner);
    L1Deposit = await getContract(NFTDeposit, contracts.L1.deposit, wallets.L1.owner);
    L1Factory = await getContract(factory, contracts.L1.factory, wallets.L1.owner);

    destNFTBridgeL1 = await L1Bridge.destNFTBridge();
    localNFTDepositL1 = await L1Bridge.localNFTDeposit();
    DEST_CHAINIDL1 = await L1Bridge.DEST_CHAINID();
    DEST_CHAINIDL1String = DEST_CHAINIDL1.toString();

    WITHDRAW_ROLEL1 = await L1Deposit.WITHDRAW_ROLE();
    L1BridgeHasRoleDeposit = await L1Deposit.hasRole(WITHDRAW_ROLEL1, contracts.L1.bridge);

    L1FactoryBridge = await L1Factory.bridge();
    

    console.log("L1", {
        "L1-bridge":{
            destNFTBridgeL1,
            localNFTDepositL1,
            DEST_CHAINIDL1String
        },
        "L1-deposit": {
            WITHDRAW_ROLEL1,
            L1BridgeHasRoleDeposit
        },
        "L1-factory": {
            L1FactoryBridge
        }
    });

    // ------------------------------------------------------------------------------------
    L2Bridge = await getContract(L2NFTBridge, contracts.L2.bridge, wallets.L2.owner);
    L2Deposit = await getContract(NFTDeposit, contracts.L2.deposit, wallets.L2.owner);
    L2Factory = await getContract(factory, contracts.L2.factory, wallets.L2.owner);

    destNFTBridgeL2 = await L2Bridge.destNFTBridge();
    localNFTDepositL2 = await L2Bridge.localNFTDeposit();
    

    WITHDRAW_ROLEL2 = await L2Deposit.WITHDRAW_ROLE();
    L2BridgeHasRoleDeposit = await L2Deposit.hasRole(WITHDRAW_ROLEL2, contracts.L2.bridge);


    L2FactoryBridge = await L2Factory.bridge();

    console.log("L2", {
        "L2-bridge":{
            destNFTBridgeL2,
            localNFTDepositL2
        },
        "L1-deposit": {
            WITHDRAW_ROLEL2,
            L2BridgeHasRoleDeposit
        },
        "L2-factory": {
            L2FactoryBridge
        }
    });
}

async function main() {
    try{
        await verfiy();
    }catch(e){
        console.error("dev-debug:", e, "run error!");
    }
}

main();
