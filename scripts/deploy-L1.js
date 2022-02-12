const hre = require("hardhat");

async function main() {
    // We get the contract to deploy
    const ERC721Mock = await ethers.getContractFactory("ERC721Mock");
    const ERC721 = await ERC721Mock.deploy("Hello, Hardhat!");
  
    console.log("Greeter deployed to:", greeter.address);
  }
  
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });