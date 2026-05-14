import { ethers } from "ethers";
import { createRequire } from "module";
const require = createRequire(import.meta.url);

const SwapPoolArtifact = require("../artifacts/contracts/SwapPool.sol/SwapPool.json");
const EscrowArtifact = require("../artifacts/contracts/Escrow.sol/Escrow.json");

const USDC = "0x3600000000000000000000000000000000000000";
const EURC = "0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a";

const provider = new ethers.JsonRpcProvider("https://rpc.testnet.arc.network");
const wallet = new ethers.Wallet("0xbd41be72afd89dbba572e20fefc8038d1aeb82c803f8f0f23f48d450140eb079", provider);

console.log("Deploying with:", wallet.address);

const SwapPool = new ethers.ContractFactory(SwapPoolArtifact.abi, SwapPoolArtifact.bytecode, wallet);
const swap = await SwapPool.deploy(USDC, EURC);
await swap.waitForDeployment();
console.log("SwapPool:", await swap.getAddress());

const Escrow = new ethers.ContractFactory(EscrowArtifact.abi, EscrowArtifact.bytecode, wallet);
const escrow = await Escrow.deploy();
await escrow.waitForDeployment();
console.log("Escrow:", await escrow.getAddress());
