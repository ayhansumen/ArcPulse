import React, { useEffect, useState, useCallback } from 'react';
import { ethers } from 'ethers';

const USDC_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "event Transfer(address indexed from, address indexed to, uint256 value)"
];

const ARC_USDC = '0x3600000000000000000000000000000000000000';
const ARC_EURC = '0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a';
const SEP_USDC = '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238';

const SEP_RPCS = [
  'https://ethereum-sepolia-rpc.publicnode.com',
  'https://sepolia.drpc.org',
  'https://rpc2.sepolia.org',
];

const C = {
  bg: '#0A0B0F', surface: '#111318', card: '#13161E', border: '#1E2130',
  accent: '#00E5A0', accent2: '#FF6B35', muted: '#5A6180', text: '#E8EAF2', sub: '#8890AA',
};

const Dashboard = ({ account }) => {
  const [arcUSDC, setArcUSDC] = useState(null);
  const [arcEURC, setArcEURC] = useState(null);
  const [sepoliaBalance, setSepoliaBalance] = useState(null);
  const [loading, setLoading] = useState(false);
  const [txList, setTxList] = useState([]);
  const [txLoading, setTxLoading] = useState(false);

  const fetchBalances = useCallback(async () => {
    if (!account) return;
    setLoading(true);
    try {
      const arcProvider = new ethers.JsonRpcProvider('https://rpc.testnet.arc.network');
      const usdcBal = await new ethers.Contract(ARC_USDC, USDC_ABI, arcProvider).balanceOf(account);
      setArcUSDC(ethers.formatUnits(usdcBal, 6));
      const eurcBal = await new ethers.Contract(ARC_EURC, USDC_ABI, arcProvider).balanceOf(account);
      setArcEURC(ethers.formatUnits(eurcBal, 6));
      let sepBal = null;
      for (const rpc of SEP_RPCS) {
        try {
          const sepProvider = new ethers.JsonRpcProvider(rpc);
          sepBal = await new ethers.Contract(SEP_USDC, USDC_ABI, sepProvider).balanceOf(account);
          break;
        } catch (e) { continue; }
      }
      if (sepBal !== null) setSepoliaBalance(ethers.formatUnits(sepBal, 6));
    } catch (err) { console.error(err); }
    setLoading(false);
  }, [account]);

  const fetchHistory = useCallback(async () => {
    if (!account) return;
    setTxLoading(true);
    try {
      const provider = new ethers.JsonRpcProvider('https://rpc.testnet.arc.network');
      const usdcContract = new ethers.Contract(ARC_USDC, USDC_ABI, provider);
      const eurcContract = new ethers.Contract(ARC_EURC, USDC_ABI, provider);
      const currentBlock = await provider.getBlockNumber();
      const fromBlock = Math.max(0, currentBlock - 10000);
      const [usdcSent, usdcReceived, eurcSent, eurcReceived] = await Promise.all([
        usdcContract.queryFilter(usdcContract.filters.Transfer(account, null), fromBlock),
        usdcContract.queryFilter(usdcContract.filters.Transfer(null, account), fromBlock),
        eurcContract.queryFilter(eurcContract.filters.Transfer(account, null), fromBlock),
        eurcContract.queryFilter(eurcContract.filters.Transfer(null, account), fromBlock),
      ]);
      const allEvents = [
        ...usdcSent.map(e => ({ ...e, token: 'USDC' })),
        ...usdcReceived.map(e => ({ ...e, token: 'USDC' })),
        ...eurcSent.map(e => ({ ...e, token: 'EURC' })),
        ...eurcReceived.map(e => ({ ...e, token: 'EURC' })),
      ].sort((a, b) => b.blockNumber - a.blockNumber).slice(0, 8);
      setTxList(allEvents.map(e => ({
        hash: e.transactionHash, from: e.args.from, to: e.args.to,
        amount: ethers.formatUnits(e.args.value, 6), block: e.blockNumber,
        token: e.token,
        type: e.args.from.toLowerCase() === account.toLowerCase() ? 'sent' : 'received'
      })));
    } catch (err) { console.error(err); }
    setTxLoading(false);
  }, [account]);

  useEffect(() => {
    if (account) {
      fetchBalances();
      fetchHistory();
      const interval = setInterval(() => { fetchBalances(); fetchHistory(); }, 30000);
      return () => clearInterval(interval);
    }
  }, [account, fetchBalances, fetchHistory]);

  const quickLinks = [
    { label: 'Circle Faucet', desc: 'Get free USDC & EURC', url: 'https://faucet.circle.com', color: C.accent },
    { label: 'Arc Explorer', desc: 'View transactions', url: 'https://testnet.arcscan.app', color: C.accent },
    { label: 'Arc Docs', desc: 'Developer documentation', url: 'https://docs.arc.network', color: C.accent2 },
    { label: 'Circle Console', desc: 'API keys & tools', url: 'https://console.circle.com', color: C.accent },
    { label: 'Sepolia Faucet', desc: 'Get testnet ETH', url: 'https://sepoliafaucet.com', color: C.accent2 },
    { label: 'Arc Community', desc: 'Discord & support', url: 'https://community.arc.network', color: C.accent },
  ];

  if (!account) return (
    <div style={{ padding: '28px' }}>
      <div style={{ marginBottom: '28px' }}>
        <h2 style={{ fontSize: '22px', fontWeight: '800', color: C.text, marginBottom: '6px', letterSpacing: '-0.5px' }}>
          <span style={{ color: C.accent }}>◈</span> Dashboard
        </h2>
        <p style={{ color: C.muted, fontSize: '13px', fontFamily: 'monospace' }}>Manage your USDC and EURC across chains</p>
      </div>
      <div style={{ textAlign: 'center', padding: '60px', color: C.muted, background: C.card, borderRadius: '16px', border: '1px solid ' + C.border, fontFamily: 'monospace' }}>
        Connect your wallet to continue
      </div>
    </div>
  );

  return (
    <div style={{ padding: '28px' }}>
      <div style={{ marginBottom: '28px' }}>
        <h2 style={{ fontSize: '22px', fontWeight: '800', color: C.text, marginBottom: '6px', letterSpacing: '-0.5px' }}>
          <span style={{ color: C.accent }}>◈</span> Dashboard
        </h2>
        <p style={{ color: C.muted, fontSize: '13px', fontFamily: 'monospace' }}>Manage your USDC and EURC across chains</p>
      </div>

      {/* Bakiye Kartları */}
      <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
        {[
          { label: 'Arc USDC Balance', value: arcUSDC, symbol: 'USDC', color: C.accent, net: 'Arc Testnet' },
          { label: 'Arc EURC Balance', value: arcEURC, symbol: 'EURC', color: C.accent2, net: 'Arc Testnet' },
          { label: 'Sepolia USDC Balance', value: sepoliaBalance, symbol: 'USDC', color: C.accent, net: 'Ethereum Sepolia' },
        ].map((card, i) => (
          <div key={i} style={{ background: C.card, border: '1px solid ' + card.color + '30', borderRadius: '16px', padding: '24px', flex: 1 }}>
            <div style={{ color: C.muted, fontSize: '11px', fontWeight: '600', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '10px' }}>{card.label}</div>
            <div style={{ fontSize: '26px', fontWeight: '800', color: card.color, fontFamily: 'monospace' }}>
              {loading ? '...' : card.value !== null ? parseFloat(card.value).toFixed(2) : '-'}
              <span style={{ fontSize: '14px', marginLeft: '6px', fontWeight: '600' }}>{card.symbol}</span>
            </div>
            <div style={{ marginTop: '10px' }}>
              <span style={{ color: card.color, fontSize: '11px', fontWeight: '600', background: card.color + '15', padding: '3px 10px', borderRadius: '20px', fontFamily: 'monospace' }}>
                {card.net}
              </span>
            </div>
          </div>
        ))}
      </div>

      <button onClick={() => { fetchBalances(); fetchHistory(); }} style={{
        background: C.card, color: C.accent, border: '1px solid ' + C.border,
        padding: '9px 20px', borderRadius: '10px', cursor: 'pointer',
        fontSize: '13px', fontWeight: '700', marginBottom: '28px', fontFamily: 'monospace',
      }}>
        {loading ? 'Refreshing...' : '↻ Refresh'}
      </button>

      {/* Network Info + Quick Links */}
      <div style={{ display: 'flex', gap: '16px', marginBottom: '28px' }}>
        <div style={{ background: C.card, border: '1px solid ' + C.border, borderRadius: '16px', padding: '24px', flex: 1 }}>
          <div style={{ fontWeight: '700', fontSize: '13px', color: C.text, marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Network Info</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            {[
              { label: 'Network', value: 'Arc Testnet' },
              { label: 'Chain ID', value: '5042002' },
              { label: 'RPC', value: 'rpc.testnet.arc.network' },
              { label: 'Gas Token', value: 'USDC' },
              { label: 'Finality', value: 'Sub-second' },
              { label: 'EVM', value: 'Compatible' },
            ].map((item, i) => (
              <div key={i}>
                <div style={{ color: C.muted, fontSize: '10px', marginBottom: '3px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{item.label}</div>
                <div style={{ color: C.text, fontSize: '13px', fontWeight: '600', fontFamily: 'monospace' }}>{item.value}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ background: C.card, border: '1px solid ' + C.border, borderRadius: '16px', padding: '24px', flex: 2 }}>
          <div style={{ fontWeight: '700', fontSize: '13px', color: C.text, marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Quick Links</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
            {quickLinks.map((link, i) => (
              <a key={i} href={link.url} target="_blank" rel="noreferrer" style={{
                textDecoration: 'none', display: 'flex', alignItems: 'center',
                gap: '10px', padding: '10px 12px', background: '#0D0F16',
                border: '1px solid ' + C.border, borderRadius: '10px',
              }}>
                <div style={{ width: '30px', height: '30px', borderRadius: '8px', background: link.color + '15', display: 'flex', alignItems: 'center', justifyContent: 'center', color: link.color, fontWeight: '800', fontSize: '13px', flexShrink: 0 }}>
                  {link.label[0]}
                </div>
                <div>
                  <div style={{ color: C.text, fontWeight: '600', fontSize: '12px' }}>{link.label}</div>
                  <div style={{ color: C.muted, fontSize: '11px' }}>{link.desc}</div>
                </div>
              </a>
            ))}
          </div>
        </div>
      </div>

      {/* Son İşlemler */}
      <div>
        <div style={{ fontWeight: '700', fontSize: '13px', color: C.text, marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Recent Transactions</div>
        {txLoading ? (
          <div style={{ color: C.muted, padding: '20px', textAlign: 'center', fontFamily: 'monospace', fontSize: '13px' }}>Loading...</div>
        ) : txList.length === 0 ? (
          <div style={{ color: C.muted, padding: '24px', textAlign: 'center', background: C.card, borderRadius: '12px', border: '1px solid ' + C.border, fontFamily: 'monospace', fontSize: '13px' }}>
            No recent transactions on Arc Testnet
          </div>
        ) : (
          <div style={{ background: C.card, border: '1px solid ' + C.border, borderRadius: '16px', overflow: 'hidden' }}>
            {txList.map((tx, i) => (
              <div key={i} style={{ padding: '14px 20px', borderBottom: i < txList.length - 1 ? '1px solid ' + C.border : 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '34px', height: '34px', borderRadius: '8px', background: tx.type === 'sent' ? '#ef444415' : C.accent + '15', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', color: tx.type === 'sent' ? '#ef4444' : C.accent, fontWeight: '700' }}>
                    {tx.type === 'sent' ? '↑' : '↓'}
                  </div>
                  <div>
                    <div style={{ fontWeight: '600', fontSize: '13px', color: C.text, marginBottom: '2px' }}>
                      {tx.type === 'sent' ? 'Sent' : 'Received'} {tx.token}
                    </div>
                    <div style={{ color: C.muted, fontSize: '11px', marginBottom: '2px', fontFamily: 'monospace' }}>
                      {tx.type === 'sent' ? 'To: ' + tx.to.slice(0, 8) + '...' + tx.to.slice(-4) : 'From: ' + tx.from.slice(0, 8) + '...' + tx.from.slice(-4)}
                    </div>
                    <a href={`https://testnet.arcscan.app/tx/${tx.hash}`} target="_blank" rel="noreferrer" style={{ color: C.accent, fontSize: '11px', textDecoration: 'none', fontFamily: 'monospace' }}>
                      View ↗
                    </a>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: '700', fontSize: '14px', color: tx.type === 'sent' ? '#ef4444' : C.accent, fontFamily: 'monospace' }}>
                    {tx.type === 'sent' ? '-' : '+'}{parseFloat(tx.amount).toFixed(2)} {tx.token}
                  </div>
                  <div style={{ color: C.muted, fontSize: '11px', fontFamily: 'monospace' }}>Block {tx.block}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;