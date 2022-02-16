const ethers = require('ethers')

const { predeploys, getContractInterface } = require('@metis.io/contracts')

const demo721Artifact = require(`../artifacts/contracts/mock/ERC721Mock.sol/ERC721Mock.json`)
const demo721 = new ethers.ContractFactory(demo721Artifact.abi, demo721Artifact.bytecode)

const factoryArtifact = require(`../artifacts/contracts/BridgeFactory.sol/BridgeFactory.json`)
const factory = new ethers.ContractFactory(factoryArtifact.abi,factoryArtifact.bytecode)

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


const config = {
    rpc: {
        L1: "http://localhost:9545",
        L2: "http://localhost:8545"
    },
    own: '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80', // 10k ETH
    accounts: {
        ali: '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff81', // 张东飞
        bob: "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff82", // 鲍勃
        jno: "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff83", // 约翰
        fac: "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff84"  // factory
    },
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

let accounts = [];


const receiptTX = async(provider, txHash) => {
    const receipt = await provider.getTransactionReceipt(txHash)
    if (!receipt) {
      return []
    }
    console.debug("hosea-debug tx receipt: ", receipt);

    const msgHashes = []
    const sentMessageEventId = ethers.utils.id(
      'SentMessage(address,address,bytes,uint256,uint256,uint256)'
    )

    console.debug("hosea-debug: sendMessage Event ", sentMessageEventId);

    const l2CrossDomainMessengerRelayAbi = [
      'function relayMessage(address _target,address _sender,bytes memory _message,uint256 _messageNonce)',
    ]
    const l2CrossDomainMessengerRelayinterface = new ethers.utils.Interface(
      l2CrossDomainMessengerRelayAbi
    )

    for (const log of receipt.logs) {
        console.debug("hosea-debug: log.topics ", log.topics);
        // call l1 Messenger and send cross domain msg
      if (log.address === L1MessengerAddress && log.topics[0] === sentMessageEventId) {
          const [sender, message, messageNonce] = ethers.utils.defaultAbiCoder.decode(
            ['address', 'bytes', 'uint256'],
            log.data
          )
  
          const [target] = ethers.utils.defaultAbiCoder.decode(
            ['address'],
            log.topics[1]
          )

          console.debug("hosea-debug: dest target ", target);

          const encodedMessage = l2CrossDomainMessengerRelayinterface.encodeFunctionData(
            'relayMessage',
            [target, sender, message, messageNonce]
          )
          console.debug("hosea-debug: relayMessage ", [target, sender, message, messageNonce]);
  
          msgHashes.push(
            ethers.utils.solidityKeccak256(['bytes'], [encodedMessage])
          )
        }
      }
      return msgHashes
}

const receiptMSGTX = async(provider, msgHash, pollForPending, blocksToFetch) => {

    const RELAYED_MESSAGE = ethers.utils.id(`RelayedMessage(bytes32)`)
    const FAILED_RELAYED_MESSAGE = ethers.utils.id(`FailedRelayedMessage(bytes32)`)

    let matches = []
    
    while (matches.length === 0) {
      const blockNumber = await provider.getBlockNumber()
      const startingBlock = Math.max(blockNumber - blocksToFetch, 0)
      const successFilter = {
        address: provider.messengerAddress,
        topics: [RELAYED_MESSAGE],
        fromBlock: startingBlock,
      }
      const failureFilter = {
        address: provider.messengerAddress,
        topics: [FAILED_RELAYED_MESSAGE],
        fromBlock: startingBlock,
      }
      const successLogs = await provider.getLogs(successFilter)
      const failureLogs = await provider.getLogs(failureFilter)
      const logs = successLogs.concat(failureLogs)
      matches = logs.filter(
        log => log.topics[1] === msgHash
      )

      // exit loop after first iteration if not polling
      if (!pollForPending) {
        break
      }

      // pause awhile before trying again
      await new Promise((r) => setTimeout(r, (blocksToFetch+150)))
    }

    console.debug("hosea-debug: msg matches", matches);

    // Message was relayed in the past
    if (matches.length > 0) {
      if (matches.length > 1) {
        throw Error(
          'Found multiple transactions relaying the same message hash.'
        )
      }
      return provider.getTransactionReceipt(matches[0].transactionHash)
    } else {
      return Promise.resolve(undefined)
    }
}

async function sendETH(owner, _wallet, _gasLimit, _value){
    let balance = await _wallet.getBalance();
    if(balance < _gasLimit){
        await owner.sendTransaction({to: _wallet.address, value: _value});
    }
}

async function getBalances(wallet1, wallet2, wallet3, wallet4){
    let balance1 = await wallet1.getBalance();
    let balance2 = await wallet2.getBalance();
    let balance3 = await wallet3.getBalance();
    let balance4 = await wallet4.getBalance();
    
    //ethers.utils.formatUnits
    
    let balances = [];

    balances[accounts[wallet1.address]] = ethers.utils.formatEther(balance1) + " ETH";
    balances[accounts[wallet2.address]] = ethers.utils.formatEther(balance2) + " ETH";
    balances[accounts[wallet3.address]] = ethers.utils.formatEther(balance3) + " ETH";
    balances[accounts[wallet4.address]] = ethers.utils.formatEther(balance4) + " ETH";

    return balances;
    
}

async function initWallet(config, l1RpcProvider, l2RpcProvider, stepValue) {
   
    const L1_wallet_own = new ethers.Wallet(config.own, l1RpcProvider)
    const L1_wallet_ali = new ethers.Wallet(config.accounts.ali, l1RpcProvider)
    const L1_wallet_bob = new ethers.Wallet(config.accounts.bob, l1RpcProvider)
    const L1_wallet_jno = new ethers.Wallet(config.accounts.jno, l1RpcProvider)
    const L1_wallet_fac = new ethers.Wallet(config.accounts.fac, l1RpcProvider)

    const L2_wallet_own = new ethers.Wallet(config.own, l2RpcProvider)
    const L2_wallet_ali = new ethers.Wallet(config.accounts.ali, l2RpcProvider)
    const L2_wallet_bob = new ethers.Wallet(config.accounts.bob, l2RpcProvider)
    const L2_wallet_jno = new ethers.Wallet(config.accounts.jno, l2RpcProvider)

    accounts[L1_wallet_own.address] = "owner"
    
    accounts[L1_wallet_ali.address] = "张东飞"
    accounts[L1_wallet_bob.address] = "鲍勃"
    accounts[L1_wallet_jno.address] = "约翰"

    accounts[L1_wallet_fac.address] = "factory"

    await sendETH(L1_wallet_own, L1_wallet_ali, config.gasLimit.L1, stepValue);
    await sendETH(L1_wallet_own, L1_wallet_bob, config.gasLimit.L1, stepValue);
    await sendETH(L1_wallet_own, L1_wallet_jno, config.gasLimit.L1, stepValue);
    await sendETH(L1_wallet_own, L1_wallet_fac, config.gasLimit.L1, stepValue);

    await sendETH(L2_wallet_own, L2_wallet_ali, config.gasLimit.L2, stepValue);
    await sendETH(L2_wallet_own, L2_wallet_bob, config.gasLimit.L2, stepValue);
    await sendETH(L2_wallet_own, L2_wallet_jno, config.gasLimit.L2, stepValue);

    L1Balances = await getBalances(L1_wallet_fac, L1_wallet_ali, L1_wallet_bob, L1_wallet_jno);
    L2Balances = await getBalances(L2_wallet_own, L2_wallet_ali, L2_wallet_bob, L2_wallet_jno);
    
    console.log(
        "initWallet:",
        "\n L1 balances: ",
        L1Balances, 
        "\n L2 balances: ",
        L2Balances,
        "\n"
    );

    return {
        L1: {
            owner : L1_wallet_own,
            ali: L1_wallet_ali,
            bob: L1_wallet_bob,
            jno: L1_wallet_jno,
            fac: L1_wallet_fac,
        },
        L2: {
            owner : L2_wallet_own,
            ali: L2_wallet_ali,
            bob: L2_wallet_bob,
            jno: L2_wallet_jno,
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

async function setCrossDomain(L1Messenger, L1Owner) {
    let L1LibAddressManager = await L1Messenger.libAddressManager();
    const L1LibAddressManagerObj = l1Lib_AddressManager.connect(L1Owner).attach(L1LibAddressManager)
    let METIS_MANAGER = await L1LibAddressManagerObj.getAddress("METIS_MANAGER");
    console.log("\n  METIS_MANAGER role: ", accounts[METIS_MANAGER]);
    let MVM_DiscountOracle = await L1LibAddressManagerObj.getAddress("MVM_DiscountOracle");
    const MVM_DiscountOracleObj = l1MVM_DiscountOracle.connect(L1Owner).attach(MVM_DiscountOracle)
    L1_init = await MVM_DiscountOracleObj.setAllowAllXDomainSenders(true);
    L1_init.wait();
    console.log("\n  L1 METIS_MANAGER role set white list done.")

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
    const L1Mock = await demo721.connect(originWallet).deploy("L1 721Nft1", "L1 721Nft1", "ipfs://erc721.io/L1/");
    await L1Mock.deployTransaction.wait();
    console.log(`\n  L1 721Nft1 deployed on L1 @ ${L1Mock.address}`)

    const L1Mock1 = await demo721.connect(originWallet).deploy("L1 721Nft2", "L1 721Nft2", "ipfs://erc721.io/L1/");
    await L1Mock1.deployTransaction.wait();
    console.log(`\n  L1 721Nft2 deployed on L1 @ ${L1Mock1.address}`)

    const L1Mock2 = await demo721.connect(originWallet).deploy("L1 721Nft3", "L1 721Nft3", "ipfs://erc721.io/L1/");
    await L1Mock2.deployTransaction.wait();
    console.log(`\n  L1 721Nft3 deployed on L1 @ ${L1Mock2.address}`)


    
    // L2
    const L2Mock = await demo721.connect(destWallet).deploy("L2 721Nft1", "L2 721Nft1", "ipfs://erc721.io/L1/to/L2/");
    await L2Mock.deployTransaction.wait();
    console.log(`\n  L2 721Nft1 deployed on L2 @ ${L2Mock.address}`)

    const L2Mock1 = await demo721.connect(destWallet).deploy("L2 721Nft2", "L2 721Nft2", "ipfs://erc721.io/L1/to/L2/");
    await L2Mock1.deployTransaction.wait();
    console.log(`\n  L2 721Nft2 deployed on L2 @ ${L2Mock1.address}`)

    const L2Mock2 = await demo721.connect(destWallet).deploy("L2 721Nft3", "L2 721Nft3", "ipfs://erc721.io/L1/to/L2/");
    await L2Mock2.deployTransaction.wait();
    console.log(`\n  L2 721Nft3 deployed on L2 @ ${L2Mock2.address}`)
    
    // mint token
    console.log("Mint nft Token")
    for(let index = 0; index < presetTokenIds.length; index++) {
        await L1Mock.mint(originWallet.address, presetTokenIds[index]);
        await L1Mock1.mint(originWallet.address, presetTokenIds[index]);
        await L1Mock2.mint(originWallet.address, presetTokenIds[index]);
        await L2Mock.mint(originWallet.address, presetTokenIds[index]);
        await L2Mock1.mint(originWallet.address, presetTokenIds[index]);
        await L2Mock2.mint(originWallet.address, presetTokenIds[index]);
    }
    let balance = await L1Mock.balanceOf(originWallet.address)
    console.log(`\n  ${L1Mock.address} mint tokens{ ${balance} } to ${originWallet.address}`)
    console.log(`\n  ${L1Mock1.address} mint tokens{ ${balance} } to ${originWallet.address}`)
    console.log(`\n  ${L1Mock2.address} mint tokens{ ${balance} } to ${originWallet.address}`)
    console.log(`\n  ${L2Mock.address} mint tokens{ ${balance} } to ${originWallet.address}`)
    console.log(`\n  ${L2Mock1.address} mint tokens{ ${balance} } to ${originWallet.address}`)
    console.log(`\n  ${L2Mock2.address} mint tokens{ ${balance} } to ${originWallet.address}`)

    // return 
    accounts[L1Mock.address] = "L1 ERC721 Contract";
    accounts[L2Mock.address] = "L2 ERC721 Contract";

    return {
        L1: L1Mock,
        L2: L2Mock
    }
}

async function mockDeployERC1155(originWallet, destWallet, presetTokenIds, destBridge){
    // L1
    const L1Mock = await demo1155.connect(originWallet).deploy("ipfs://erc1155.io/L1/");
    await L1Mock.deployTransaction.wait();
    console.log(`\n  mockERC1155 deployed on L1 @ ${L1Mock.address}`)
    
    // L2
    const L2Mock = await demo1155.connect(destWallet).deploy("ipfs://erc1155.io/L2/");
    await L2Mock.deployTransaction.wait();
    console.log(`\n  mockERC1155 deployed on L2 @ ${L2Mock.address}`)

    
    console.log("Mint 1155nft Token")
    for(let index = 0; index < presetTokenIds.length; index++) {
        await L1Mock.mint(originWallet.address, presetTokenIds[index], 1, [])
        await L2Mock.mint(originWallet.address, presetTokenIds[index], 1, [])
    }

    let balance = await L1Mock.balanceOf(originWallet.address,4)
    console.log(`\n  ${L1Mock.address} mint tokens{ ${balance} } to ${originWallet.address}`)
    console.log(`\n  ${L2Mock.address} mint tokens{ ${balance} } to ${originWallet.address}`)
    // return 
    accounts[L1Mock.address] = "L1 ERC1155 Contract";
    accounts[L2Mock.address] = "L2 ERC1155 Contract";

    return {
        L1: L1Mock,
        L2: L2Mock
    }
}

async function deployBridgeConfig(L1Bridge, L2Bridge, L1Deposit, L2Deposit, L1Mock, L2Mock, L1ChainId, L2Gas, wait, L1Factory){
    console.log(`\n  call set on L1 and L2`)
    L1_TX1 = await L1Bridge.set(L1Deposit.address,L2Bridge.address);
    await L1_TX1.wait()
    L2_TX1 = await L2Bridge.set(L2Deposit.address, L1Bridge.address);
    await L2_TX1.wait()
    console.log(`\n  set done.`) 
  
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

async function check721(L1Mock, L2Mock, tokenID, walletFrom, WalletTo, L1Deposit, L2Deposit){
    let tokenIDOwnerL1 = await L1Mock.ownerOf(tokenID);
    console.log(`\n  tokenID {${tokenID}} owner is {${accounts[tokenIDOwnerL1]}} on L1`);
    
    let tokenIDOwnerL2 = await L2Mock.ownerOf(tokenID);
    console.log(`\n  tokenID {${tokenID}} owner is {${accounts[tokenIDOwnerL2]}} on L2`);
}

async function check1155(L1Mock, L2Mock, tokenID, walletFrom, WalletTo, L1Deposit, L2Deposit){
    let L1WalletFromAmount = await L1Mock.balanceOf(walletFrom.address, tokenID);
    console.log(`\n  user: {${accounts[walletFrom.address]}} tokenID : {${tokenID}} amount : {${L1WalletFromAmount}} on L1`);
    
    let L2WalletFromAmount = await L2Mock.balanceOf(WalletTo.address, tokenID);
    console.log(`\n  user: {${accounts[WalletTo.address]}} tokenID : {${tokenID}} amount : {${L2WalletFromAmount}} on L2`);
}

async function DepositL1ToL2(L1Bridge, L1Mock, L2Mock, L1MockWallet, tokenID, destTo, nftStandard, destGas, wait, config, L1Deposit, L2Deposit) {

    if(nftStandard == config.nftStandard.ERC721){
        await L1Mock.connect(L1MockWallet).approve(L1Bridge.address, tokenID);
    }else if(nftStandard == config.nftStandard.ERC1155) {
        await L1Mock.connect(L1MockWallet).setApprovalForAll(L1Bridge.address, true);
    }else{
        throw new Error("Undefined nftStandard");
    }

    // function depositTo(address localNFT, address destTo, uint256 id,  nftenum nftStandard, uint32 destGas)
    let L1_TX1 = await L1Bridge.connect(L1MockWallet).depositTo(L1Mock.address, destTo.address, tokenID, nftStandard, destGas);
    await L1_TX1.wait()
    
    console.log('\n  waiting peer L1 => L2 depositTo { L1 ali => L2 bob }')
    await new Promise((resolve) => setTimeout(resolve, wait));
  
    if(nftStandard == config.nftStandard.ERC721){
        await check721(L1Mock, L2Mock, tokenID, L1MockWallet, destTo, L1Deposit, L2Deposit);
    }else{
        await check1155(L1Mock, L2Mock, tokenID, L1MockWallet, destTo, L1Deposit, L2Deposit);
    }
}

async function DepositL2ToL1(L2Bridge, L1Mock, L2Mock, L2MockWallet, tokenID, destTo, nftStandard, destGas, wait, config, L1Deposit, L2Deposit) {
    
    if(nftStandard == config.nftStandard.ERC721){
        await L2Mock.connect(L2MockWallet).approve(L2Bridge.address, tokenID);
    }else if(nftStandard == config.nftStandard.ERC1155) {
        await L2Mock.connect(L2MockWallet).setApprovalForAll(L2Bridge.address, true);
    }else{
        throw new Error("Undefined nftStandard");
    }

    let L2_TX1 = await L2Bridge.connect(L2MockWallet).depositTo(L2Mock.address, destTo.address, tokenID, nftStandard, destGas);
    await L2_TX1.wait()
    
    console.log('\n  waiting peer L2 => L1 depositTo { L2 bob => L1 jno } ')
    await new Promise((resolve) => setTimeout(resolve, wait));

    if(nftStandard == config.nftStandard.ERC721){
        await check721(L1Mock, L2Mock, tokenID, destTo, L2MockWallet, L1Deposit, L2Deposit);
    }else{
        await check1155(L1Mock, L2Mock, tokenID, destTo, L2MockWallet, L1Deposit, L2Deposit);
    }
}

async function eventEmit(bridges){
     bridges.L1.bridge.on("DEPOSIT_TO", (a,b,c,d,e,f) => {
        console.log("\n  L1 DEPOSIT_TO:",a,b,c,d,e,f);
    });
    bridges.L1.bridge.on("FINALIZE_DEPOSIT", (a,b,c,d,e,f) => {
        console.log("\n  L1 FINALIZE_DEPOSIT:",a,b,c,d,e,f);
    });

    bridges.L2.bridge.on("DEPOSIT_TO", (a,b,c,d,e,f) => {
        console.log("\n  L2 DEPOSIT_TO:",a,b,c,d,e,f);
    });
    bridges.L2.bridge.on("FINALIZE_DEPOSIT", (a,b,c,d,e,f) => {
        console.log("\n  L2 FINALIZE_DEPOSIT:",a,b,c,d,e,f);
    });
}


async function init(config) {
    // Set up our RPC provider connections.
    const l1RpcProvider = new ethers.providers.JsonRpcProvider(config.rpc.L1)
    const l2RpcProvider = new ethers.providers.JsonRpcProvider(config.rpc.L2)

    // var
    let tenETH = ethers.utils.parseEther("10")

    let presetTokenIds = [1, 2, 3, 4, 5];

    let crossDomainId = presetTokenIds[2];
    
    // call
    let wallets = await initWallet(config, l1RpcProvider, l2RpcProvider, tenETH);

    let ChainIDs = await getChainID(l1RpcProvider, l2RpcProvider);
  
    let messengers = await getMessenger(l1RpcProvider, l2RpcProvider);
    
    let gases = await getGas(l1RpcProvider, l2RpcProvider);
    
    let crossDomain = await setCrossDomain(messengers.L1, wallets.L1.owner);

    const bridgeFactoryL1 = await factory.connect(wallets.L1.owner).deploy();
    await bridgeFactoryL1.deployTransaction.wait();
    console.log(`\n  bridgeFactoryL1 deployed on L1 @ ${bridgeFactoryL1.address}`)

    const bridgeFactoryL2 = await factory.connect(wallets.L2.owner).deploy();
    await bridgeFactoryL2.deployTransaction.wait();
    console.log(`\n  bridgeFactoryL2 deployed on L2 @ ${bridgeFactoryL2.address}`)

    let bridges = await deployBridge(wallets.L1.owner, wallets.L2.owner, bridgeFactoryL1, crossDomain.L1LibAddressManager, messengers.L1.address, messengers.L2.address);
    
    console.log(`\n  call set on L1 and L2`)
    L1_TX1 = await bridges.L1.bridge.set(bridges.L1.deposit.address,bridges.L2.bridge.address);
    await L1_TX1.wait()
    L2_TX1 = await bridges.L2.bridge.set(bridges.L2.deposit.address, bridges.L1.bridge.address);
    await L2_TX1.wait()
    console.log(`\n  set done.`)
    
    await bridgeFactoryL1.setbridge(bridges.L1.bridge.address)
    await bridgeFactoryL2.setbridge(bridges.L2.bridge.address)
    // param second is clone contract
    
    await mockDeployERC721(wallets.L1.ali, wallets.L2.ali, presetTokenIds, bridges.L2.bridge);

    await mockDeployERC1155(wallets.L1.ali, wallets.L2.ali, presetTokenIds, bridges.L2.bridge);
    // bridgeFactoryL1.setNft(wallets.L1.ali.address,wallets.L1.ali.address,ChainIDs.L2,config.gas.L2)
    
}

async function main() {
    try{
        // await init(config, config.nftStandard.ERC721);
        
        // await init(config, config.nftStandard.ERC1155);
        await init(config)
    }catch(e){
        console.error("dev-debug:", e, "run error!");
    }
}

main();
