import React, { useState } from 'react';
import { BridgeKit } from '@circle-fin/bridge-kit';
import { createAdapterFromProvider } from '@circle-fin/adapter-viem-v2';

const CHAIN_LABELS = {
  Arc_Testnet: 'Arc Testnet',
  Ethereum_Sepolia: 'ETH Sepolia',
};

const CHAIN_IDS = {
  Arc_Testnet: 5042002,
  Ethereum_Sepolia: 11155111,
};

const CHAIN_RPC = {
  Arc_Testnet: 'https://rpc.testnet.arc.network',
  Ethereum_Sepolia: 'https://ethereum-sepolia-rpc.publicnode.com',
};

const CHAIN_EXPLORER = {
  Arc_Testnet: 'https://testnet.arcscan.app',
  Ethereum_Sepolia: 'https://sepolia.etherscan.io',
};

const CHAIN_NATIVE = {
  Arc_Testnet: { name: 'Arc', symbol: 'Arc', decimals: 18 },
  Ethereum_Sepolia: { name: 'Ethereum', symbol: 'ETH', decimals: 18 },
};

const switchNetwork = async (chainKey) => {
  const chainId = CHAIN_IDS[chainKey];
  const chainIdHex = '0x' + chainId.toString(16);
  try {
    await window.ethereum.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: chainIdHex }] });
  } catch (err) {
    if (err.code === 4902 || err.code === -32603) {
      await window.ethereum.request({
        method: 'wallet_addEthereumChain',
        params: [{ chainId: chainIdHex, chainName: CHAIN_LABELS[chainKey], rpcUrls: [CHAIN_RPC[chainKey]], blockExplorerUrls: [CHAIN_EXPLORER[chainKey]], nativeCurrency: CHAIN_NATIVE[chainKey] }],
      });
      await new Promise(r => setTimeout(r, 1000));
    } else throw err;
  }
  await new Promise(r => setTimeout(r, 800));
};

const C = {
  bg: '#0A0B0F', surface: '#111318', card: '#13161E', border: '#1E2130',
  accent: '#00E5A0', accent2: '#FF6B35', muted: '#5A6180', text: '#E8EAF2', sub: '#8890AA',
};

