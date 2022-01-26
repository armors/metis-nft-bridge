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

async function main() {
  // Set up our RPC provider connections.
  const l1RpcProvider = new ethers.providers.JsonRpcProvider('http://localhost:9545')
  const l2RpcProvider = new ethers.providers.JsonRpcProvider('http://localhost:8545')

  // Set up our wallets (using a default private key with 10k ETH allocated to it).
  // Need two wallets objects, one for interacting with L1 and one for interacting with L2.
  // Both will use the same private key.
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
  }   // lookupL1toL2
  
  
  const lookupL2toL1 = async (hash) => {
    console.log("L2 to L1 message")
    console.log(`L2 TX hash: ${hash}`)  
    const [msgHash] = await watcher.getMessageHashesFromL2Tx(hash)
    console.log(`Message hash: ${msgHash}`)
    const L1Receipt = await watcher.getL1TransactionReceipt(msgHash)
    console.log(`L1 TX hash: ${L1Receipt.transactionHash}`)
  }     // lookupL2toL1

  //   get l1 libAddressManager
  let l1libAddressManager = await l1Messenger.libAddressManager();
  console.log("L1 libAddressManager:", l1libAddressManager);
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
  console.log('Deploying ERC721 on L1...')
  const L1_demo721 = await demo721.connect(l1Wallet).deploy(
    "L1 name",
    "L1 symbol",
    "ipfs://armors.io/L1/",
  )
  await L1_demo721.deployTransaction.wait();
  console.log(`   L1_demo721 deployed @ ${L1_demo721.address}`)

  // ------------------------------------------------------------
  
  // Deploy ERC721 on L2.
  console.log('Deploying ERC721 on L2...')
  const L2_demo721 = await demo721.connect(l2Wallet).deploy(
    "L2 name",
    "L2 symbol",
    "ipfs://armors.io/L2/",
  )
  await L2_demo721.deployTransaction.wait();
  console.log(`   L2_demo721 deployed @ ${L2_demo721.address}`)


  // ------------------------------------------------------------
  // Deploy l1 bridge on L1.
  console.log('Deploying L1 bridge...')
  const L1_bridge = await L1NFTBridge.connect(l1Wallet).deploy(
    l1Wallet.address,
    l1Wallet.address,
    l1libAddressManager,
    l1MessengerAddress
  )
  await L1_bridge.deployTransaction.wait();
  console.log(`   L1_bridge deployed @ ${L1_bridge.address}`)

  // ------------------------------------------------------------
  // Deploy l2 bridge on L2.
  console.log('Deploying L2 bridge...')
  const L2_bridge = await L2NFTBridge.connect(l2Wallet).deploy(
    l2Wallet.address,
    l2Wallet.address,
    l2MessengerAddress
  )
  await L2_bridge.deployTransaction.wait();
  console.log(`   L2_bridge deployed @ ${L2_bridge.address}`)

  // ------------------------------------------------------------
  L1_TX1 = await L1_bridge.set(l1Wallet.address,L2_bridge.address);
  await L1_TX1.wait()

  L2_TX1 = await L2_bridge.init(l2Wallet.address, L1_bridge.address);
  await L2_TX1.wait()

  L1_TX2 = await L1_bridge.configNFT(L1_demo721.address, L2_demo721.address, l2_net.chainId, 2000000);
  await L1_TX2.wait()
  
  console.log('waiting peer')
  await new Promise((resolve) => setTimeout(resolve, 5000));

  console.log(
    "L1 clone:",
    await L1_bridge.clone(L1_demo721.address),
    await L1_bridge.isOriginNFT(L1_demo721.address),
    "L2 clone:",
    await L2_bridge.clone(L2_demo721.address),
    await L2_bridge.isOriginNFT(L2_demo721.address),
  )
//   // Wait for the message to be relayed to L2.
//   console.log('Waiting for confit to be relayed to L2...', L1_TX2.hash)
//   await lookupL1toL2(L1_TX2.hash);
//   const [ msgHash1 ] = await watcher.getMessageHashesFromL1Tx(L1_TX2.hash)
//   console.log('msgHash1', msgHash1)
//   const receipt = await watcher.getL2TransactionReceipt(msgHash1, true)
//   console.log("receipt", receipt)

