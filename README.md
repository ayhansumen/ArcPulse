# ArcPulse

A full DeFi gateway built from scratch on Arc Testnet.

Live: https://xarcpulse.netlify.app

## What it does

**Swap** — USDC and EURC swaps on Arc Testnet via a custom AMM contract written in Solidity. Handles pool management, price estimation via getAmountOut(), and on-chain execution. Uses a custom RPC polling mechanism instead of MetaMask's default tx.wait() to handle Arc Testnet's receipt behavior reliably.

**Bridge** — Cross-chain USDC transfers between Arc Testnet and Ethereum Sepolia using Circle CCTP V2. depositForBurn() on source chain, Circle attestation, receiveMessage() on destination. No wrapped tokens, no custodians.

**RefundPay** — On-chain escrow with dispute resolution. Sender locks USDC or EURC in the contract, recipient delivers, sender approves and funds are released. If there is a dispute, a pre-agreed arbiter decides. Four states: PENDING, COMPLETED, REFUNDED, DISPUTED.

**Dashboard** — Live USDC and EURC balances on both Arc Testnet and Ethereum Sepolia, read directly from token contracts via ethers.js v6.

**History** — Full transaction history via Arc API with automatic refresh.

**Send** — Simple USDC and EURC transfers with client-side address validation.

## Contracts (Arc Testnet — Chain ID: 5042002)

| Contract | Address |
|---|---|
| RefundPay | 0xbDC1e9bf597458A02De818c10dA70061BbE5d514 |
| SwapPool | 0x20eF12b38D59CFA4e7A190e88e54cDaf3c7efB99 |
| USDC | 0x3600000000000000000000000000000000000000 |
| EURC | 0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a |

## Stack

React.js, ethers.js v6, Solidity 0.8.19, Hardhat, Circle CCTP V2, Netlify

## Network

| Field | Value |
|---|---|
| Network Name | Arc Testnet |
| RPC URL | https://rpc.testnet.arc.network |
| Chain ID | 5042002 |
| Currency Symbol | ARC |
| Block Explorer | https://testnet.arcscan.app |

## Getting Started

git clone https://github.com/ayhansumen/ArcPulse.git
cd ArcPulse
npm install
npm start

## Links

- Live App: https://xarcpulse.netlify.app
- Explorer: https://testnet.arcscan.app
- Arc Docs: https://docs.arc.network
