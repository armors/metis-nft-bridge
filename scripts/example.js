const ethers = require('ethers')
const { Watcher } = require('@eth-optimism/core-utils')
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

async function main() {
  // Set up our RPC provider connections.
  const l1RpcProvider = new ethers.providers.JsonRpcProvider('http://localhost:9545')
  const l2RpcProvider = new ethers.providers.JsonRpcProvider('http://localhost:8545')

  // 10k ETH
  const key = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80'
  const l1Wallet = new ethers.Wallet(key, l1RpcProvider)
  const l2Wallet = new ethers.Wallet(key, l2RpcProvider)

  console.log("l1Wallet", l1Wallet.address, (await l1Wallet.getBalance()).toString());
  console.log("l2Wallet", l2Wallet.address, (await l2Wallet.getBalance()).toString());

  let l1_net = await l1RpcProvider.getNetwork();
  let l2_net = await l2RpcProvider.getNetwork();

  console.log("L1 chainID:", l1_net.chainId);
  console.log("L2 chainID:", l2_net.chainId);
  

  const l2Messenger = new ethers.Contract(
    predeploys.L2CrossDomainMessenger,
    getContractInterface('L2CrossDomainMessenger'),
    l2RpcProvider
  )

  const l1Messenger = new ethers.Contract(
    await l2Messenger.l1CrossDomainMessenger(),
    getContractInterface('L1CrossDomainMessenger'),
    l1RpcProvider
  )

  const l1MessengerAddress = l1Messenger.address
  // L2 messenger address is always the same, 0x42.....07
  const l2MessengerAddress = l2Messenger.address

  console.log("L1 MessengerAddress:", l1MessengerAddress);
  console.log("L2 MessengerAddress:", l2MessengerAddress);


  const l1GasPrice = await l1RpcProvider.getGasPrice()
  const l2GasPrice = await l2RpcProvider.getGasPrice()
  console.log("Current gas price L1:", l1GasPrice.toString() )
  console.log("Current gas price L2:", l2GasPrice.toString() )

  //  Tool that helps watches and waits for messages to be relayed between L1 and L2.
  const watcher = new Watcher({
    l1: {
      provider: l1RpcProvider,
      messengerAddress: l1MessengerAddress
    },
    l2: {
      provider: l2RpcProvider,
      messengerAddress: l2MessengerAddress
    }
  })

  const lookupL1toL2 = async (hash) => {
    console.log("L1 to L2 message")
    console.log(`L1 TX hash: ${hash}`)
    const [msgHash] = await watcher.getMessageHashesFromL1Tx(hash)
    console.log(`Message hash: ${msgHash}`)
    const L2Receipt = await watcher.getL2TransactionReceipt(msgHash)
    console.log(`L2 TX hash: ${L2Receipt.transactionHash}`)
  }
  
  const lookupL2toL1 = async (hash) => {
    console.log("L2 to L1 message")
    console.log(`L2 TX hash: ${hash}`)  
    const [msgHash] = await watcher.getMessageHashesFromL2Tx(hash)
    console.log(`Message hash: ${msgHash}`)
    const L1Receipt = await watcher.getL1TransactionReceipt(msgHash)
    console.log(`L1 TX hash: ${L1Receipt.transactionHash}`)
  }

  //   get l1 libAddressManager
  let l1libAddressManager = await l1Messenger.libAddressManager();
  console.log("L1 AddressManager:", l1libAddressManager);
  const l1libAddressManagerObj = l1Lib_AddressManager.connect(l1Wallet).attach(l1libAddressManager)

  let METIS_MANAGER = await l1libAddressManagerObj.getAddress("METIS_MANAGER");
  console.log("L1 METIS_MANAGER:", METIS_MANAGER);

  let MVM_DiscountOracle = await l1libAddressManagerObj.getAddress("MVM_DiscountOracle");
  const MVM_DiscountOracleObj = l1MVM_DiscountOracle.connect(l1Wallet).attach(MVM_DiscountOracle)
  console.log("L1 MVM_DiscountOracle:", MVM_DiscountOracle);
  L1_TX0 = await MVM_DiscountOracleObj.setAllowAllXDomainSenders(true);
  L1_TX0.wait();

  // ------------------------------------------------------------  
  // Deploy ERC721 on L1.
  console.log('Deploying L1_demo721 ERC721 on L1...')
  const L1_demo721 = await demo721.connect(l1Wallet).deploy(
    "L1 name",
    "L1 symbol",
    "ipfs://armors.io/L1/"
  )
  await L1_demo721.deployTransaction.wait();
  console.log(`   L1_demo721 deployed @ ${L1_demo721.address}`)

  let L1_demo721_token_1 = 1;
  let demo721_token_2 = 2;
  await L1_demo721.mint(l1Wallet.address, L1_demo721_token_1);
  await L1_demo721.mint(l1Wallet.address, demo721_token_2);
  let l1balanceOf = await L1_demo721.balanceOf(l1Wallet.address);
  console.log(`   L1_demo721 mint to l1Wallet.address {1、2} tokenId:`, l1balanceOf.toString());

  // ------------------------------------------------------------
  
  // Deploy ERC721 on L2.
  console.log('Deploying ERC721 on L2...')
  const L2_demo721 = await demo721.connect(l2Wallet).deploy(
    "L1 name to L2",
    "L1 symbol to L2",
    "ipfs://armors.io/L1/L2/"
  )
  await L2_demo721.deployTransaction.wait();
  console.log(`   L2_demo721 deployed @ ${L2_demo721.address}`)

  // ------------------------------------------------------------
  // Deploy l1 bridge on L1.
  console.log('Deploying bridge on L1...')
  const L1_bridge = await L1NFTBridge.connect(l1Wallet).deploy(
    l1Wallet.address, // owner
    l1Wallet.address, // factory
    l1libAddressManager,
    l1MessengerAddress
  )
  await L1_bridge.deployTransaction.wait();
  console.log(`   L1_bridge deployed @ ${L1_bridge.address}`)

  // ------------------------------------------------------------
  // Deploy l2 bridge on L2.
  console.log('Deploying L2 bridge...')
  const L2_bridge = await L2NFTBridge.connect(l2Wallet).deploy(
    l2Wallet.address, // owner
    l2MessengerAddress
  )
  await L2_bridge.deployTransaction.wait();
  console.log(`   L2_bridge deployed @ ${L2_bridge.address}`)

  // ------------------------------------------------------------
  console.log('Grant mint role to L2 bridge...')
  let mintRole = await L2_demo721.MINTER_ROLE();
  console.log("mintRole:", mintRole);

  L2_TX1 = await L2_demo721.grantRole(mintRole, L2_bridge.address);
  await L2_TX1.wait()
  console.log('Grant L2_demo721 mint role to L2 bridge done.')

  // ------------------------------------------------------------
  console.log('Deploying L1 NFTDeposit on L1...')
  const L1_NFTDeposit = await NFTDeposit.connect(l1Wallet).deploy(
    l1Wallet.address, // owner
    L1_bridge.address // withdraw

  )
  await L1_NFTDeposit.deployTransaction.wait();
  console.log(`   L1 NFTDeposit deployed @ ${L1_NFTDeposit.address}`)

  // ------------------------------------------------------------

  // ------------------------------------------------------------
  console.log('Deploying L2 NFTDeposit on L2...')
  const L2_NFTDeposit = await NFTDeposit.connect(l2Wallet).deploy(
    l2Wallet.address, // owner
    L2_bridge.address // withdraw

  )
  await L2_NFTDeposit.deployTransaction.wait();
  console.log(`   L2 NFTDeposit deployed @ ${L2_NFTDeposit.address}`)

  // ------------------------------------------------------------

  L1_TX1 = await L1_bridge.set(L1_NFTDeposit.address,L2_bridge.address);
  await L1_TX1.wait()

  L2_TX2 = await L2_bridge.set(L2_NFTDeposit.address, L1_bridge.address);
  await L2_TX2.wait()

  let blocksToFetch = await l2RpcProvider.getBlockNumber();

  L1_TX2 = await L1_bridge.configNFT(L1_demo721.address, L2_demo721.address, l1_net.chainId, 2000000);
  await L1_TX2.wait()
  
  // ------------------------------------------------------------

  console.log('waiting peer')
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
      if (log.address === l1MessengerAddress && log.topics[0] === sentMessageEventId) {
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
    await L1_bridge.clone(L1_demo721.address),
    await L1_bridge.isOrigin(L1_demo721.address),
    "L2 clone:",
    await L2_bridge.clone(L2_demo721.address),
    await L2_bridge.isOrigin(L2_demo721.address),
  )

  // ------------------------------------------------------------
  console.log('L1_demo721 approve to L1_bridge')
  await L1_demo721.approve(L1_bridge.address, demo721_token_2);
  //function depositTo(address localNFT, address destTo, uint256 id,  nftenum nftStandard, uint32 destGas) 
  L1_TX3 = await L1_bridge.depositTo(L1_demo721.address, l2Wallet.address, demo721_token_2, 0, 200000);
  await L1_TX3.wait()
  
  console.log('waiting peer')
  await new Promise((resolve) => setTimeout(resolve, 3000));

  // -------------------

  let L1_demo721_token_2_owner = await L1_demo721.ownerOf(demo721_token_2);
  console.log('L1_demo721_token_2_owner', L1_demo721_token_2_owner);

  let L2_demo721_token_2_owner = await L2_demo721.ownerOf(demo721_token_2);
  console.log('L2_demo721_token_2_owner', L2_demo721_token_2_owner);
  
  let l2balanceOf = await L2_demo721.balanceOf(l2Wallet.address);
  console.log(`   L2_demo721 mint to l2Wallet.address demo721_token_2 count:`, l2balanceOf.toString());


  // ------------------------------------------------------------

  console.log('L2_demo721 approve to L2_bridge')
  await L2_demo721.approve(L2_bridge.address, demo721_token_2);
  //function depositTo(address localNFT, address destTo, uint256 id,  nftenum nftStandard, uint32 destGas) 
  L2_TX3 = await L2_bridge.depositTo(L2_demo721.address, l1Wallet.address, demo721_token_2, 0, 200000);
  await L2_TX3.wait()
  
  console.log('waiting peer')
  await new Promise((resolve) => setTimeout(resolve, 100000));

  // -------------------
  
  L2_demo721_token_2_owner = await L2_demo721.ownerOf(demo721_token_2);
  console.log('L2_demo721_token_2_owner', L2_demo721_token_2_owner);

  L1_demo721_token_2_owner = await L1_demo721.ownerOf(demo721_token_2);
  console.log('L1_demo721_token_2_owner', L1_demo721_token_2_owner);

  l1balanceOf = await L1_demo721.balanceOf(l1Wallet.address);
  console.log(`   L1_demo721  withdrow to l1Wallet.address demo721_token_2 count:`, l1balanceOf.toString());
  
  // ------------------------------------------------------------

}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
