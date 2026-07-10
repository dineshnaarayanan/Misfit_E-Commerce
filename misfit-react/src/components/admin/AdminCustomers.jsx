/* AdminCustomers.jsx — Customer list with stats + expandable profile */
import { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '../../api';

const fmt = n => `₹${(n||0).toLocaleString('en-IN')}`;
const fmtDate = d => d ? new Date(d).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'}) : '—';

export default function AdminCustomers({ token }) {
  const [customers, setCustomers] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [search,    setSearch]    = useState('');
  const [sort,      setSort]      = useState('joinedAt');
  const [expanded,  setExpanded]  = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const d = await apiFetch('/admin/customers', {}, token);
      setCustomers(d.customers || []);
    } catch { setCustomers([]); }
    finally { setLoading(false); }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const filtered = customers
    .filter(c => {
      const q = search.toLowerCase();
      return !q || c.name.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) || (c.phone||'').includes(q);
    })
    .sort((a,b) => {
      if (sort==='totalSpend')  return b.totalSpend - a.totalSpend;
      if (sort==='orderCount')  return b.orderCount - a.orderCount;
      return new Date(b.joinedAt) - new Date(a.joinedAt);
    });

  const totalRev    = customers.reduce((s,c) => s+c.totalSpend, 0);
  const activeBuyers = customers.filter(c => c.orderCount > 0).length;

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:'1rem' }}>

      {/* KPIs */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'0.75rem' }}>
        {[
          { icon:'', label:'Total Customers',   value:customers.length,   color:'#6366f1' },
          { icon:'', label:'Active Buyers',     value:activeBuyers,        color:'#10b981' },
          { icon:'', label:'Total Revenue',      value:fmt(totalRev),       color:'#f59e0b' },
          { icon:'', label:'Avg. Spend / Buyer', value:fmt(Math.round(activeBuyers>0?totalRev/activeBuyers:0)), color:'#f97316' },
        ].map(k => (
          <div key={k.label} style={{
            background:'#fff', borderRadius:14, padding:'1.1rem 1.25rem',
            boxShadow:'0 1px 3px rgba(0,0,0,0.05)', border:'1px solid #f1f5f9',
            display:'flex', alignItems:'center', gap:'0.85rem',
          }}>
            <div>
              <div style={{ fontSize:'0.62rem', color:'#94a3b8', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:2 }}>{k.label}</div>
              <div style={{ fontSize:'1.4rem', fontWeight:800, color:'#1e1b4b', lineHeight:1 }}>{k.value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div style={{ display:'flex', gap:'0.75rem', alignItems:'center', flexWrap:'wrap' }}>
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search by name, email or phone…"
          style={{ flex:1, minWidth:220, padding:'0.6rem 1rem', borderRadius:10, border:'1px solid #e2e8f0', background:'#fff', fontSize:'0.875rem', fontFamily:'var(--font-body)', outline:'none', color:'#1e1b4b' }} />
        <div style={{ display:'flex', gap:4 }}>
          {[
            { key:'joinedAt',   label:'Newest'      },
            { key:'totalSpend', label:'Top Spenders' },
            { key:'orderCount', label:'Most Orders'  },
          ].map(s => (
            <button key={s.key} onClick={() => setSort(s.key)}
              style={{
                padding:'0.35rem 0.85rem', fontSize:'0.75rem', borderRadius:50, border:'1px solid',
                cursor:'pointer', transition:'all 0.15s',
                background: sort===s.key ? 'rgba(99,102,241,0.1)' : '#fff',
                borderColor: sort===s.key ? '#6366f1' : '#e2e8f0',
                color: sort===s.key ? '#6366f1' : '#64748b',
              }}>
              {s.label}
            </button>
          ))}
        </div>
        <span style={{ fontSize:'0.75rem', color:'#94a3b8' }}>{filtered.length} customers</span>
      </div>

      {/* Table */}
      {loading ? (
        <div style={{ display:'flex', justifyContent:'center', padding:'3rem' }}><div className="spinner" /></div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign:'center', padding:'3rem', color:'#94a3b8' }}>
          <div style={{ fontSize:'2.5rem' }}></div><p>No customers found.</p>
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:'0.5rem' }}>

          {/* Header */}
          <div style={{
            display:'grid', gridTemplateColumns:'2fr 2fr 1fr 1fr 1fr 32px',
            gap:'1rem', padding:'0.4rem 1.25rem',
            fontSize:'0.62rem', textTransform:'uppercase', letterSpacing:'0.08em', color:'#94a3b8',
          }}>
            <div>Customer</div><div>Contact</div>
            <div style={{textAlign:'right'}}>Joined</div>
            <div style={{textAlign:'right'}}>Orders</div>
            <div style={{textAlign:'right'}}>Spent</div>
            <div />
          </div>

          {filtered.map(c => (
            <div key={c.id} style={{
              background:'#fff', borderRadius:14, border:'1px solid #e2e8f0',
              boxShadow:'0 1px 3px rgba(0,0,0,0.04)', overflow:'hidden',
            }}>
              <div
                onClick={() => setExpanded(expanded===c.id ? null : c.id)}
                style={{ display:'grid', gridTemplateColumns:'2fr 2fr 1fr 1fr 1fr 32px', gap:'1rem', padding:'0.9rem 1.25rem', alignItems:'center', cursor:'pointer' }}>

                <div style={{ display:'flex', alignItems:'center', gap:'0.75rem' }}>
                  <div style={{
                    width:36, height:36, borderRadius:'50%', flexShrink:0,
                    background:'linear-gradient(135deg,#6366f1,#818cf8)',
                    display:'flex', alignItems:'center', justifyContent:'center',
                    color:'#fff', fontWeight:800, fontSize:'0.9rem',
                  }}>{c.name.charAt(0).toUpperCase()}</div>
                  <div>
                    <div style={{ fontWeight:600, fontSize:'0.875rem', color:'#1e1b4b' }}>{c.name}</div>
                    {c.orderCount===0 && <div style={{ fontSize:'0.68rem', color:'#94a3b8' }}>No orders</div>}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize:'0.8rem', color:'#1e1b4b' }}>{c.email}</div>
                  <div style={{ fontSize:'0.72rem', color:'#94a3b8', marginTop:2 }}>{c.phone||'—'}</div>
                </div>

                <div style={{ textAlign:'right', fontSize:'0.78rem', color:'#64748b' }}>{fmtDate(c.joinedAt)}</div>

                <div style={{ textAlign:'right' }}>
                  <span style={{
                    display:'inline-block', padding:'0.15rem 0.6rem',
                    background: c.orderCount>0 ? 'rgba(99,102,241,0.1)' : '#f1f5f9',
                    color: c.orderCount>0 ? '#6366f1' : '#94a3b8',
                    borderRadius:50, fontSize:'0.78rem', fontWeight:700,
                  }}>{c.orderCount}</span>
                </div>

                <div style={{ textAlign:'right', fontWeight:700, fontSize:'0.875rem', color:c.totalSpend>0?'#10b981':'#94a3b8' }}>
                  {fmt(c.totalSpend)}
                </div>

                <div style={{ color:'#94a3b8', transition:'transform 0.2s', transform:expanded===c.id?'rotate(180deg)':'none', textAlign:'center' }}>▾</div>
              </div>

              {expanded===c.id && (
                <div style={{ borderTop:'1px solid #f1f5f9', padding:'1rem 1.25rem', background:'#f8fafc', display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'0.75rem' }}>
                  {[
                    { icon:'', label:'Email',        value:c.email },
                    { icon:'', label:'Phone',        value:c.phone||'Not provided' },
                    { icon:'', label:'Member Since', value:fmtDate(c.joinedAt) },
                    { icon:'', label:'Orders',       value:`${c.orderCount} order${c.orderCount!==1?'s':''}` },
                    { icon:'', label:'Total Spent',  value:fmt(c.totalSpend) },
                    { icon:'', label:'Last Order',   value:fmtDate(c.lastOrder) },
                  ].map(r => (
                    <div key={r.label} style={{ background:'#fff', borderRadius:10, padding:'0.7rem 0.9rem', border:'1px solid #e2e8f0', display:'flex', gap:'0.6rem', alignItems:'flex-start' }}>
                      <span style={{ fontSize:'1.1rem', flexShrink:0 }}>{r.icon}</span>
                      <div>
                        <div style={{ fontSize:'0.6rem', textTransform:'uppercase', letterSpacing:'0.08em', color:'#94a3b8', marginBottom:2 }}>{r.label}</div>
                        <div style={{ fontSize:'0.85rem', fontWeight:600, color:'#1e1b4b' }}>{r.value}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
