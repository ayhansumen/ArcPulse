import React, { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { CONTRACTS } from '../utils/constants';

const ESCROW_ADDRESS = CONTRACTS.arc.ESCROW;

const ESCROW_ABI = [
  "function createPayment(address recipient, address arbiter, address token, uint256 amount, string calldata description) external returns (uint256)",
  "function approvePayment(uint256 id) external",
  "function refundPayment(uint256 id) external",
  "function disputePayment(uint256 id) external",
  "function getPayment(uint256 id) external view returns (tuple(address sender, address recipient, address arbiter, address token, uint256 amount, uint8 state, string description))",
  "function paymentCount() external view returns (uint256)",
  "event PaymentCreated(uint256 indexed id, address sender, address recipient, uint256 amount, address token, string description)",
  "event PaymentCompleted(uint256 indexed id)",
  "event PaymentRefunded(uint256 indexed id)",
  "event PaymentDisputed(uint256 indexed id)",
];

const TOKEN_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
];

const USDC = CONTRACTS.arc.USDC;
const EURC = CONTRACTS.arc.EURC;
const ARC_CHAIN_ID = '0x4cef52';
const ARC_RPC = 'https://rpc.testnet.arc.network';
const EXPLORER = 'https://testnet.arcscan.app/tx/';

const STATE_LABELS = ['Pending', 'Completed', 'Refunded', 'Disputed'];
const STATE_COLORS = ['#FF6B35', '#00E5A0', '#ef4444', '#a855f7'];

const C = {
  bg: '#0A0B0F', surface: '#111318', card: '#13161E', border: '#1E2130',
  accent: '#00E5A0', accent2: '#FF6B35', muted: '#5A6180', text: '#E8EAF2', sub: '#8890AA',
};

const switchToArc = async () => {
  try {
    await window.ethereum.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: ARC_CHAIN_ID }] });
  } catch (err) { if (err.code === 4001) throw err; }
  await new Promise(r => setTimeout(r, 1000));
};

