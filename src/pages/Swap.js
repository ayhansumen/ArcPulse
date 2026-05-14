import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';

const SWAP_ADDRESS = '0x20eF12b38D59CFA4e7A190e88e54cDaf3c7efB99';
const USDC = '0x3600000000000000000000000000000000000000';
const EURC = '0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a';
const ARC_RPC = 'https://rpc.testnet.arc.network';

const ERC20_ABI = [
  'function approve(address spender, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function balanceOf(address) view returns (uint256)',
];
const SWAP_ABI = [
  'function swap(address tokenIn, address tokenOut, uint256 amountIn) returns (uint256)',
  'function getAmountOut(address tokenIn, uint256 amountIn) view returns (uint256)',
  'function getPoolBalances() view returns (uint256, uint256)',
];

const C = {
  bg: '#0A0B0F', surface: '#111318', card: '#13161E', border: '#1E2130',
  accent: '#00E5A0', accent2: '#FF6B35', muted: '#5A6180', text: '#E8EAF2', sub: '#8890AA',
};

const waitForTx = async (hash) => {
  const provider = new ethers.JsonRpcProvider(ARC_RPC);
  for (let i = 0; i < 60; i++) {
    const receipt = await provider.getTransactionReceipt(hash);
    if (receipt) return receipt;
    await new Promise(r => setTimeout(r, 2000));
  }
  throw new Error('Transaction timeout');
};

