import React, { useState } from 'react';
import { ethers } from 'ethers';
import { CONTRACTS, CHAINS, TOKEN_ABI } from '../utils/constants';

const C = {
  bg: '#0A0B0F', surface: '#111318', card: '#13161E', border: '#1E2130',
  accent: '#00E5A0', accent2: '#FF6B35', muted: '#5A6180', text: '#E8EAF2', sub: '#8890AA',
};

const Send = ({ account }) => {
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [token, setToken] = useState('USDC');
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [txHash, setTxHash] = useState(null);

  const sendTokens = async () => {
    if (!account) return alert('Please connect your wallet!');
    if (!recipient || !amount) return alert('Please enter address and amount!');
    if (!ethers.isAddress(recipient)) return alert('Invalid address!');
    setLoading(true);
    setStatus('Switching to Arc Testnet...');
    setTxHash(null);
    try {
      await window.ethereum.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: CHAINS.arc.chainId }] });
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const tokenAddress = token === 'USDC' ? CONTRACTS.arc.USDC : CONTRACTS.arc.EURC;
      const contract = new ethers.Contract(tokenAddress, TOKEN_ABI, signer);
      const decimals = await contract.decimals();
      const amountInUnits = ethers.parseUnits(amount, decimals);
      setStatus('Waiting for MetaMask approval...');
      const tx = await contract.transfer(recipient, amountInUnits);
      setStatus('Transaction sent, confirming...');
      await tx.wait();
      setTxHash(tx.hash);
      setStatus('success');
      setRecipient('');
      setAmount('');
    } catch (err) {
      console.error(err);
      setStatus('Error: ' + (err.reason || err.message));
    }
    setLoading(false);
  };

  const inp = {
    width: '100%', background: '#0D0F16', border: '1px solid ' + C.border,
    borderRadius: '10px', padding: '12px 16px', color: C.text,
    fontSize: '14px', outline: 'none', boxSizing: 'border-box', fontFamily: 'monospace',
  };

  return (
    <div style={{ padding: '28px' }}>
      <div style={{ marginBottom: '28px' }}>
        <h2 style={{ fontSize: '22px', fontWeight: '800', color: C.text, marginBottom: '6px', letterSpacing: '-0.5px' }}>
          <span style={{ color: C.accent }}>?</span> Send
        </h2>
        <p style={{ color: C.muted, fontSize: '13px', fontFamily: 'monospace' }}>Send USDC or EURC on Arc Testnet</p>
      </div>
      <div style={{ background: C.card, border: '1px solid ' + C.border, borderRadius: '16px', padding: '28px', maxWidth: '480px' }}>
        <div style={{ marginBottom: '20px' }}>
          <label style={{ color: C.muted, fontSize: '11px', fontWeight: '600', letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>Token</label>
          <div style={{ display: 'flex', gap: '8px' }}>
            {['USDC', 'EURC'].map(t => (
              <button key={t} onClick={() => setToken(t)} style={{
                flex: 1, padding: '10px', borderRadius: '10px',
                border: '1px solid ' + (token === t ? C.accent : C.border),
                background: token === t ? C.accent + '12' : '#0D0F16',
                color: token === t ? C.accent : C.muted,
                cursor: 'pointer', fontWeight: '700', fontSize: '13px', fontFamily: 'monospace',
              }}>{t}</button>
            ))}
          </div>
        </div>
        <div style={{ marginBottom: '20px' }}>
          <label style={{ color: C.muted, fontSize: '11px', fontWeight: '600', letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>Recipient Address</label>
          <input value={recipient} onChange={e => { setRecipient(e.target.value); setStatus(null); }} placeholder="0x..." style={inp} />
        </div>
        <div style={{ marginBottom: '24px' }}>
          <label style={{ color: C.muted, fontSize: '11px', fontWeight: '600', letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>Amount ({token})</label>
          <div style={{ background: '#0D0F16', border: '1px solid ' + C.border, borderRadius: '10px', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <input value={amount} onChange={e => { setAmount(e.target.value); setStatus(null); }} placeholder="0.00" type="number" style={{ ...inp, padding: 0, border: 'none', background: 'transparent', width: '140px' }} />
            <span style={{ color: token === 'USDC' ? C.accent : C.accent2, fontWeight: '700', fontSize: '13px', fontFamily: 'monospace' }}>{token}</span>
          </div>
        </div>
        <button onClick={sendTokens} disabled={loading || !account} style={{
          width: '100%',
          background: loading || !account ? C.border : C.accent,
          color: loading || !account ? C.muted : C.bg,
          border: 'none', padding: '14px', borderRadius: '12px',
          cursor: loading || !account ? 'not-allowed' : 'pointer',
          fontSize: '14px', fontWeight: '700',
        }}>
          {!account ? 'Connect Wallet' : loading ? 'Sending...' : 'Send ' + token + ' ?'}
        </button>
        {status && status !== 'success' && (
          <div style={{ marginTop: '14px', padding: '12px 16px', background: '#0D0F16', border: '1px solid ' + (status.startsWith('Error') ? '#ef444444' : C.border), borderRadius: '10px', color: status.startsWith('Error') ? '#ef4444' : C.sub, fontSize: '12px', fontFamily: 'monospace' }}>
            {status}
          </div>
        )}
        {status === 'success' && txHash && (
          <div style={{ marginTop: '14px', padding: '16px', background: '#0a1f14', border: '1px solid #00E5A044', borderRadius: '10px' }}>
            <div style={{ color: C.accent, fontWeight: '700', marginBottom: '8px', fontSize: '13px' }}>Successfully Sent!</div>
            <a href={'https://testnet.arcscan.app/tx/' + txHash} target="_blank" rel="noreferrer" style={{ color: C.accent, fontSize: '12px', wordBreak: 'break-all', textDecoration: 'none', fontFamily: 'monospace' }}>
              View on Explorer
            </a>
          </div>
        )}
        <div style={{ marginTop: '20px', padding: '12px 16px', background: '#0D0F16', border: '1px solid ' + C.border, borderRadius: '10px' }}>
          <div style={{ color: C.muted, fontSize: '10px', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Arc Testnet Contracts</div>
          <div style={{ color: C.sub, fontSize: '11px', fontFamily: 'monospace', marginBottom: '4px' }}>USDC: <span style={{ color: C.accent }}>{CONTRACTS.arc.USDC.slice(0, 10)}...</span></div>
          <div style={{ color: C.sub, fontSize: '11px', fontFamily: 'monospace' }}>EURC: <span style={{ color: C.accent2 }}>{CONTRACTS.arc.EURC.slice(0, 10)}...</span></div>
        </div>
      </div>
    </div>
  );
};

export default Send;
