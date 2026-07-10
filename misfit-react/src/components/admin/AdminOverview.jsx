/* AdminOverview.jsx — Sales KPIs + Charts */
import { useState, useEffect } from 'react';
import { apiFetch } from '../../api';

const kpiCards = [
  { key: 'totalRevenue',   label: 'Total Revenue',   icon: '', color: '#6366f1', fmt: v => `₹${(v||0).toLocaleString('en-IN')}` },
  { key: 'totalOrders',    label: 'Total Orders',    icon: '', color: '#0ea5e9', fmt: v => v||0 },
  { key: 'totalCustomers', label: 'Customers',       icon: '', color: '#10b981', fmt: v => v||0 },
  { key: 'totalProducts',  label: 'Products',        icon: '', color: '#f59e0b', fmt: v => v||0 },
  { key: 'lowStock',       label: 'Low Stock Items', icon: '', color: '#ef4444', fmt: v => v||0 },
  { key: 'outOfStock',     label: 'Out of Stock',    icon: '', color: '#dc2626', fmt: v => v||0 },
];

const STATUS_ORDER = ['pending','confirmed','packed','shipped','out-for-delivery','delivered','cancelled'];
const STATUS_COLOR = {
  pending:'#fbbf24',confirmed:'#34d399',packed:'#60a5fa',
  shipped:'#a78bfa','out-for-delivery':'#f97316',delivered:'#22c55e',cancelled:'#ef4444',
};

export default function AdminOverview({ token }) {
  const [stats,   setStats]   = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch('/admin/stats', {}, token)
      .then(d => setStats(d.stats))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) return (
    <div style={{ display:'flex', justifyContent:'center', alignItems:'center', height:300 }}>
      <div className="spinner" />
    </div>
  );

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:'1.5rem' }}>

      {/* KPI Grid */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'1rem' }}>
        {kpiCards.map(k => (
          <div key={k.key} className="admin-kpi-card">

            <div>
              <div style={{ fontSize:'0.68rem', color:'#94a3b8', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:4 }}>{k.label}</div>
              <div style={{ fontSize:'1.75rem', fontWeight:800, color:'#1e1b4b', lineHeight:1 }}>{k.fmt(stats?.[k.key])}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Order Status Breakdown */}
      <div style={{ padding:'1.5rem 0' }}>
        <h3 style={{ fontFamily:'var(--font-display)', fontSize:'1.1rem', color:'#1e1b4b', marginBottom:'1.25rem' }}>
          Orders by Status
        </h3>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'0.75rem' }}>
          {STATUS_ORDER.map(s => {
            const count = stats?.byStatus?.[s === 'out-for-delivery' ? 'outForDelivery' : s] || 0;
            return (
              <div key={s} className="admin-stat-box">
                <div style={{ fontSize:'1.5rem', fontWeight:800, color:'#1e1b4b' }}>{count}</div>
                <div style={{ fontSize:'0.7rem', color:'#64748b', marginTop:2, textTransform:'capitalize' }}>
                  {s.replace('-', ' ')}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Quick info */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'2rem' }}>
        <div style={{ padding:'1.5rem 0' }}>
          <h3 style={{ fontFamily:'var(--font-display)', fontSize:'1rem', color:'#1e1b4b', marginBottom:'1rem' }}>Quick Stats</h3>
          <div style={{ display:'flex', flexDirection:'column', gap:'0.75rem' }}>
            {[
              { label: 'Total Sales (non-cancelled)', value: `₹${(stats?.totalRevenue||0).toLocaleString('en-IN')}` },
              { label: 'Avg. Order Value', value: stats?.totalOrders > 0 ? `₹${Math.round((stats?.totalRevenue||0) / (stats?.totalOrders||1)).toLocaleString('en-IN')}` : '₹0' },
              { label: 'Products in Store', value: stats?.totalProducts || 0 },
              { label: 'Registered Customers', value: stats?.totalCustomers || 0 },
            ].map(r => (
              <div key={r.label} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'0.5rem 0', borderBottom:'1px solid #f1f5f9' }}>
                <span style={{ fontSize:'0.82rem', color:'#64748b' }}>{r.label}</span>
                <span style={{ fontSize:'0.9rem', fontWeight:700, color:'#1e1b4b' }}>{r.value}</span>
              </div>
            ))}
          </div>
        </div>
        <div style={{ padding:'1.5rem 0' }}>
          <h3 style={{ fontFamily:'var(--font-display)', fontSize:'1rem', color:'#1e1b4b', marginBottom:'1rem' }}>Stock Alerts</h3>
          <div style={{ display:'flex', flexDirection:'column', gap:'0.75rem' }}>
            {[
              { label: 'Low Stock (≤ 10 units)', value: stats?.lowStock || 0, color:'#f59e0b' },
              { label: 'Out of Stock', value: stats?.outOfStock || 0, color:'#ef4444' },
            ].map(r => (
              <div key={r.label} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'0.75rem 0' }}>
                <span style={{ fontSize:'0.82rem', color:'#64748b' }}>{r.label}</span>
                <span style={{ fontSize:'1.1rem', fontWeight:800, color:'#1e1b4b' }}>{r.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
