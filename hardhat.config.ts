import { HardhatUserConfig } from "hardhat/config";

const config: HardhatUserConfig = {
  solidity: "0.8.28",
  networks: {
    arc_testnet: {
      type: "http",
      url: "https://rpc.testnet.arc.network",
      chainId: 5042002,
      accounts: ["0xbd41be72afd89dbba572e20fefc8038d1aeb82c803f8f0f23f48d450140eb079"],
    },
    sepolia: {
      type: "http",
      url: "https://ethereum-sepolia-rpc.publicnode.com",
      chainId: 11155111,
      accounts: ["0xbd41be72afd89dbba572e20fefc8038d1aeb82c803f8f0f23f48d450140eb079"],
    },
  },
};

export default config;
