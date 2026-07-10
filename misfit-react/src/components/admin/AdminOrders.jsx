/* AdminOrders.jsx — Order list, status control, customer details */
import { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '../../api';

const STATUSES = ['pending','confirmed','packed','shipped','out-for-delivery','delivered','cancelled'];
const STATUS_COLOR = {
  pending:'#fbbf24',confirmed:'#34d399',packed:'#60a5fa',
  shipped:'#a78bfa','out-for-delivery':'#f97316',delivered:'#22c55e',cancelled:'#ef4444',
};

function Badge({ status }) {
  const color = STATUS_COLOR[status] || '#94a3b8';
  return (
    <span style={{
      display:'inline-block', padding:'0.2rem 0.65rem', borderRadius:50,
      background:`${color}18`, border:`1px solid ${color}40`,
      color, fontSize:'0.72rem', fontWeight:700,
      textTransform:'capitalize',
    }}>
      {status?.replace('-',' ')}
    </span>
  );
}

export default function AdminOrders({ token, showToast }) {
  const [orders,   setOrders]   = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [search,   setSearch]   = useState('');
  const [filter,   setFilter]   = useState('all');
  const [expanded, setExpanded] = useState({});
  const [page,     setPage]     = useState(1);
  const PER = 15;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const d = await apiFetch('/orders?limit=500', {}, token);
      setOrders(d.orders || []);
    } catch { setOrders([]); }
    finally { setLoading(false); }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  async function updateStatus(id, status) {
    try {
      await apiFetch(`/orders/${id}/status`, { method:'PATCH', body:JSON.stringify({ status }) }, token);
      showToast(`Status updated to ${status}`);
      load();
    } catch(e) { showToast(e.message, 'error'); }
  }

  const toggle = id => setExpanded(p => ({ ...p, [id]: !p[id] }));

  const filtered = orders.filter(o => {
    const q = search.toLowerCase();
    const id = (o._id||o.id||'').toString();
    const onum = o.orderNumber ? o.orderNumber.toString() : '';
    const match = !q || id.toLowerCase().includes(q) || onum.includes(q) ||
      (o.customer_name||'').toLowerCase().includes(q) ||
      (o.customer_email||'').toLowerCase().includes(q) ||
      (o.customer_phone||'').toLowerCase().includes(q);
    return (filter === 'all' || o.status === filter) && match;
  });

  const pages = Math.ceil(filtered.length / PER);
  const paged = filtered.slice((page-1)*PER, page*PER);

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:'1rem' }}>

      {/* Status quick counts */}
      <div style={{ display:'flex', gap:'0.5rem', flexWrap:'wrap' }}>
        {['all',...STATUSES].map(s => {
          const cnt = s === 'all' ? orders.length : orders.filter(o => o.status === s).length;
          const col = STATUS_COLOR[s] || '#6366f1';
          return (
            <button key={s} onClick={() => { setFilter(s); setPage(1); }}
              style={{
                padding:'0.3rem 0.85rem', borderRadius:50, fontSize:'0.72rem', fontWeight:600,
                border:'1px solid', cursor:'pointer', transition:'all 0.15s',
                background: filter===s ? `${col}18` : '#fff',
                borderColor: filter===s ? col : '#e2e8f0',
                color: filter===s ? col : '#64748b',
              }}>
              {s === 'all' ? 'All' : s.replace('-',' ')} ({cnt})
            </button>
          );
        })}
      </div>

      {/* Search + count */}
      <div style={{ display:'flex', gap:'0.75rem', alignItems:'center' }}>
        <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
          placeholder="Search by order ID, name, email or phone…"
          style={{
            flex:1, padding:'0.6rem 1rem', borderRadius:10,
            border:'1px solid #e2e8f0', background:'#fff',
            fontSize:'0.875rem', fontFamily:'var(--font-body)', outline:'none', color:'#1e1b4b',
          }} />
        <span style={{ fontSize:'0.75rem', color:'#94a3b8', whiteSpace:'nowrap' }}>{filtered.length} orders</span>
      </div>

      {/* Orders list */}
      {loading ? (
        <div style={{ display:'flex', justifyContent:'center', padding:'3rem' }}><div className="spinner" /></div>
      ) : paged.length === 0 ? (
        <div style={{ textAlign:'center', padding:'3rem', color:'#94a3b8' }}>
          <div style={{ fontSize:'2.5rem' }}></div><p>No orders found.</p>
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:'0.65rem' }}>
          {paged.map(o => {
            const oid = (o._id||o.id).toString();
            const isOpen = !!expanded[oid];
            return (
              <div key={oid} style={{
                background:'#fff', borderRadius:14,
                border:'1px solid #e2e8f0',
                boxShadow:'0 1px 3px rgba(0,0,0,0.04)',
                overflow:'hidden',
              }}>
                {/* Summary row */}
                <div style={{
                  display:'grid', gridTemplateColumns:'1fr 1.5fr 1fr 160px 32px',
                  gap:'1rem', padding:'1rem 1.25rem', alignItems:'center',
                  cursor:'pointer',
                }} onClick={() => toggle(oid)}>

                  <div>
                    <div style={{ fontFamily:'monospace', fontSize:'0.82rem', fontWeight:700, color:'#6366f1' }}>
                      #{o.orderNumber || oid.slice(-8).toUpperCase()}
                    </div>
                    <div style={{ fontSize:'0.68rem', color:'#94a3b8', marginTop:2 }}>
                      {new Date(o.createdAt||o.created_at).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'})}
                    </div>
                  </div>

                  <div>
                    <div style={{ fontWeight:600, fontSize:'0.875rem', color:'#1e1b4b' }}>{o.customer_name||'—'}</div>
                    <div style={{ fontSize:'0.7rem', color:'#94a3b8' }}>{o.customer_email}</div>
                    {o.customer_phone && <div style={{ fontSize:'0.7rem', color:'#94a3b8' }}>{o.customer_phone}</div>}
                  </div>

                  <div>
                    <div style={{ fontSize:'0.95rem', fontWeight:800, color:'#1e1b4b' }}>₹{(o.total||0).toLocaleString('en-IN')}</div>
                    <div style={{ fontSize:'0.7rem', color:'#94a3b8' }}>
                      {(o.items||[]).length} item(s) · {(o.paymentMethod||'COD').toUpperCase()}
                    </div>
                  </div>

                  <div onClick={e => e.stopPropagation()}>
                    <select value={o.status} onChange={e => updateStatus(oid, e.target.value)}
                      style={{
                        width:'100%', padding:'0.35rem 0.5rem', fontSize:'0.75rem', fontWeight:600,
                        borderRadius:8, border:`1px solid ${STATUS_COLOR[o.status]||'#e2e8f0'}`,
                        background:`${STATUS_COLOR[o.status]||'#f8fafc'}15`,
                        color:STATUS_COLOR[o.status]||'#64748b',
                        fontFamily:'var(--font-body)', cursor:'pointer', outline:'none',
                      }}>
                      {STATUSES.map(s => <option key={s} value={s}>{s.replace('-',' ')}</option>)}
                    </select>
                  </div>

                  <div style={{ color:'#94a3b8', transition:'transform 0.2s', transform:isOpen?'rotate(180deg)':'none', textAlign:'center' }}>▾</div>
                </div>

                {/* Expanded details */}
                {isOpen && (
                  <div style={{ borderTop:'1px solid #f1f5f9', background:'#f8fafc' }}>
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 2fr', gap:'1.25rem', padding:'1.25rem' }}>

                      {/* Customer card */}
                      <div style={{ background:'#fff', borderRadius:12, padding:'1rem', border:'1px solid #e2e8f0' }}>
                        <div style={{ fontSize:'0.65rem', textTransform:'uppercase', letterSpacing:'0.08em', color:'#94a3b8', fontWeight:700, marginBottom:'0.75rem' }}>Customer</div>
                        {[
                          ['Name',  o.customer_name || '—'],
                          ['Email', o.customer_email || '—'],
                          ['Phone', o.customer_phone || 'Not provided'],
                        ].map(([l, v]) => (
                          <div key={l} style={{ display:'flex', gap:'0.5rem', marginBottom:'0.5rem', fontSize:'0.82rem' }}>
                            <span style={{ color:'#94a3b8', minWidth:50 }}>{l}:</span>
                            <span style={{ fontWeight:600, color:'#1e1b4b' }}>{v}</span>
                          </div>
                        ))}
                        <div style={{ marginTop:'0.75rem' }}>
                          <div style={{ fontSize:'0.65rem', textTransform:'uppercase', letterSpacing:'0.08em', color:'#94a3b8', fontWeight:700, marginBottom:'0.4rem' }}>Delivery Address</div>
                          <div style={{ fontSize:'0.82rem', color:'#1e1b4b', lineHeight:1.6, padding:'0.5rem 0.75rem', background:'#f8fafc', borderRadius:8, border:'1px solid #e2e8f0' }}>
                            {o.address || 'No address provided'}
                          </div>
                        </div>
                      </div>

                      {/* Items */}
                      <div>
                        <div style={{ fontSize:'0.65rem', textTransform:'uppercase', letterSpacing:'0.08em', color:'#94a3b8', fontWeight:700, marginBottom:'0.75rem' }}>
                          Order Items ({(o.items||[]).length})
                        </div>
                        <div style={{ display:'flex', flexDirection:'column', gap:'0.4rem' }}>
                          {(o.items||[]).map((item, i) => (
                            <div key={i} style={{
                              display:'flex', justifyContent:'space-between', alignItems:'center',
                              padding:'0.6rem 0.85rem', background:'#fff', borderRadius:10,
                              border:'1px solid #e2e8f0', fontSize:'0.82rem',
                            }}>
                              <div>
                                <span style={{ fontWeight:600, color:'#1e1b4b' }}>{item.name}</span>
                                <span style={{ color:'#94a3b8', marginLeft:'0.65rem' }}>
                                  Size: <b>{item.size}</b> · Colour: <b>{item.colour}</b> · Qty: <b>×{item.qty}</b>
                                </span>
                              </div>
                              <div style={{ fontWeight:700, color:'#6366f1' }}>
                                ₹{((item.price||0)*item.qty).toLocaleString('en-IN')}
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Courier info if shipped */}
                        {o.trackingId && (
                          <div style={{
                            marginTop:'0.75rem', padding:'0.75rem 1rem',
                            background:'#f0fdf4', border:'1px solid #bbf7d0', borderRadius:10,
                            display:'flex', justifyContent:'space-between', alignItems:'center',
                          }}>
                            <div style={{ fontSize:'0.82rem' }}>
                              <div style={{ fontWeight:700, color:'#16a34a' }}>{o.courierName}</div>
                              <div style={{ fontFamily:'monospace', color:'#64748b', fontSize:'0.78rem' }}>Tracking: {o.trackingId}</div>
                            </div>
                            <span style={{ fontSize:'0.72rem', color:'#16a34a', fontWeight:600 }}>Shipped</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {pages > 1 && (
        <div style={{ display:'flex', justifyContent:'center', gap:'0.5rem', marginTop:'0.5rem' }}>
          <button disabled={page===1} onClick={() => setPage(p=>p-1)}
            style={{ padding:'0.4rem 1rem', background:'#fff', border:'1px solid #e2e8f0', borderRadius:8, cursor:'pointer', color:'#1e1b4b', fontSize:'0.82rem' }}>← Prev</button>
          <span style={{ display:'flex', alignItems:'center', fontSize:'0.82rem', color:'#64748b' }}>{page}/{pages}</span>
          <button disabled={page===pages} onClick={() => setPage(p=>p+1)}
            style={{ padding:'0.4rem 1rem', background:'#fff', border:'1px solid #e2e8f0', borderRadius:8, cursor:'pointer', color:'#1e1b4b', fontSize:'0.82rem' }}>Next →</button>
        </div>
      )}
    </div>
  );
}
