require('@nomiclabs/hardhat-ethers')
require('dotenv').config();

// This is a sample Hardhat task. To learn how to create your own go to
// https://hardhat.org/guides/create-task.html
task("accounts", "Prints the list of accounts", async (taskArgs, hre) => {
  const accounts = await hre.ethers.getSigners();

  for (const account of accounts) {
    console.log(account);
  }
});

// You need to export an object to set up your config
// Go to https://hardhat.org/config/ to learn more

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
//   solidity: "0.8.11",
  // solidity: "0.8.9",
  solidity:{
    compilers:[
      {
        version: "0.8.9",
        settings: {
          optimizer: {
            enabled: true,
            runs: 1
          }
        }
      }
    ]
  },
  networks: {
    'hardhat': {
        accounts: { mnemonic: 'test test test test test test test test test test test junk' }
    },
    'metis-local': {
        url: 'http://127.0.0.1:8545',
        accounts: { mnemonic: 'test test test test test test test test test test test junk' },
        gasPrice: 0
    },
    'metis-Rinkeby': {
        chainId: 588,
        url: 'https://stardust.metis.io/?owner=588',
        accounts: [process.env.PRIVATE_KEY],
        gasPrice: 15000000,
    },
    'metis-mainnet': {
        chainId: 1088,
        url: 'https://andromeda.metis.io/?owner=1088',
        accounts: [process.env.PRIVATE_KEY],
        gasPrice: 15000000,
    }
  }
};