const RefundPay = ({ account }) => {
  const [tab, setTab] = useState('create');
  const [token, setToken] = useState('USDC');
  const [recipient, setRecipient] = useState('');
  const [arbiter, setArbiter] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [txHash, setTxHash] = useState(null);
  const [payments, setPayments] = useState([]);
  const [balance, setBalance] = useState(null);

  const tokenAddress = token === 'USDC' ? USDC : EURC;

  const fetchBalance = useCallback(async () => {
    if (!account) return;
    try {
      const provider = new ethers.JsonRpcProvider(ARC_RPC);
      const contract = new ethers.Contract(tokenAddress, TOKEN_ABI, provider);
      const bal = await contract.balanceOf(account);
      setBalance(ethers.formatUnits(bal, 6));
    } catch (e) {}
  }, [account, tokenAddress]);

  const fetchPayments = useCallback(async () => {
    if (!account) return;
    try {
      const provider = new ethers.JsonRpcProvider(ARC_RPC);
      const escrow = new ethers.Contract(ESCROW_ADDRESS, ESCROW_ABI, provider);
      const count = await escrow.paymentCount();
      const total = Number(count);
      const results = [];
      for (let i = total - 1; i >= Math.max(0, total - 20); i--) {
        try {
          const p = await escrow.getPayment(i);
          if (
            p.sender.toLowerCase() === account.toLowerCase() ||
            p.recipient.toLowerCase() === account.toLowerCase() ||
            p.arbiter.toLowerCase() === account.toLowerCase()
          ) {
            results.push({
              id: i, sender: p.sender, recipient: p.recipient, arbiter: p.arbiter,
              token: p.token.toLowerCase() === USDC.toLowerCase() ? 'USDC' : 'EURC',
              amount: ethers.formatUnits(p.amount, 6),
              state: Number(p.state), description: p.description,
            });
          }
        } catch (e) {}
      }
      setPayments(results);
    } catch (e) { console.error(e); }
  }, [account]);

  useEffect(() => { fetchBalance(); fetchPayments(); }, [fetchBalance, fetchPayments]);

  const createPayment = async () => {
    if (!account) return setStatus('Please connect your wallet!');
    if (!recipient || !amount || !description) return setStatus('Please fill all required fields!');
    if (!ethers.isAddress(recipient)) return setStatus('Invalid recipient address!');
    if (arbiter && !ethers.isAddress(arbiter)) return setStatus('Invalid arbiter address!');
    if (parseFloat(amount) <= 0) return setStatus('Amount must be greater than 0');
    setLoading(true); setStatus(null); setTxHash(null);
    try {
      setStatus('Switching to Arc Testnet...');
      await switchToArc();
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const tokenContract = new ethers.Contract(tokenAddress, TOKEN_ABI, signer);
      const escrowContract = new ethers.Contract(ESCROW_ADDRESS, ESCROW_ABI, signer);
      const amountUnits = ethers.parseUnits(amount, 6);
      const bal = await tokenContract.balanceOf(account);
      if (bal < amountUnits) { setStatus(`Insufficient ${token} balance`); setLoading(false); return; }
      setStatus('Checking allowance...');
      const allowance = await tokenContract.allowance(account, ESCROW_ADDRESS);
      if (allowance < amountUnits) {
        setStatus(`Approving ${token}... Confirm in MetaMask.`);
        const approveTx = await tokenContract.approve(ESCROW_ADDRESS, amountUnits);
        await approveTx.wait();
      }
      setStatus('Creating escrow... Confirm in MetaMask.');
      const arbiterAddr = arbiter && ethers.isAddress(arbiter) ? arbiter : ethers.ZeroAddress;
      const tx = await escrowContract.createPayment(recipient, arbiterAddr, tokenAddress, amountUnits, description);
      setStatus('Waiting for confirmation...');
      await tx.wait();
      setTxHash(tx.hash);
      setStatus('success');
      setRecipient(''); setArbiter(''); setAmount(''); setDescription('');
      fetchBalance(); fetchPayments();
    } catch (err) {
      console.error(err);
      setStatus(err.code === 4001 || err.message?.includes('rejected') ? 'Transaction rejected by user.' : 'Error: ' + (err.shortMessage || err.reason || err.message));
    }
    setLoading(false);
  };

  const approvePayment = async (id) => {
    setLoading(true);
    try {
      await switchToArc();
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const escrow = new ethers.Contract(ESCROW_ADDRESS, ESCROW_ABI, signer);
      setStatus('Approving payment... Confirm in MetaMask.');
      const tx = await escrow.approvePayment(id);
      await tx.wait();
      setStatus('success_approve'); fetchPayments(); fetchBalance();
    } catch (err) { setStatus('Error: ' + (err.shortMessage || err.reason || err.message)); }
    setLoading(false);
  };

  const refundPayment = async (id) => {
    setLoading(true);
    try {
      await switchToArc();
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const escrow = new ethers.Contract(ESCROW_ADDRESS, ESCROW_ABI, signer);
      setStatus('Refunding payment... Confirm in MetaMask.');
      const tx = await escrow.refundPayment(id);
      await tx.wait();
      setStatus('success_refund'); fetchPayments(); fetchBalance();
    } catch (err) { setStatus('Error: ' + (err.shortMessage || err.reason || err.message)); }
    setLoading(false);
  };

  const disputePayment = async (id) => {
    setLoading(true);
    try {
      await switchToArc();
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const escrow = new ethers.Contract(ESCROW_ADDRESS, ESCROW_ABI, signer);
      setStatus('Disputing payment... Confirm in MetaMask.');
      const tx = await escrow.disputePayment(id);
      await tx.wait();
      setStatus('success_dispute'); fetchPayments();
    } catch (err) { setStatus('Error: ' + (err.shortMessage || err.reason || err.message)); }
    setLoading(false);
  };

  const inp = { width: '100%', background: '#0D0F16', border: '1px solid ' + C.border, borderRadius: '10px', padding: '12px 16px', color: C.text, fontSize: '14px', outline: 'none', boxSizing: 'border-box', fontFamily: 'monospace' };

  return (
    <div style={{ padding: '28px' }}>
      <div style={{ marginBottom: '28px' }}>
        <h2 style={{ fontSize: '22px', fontWeight: '800', color: C.text, marginBottom: '6px', letterSpacing: '-0.5px' }}>
          <span style={{ color: C.accent2 }}>🛡</span> Refund Pay
        </h2>
        <p style={{ color: C.muted, fontSize: '13px', fontFamily: 'monospace' }}>Secure escrow payments with on-chain chargeback protection</p>
      </div>

      <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start' }}>
        <div style={{ background: C.card, border: '1px solid ' + C.border, borderRadius: '16px', padding: '28px', maxWidth: '560px', flex: 1 }}>

          <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
            {[['create', 'Create Payment'], ['manage', 'My Payments']].map(([key, label]) => (
              <button key={key} onClick={() => { setTab(key); setStatus(null); }} style={{
                flex: 1, padding: '10px', borderRadius: '10px',
                border: '1px solid ' + (tab === key ? C.accent : C.border),
                background: tab === key ? C.accent + '12' : '#0D0F16',
                color: tab === key ? C.accent : C.muted,
                cursor: 'pointer', fontWeight: '700', fontSize: '13px',
              }}>{label}</button>
            ))}
          </div>

          {tab === 'create' ? (
            <>
              {balance !== null && (
                <div style={{ marginBottom: '16px', padding: '10px 14px', background: '#0D0F16', border: '1px solid ' + C.border, borderRadius: '10px', display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: C.muted, fontSize: '12px' }}>{token} Balance (Arc)</span>
                  <span style={{ color: C.accent, fontWeight: '700', fontSize: '12px', fontFamily: 'monospace' }}>{parseFloat(balance).toFixed(2)} {token}</span>
                </div>
              )}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ color: C.muted, fontSize: '11px', fontWeight: '600', letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>Token</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {['USDC', 'EURC'].map(t => (
                    <button key={t} onClick={() => { setToken(t); setBalance(null); }} style={{
                      flex: 1, padding: '10px', borderRadius: '10px',
                      border: '1px solid ' + (token === t ? C.accent : C.border),
                      background: token === t ? C.accent + '12' : '#0D0F16',
                      color: token === t ? C.accent : C.muted,
                      cursor: 'pointer', fontWeight: '700', fontSize: '13px', fontFamily: 'monospace',
                    }}>{t}</button>
                  ))}
                </div>
              </div>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ color: C.muted, fontSize: '11px', fontWeight: '600', letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>Recipient Address</label>
                <input value={recipient} onChange={e => { setRecipient(e.target.value); setStatus(null); }} placeholder="0x..." style={inp} />
              </div>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ color: C.muted, fontSize: '11px', fontWeight: '600', letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>
                  Arbiter Address <span style={{ color: C.border, fontWeight: '400', textTransform: 'none', letterSpacing: 0 }}>(optional)</span>
                </label>
                <input value={arbiter} onChange={e => { setArbiter(e.target.value); setStatus(null); }} placeholder="0x..." style={inp} />
              </div>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ color: C.muted, fontSize: '11px', fontWeight: '600', letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>Amount ({token})</label>
                <input value={amount} onChange={e => { setAmount(e.target.value); setStatus(null); }} placeholder="0.00" type="number" style={inp} />
              </div>
              <div style={{ marginBottom: '24px' }}>
                <label style={{ color: C.muted, fontSize: '11px', fontWeight: '600', letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>Description</label>
                <input value={description} onChange={e => { setDescription(e.target.value); setStatus(null); }} placeholder="e.g. Payment for web design" style={inp} />
              </div>
              <button onClick={createPayment} disabled={loading || !account} style={{
                width: '100%',
                background: loading || !account ? C.border : C.accent,
                color: loading || !account ? C.muted : C.bg,
                border: 'none', padding: '14px', borderRadius: '12px',
                cursor: loading || !account ? 'not-allowed' : 'pointer', fontSize: '14px', fontWeight: '700',
              }}>
                {!account ? 'Connect Wallet' : loading ? 'Processing...' : `Lock ${amount || '0'} ${token} in Escrow`}
              </button>
              {status && !status.startsWith('success') && (
                <div style={{ marginTop: '14px', padding: '12px 16px', borderRadius: '10px', fontSize: '12px', fontFamily: 'monospace',
                  background: status.startsWith('Error') ? '#1a0d0d' : '#0D0F16',
                  border: '1px solid ' + (status.startsWith('Error') ? '#ef444444' : C.border),
                  color: status.startsWith('Error') ? '#ef4444' : C.sub,
                }}>{status}</div>
              )}
              {status === 'success' && (
                <div style={{ marginTop: '14px', padding: '16px', background: '#0a1f14', border: '1px solid ' + C.accent + '44', borderRadius: '10px' }}>
                  <div style={{ color: C.accent, fontWeight: '700', marginBottom: '6px', fontSize: '13px' }}>✓ Escrow Created!</div>
                  <div style={{ color: C.sub, fontSize: '12px', fontFamily: 'monospace', marginBottom: '6px' }}>{amount} {token} locked. Recipient delivers → you approve.</div>
                  {txHash && <a href={EXPLORER + txHash} target="_blank" rel="noreferrer" style={{ color: C.accent, fontSize: '12px', textDecoration: 'none' }}>View on Explorer ↗</a>}
                </div>
              )}
            </>
          ) : (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <span style={{ color: C.muted, fontSize: '12px', fontFamily: 'monospace' }}>{payments.length} payment(s)</span>
                <button onClick={fetchPayments} style={{ background: 'none', border: '1px solid ' + C.border, borderRadius: '8px', color: C.accent, padding: '4px 12px', cursor: 'pointer', fontSize: '12px' }}>↻ Refresh</button>
              </div>
              {status && status.startsWith('success_') && (
                <div style={{ marginBottom: '14px', padding: '12px', background: '#0a1f14', border: '1px solid ' + C.accent + '44', borderRadius: '10px', color: C.accent, fontSize: '12px', fontFamily: 'monospace' }}>
                  ✓ {status === 'success_approve' ? 'Payment approved!' : status === 'success_refund' ? 'Payment refunded!' : 'Payment disputed!'}
                </div>
              )}
              {status && status.startsWith('Error') && (
                <div style={{ marginBottom: '14px', padding: '12px', background: '#1a0d0d', border: '1px solid #ef444444', borderRadius: '10px', color: '#ef4444', fontSize: '12px', fontFamily: 'monospace' }}>{status}</div>
              )}
              {payments.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: C.muted, fontSize: '13px' }}>No payments found. Create one!</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {payments.map((p) => (
                    <div key={p.id} style={{ background: '#0D0F16', borderRadius: '12px', padding: '16px', border: '1px solid ' + C.border }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <span style={{ color: C.text, fontWeight: '700', fontFamily: 'monospace' }}>#{p.id} — {p.amount} {p.token}</span>
                        <span style={{ color: STATE_COLORS[p.state], fontSize: '11px', fontWeight: '700', background: STATE_COLORS[p.state] + '18', padding: '2px 10px', borderRadius: '20px', fontFamily: 'monospace' }}>
                          {STATE_LABELS[p.state]}
                        </span>
                      </div>
                      <div style={{ color: C.sub, fontSize: '12px', marginBottom: '6px' }}>{p.description}</div>
                      <div style={{ color: C.muted, fontSize: '11px', marginBottom: '2px', fontFamily: 'monospace' }}>Sender: {p.sender.slice(0, 10)}...{p.sender.slice(-4)}</div>
                      <div style={{ color: C.muted, fontSize: '11px', marginBottom: '2px', fontFamily: 'monospace' }}>Recipient: {p.recipient.slice(0, 10)}...{p.recipient.slice(-4)}</div>
                      <div style={{ color: C.muted, fontSize: '11px', marginBottom: '12px', fontFamily: 'monospace' }}>Arbiter: {p.arbiter.slice(0, 10)}...{p.arbiter.slice(-4)}</div>
                      {p.state === 0 && (
                        <div style={{ display: 'flex', gap: '8px' }}>
                          {p.sender.toLowerCase() === account?.toLowerCase() && (
                            <button onClick={() => approvePayment(p.id)} disabled={loading} style={{ flex: 1, padding: '8px', borderRadius: '8px', border: 'none', background: C.accent + '18', color: C.accent, cursor: 'pointer', fontWeight: '700', fontSize: '12px' }}>✓ Approve</button>
                          )}
                          {(p.sender.toLowerCase() === account?.toLowerCase() || p.recipient.toLowerCase() === account?.toLowerCase()) && (
                            <button onClick={() => disputePayment(p.id)} disabled={loading} style={{ flex: 1, padding: '8px', borderRadius: '8px', border: 'none', background: '#a855f718', color: '#a855f7', cursor: 'pointer', fontWeight: '700', fontSize: '12px' }}>⚠ Dispute</button>
                          )}
                          {p.arbiter.toLowerCase() === account?.toLowerCase() && (
                            <button onClick={() => refundPayment(p.id)} disabled={loading} style={{ flex: 1, padding: '8px', borderRadius: '8px', border: 'none', background: '#ef444418', color: '#ef4444', cursor: 'pointer', fontWeight: '700', fontSize: '12px' }}>↩ Refund</button>
                          )}
                        </div>
                      )}
                      {p.state === 3 && p.arbiter.toLowerCase() === account?.toLowerCase() && (
                        <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                          <button onClick={() => approvePayment(p.id)} disabled={loading} style={{ flex: 1, padding: '8px', borderRadius: '8px', border: 'none', background: C.accent + '18', color: C.accent, cursor: 'pointer', fontWeight: '700', fontSize: '12px' }}>✓ Release to Recipient</button>
                          <button onClick={() => refundPayment(p.id)} disabled={loading} style={{ flex: 1, padding: '8px', borderRadius: '8px', border: 'none', background: '#ef444418', color: '#ef4444', cursor: 'pointer', fontWeight: '700', fontSize: '12px' }}>↩ Refund to Sender</button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        <div style={{ background: C.card, border: '1px solid ' + C.border, borderRadius: '16px', padding: '24px', minWidth: '220px' }}>
          <div style={{ color: C.muted, fontSize: '11px', fontWeight: '600', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '16px' }}>How It Works</div>
          {[
            { step: '1', title: 'Lock', desc: 'USDC locked in smart contract', color: C.accent },
            { step: '2', title: 'Deliver', desc: 'Recipient delivers service', color: C.accent },
            { step: '3', title: 'Approve', desc: 'Sender releases payment', color: C.accent },
            { step: '4', title: 'Dispute', desc: 'Arbiter resolves if needed', color: C.accent2 },
          ].map((item, i) => (
            <div key={i} style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
              <div style={{ width: '26px', height: '26px', borderRadius: '50%', background: item.color + '15', border: '1px solid ' + item.color + '50', display: 'flex', alignItems: 'center', justifyContent: 'center', color: item.color, fontSize: '11px', fontWeight: '700', flexShrink: 0, fontFamily: 'monospace' }}>{item.step}</div>
              <div>
                <div style={{ color: C.text, fontSize: '12px', fontWeight: '600', marginBottom: '2px' }}>{item.title}</div>
                <div style={{ color: C.muted, fontSize: '11px' }}>{item.desc}</div>
              </div>
            </div>
          ))}
          <div style={{ padding: '12px', background: '#0D0F16', border: '1px solid ' + C.border, borderRadius: '10px', marginTop: '8px' }}>
            <div style={{ color: C.muted, fontSize: '10px', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Contract</div>
            <div style={{ color: C.accent, fontSize: '10px', wordBreak: 'break-all', fontFamily: 'monospace' }}>{ESCROW_ADDRESS}</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RefundPay;