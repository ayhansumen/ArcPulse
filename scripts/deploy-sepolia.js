import { ethers } from "ethers";
import { createRequire } from "module";
const require = createRequire(import.meta.url);

const SwapPoolArtifact = require("../artifacts/contracts/SwapPool.sol/SwapPool.json");
const EscrowArtifact = require("../artifacts/contracts/Escrow.sol/Escrow.json");

const USDC = "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238";
const EURC = ethers.getAddress("0x08210f9170f89ab7658f0b5e3ff39b0e03c594d4");

const provider = new ethers.JsonRpcProvider("https://ethereum-sepolia-rpc.publicnode.com");
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
