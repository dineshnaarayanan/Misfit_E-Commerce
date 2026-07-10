/* AdminPayments.jsx — Payment tracking: COD vs Online */
import { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '../../api';

const METHOD_COLOR = { cod:'#f59e0b', razorpay:'#6366f1', online:'#6366f1', original:'#10b981' };
const STATUS_COLOR = {
  pending:'#fbbf24',confirmed:'#34d399',packed:'#60a5fa',
  shipped:'#a78bfa','out-for-delivery':'#f97316',delivered:'#22c55e',cancelled:'#ef4444',
};

export default function AdminPayments({ token }) {
  const [orders,  setOrders]  = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter,  setFilter]  = useState('all');  // all | cod | online
  const [search,  setSearch]  = useState('');
  const [page,    setPage]    = useState(1);
  const PER = 20;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const d = await apiFetch('/orders?limit=500', {}, token);
      setOrders(d.orders || []);
    } catch { setOrders([]); }
    finally { setLoading(false); }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  // Stats
  const paid   = orders.filter(o => o.paymentMethod !== 'cod');
  const cod    = orders.filter(o => o.paymentMethod === 'cod');
  const total  = orders.reduce((s, o) => s + (o.total||0), 0);
  const paidAmt= paid.reduce((s, o) => s + (o.total||0), 0);
  const codAmt = cod.reduce((s,  o) => s + (o.total||0), 0);

  const filtered = orders.filter(o => {
    const q = search.toLowerCase();
    const onum = o.orderNumber ? o.orderNumber.toString() : '';
    const match = !q ||
      (o._id||o.id).toString().slice(-8).toLowerCase().includes(q) ||
      onum.includes(q) ||
      (o.customer_name||'').toLowerCase().includes(q) ||
      (o.customer_email||'').toLowerCase().includes(q);
    const methodMatch = filter==='all' || (filter==='cod' ? o.paymentMethod==='cod' : o.paymentMethod!=='cod');
    return match && methodMatch;
  });

  const pages = Math.ceil(filtered.length / PER);
  const paged = filtered.slice((page-1)*PER, page*PER);

  const fmt = n => `₹${(n||0).toLocaleString('en-IN')}`;

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:'1rem' }}>

      {/* KPIs */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'0.75rem' }}>
        {[
          { icon:'', label:'Total Billed',  value:fmt(total),   color:'#1e1b4b' },
          { icon:'', label:'Online Paid',   value:fmt(paidAmt), color:'#6366f1' },
          { icon:'', label:'COD Amount',    value:fmt(codAmt),  color:'#f59e0b' },
          { icon:'', label:'Online Orders', value:`${paid.length} / ${orders.length}`, color:'#10b981' },
        ].map(k => (
          <div key={k.label} style={{
            background:'#fff', borderRadius:14, padding:'1.1rem 1.25rem',
            boxShadow:'0 1px 3px rgba(0,0,0,0.05)', border:'1px solid #f1f5f9',
            display:'flex', alignItems:'center', gap:'0.85rem',
          }}>
            <div style={{ width:44, height:44, borderRadius:12, background:`${k.color}15`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1.3rem', flexShrink:0 }}>{k.icon}</div>
            <div>
              <div style={{ fontSize:'0.62rem', color:'#94a3b8', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:2 }}>{k.label}</div>
              <div style={{ fontSize:'1.3rem', fontWeight:800, color:'#1e1b4b', lineHeight:1 }}>{k.value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Filter + Search */}
      <div style={{ display:'flex', gap:'0.75rem', alignItems:'center', flexWrap:'wrap' }}>
        <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
          placeholder="Search by order ID, customer…"
          style={{ flex:1, minWidth:200, padding:'0.6rem 1rem', borderRadius:10, border:'1px solid #e2e8f0', background:'#fff', fontSize:'0.875rem', fontFamily:'var(--font-body)', outline:'none', color:'#1e1b4b' }} />
        <div style={{ display:'flex', gap:4 }}>
          {[
            { key:'all',    label:'All' },
            { key:'online', label:'Online' },
            { key:'cod',    label:'COD' },
          ].map(f => (
            <button key={f.key} onClick={() => { setFilter(f.key); setPage(1); }}
              style={{
                padding:'0.35rem 0.85rem', fontSize:'0.75rem', borderRadius:50, border:'1px solid', cursor:'pointer',
                background: filter===f.key ? 'rgba(99,102,241,0.1)' : '#fff',
                borderColor: filter===f.key ? '#6366f1' : '#e2e8f0',
                color: filter===f.key ? '#6366f1' : '#64748b',
                transition:'all 0.15s',
              }}>{f.label}</button>
          ))}
        </div>
        <span style={{ fontSize:'0.75rem', color:'#94a3b8' }}>{filtered.length} records</span>
      </div>

      {/* Table header */}
      <div style={{
        display:'grid', gridTemplateColumns:'1fr 1.5fr 1fr 120px 120px',
        gap:'1rem', padding:'0.4rem 1.25rem',
        fontSize:'0.62rem', textTransform:'uppercase', letterSpacing:'0.08em', color:'#94a3b8',
      }}>
        <div>Order</div><div>Customer</div>
        <div style={{textAlign:'right'}}>Amount</div>
        <div style={{textAlign:'center'}}>Method</div>
        <div style={{textAlign:'center'}}>Status</div>
      </div>

      {/* Table rows */}
      {loading ? (
        <div style={{ display:'flex', justifyContent:'center', padding:'3rem' }}><div className="spinner" /></div>
      ) : paged.length === 0 ? (
        <div style={{ textAlign:'center', padding:'3rem', color:'#94a3b8' }}>
          <div style={{ fontSize:'2.5rem' }}></div><p>No payment records found.</p>
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:'0.45rem' }}>
          {paged.map(o => {
            const oid = (o._id||o.id).toString();
            const method = o.paymentMethod||'cod';
            const mColor = METHOD_COLOR[method]||'#94a3b8';
            return (
              <div key={oid} style={{
                display:'grid', gridTemplateColumns:'1fr 1.5fr 1fr 120px 120px',
                gap:'1rem', padding:'0.85rem 1.25rem', alignItems:'center',
                background:'#fff', borderRadius:12, border:'1px solid #e2e8f0',
                boxShadow:'0 1px 2px rgba(0,0,0,0.04)',
              }}>
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
                </div>
                <div style={{ textAlign:'right', fontWeight:800, fontSize:'0.95rem', color:'#1e1b4b' }}>
                  {fmt(o.total)}
                </div>
                <div style={{ textAlign:'center' }}>
                  <span style={{
                    display:'inline-block', padding:'0.2rem 0.65rem', borderRadius:50,
                    background:`${mColor}15`, border:`1px solid ${mColor}30`,
                    color:mColor, fontSize:'0.72rem', fontWeight:700, textTransform:'uppercase',
                  }}>
                    {method}
                  </span>
                </div>
                <div style={{ textAlign:'center' }}>
                  <span style={{
                    display:'inline-block', padding:'0.2rem 0.65rem', borderRadius:50,
                    background:`${STATUS_COLOR[o.status]||'#94a3b8'}15`,
                    border:`1px solid ${STATUS_COLOR[o.status]||'#94a3b8'}30`,
                    color:STATUS_COLOR[o.status]||'#94a3b8', fontSize:'0.72rem', fontWeight:700,
                    textTransform:'capitalize',
                  }}>
                    {o.status?.replace('-',' ')}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {pages > 1 && (
        <div style={{ display:'flex', justifyContent:'center', gap:'0.5rem' }}>
          <button disabled={page===1} onClick={()=>setPage(p=>p-1)}
            style={{ padding:'0.4rem 1rem', background:'#fff', border:'1px solid #e2e8f0', borderRadius:8, cursor:'pointer', color:'#1e1b4b', fontSize:'0.82rem' }}>← Prev</button>
          <span style={{ display:'flex', alignItems:'center', fontSize:'0.82rem', color:'#64748b' }}>{page}/{pages}</span>
          <button disabled={page===pages} onClick={()=>setPage(p=>p+1)}
            style={{ padding:'0.4rem 1rem', background:'#fff', border:'1px solid #e2e8f0', borderRadius:8, cursor:'pointer', color:'#1e1b4b', fontSize:'0.82rem' }}>Next →</button>
        </div>
      )}
    </div>
  );
}
