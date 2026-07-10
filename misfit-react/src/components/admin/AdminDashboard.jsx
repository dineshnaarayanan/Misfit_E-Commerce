/* ═══════════════════════════════════════════════════
   AdminDashboard.jsx — MisFit Admin Control Panel
   Fresh rebuild: clean sidebar + 6 content sections
═══════════════════════════════════════════════════ */
import { useState, useEffect, useCallback, useRef } from 'react';

// ── Section Components ─────────────────────────────
import AdminOverview  from './AdminOverview';
import AdminOrders    from './AdminOrders';
import AdminCustomers from './AdminCustomers';
import AdminProducts  from './AdminProducts';
import AdminPayments  from './AdminPayments';
import AdminTracking  from './AdminTracking';

const NAV = [
  { key: 'overview',   icon: '', label: 'Dashboard' },
  { key: 'orders',     icon: '', label: 'Orders'    },
  { key: 'tracking',   icon: '', label: 'Tracking'  },
  { key: 'customers',  icon: '', label: 'Customers' },
  { key: 'products',   icon: '', label: 'Products'  },
  { key: 'payments',   icon: '', label: 'Payments'  },
];

export default function AdminDashboard({ token, adminName, onLogout, showToast }) {
  const [tab,       setTab]       = useState('overview');
  const [sideOpen,  setSideOpen]  = useState(true);
  const [warnMsg,   setWarnMsg]   = useState('');
  const inactTimer  = useRef(null);
  const warnTimer   = useRef(null);

  // Always land on Dashboard (overview) when panel opens
  useEffect(() => { setTab('overview'); }, []);

  // ── Inactivity auto-logout ──────────────────────
  const resetTimer = useCallback(() => {
    clearTimeout(inactTimer.current);
    clearTimeout(warnTimer.current);
    warnTimer.current = setTimeout(() => {
      setWarnMsg('No activity detected. You will be logged out in 60 seconds.');
    }, 14 * 60 * 1000);
    inactTimer.current = setTimeout(() => {
      showToast?.('Session expired due to inactivity.', 'error');
      onLogout?.();
    }, 15 * 60 * 1000);
  }, [onLogout, showToast]);

  useEffect(() => {
    const events = ['mousemove', 'keydown', 'click', 'scroll'];
    events.forEach(e => window.addEventListener(e, resetTimer));
    resetTimer();
    return () => {
      events.forEach(e => window.removeEventListener(e, resetTimer));
      clearTimeout(inactTimer.current);
      clearTimeout(warnTimer.current);
    };
  }, [resetTimer]);

  // Esc to exit
  useEffect(() => {
    const onKey = e => { if (e.key === 'Escape') onLogout?.(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onLogout]);

  const toast = (msg, type = 'success') => showToast?.(msg, type);

  const activeTab = NAV.find(n => n.key === tab);

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      display: 'flex', background: '#f1f5f9',
      fontFamily: 'var(--font-body)',
    }}>

      {/* ══════ SIDEBAR ══════ */}
      <aside style={{
        width: sideOpen ? 240 : 64,
        flexShrink: 0,
        background: '#1e1b4b',
        display: 'flex', flexDirection: 'column',
        transition: 'width 0.25s ease',
        overflow: 'hidden',
      }}>

        {/* Brand */}
        <div style={{
          padding: sideOpen ? '1.5rem 1.25rem 1.25rem' : '1.5rem 0.75rem 1.25rem',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          display: 'flex', alignItems: 'center', gap: '0.75rem',
          justifyContent: sideOpen ? 'flex-start' : 'center',
        }}>
          <div style={{
            width: 38, height: 38, borderRadius: 10, flexShrink: 0,
            background: 'linear-gradient(135deg, #6366f1, #818cf8)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'var(--font-display)', fontSize: '1.2rem', color: '#fff', fontWeight: 900,
          }}>M</div>
          {sideOpen && (
            <div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', letterSpacing: '0.1em', color: '#fff' }}>MISFIT</div>
              <div style={{ fontSize: '0.6rem', color: '#818cf8', textTransform: 'uppercase', letterSpacing: '0.12em' }}>Admin Panel</div>
            </div>
          )}
        </div>

        {/* Nav links */}
        <nav style={{ flex: 1, padding: '0.75rem 0.5rem', display: 'flex', flexDirection: 'column', gap: 2 }}>
          {NAV.map(n => {
            const active = tab === n.key;
            return (
              <button key={n.key} onClick={() => setTab(n.key)}
                title={!sideOpen ? n.label : undefined}
                style={{
                  display: 'flex', alignItems: 'center',
                  gap: sideOpen ? '0.75rem' : 0,
                  justifyContent: sideOpen ? 'flex-start' : 'center',
                  padding: '0.7rem 0.85rem', borderRadius: 10,
                  background: active ? 'rgba(99,102,241,0.25)' : 'transparent',
                  border: active ? '1px solid rgba(99,102,241,0.4)' : '1px solid transparent',
                  cursor: 'pointer', width: '100%', textAlign: 'left',
                  color: active ? '#a5b4fc' : 'rgba(255,255,255,0.5)',
                  fontFamily: 'var(--font-body)', fontSize: '0.875rem',
                  fontWeight: active ? 700 : 400,
                  transition: 'all 0.15s',
                  whiteSpace: 'nowrap',
                }}>
                <span style={{ fontSize: '1.1rem', flexShrink: 0 }}>{n.icon}</span>
                {sideOpen && n.label}
              </button>
            );
          })}
        </nav>

        {/* User + Logout */}
        <div style={{ padding: '1rem 0.75rem', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          {sideOpen && (
            <div style={{ marginBottom: '0.75rem' }}>
              <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Signed in as</div>
              <div style={{ fontSize: '0.82rem', color: '#a5b4fc', fontWeight: 600, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{adminName}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: 4, fontSize: '0.68rem', color: '#4ade80' }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#4ade80', flexShrink: 0 }} />
                Active Session
              </div>
            </div>
          )}
          <button onClick={onLogout}
            style={{
              width: '100%', padding: '0.5rem',
              background: 'rgba(239,68,68,0.12)',
              border: '1px solid rgba(239,68,68,0.25)',
              borderRadius: 8, color: '#f87171',
              fontSize: sideOpen ? '0.78rem' : '1rem',
              fontWeight: 600, cursor: 'pointer',
              fontFamily: 'var(--font-body)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              gap: '0.4rem',
            }}>
            {sideOpen ? 'Exit Admin' : ''}
          </button>
          {sideOpen && (
            <div style={{ marginTop: '0.4rem', fontSize: '0.6rem', color: 'rgba(255,255,255,0.2)', textAlign: 'center' }}>
              Press Esc to exit
            </div>
          )}
        </div>
      </aside>

      {/* ══════ MAIN AREA ══════ */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Top bar */}
        <header style={{
          background: '#fff', borderBottom: '1px solid #e2e8f0',
          padding: '0 1.75rem', height: 60, flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            {/* Sidebar toggle */}
            <button onClick={() => setSideOpen(s => !s)}
              style={{
                width: 34, height: 34, borderRadius: 8,
                background: '#f8fafc', border: '1px solid #e2e8f0',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '1.1rem', color: '#64748b',
              }}>
              ☰
            </button>
            <div>
              <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem', letterSpacing: '0.04em', margin: 0, color: '#1e1b4b' }}>
                {activeTab?.icon}&nbsp;{activeTab?.label}
              </h1>
              <p style={{ fontSize: '0.7rem', color: '#94a3b8', margin: 0 }}>
                {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {warnMsg && (
              <div style={{
                padding: '0.35rem 0.85rem',
                background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)',
                borderRadius: 8, color: '#ef4444', fontSize: '0.75rem', fontWeight: 600,
              }}>{warnMsg}</div>
            )}
            {/* Admin avatar */}
            <div style={{
              width: 36, height: 36, borderRadius: '50%',
              background: 'linear-gradient(135deg,#6366f1,#818cf8)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontWeight: 700, fontSize: '0.9rem', flexShrink: 0,
            }}>
              {adminName?.charAt(0).toUpperCase()}
            </div>
          </div>
        </header>

        {/* Content area */}
        <main style={{ flex: 1, overflowY: 'auto', padding: '1.75rem' }}>
          {tab === 'overview'  && <AdminOverview  token={token} />}
          {tab === 'orders'    && <AdminOrders    token={token} showToast={toast} />}
          {tab === 'tracking'  && <AdminTracking  token={token} showToast={toast} />}
          {tab === 'customers' && <AdminCustomers token={token} />}
          {tab === 'products'  && <AdminProducts  token={token} showToast={toast} />}
          {tab === 'payments'  && <AdminPayments  token={token} />}
        </main>
      </div>
    </div>
  );
}