//   // Deploy the paired ERC20 token to L2.
//   console.log('Deploying L2 ERC20...')
//   const L2_ERC20 = await factory__L2_ERC20.connect(l2Wallet).deploy(
//     '0x4200000000000000000000000000000000000010',
//     // Use this (\/) value to check what happens when the L1 ERC20 address is invalid
//     // '0x1111111111000000000000000000000000000000',
//     // Use this (\/) value to check what happens when the L1 ERC20 address is valid
//     L1_ERC20.address,
//     'L2 ERC20', //name
//     'L2T', // symbol
//   )
//   await L2_ERC20.deployTransaction.wait()
//   console.log(`   L2_ERC20 deployed @ ${L2_ERC20.address}`)

//   const L2StandardBridge = factory__L2StandardBridge
//       .connect(l2Wallet)
//       .attach('0x4200000000000000000000000000000000000010')

//   console.log('Instantiate L1 Standard Bridge...')
//   const L1StandardBridgeAddress = await L2StandardBridge.l1TokenBridge();
//   const L1StandardBridge = factory__L1StandardBridge.connect(l1Wallet).attach(L1StandardBridgeAddress)

//   // Initial balances.
//   console.log(`Balance on L1: ${await L1_ERC20.balanceOf(l1Wallet.address)}`) // 1234
//   console.log(`Balance on L2: ${await L2_ERC20.balanceOf(l1Wallet.address)}`) // 0

//   // Allow the gateway to lock up some of our tokens.
//   console.log('Approving tokens for Standard Bridge...')
//   const tx1 = await L1_ERC20.approve(L1StandardBridge.address, 1234)
//   await tx1.wait()

//   // DO NOT remove this check.
//   // It ensures L2 token compliance and validity. If the L2 token contract doesn't implement
//   // IL2StandardERC20 or it does not correspond to the L1 token being deposited, an exception
//   // will occur and no deposit will take place. Alternatively the exception will occur once
//   // the deposit is relayed to L2 and the seven day wait period will apply for the bad deposit
//   // to be withdraw-able back on L1
//   if (await L2_ERC20.l1Token() != L1_ERC20.address) {
//     console.log(`L2 token does not correspond to L1 token: L2_ERC20.l1Token() = ${await L2_ERC20.l1Token()}`)
//     process.exit(0)
//   }

//   // Lock the tokens up inside the gateway and ask the L2 contract to mint new ones.
//   console.log('Depositing tokens into L2 ...')
//   const tx2 = await L1StandardBridge.depositERC20(
//     L1_ERC20.address,
//     L2_ERC20.address,
//     1234,
//     2000000,
//     '0x')
//   await tx2.wait()

//   // Wait for the message to be relayed to L2.
//   console.log('Waiting for deposit to be relayed to L2...')
//   const [ msgHash1 ] = await watcher.getMessageHashesFromL1Tx(tx2.hash)

//   const receipt = await watcher.getL2TransactionReceipt(msgHash1, true)
//   //console.log("receipt", receipt)

//   // Log some balances to see that it worked!
//   console.log(`Balance on L1: ${await L1_ERC20.balanceOf(l1Wallet.address)}`) // 0
//   console.log(`Balance on L2: ${await L2_ERC20.balanceOf(l1Wallet.address)}`) // 1234

//   // Burn the tokens on L2 and ask the L1 contract to unlock on our behalf.
//   console.log(`Withdrawing tokens back to L1 ...`)
//   const tx3 = await L2StandardBridge.withdraw(
//     L2_ERC20.address,
//     1234,
//     2000000,
//     '0x'
//   )
//   await tx3.wait()

//   // Wait for the message to be relayed to L1.
//   console.log(`Waiting for withdrawal to be relayed to L1...`)
//   const [ msgHash2 ] = await watcher.getMessageHashesFromL2Tx(tx3.hash)
//   await watcher.getL1TransactionReceipt(msgHash2)

//   // Log balances again!
//   console.log(`Balance on L1: ${await L1_ERC20.balanceOf(l1Wallet.address)}`) // 1234
//   console.log(`Balance on L2: ${await L2_ERC20.balanceOf(l1Wallet.address)}`) // 0
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
