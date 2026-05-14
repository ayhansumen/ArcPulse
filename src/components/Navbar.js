import React from 'react';

const Navbar = ({ account, connectWallet, disconnectWallet, activePage, setActivePage }) => {
  const pages = [
    { id: 'dashboard', label: 'Dashboard', icon: '◈' },
    { id: 'bridge', label: 'Bridge', icon: '⇄' },
    { id: 'send', label: 'Send', icon: '↗' },
    { id: 'swap', label: 'Swap', icon: '↺' },
    { id: 'refundpay', label: 'Refund Pay', icon: '⟳' },
    { id: 'history', label: 'History', icon: '◷' },
  ];

  return (
    <header style={{
      padding: '0 24px',
      borderBottom: '1px solid #1E2130',
      background: '#111318',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      height: '64px',
      position: 'sticky',
      top: 0,
      zIndex: 100,
    }}>
      <h1 style={{
        fontSize: '22px',
        fontWeight: '800',
        color: '#E8EAF2',
        minWidth: '120px',
        letterSpacing: '-0.5px',
      }}>
        Arc<span style={{ color: '#00E5A0' }}>Pulse</span>
      </h1>

      <nav style={{ display: 'flex', gap: '4px' }}>
        {pages.map(page => (
          <button
            key={page.id}
            onClick={() => setActivePage(page.id)}
            style={{
              background: activePage === page.id ? 'rgba(0,229,160,0.08)' : 'transparent',
              color: activePage === page.id ? '#00E5A0' : '#5A6180',
              border: activePage === page.id ? '1px solid rgba(0,229,160,0.2)' : '1px solid transparent',
              padding: '8px 14px',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.2s',
            }}
          >
            <span>{page.icon}</span>
            {page.label}
          </button>
        ))}
      </nav>

      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        {account && (
          <button onClick={disconnectWallet} style={{
            background: 'transparent',
            color: '#5A6180',
            border: '1px solid #1E2130',
            padding: '8px 12px',
            borderRadius: '10px',
            cursor: 'pointer',
            fontSize: '12px',
            fontWeight: '600',
          }}>
            Disconnect
          </button>
        )}
        <button onClick={connectWallet} style={{
          background: account ? '#13161E' : '#00E5A0',
          color: account ? '#E8EAF2' : '#0A0B0F',
          border: account ? '1px solid #1E2130' : 'none',
          padding: '8px 18px',
          borderRadius: '10px',
          cursor: 'pointer',
          fontSize: '13px',
          fontWeight: '700',
          minWidth: '140px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}>
          {account && (
            <span style={{
              width: '6px',
              height: '6px',
              background: '#00E5A0',
              borderRadius: '50%',
              display: 'inline-block',
            }} />
          )}
          {account
            ? `${account.slice(0, 6)}...${account.slice(-4)}`
            : 'Connect Wallet'}
        </button>
      </div>
    </header>
  );
};

export default Navbar;