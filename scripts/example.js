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


const config = {
    rpc: {
        L1: "http://localhost:9545",
        L2: "http://localhost:8545"
    },
    own: '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80', // 10k ETH
    accounts: {
        ali: '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff81', // 艾莉
        bob: "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff82", // 鲍勃
        jno: "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff83", // 约翰
        fac: "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff84"  // factory
    },
    gasLimit: {
        L1: 30000000,
        L2: 30000000
    },
    gas:{
        L1: 2000000,
        L2: 2000000,
    },
    wait:{
        v1: 3000,
    }
}

let accounts = [];


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
    
    accounts[L1_wallet_ali.address] = "艾莉"
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
        "\n accounts: ",
        accounts, 
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
        L1Factory.address, // factory
        L1LibAddressManager,
        L1MessengerAddress
    )
    await L1Bridge.deployTransaction.wait();
    console.log(`\n  bridge deployed on L1 @ ${L1Bridge.address}`)

    // L2 bridge
    const L2Bridge = await L2NFTBridge.connect(L2BridgeOwner).deploy(
        L2BridgeOwner.address, // owner
        L2MessengerAddress
    )
    await L2Bridge.deployTransaction.wait();
    console.log(`\n  bridge deployed on L2 @ ${L2Bridge.address}`)

    // L1 deposit
    const L1Deposit = await NFTDeposit.connect(L1BridgeOwner).deploy(
        L1BridgeOwner.address, // owner
        L1Bridge.address // withdraw
  )
    await L1Deposit.deployTransaction.wait();
    console.log(`\n  bridge deposit deployed on L1 @ ${L1Deposit.address}`)

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

// L2 为 克隆合约
async function mockDeployERC721(L1Wallet, L2Wallet, presetTokenIds, L2Bridge){
    // L1
    const L1Mock721 = await demo721.connect(L1Wallet).deploy("L1 name", "L1 symbol", "ipfs://erc721.io/L1/");
    await L1Mock721.deployTransaction.wait();
    console.log(`\n  mockERC721 deployed on L1 @ ${L1Mock721.address}`)
    
    // L2
    const L2Mock721 = await demo721.connect(L2Wallet).deploy("L1 name to L2", "L1 symbol to L2", "ipfs://erc721.io/L1/to/L2/");
    await L2Mock721.deployTransaction.wait();
    console.log(`\n  mockERC721 deployed on L2 @ ${L2Mock721.address}`)

    // grant role
    let mintRole = await L2Mock721.MINTER_ROLE();
    L2Mock721Grant = await L2Mock721.grantRole(mintRole, L2Bridge.address);
    await L2Mock721Grant.wait()
    console.log('\n  Grant [mint role] to bridge on L2 done.')
    
    // L1 mint token
    for(let index = 0; index < presetTokenIds.length; index++) {
        await L1Mock721.mint(L1Wallet.address, presetTokenIds[index]);
    }

    console.log(`\n  mockERC721 mint tokens{ ${presetTokenIds} } on L1`)

    // return 
    accounts[L1Mock721.address] = "L1 ERC721 Contract";
    accounts[L2Mock721.address] = "L2 ERC721 Contract";

    return {
        L1: L1Mock721,
        L2: L2Mock721
    }
}

// 2000000
async function deployBridgeConfig(L1Bridge, L2Bridge, L1Deposit, L2Deposit, L1Mock721, L2Mock721, L1ChainId, L2Gas, wait){

    console.log(`\n  call set on L1 and L2`)
    L1_TX1 = await L1Bridge.set(L1Deposit.address,L2Bridge.address);
    await L1_TX1.wait()
    L2_TX1 = await L2Bridge.set(L2Deposit.address, L1Bridge.address);
    await L2_TX1.wait()
    console.log(`\n  set done.`) 
  
    console.log(`\n  project config clone nft.`)
    L1_TX2 = await L1Bridge.configNFT(L1Mock721.address, L2Mock721.address, L1ChainId, L2Gas);
    await L1_TX2.wait()
    console.log('waiting peer L1 => L2 ')
    await new Promise((resolve) => setTimeout(resolve, wait));

    console.log(
        "L1 clone:",
        await L1Bridge.clone(L1Mock721.address),
        await L1Bridge.isOrigin(L1Mock721.address),
        "L2 clone:",
        await L2Bridge.clone(L2Mock721.address),
        await L2Bridge.isOrigin(L2Mock721.address),
      )
}