const Bridge = ({ account }) => {
  const [amount, setAmount] = useState('');
  const [fromChain, setFromChain] = useState('Arc_Testnet');
  const [toChain, setToChain] = useState('Ethereum_Sepolia');
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [txHash, setTxHash] = useState(null);
  const [stepMsg, setStepMsg] = useState('');

  const toggle = () => { setFromChain(toChain); setToChain(fromChain); setStatus(null); setTxHash(null); setStepMsg(''); };

  const bridgeUSDC = async () => {
    if (!account || !amount || parseFloat(amount) <= 0) return;
    setLoading(true); setStatus(null); setTxHash(null); setStepMsg('');
    try {
      setStepMsg('Switching to ' + CHAIN_LABELS[fromChain] + '...');
      await switchNetwork(fromChain);
      setStepMsg('Connecting wallet...');
      const adapter = await createAdapterFromProvider({ provider: window.ethereum });
      const kit = new BridgeKit();
      kit.on('approve', (e) => { setStepMsg('Approving USDC...'); if (e?.values?.txHash) setTxHash(e.values.txHash); });
      kit.on('burn', (e) => { setStepMsg('Burning USDC on ' + CHAIN_LABELS[fromChain] + '...'); if (e?.values?.txHash) setTxHash(e.values.txHash); });
      kit.on('fetchAttestation', () => setStepMsg('Getting Circle attestation...'));
      kit.on('mint', () => setStepMsg('Minting USDC on ' + CHAIN_LABELS[toChain] + '...'));
      setStepMsg('Starting bridge... Confirm in MetaMask.');
      await kit.bridge({ from: { adapter, chain: fromChain }, to: { adapter, chain: toChain }, amount });
      setStepMsg(''); setStatus('success'); setAmount('');
    } catch (err) {
      console.error(err);
      setStatus(err.code === 4001 || err.message?.includes('rejected') ? 'Transaction rejected by user.' : 'Error: ' + (err.shortMessage || err.message || String(err)));
      setStepMsg('');
    }
    setLoading(false);
  };

  const inp = { width: '100%', background: '#0D0F16', border: '1px solid ' + C.border, borderRadius: '10px', padding: '12px 16px', color: C.text, fontSize: '14px', outline: 'none', boxSizing: 'border-box', fontFamily: 'monospace' };

  return (
    <div style={{ padding: '28px' }}>
      <div style={{ marginBottom: '28px' }}>
        <h2 style={{ fontSize: '22px', fontWeight: '800', color: C.text, marginBottom: '6px', letterSpacing: '-0.5px' }}>
          <span style={{ color: C.accent }}>⇄</span> Bridge
        </h2>
        <p style={{ color: C.muted, fontSize: '13px', fontFamily: 'monospace' }}>Bridge USDC between Ethereum Sepolia and Arc Testnet via CCTP V2</p>
      </div>

      <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start' }}>
        <div style={{ background: C.card, border: '1px solid ' + C.border, borderRadius: '16px', padding: '28px', maxWidth: '480px', flex: 1 }}>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px', padding: '16px', background: '#0D0F16', border: '1px solid ' + C.border, borderRadius: '12px' }}>
            <div style={{ textAlign: 'center', flex: 1 }}>
              <div style={{ color: C.accent, fontWeight: '700', fontSize: '13px', fontFamily: 'monospace' }}>{CHAIN_LABELS[fromChain]}</div>
              <div style={{ color: C.muted, fontSize: '11px', marginTop: '2px' }}>From</div>
            </div>
            <button onClick={toggle} style={{ background: C.accent + '15', border: '1px solid ' + C.accent + '40', borderRadius: '50%', width: '36px', height: '36px', cursor: 'pointer', color: C.accent, fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>⇄</button>
            <div style={{ textAlign: 'center', flex: 1 }}>
              <div style={{ color: C.accent2, fontWeight: '700', fontSize: '13px', fontFamily: 'monospace' }}>{CHAIN_LABELS[toChain]}</div>
              <div style={{ color: C.muted, fontSize: '11px', marginTop: '2px' }}>To</div>
            </div>
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={{ color: C.muted, fontSize: '11px', fontWeight: '600', letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>Amount (USDC)</label>
            <input value={amount} onChange={e => { setAmount(e.target.value); setStatus(null); }} placeholder="0.00" type="number" style={inp} />
          </div>

          <button onClick={bridgeUSDC} disabled={loading || !account || !amount} style={{
            width: '100%', background: loading || !account || !amount ? C.border : C.accent,
            color: loading || !account || !amount ? C.muted : C.bg,
            border: 'none', padding: '14px', borderRadius: '12px',
            cursor: loading || !account || !amount ? 'not-allowed' : 'pointer',
            fontSize: '14px', fontWeight: '700',
          }}>
            {!account ? 'Connect Wallet' : loading ? 'Processing...' : `Bridge ${amount || '0'} USDC → ${CHAIN_LABELS[toChain]}`}
          </button>

          {stepMsg && (
            <div style={{ marginTop: '14px', padding: '12px 16px', background: '#0D0F16', border: '1px solid ' + C.accent + '30', borderRadius: '10px', color: C.accent, fontSize: '12px', fontFamily: 'monospace' }}>
              ⟳ {stepMsg}
            </div>
          )}
          {status && status !== 'success' && (
            <div style={{ marginTop: '14px', padding: '12px 16px', background: '#1a0d0d', border: '1px solid #ef444444', borderRadius: '10px', color: '#ef4444', fontSize: '12px', fontFamily: 'monospace' }}>{status}</div>
          )}
          {status === 'success' && (
            <div style={{ marginTop: '14px', padding: '16px', background: '#0a1f14', border: '1px solid ' + C.accent + '44', borderRadius: '10px' }}>
              <div style={{ color: C.accent, fontWeight: '700', marginBottom: '6px', fontSize: '13px' }}>✓ Bridge Complete!</div>
              <div style={{ color: C.sub, fontSize: '12px', fontFamily: 'monospace', marginBottom: '6px' }}>USDC successfully arrived on {CHAIN_LABELS[toChain]}</div>
              {txHash && <a href={`${CHAIN_EXPLORER[fromChain]}/tx/${txHash}`} target="_blank" rel="noreferrer" style={{ color: C.accent, fontSize: '12px', textDecoration: 'none' }}>View Tx ↗</a>}
            </div>
          )}
        </div>

        <div style={{ background: C.card, border: '1px solid ' + C.border, borderRadius: '16px', padding: '24px', minWidth: '200px' }}>
          <div style={{ color: C.muted, fontSize: '11px', fontWeight: '600', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '16px' }}>How It Works</div>
          {[
            { n: '1', t: 'Approve', d: 'One-time USDC approval', c: C.accent },
            { n: '2', t: 'Burn', d: 'USDC burned on source', c: C.accent },
            { n: '3', t: 'Attest', d: 'Circle verifies burn', c: C.accent2 },
            { n: '4', t: 'Mint', d: 'USDC minted on dest', c: C.accent },
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
            <div style={{ color: C.muted, fontSize: '10px', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Powered by</div>
            <div style={{ color: C.accent, fontSize: '12px', fontWeight: '700', fontFamily: 'monospace' }}>Circle Bridge Kit</div>
            <div style={{ color: C.sub, fontSize: '11px', fontFamily: 'monospace' }}>CCTP V2 Native Bridge</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Bridge;