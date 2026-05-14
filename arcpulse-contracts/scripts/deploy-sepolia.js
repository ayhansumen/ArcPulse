import { ethers } from "hardhat";

const USDC = "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238";
const EURC = "0x08210F9170F89Ab7658F0B5E3fF39b0E03C2Bef";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with:", deployer.address);

  const SwapPool = await ethers.getContractFactory("SwapPool");
  const swap = await SwapPool.deploy(USDC, EURC);
  await swap.waitForDeployment();
  console.log("SwapPool:", await swap.getAddress());

  const Escrow = await ethers.getContractFactory("Escrow");
  const escrow = await Escrow.deploy();
  await escrow.waitForDeployment();
  console.log("Escrow:", await escrow.getAddress());
}

main().catch((e) => { console.error(e); process.exit(1); });