async function init(config) {

    // Set up our RPC provider connections.
    const l1RpcProvider = new ethers.providers.JsonRpcProvider(config.rpc.L1)
    const l2RpcProvider = new ethers.providers.JsonRpcProvider(config.rpc.L2)


    // var
    let tenETH = ethers.utils.parseEther("10")

    let presetTokenIds = [1, 2, 3, 4, 5];

    // call
    let wallets = await initWallet(config, l1RpcProvider, l2RpcProvider, tenETH);

    let ChainIDs = await getChainID(l1RpcProvider, l2RpcProvider);
  
    let messengers = await getMessenger(l1RpcProvider, l2RpcProvider);
    
    let gases = await getGas(l1RpcProvider, l2RpcProvider);
    
    let crossDomain = await setCrossDomain(messengers.L1, wallets.L1.owner);

    let bridges = await deployBridge(wallets.L1.owner, wallets.L2.owner, wallets.L1.fac, crossDomain.L1LibAddressManager, messengers.L1.address, messengers.L2.address);

    let mockERC721 = await mockDeployERC721(wallets.L1.ali, wallets.L2.ali, presetTokenIds, bridges.L2.bridge);
 
    await deployBridgeConfig(bridges.L1.bridge, bridges.L2.bridge, bridges.L1.deposit, bridges.L2.deposit, mockERC721.L1, mockERC721.L2, ChainIDs.L1, config.gas.L2, config.wait.v1);
}

async function main() {
    try{
        init(config);
    }catch(e){
        console.log("debug:", e);
    }
}

main();

async function main_back() {

  // ------------------------------------------------------------  


  // ------------------------------------------------------------

  // ------------------------------------------------------------


  
  // ------------------------------------------------------------

  console.log('waiting peer L1 => L2 ')
  await new Promise((resolve) => setTimeout(resolve, 5000));

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

  let [msghash] = await receiptTX(l1RpcProvider, L1_TX2.hash);
  console.debug("hosea-debug: msghash ", msghash);


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

  let receiptL2 = await receiptMSGTX(l2RpcProvider, msghash, true, blocksToFetch);
  console.debug("hosea-debug: receiptL2 ", receiptL2);

  console.log(
    "L1 clone:",
    await L1Bridge.clone(L1Mock721.address),
    await L1Bridge.isOrigin(L1Mock721.address),
    "L2 clone:",
    await L2Bridge.clone(L2Mock721.address),
    await L2Bridge.isOrigin(L2Mock721.address),
  )

  // ------------------------------------------------------------
  console.log('L1Mock721 approve to L1Bridge')
  await L1Mock721.approve(L1Bridge.address, demo721_token_2);
  //function depositTo(address localNFT, address destTo, uint256 id,  nftenum nftStandard, uint32 destGas) 
  L1_TX3 = await L1Bridge.depositTo(L1Mock721.address, L2Wallet.address, demo721_token_2, 0, 200000);
  await L1_TX3.wait()
  
  console.log('waiting peer')
  await new Promise((resolve) => setTimeout(resolve, 3000));

  // -------------------

  let L1Mock721_token_2_owner = await L1Mock721.ownerOf(demo721_token_2);
  console.log('L1Mock721_token_2_owner', L1Mock721_token_2_owner);

  let L2Mock721_token_2_owner = await L2Mock721.ownerOf(demo721_token_2);
  console.log('L2Mock721_token_2_owner', L2Mock721_token_2_owner);
  
  let l2balanceOf = await L2Mock721.balanceOf(L2Wallet.address);
  console.log(`   L2Mock721 mint to L2Wallet.address demo721_token_2 count:`, l2balanceOf.toString());


  // ------------------------------------------------------------

  console.log('L2Mock721 approve to L2Bridge')
  await L2Mock721.approve(L2Bridge.address, demo721_token_2);
  //function depositTo(address localNFT, address destTo, uint256 id,  nftenum nftStandard, uint32 destGas) 
  L2_TX3 = await L2Bridge.depositTo(L2Mock721.address, l1Wallet.address, demo721_token_2, 0, 200000);
  await L2_TX3.wait()
  
  console.log('waiting peer')
  await new Promise((resolve) => setTimeout(resolve, 5000));

  // -------------------
  
  L2Mock721_token_2_owner = await L2Mock721.ownerOf(demo721_token_2);
  console.log('L2Mock721_token_2_owner', L2Mock721_token_2_owner);

  L1Mock721_token_2_owner = await L1Mock721.ownerOf(demo721_token_2);
  console.log('L1Mock721_token_2_owner', L1Mock721_token_2_owner);

  l1balanceOf = await L1Mock721.balanceOf(l1Wallet.address);
  console.log(`   L1Mock721  withdrow to l1Wallet.address demo721_token_2 count:`, l1balanceOf.toString());
  
  // ------------------------------------------------------------

}

// main()
//   .then(() => process.exit(0))
//   .catch(error => {
//     console.error(error)
//     process.exit(1)
//   })
