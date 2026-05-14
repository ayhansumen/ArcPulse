import "@nomicfoundation/hardhat-toolbox";
import "dotenv/config";

export default {
  solidity: "0.8.28",
  networks: {
    arc_testnet: {
      url: "https://rpc.testnet.arc.network",
      chainId: 5042002,
      accounts: [process.env.PRIVATE_KEY],
    },
    sepolia: {
      url: "https://ethereum-sepolia-rpc.publicnode.com",
      chainId: 11155111,
      accounts: [process.env.PRIVATE_KEY],
    },
  },
};