const Swap = ({ account }) => {
  const [direction, setDirection] = useState('USDC_to_EURC');
  const [amount, setAmount] = useState('');
  const [estimatedOut, setEstimatedOut] = useState('0.0000');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null);
  const [txHash, setTxHash] = useState(null);
  const [poolBalances, setPoolBalances] = useState({ usdc: '0', eurc: '0' });

  const tokenIn  = direction === 'USDC_to_EURC' ? 'USDC' : 'EURC';
  const tokenOut = direction === 'USDC_to_EURC' ? 'EURC' : 'USDC';
  const tokenInAddress  = direction === 'USDC_to_EURC' ? USDC : EURC;
  const tokenOutAddress = direction === 'USDC_to_EURC' ? EURC : USDC;

  useEffect(() => { loadPoolBalances(); }, []);
  useEffect(() => {
    if (amount && parseFloat(amount) > 0) getEstimate();
    else setEstimatedOut('0.0000');
  }, [amount, direction]);

  const loadPoolBalances = async () => {
    try {
      const provider = new ethers.JsonRpcProvider(ARC_RPC);
      const swap = new ethers.Contract(SWAP_ADDRESS, SWAP_ABI, provider);
      const [usdc, eurc] = await swap.getPoolBalances();
      setPoolBalances({
        usdc: parseFloat(ethers.formatUnits(usdc, 6)).toFixed(4),
        eurc: parseFloat(ethers.formatUnits(eurc, 6)).toFixed(4),
      });
    } catch (e) {}
  };

  const getEstimate = async () => {
    try {
      const provider = new ethers.JsonRpcProvider(ARC_RPC);
      const swap = new ethers.Contract(SWAP_ADDRESS, SWAP_ABI, provider);
      const out = await swap.getAmountOut(tokenInAddress, ethers.parseUnits(amount, 6));
      setEstimatedOut(parseFloat(ethers.formatUnits(out, 6)).toFixed(4));
    } catch (e) { setEstimatedOut('0.0000'); }
  };

  const executeSwap = async () => {
    if (!account || !amount || parseFloat(amount) <= 0) return;
    setLoading(true); setStatus(null); setTxHash(null);
    try {
      setStatus('Switching to Arc Testnet...');
      await window.ethereum.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: '0x4cef52' }] });

      const browserProvider = new ethers.BrowserProvider(window.ethereum);
      const signer = await browserProvider.getSigner();
      const arcProvider = new ethers.JsonRpcProvider(ARC_RPC);

      const tokenInContract = new ethers.Contract(tokenInAddress, ERC20_ABI, signer);
      const swapContract = new ethers.Contract(SWAP_ADDRESS, SWAP_ABI, signer);
      const amountIn = ethers.parseUnits(amount, 6);

      const balance = await new ethers.Contract(tokenInAddress, ERC20_ABI, arcProvider).balanceOf(account);
      if (balance < amountIn) { setStatus('Insufficient ' + tokenIn + ' balance.'); setLoading(false); return; }

      const allowance = await new ethers.Contract(tokenInAddress, ERC20_ABI, arcProvider).allowance(account, SWAP_ADDRESS);
      if (allowance < amountIn) {
        setStatus('Approving ' + tokenIn + '... Confirm in MetaMask.');
        const approveTx = await tokenInContract.approve(SWAP_ADDRESS, amountIn, { gasLimit: 100000 });
        setStatus('Waiting for approval: ' + approveTx.hash.slice(0, 10) + '...');
        await waitForTx(approveTx.hash);
        setStatus('Approved!');
      }

      setStatus('Swapping... Confirm in MetaMask.');
      const tx = await swapContract.swap(tokenInAddress, tokenOutAddress, amountIn, { gasLimit: 200000 });
      setTxHash(tx.hash);
      setStatus('Confirming swap: ' + tx.hash.slice(0, 10) + '...');
      await waitForTx(tx.hash);
      setStatus('success');
      setAmount('');
      loadPoolBalances();
    } catch (err) {
      console.error(err);
      setStatus(err.code === 4001 ? 'Transaction rejected.' : 'Error: ' + (err.reason || err.shortMessage || err.message));
    }
    setLoading(false);
  };

  const inp = { width: '100%', background: '#0D0F16', border: '1px solid ' + C.border, borderRadius: '10px', padding: '12px 16px', color: C.text, fontSize: '14px', outline: 'none', boxSizing: 'border-box', fontFamily: 'monospace' };

  return (
    <div style={{ padding: '28px' }}>
      <div style={{ marginBottom: '28px' }}>
        <h2 style={{ fontSize: '22px', fontWeight: '800', color: C.text, marginBottom: '6px', letterSpacing: '-0.5px' }}>
          <span style={{ color: C.accent2 }}>?</span> Swap
        </h2>
        <p style={{ color: C.muted, fontSize: '13px', fontFamily: 'monospace' }}>Swap USDC to EURC on Arc Testnet</p>
      </div>
      <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start' }}>
        <div style={{ background: C.card, border: '1px solid ' + C.border, borderRadius: '16px', padding: '28px', maxWidth: '480px', flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px', padding: '16px', background: '#0D0F16', border: '1px solid ' + C.border, borderRadius: '12px' }}>
            <div style={{ textAlign: 'center', flex: 1 }}>
              <div style={{ color: C.accent, fontWeight: '800', fontSize: '20px', fontFamily: 'monospace' }}>{tokenIn}</div>
              <div style={{ color: C.muted, fontSize: '11px', marginTop: '2px' }}>You pay</div>
            </div>
            <button onClick={() => { setDirection(d => d === 'USDC_to_EURC' ? 'EURC_to_USDC' : 'USDC_to_EURC'); setAmount(''); setStatus(null); setTxHash(null); }}
              style={{ background: C.accent + '15', border: '1px solid ' + C.accent + '40', borderRadius: '50%', width: '40px', height: '40px', cursor: 'pointer', color: C.accent, fontSize: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>?</button>
            <div style={{ textAlign: 'center', flex: 1 }}>
              <div style={{ color: C.accent2, fontWeight: '800', fontSize: '20px', fontFamily: 'monospace' }}>{tokenOut}</div>
              <div style={{ color: C.muted, fontSize: '11px', marginTop: '2px' }}>You receive</div>
            </div>
          </div>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ color: C.muted, fontSize: '11px', fontWeight: '600', letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>Amount ({tokenIn})</label>
            <input value={amount} onChange={e => { setAmount(e.target.value); setStatus(null); }} placeholder="0.00" type="number" style={inp} />
          </div>
          <div style={{ marginBottom: '24px', padding: '14px 16px', background: '#0D0F16', border: '1px solid ' + C.border, borderRadius: '10px' }}>
            <div style={{ color: C.muted, fontSize: '11px', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>You receive (estimated)</div>
            <div style={{ color: C.accent, fontSize: '22px', fontWeight: '700', fontFamily: 'monospace' }}>{estimatedOut} {tokenOut}</div>
          </div>
          <button onClick={executeSwap} disabled={loading || !amount || !account} style={{
            width: '100%',
            background: loading || !amount || !account ? C.border : C.accent,
            color: loading || !amount || !account ? C.muted : C.bg,
            border: 'none', padding: '14px', borderRadius: '12px',
            cursor: loading || !amount || !account ? 'not-allowed' : 'pointer',
            fontSize: '14px', fontWeight: '700',
          }}>
            {!account ? 'Connect Wallet' : loading ? 'Swapping...' : 'Swap ' + tokenIn + ' to ' + tokenOut}
          </button>
          {status && status !== 'success' && (
            <div style={{ marginTop: '14px', padding: '12px 16px', background: '#0D0F16', border: '1px solid ' + (status.startsWith('Error') ? '#ef444444' : C.border), borderRadius: '10px', color: status.startsWith('Error') ? '#ef4444' : C.sub, fontSize: '12px', fontFamily: 'monospace' }}>{status}</div>
          )}
          {status === 'success' && txHash && (
            <div style={{ marginTop: '14px', padding: '16px', background: '#0a1f14', border: '1px solid #00E5A044', borderRadius: '10px' }}>
              <div style={{ color: C.accent, fontWeight: '700', marginBottom: '6px', fontSize: '13px' }}>Swap Successful!</div>
              <a href={'https://testnet.arcscan.app/tx/' + txHash} target="_blank" rel="noreferrer" style={{ color: C.accent, fontSize: '12px', textDecoration: 'none', fontFamily: 'monospace' }}>View on Explorer</a>
            </div>
          )}
        </div>
        <div style={{ background: C.card, border: '1px solid ' + C.border, borderRadius: '16px', padding: '24px', minWidth: '200px' }}>
          <div style={{ color: C.muted, fontSize: '11px', fontWeight: '600', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '16px' }}>How It Works</div>
          {[
            { n: '1', t: 'Enter Amount', d: 'How much to swap', c: C.accent },
            { n: '2', t: 'Approve', d: 'One-time token approval', c: C.accent },
            { n: '3', t: 'Swap', d: 'On-chain execution', c: C.accent2 },
            { n: '4', t: 'Done', d: 'Tokens in your wallet', c: C.accent },
          ].map((s, i) => (
            <div key={i} style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
              <div style={{ width: '26px', height: '26px', borderRadius: '50%', background: s.c + '15', border: '1px solid ' + s.c + '50', display: 'flex', alignItems: 'center', justifyContent: 'center', color: s.c, fontSize: '11px', fontWeight: '700', flexShrink: 0, fontFamily: 'monospace' }}>{s.n}</div>
              <div>
                <div style={{ color: C.text, fontSize: '12px', fontWeight: '600', marginBottom: '2px' }}>{s.t}</div>
                <div style={{ color: C.muted, fontSize: '11px' }}>{s.d}</div>
              </div>
            </div>
          ))}
          <div style={{ padding: '12px', background: '#0D0F16', border: '1px solid ' + C.border, borderRadius: '10px', marginTop: '8px' }}>
            <div style={{ color: C.muted, fontSize: '10px', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Pool Balances</div>
            <div style={{ color: C.accent, fontSize: '12px', fontFamily: 'monospace' }}>USDC: {poolBalances.usdc}</div>
            <div style={{ color: C.accent2, fontSize: '12px', fontFamily: 'monospace', marginTop: '4px' }}>EURC: {poolBalances.eurc}</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Swap;
