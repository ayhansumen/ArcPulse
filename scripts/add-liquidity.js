import { ethers } from 'ethers';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const SWAP = '0x20eF12b38D59CFA4e7A190e88e54cDaf3c7efB99';
const USDC = '0x3600000000000000000000000000000000000000';
const EURC = '0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a';
const PK = '0xbd41be72afd89dbba572e20fefc8038d1aeb82c803f8f0f23f48d450140eb079';

const TOKEN_ABI = [
  'function approve(address spender, uint256 amount) returns (bool)',
  'function balanceOf(address) view returns (uint256)',
];
const SWAP_ABI = [
  'function addLiquidity(address token, uint256 amount) external',
];

const provider = new ethers.JsonRpcProvider('https://rpc.testnet.arc.network');
const wallet = new ethers.Wallet(PK, provider);

const usdc = new ethers.Contract(USDC, TOKEN_ABI, wallet);
const eurc = new ethers.Contract(EURC, TOKEN_ABI, wallet);
const swap = new ethers.Contract(SWAP, SWAP_ABI, wallet);

const usdcAmt = ethers.parseUnits('50', 6);
const eurcAmt = ethers.parseUnits('49', 6);

console.log('Approving USDC...');
await (await usdc.approve(SWAP, usdcAmt)).wait();
console.log('Adding USDC liquidity...');
await (await swap.addLiquidity(USDC, usdcAmt)).wait();
console.log('USDC done!');

console.log('Approving EURC...');
await (await eurc.approve(SWAP, eurcAmt)).wait();
console.log('Adding EURC liquidity...');
await (await swap.addLiquidity(EURC, eurcAmt)).wait();
console.log('EURC done!');

console.log('Liquidity added! Pool ready.');
