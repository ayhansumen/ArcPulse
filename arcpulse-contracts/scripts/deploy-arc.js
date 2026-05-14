import { ethers } from "hardhat";

const USDC = "0x3600000000000000000000000000000000000000";
const EURC = "0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a";

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