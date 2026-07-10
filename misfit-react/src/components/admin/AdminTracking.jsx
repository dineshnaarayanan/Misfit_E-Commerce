/* AdminTracking.jsx — Assign courier + tracking IDs, view shipped orders, track packages */
import { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '../../api';

const COURIERS = ['Delhivery','DTDC','Blue Dart','India Post','XpressBees'];
const TRACK_URL = {
  'Delhivery':  id => `https://www.delhivery.com/tracking/?utm_source=websiteTracking#`,
  'DTDC':       id => `https://www.dtdc.in/trace.asp?`,
  'Blue Dart':  id => `https://www.bluedart.com/tracking`,
  'India Post': id => `https://www.indiapost.gov.in/VAS/Pages/trackconsignment.aspx`,
  'XpressBees': id => `https://www.xpressbees.com/shipment/tracking`,
};

const STATUS_COLOR = {
  pending:'#fbbf24',confirmed:'#34d399',packed:'#60a5fa',
  shipped:'#a78bfa','out-for-delivery':'#f97316',delivered:'#22c55e',cancelled:'#ef4444', returned:'#fb923c',
};
const STATUSES = ['pending','confirmed','packed','shipped','out-for-delivery','delivered','cancelled','returned'];

export default function AdminTracking({ token, showToast }) {
  const [orders,   setOrders]   = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [tab,      setTab]      = useState('unshipped'); // unshipped | shipped
  const [form,     setForm]     = useState({});         // per-order form fields
  const [saving,   setSaving]   = useState({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const d = await apiFetch('/orders?limit=500', {}, token);
      setOrders(d.orders || []);
    } catch { setOrders([]); }
    finally { setLoading(false); }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const setF = (oid, key, val) =>
    setForm(p => ({ ...p, [oid]: { ...(p[oid]||{}), [key]: val } }));

  async function updateStatus(id, status) {
    try {
      await apiFetch(`/orders/${id}/status`, { method:'PATCH', body:JSON.stringify({ status }) }, token);
      showToast(`Status updated to ${status}`);
      load();
    } catch(e) { showToast(e.message, 'error'); }
  }

  async function assign(oid) {
    const f = form[oid] || {};
    if (!f.trackingId?.trim()) { showToast('Enter a Tracking ID', 'error'); return; }
    if (!f.courier) { showToast('Select a courier', 'error'); return; }
    setSaving(p => ({ ...p, [oid]: true }));
    try {
      await apiFetch(`/admin/orders/${oid}/track`, {
        method: 'POST',
        body: JSON.stringify({
          trackingId:            f.trackingId.trim(),
          courierName:           f.courier,
          shippingDate:          f.shipDate || new Date().toISOString(),
          estimatedDeliveryDate: f.edd || null,
        }),
      }, token);
      showToast(`✅ Courier assigned! Order shipped.`);
      setForm(p => { const n={...p}; delete n[oid]; return n; });
      load();
    } catch(e) { showToast(e.message, 'error'); }
    finally { setSaving(p => ({ ...p, [oid]: false })); }
  }

  const unshipped = orders.filter(o => !o.trackingId && !['cancelled','delivered','returned'].includes(o.status));
  const shipped   = orders.filter(o => !!o.trackingId);

  const fieldSty = {
    padding:'0.5rem 0.75rem', background:'#fff', border:'1px solid #e2e8f0',
    borderRadius:8, color:'#1e1b4b', fontSize:'0.82rem', fontFamily:'var(--font-body)', outline:'none',
  };
  const labelSty = { display:'block', fontSize:'0.62rem', color:'#94a3b8', marginBottom:4, textTransform:'uppercase', letterSpacing:'0.06em', fontWeight:700 };

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:'1rem' }}>

      {/* Tabs */}
      <div style={{ display:'flex', gap:'0', background:'#f1f5f9', borderRadius:12, padding:4, width:'fit-content' }}>
        {[
          { key:'unshipped', label:`🚚 Pending Shipment (${unshipped.length})` },
          { key:'shipped',   label:`✅ Shipped (${shipped.length})` },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            style={{
              padding:'0.5rem 1.25rem', borderRadius:9, border:'none', cursor:'pointer',
              fontFamily:'var(--font-body)', fontSize:'0.82rem', fontWeight:600, transition:'all 0.15s',
              background: tab===t.key ? '#fff' : 'transparent',
              color: tab===t.key ? '#6366f1' : '#64748b',
              boxShadow: tab===t.key ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
            }}>
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ display:'flex', justifyContent:'center', padding:'3rem' }}><div className="spinner" /></div>
      ) : tab === 'unshipped' ? (
        // ── UNSHIPPED ORDERS ──
        unshipped.length === 0 ? (
          <div style={{ textAlign:'center', padding:'3rem', color:'#94a3b8' }}>
            <div style={{ fontSize:'2.5rem' }}>🎉</div>
            <p>All orders have been shipped!</p>
          </div>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:'0.75rem' }}>
            {unshipped.map(o => {
              const oid = (o._id||o.id).toString();
              const f = form[oid] || {};
              const isSaving = !!saving[oid];
              return (
                <div key={oid} style={{
                  background:'#fff', borderRadius:14, border:'1px solid #e2e8f0',
                  overflow:'hidden', boxShadow:'0 1px 3px rgba(0,0,0,0.04)',
                }}>
                  {/* Order header */}
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1.5fr 1fr auto', gap:'1rem', padding:'1rem 1.25rem', alignItems:'center', borderBottom:'1px solid #f1f5f9' }}>
                    <div>
                      <div style={{ fontFamily:'monospace', fontSize:'0.82rem', fontWeight:700, color:'#6366f1' }}>#{o.orderNumber || oid.slice(-8).toUpperCase()}</div>
                      <div style={{ fontSize:'0.68rem', color:'#94a3b8', marginTop:2 }}>
                        {new Date(o.createdAt||o.created_at).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'})}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontWeight:600, fontSize:'0.875rem', color:'#1e1b4b' }}>{o.customer_name}</div>
                      <div style={{ fontSize:'0.7rem', color:'#94a3b8' }}>{o.customer_email}</div>
                    </div>
                    <div>
                      <div style={{ fontWeight:800, color:'#1e1b4b' }}>₹{(o.total||0).toLocaleString('en-IN')}</div>
                      <div style={{ fontSize:'0.7rem', color:'#94a3b8' }}>{(o.items||[]).length} item(s)</div>
                    </div>
                    <span style={{
                      display:'inline-block', padding:'0.2rem 0.65rem', borderRadius:50,
                      background:`${STATUS_COLOR[o.status]||'#94a3b8'}18`,
                      border:`1px solid ${STATUS_COLOR[o.status]||'#94a3b8'}40`,
                      color:STATUS_COLOR[o.status]||'#94a3b8', fontSize:'0.72rem', fontWeight:700,
                      textTransform:'capitalize',
                    }}>
                      {o.status?.replace('-',' ')}
                    </span>
                  </div>

                  {/* Courier assignment form */}
                  <div style={{ padding:'1rem 1.25rem', background:'#fafbff' }}>
                    <div style={{ fontSize:'0.65rem', color:'#6366f1', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:'0.75rem' }}>
                      📦 Assign Courier & Tracking
                    </div>
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1.5fr 1fr 1fr auto', gap:'0.65rem', alignItems:'flex-end' }}>
                      <div>
                        <label style={labelSty}>Courier</label>
                        <select value={f.courier||''} onChange={e => setF(oid,'courier',e.target.value)} style={{...fieldSty, width:'100%'}}>
                          <option value="">Select…</option>
                          {COURIERS.map(c => <option key={c}>{c}</option>)}
                        </select>
                      </div>
                      <div>
                        <label style={labelSty}>Tracking ID *</label>
                        <input value={f.trackingId||''} onChange={e => setF(oid,'trackingId',e.target.value)}
                          placeholder="e.g. DL123456789"
                          style={{...fieldSty, width:'100%', boxSizing:'border-box'}} />
                      </div>
                      <div>
                        <label style={labelSty}>Ship Date</label>
                        <input type="date" value={f.shipDate||''} onChange={e => setF(oid,'shipDate',e.target.value)} style={fieldSty} />
                      </div>
                      <div>
                        <label style={labelSty}>Est. Delivery</label>
                        <input type="date" value={f.edd||''} onChange={e => setF(oid,'edd',e.target.value)} style={fieldSty} />
                      </div>
                      <button onClick={() => assign(oid)} disabled={isSaving}
                        style={{
                          padding:'0.55rem 1.1rem', background: isSaving ? '#94a3b8' : '#6366f1',
                          border:'none', borderRadius:8, color:'#fff', fontWeight:700, fontSize:'0.82rem',
                          cursor: isSaving ? 'not-allowed' : 'pointer', fontFamily:'var(--font-body)', whiteSpace:'nowrap',
                        }}>
                        {isSaving ? '⏳…' : '✅ Ship Now'}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : (
        // ── SHIPPED ORDERS ──
        shipped.length === 0 ? (
          <div style={{ textAlign:'center', padding:'3rem', color:'#94a3b8' }}>
            <div style={{ fontSize:'2.5rem' }}>📭</div>
            <p>No shipped orders yet.</p>
          </div>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:'0.65rem' }}>
            {shipped.map(o => {
              const oid = (o._id||o.id).toString();
              return (
                <div key={oid} style={{
                  background:'#fff', borderRadius:14, border:'1px solid #e2e8f0',
                  boxShadow:'0 1px 3px rgba(0,0,0,0.04)',
                  padding:'1rem 1.25rem',
                  display:'grid', gridTemplateColumns:'1fr 1.5fr 1fr auto auto',
                  gap:'1rem', alignItems:'center',
                }}>
                  <div>
                    <div style={{ fontFamily:'monospace', fontSize:'0.82rem', fontWeight:700, color:'#6366f1' }}>#{o.orderNumber || oid.slice(-8).toUpperCase()}</div>
                    <div style={{ fontSize:'0.68rem', color:'#94a3b8', marginTop:2 }}>
                      {new Date(o.createdAt||o.created_at).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'})}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontWeight:600, fontSize:'0.875rem', color:'#1e1b4b' }}>{o.customer_name}</div>
                    <div style={{ fontSize:'0.7rem', color:'#94a3b8' }}>{o.customer_email}</div>
                  </div>
                  <div>
                    <div style={{ fontSize:'0.72rem', color:'#16a34a', fontWeight:700 }}>🚚 {o.courierName}</div>
                    <div style={{ fontFamily:'monospace', fontSize:'0.72rem', color:'#64748b' }}>{o.trackingId}</div>
                    {o.estimatedDeliveryDate && (
                      <div style={{ fontSize:'0.68rem', color:'#94a3b8', marginTop:2 }}>
                        EDD: {new Date(o.estimatedDeliveryDate).toLocaleDateString('en-IN',{day:'numeric',month:'short'})}
                      </div>
                    )}
                  </div>
                  <div>
                    <select value={o.status} onChange={e => updateStatus(oid, e.target.value)}
                      style={{
                        width:'110px', padding:'0.35rem 0.5rem', fontSize:'0.75rem', fontWeight:600,
                        borderRadius:8, border:`1px solid ${STATUS_COLOR[o.status]||'#e2e8f0'}`,
                        background:`${STATUS_COLOR[o.status]||'#f8fafc'}15`,
                        color:STATUS_COLOR[o.status]||'#64748b',
                        fontFamily:'var(--font-body)', cursor:'pointer', outline:'none',
                      }}>
                      {STATUSES.map(s => <option key={s} value={s}>{s.replace('-',' ')}</option>)}
                    </select>
                  </div>
                  <button onClick={() => window.open(TRACK_URL[o.courierName]?.(o.trackingId), '_blank')}
                    style={{
                      padding:'0.45rem 0.9rem', background:'#f0fdf4',
                      border:'1px solid #bbf7d0', borderRadius:8,
                      color:'#16a34a', fontSize:'0.78rem', fontWeight:700,
                      cursor:'pointer', fontFamily:'var(--font-body)', whiteSpace:'nowrap',
                    }}>
                    🔗 Track
                  </button>
                </div>
              );
            })}
          </div>
        )
      )}
    </div>
  );
}
