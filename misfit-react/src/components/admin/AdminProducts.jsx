/* AdminProducts.jsx — Add / Edit / Delete products */
import { useState, useEffect } from 'react';
import { apiFetch } from '../../api';

const CATS = [
  { value:'polo',      label:'Polo T-Shirts'      },
  { value:'acid-wash', label:'Acid Wash T-Shirts'  },
  { value:'oversized', label:'Oversized T-Shirts'  },
  { value:'graphic',   label:'Graphic Tees'        },
  { value:'plain',     label:'Plain / Solid Tees'  },
];
const SIZES = ['XS','S','M','L','XL','XXL','3XL'];
const EMPTY = {
  name:'', category:'polo', price:'', origPrice:'', description:'',
  sizes:['S','M','L','XL'], stock:'100', imageUrl:'', gradient:'', topSeller:false,
};

export default function AdminProducts({ token, showToast }) {
  const [form,     setForm]     = useState(EMPTY);
  const [products, setProducts] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);
  const [editId,   setEditId]   = useState(null);
  const [err,      setErr]      = useState('');
  const [search,   setSearch]   = useState('');
  const [preview,  setPreview]  = useState(null);
  const [view,     setView]     = useState('list'); // 'list' | 'form'

  const load = async () => {
    setLoading(true);
    try {
      const d = await apiFetch('/products?limit=200', {}, token);
      setProducts(d.products || []);
    } catch { setProducts([]); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const F = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const toggleSize = s => setForm(f => ({ ...f, sizes: f.sizes.includes(s) ? f.sizes.filter(x=>x!==s) : [...f.sizes,s] }));

  async function handleSave() {
    if (!form.name.trim())        { setErr('Product name required'); return; }
    if (!form.price||isNaN(+form.price)) { setErr('Valid price required'); return; }
    if (!form.description.trim()) { setErr('Description required'); return; }
    if (!form.sizes.length)       { setErr('Select at least one size'); return; }
    setErr(''); setSaving(true);
    const payload = {
      name: form.name.trim(), category: form.category, price: +form.price,
      origPrice: form.origPrice ? +form.origPrice : undefined,
      description: form.description.trim(), sizes: form.sizes,
      stock: +form.stock||100,
      imageUrl: form.imageUrl.trim()||undefined,
      gradient: form.gradient.trim()||'linear-gradient(135deg,var(--surface),#6366f1)',
      topSeller: form.topSeller,
      letter: form.name.trim().charAt(0).toUpperCase(),
    };
    try {
      if (editId) {
        await apiFetch(`/products/${editId}`, { method:'PUT', body:JSON.stringify(payload) }, token);
        showToast(`"${payload.name}" updated!`);
        setEditId(null);
      } else {
        await apiFetch('/products', { method:'POST', body:JSON.stringify(payload) }, token);
        showToast(`"${payload.name}" is now live on the store!`);
      }
      setForm(EMPTY); setPreview(null); setView('list'); load();
    } catch(e) { setErr(e.message||'Failed to save'); }
    finally { setSaving(false); }
  }

  async function handleDelete(id, name) {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
    try {
      await apiFetch(`/products/${id}`, { method:'DELETE' }, token);
      showToast(`"${name}" removed.`, 'error'); load();
    } catch(e) { showToast(e.message, 'error'); }
  }

  function startEdit(p) {
    setEditId(p.id||p._id); setErr('');
    setForm({
      name: p.name, category: p.category, price: String(p.price),
      origPrice: p.origPrice ? String(p.origPrice) : '',
      description: p.description||'',
      sizes: Array.isArray(p.sizes) ? p.sizes : ['S','M','L','XL'],
      stock: String(p.stock||100), imageUrl: p.imageUrl||'',
      gradient: p.gradient||'', topSeller: !!p.topSeller,
    });
    setPreview(p.imageUrl||null); setView('form');
    window.scrollTo({ top:0, behavior:'smooth' });
  }

  const displayed = products.filter(p => !search || p.name.toLowerCase().includes(search.toLowerCase()));

  const iSty = {
    width:'100%', padding:'0.6rem 0.85rem', background:'#f8fafc',
    border:'1px solid #e2e8f0', borderRadius:10, color:'#1e1b4b',
    fontSize:'0.875rem', fontFamily:'var(--font-body)', outline:'none', boxSizing:'border-box',
  };
  const lSty = { display:'block', fontSize:'0.62rem', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.08em', color:'#64748b', marginBottom:6 };

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:'1.25rem' }}>

      {/* Header with toggle */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <h2 style={{ fontFamily:'var(--font-display)', fontSize:'1.1rem', color:'#1e1b4b', margin:0 }}>
          {view==='list' ? `Store Inventory (${products.length})` : editId ? 'Edit Product' : 'Add New Product'}
        </h2>
        <div style={{ display:'flex', gap:'0.5rem' }}>
          {view==='form' && (
            <button onClick={() => { setView('list'); setEditId(null); setForm(EMPTY); setPreview(null); setErr(''); }}
              style={{ padding:'0.5rem 1rem', background:'#f1f5f9', border:'1px solid #e2e8f0', borderRadius:8, color:'#64748b', fontSize:'0.82rem', cursor:'pointer' }}>
              ← Back to List
            </button>
          )}
          {view==='list' && (
            <button onClick={() => setView('form')}
              style={{ padding:'0.5rem 1.1rem', background:'#6366f1', border:'none', borderRadius:8, color:'#fff', fontSize:'0.82rem', fontWeight:700, cursor:'pointer' }}>
              + Add Product
            </button>
          )}
        </div>
      </div>

      {/* ── PRODUCT FORM ── */}
      {view==='form' && (
        <div style={{ background:'#fff', borderRadius:16, padding:'1.5rem', boxShadow:'0 1px 4px rgba(0,0,0,0.06)', border:'1px solid #f1f5f9' }}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1rem' }}>
            <div style={{ gridColumn:'1/-1' }}>
              <label style={lSty}>Product Name *</label>
              <input value={form.name} onChange={e => F('name',e.target.value)} placeholder="e.g. Black Dragon Oversized Tee" style={iSty} />
            </div>
            <div>
              <label style={lSty}>Category</label>
              <select value={form.category} onChange={e => F('category',e.target.value)} style={iSty}>
                {CATS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
            <div>
              <label style={lSty}>Stock (units)</label>
              <input type="number" value={form.stock} onChange={e => F('stock',e.target.value)} style={iSty} min="0" />
            </div>
            <div>
              <label style={lSty}>Selling Price (₹) *</label>
              <input type="number" value={form.price} onChange={e => F('price',e.target.value)} placeholder="799" style={iSty} />
            </div>
            <div>
              <label style={lSty}>MRP / Original Price (₹)</label>
              <input type="number" value={form.origPrice} onChange={e => F('origPrice',e.target.value)} placeholder="1299" style={iSty} />
            </div>
            <div style={{ gridColumn:'1/-1' }}>
              <label style={lSty}>Description *</label>
              <textarea value={form.description} onChange={e => F('description',e.target.value)}
                placeholder="Describe the product — material, fit, care instructions…"
                rows={3} style={{ ...iSty, resize:'vertical', lineHeight:1.6 }} />
            </div>
            <div>
              <label style={lSty}>Image URL</label>
              <input value={form.imageUrl} onChange={e => { F('imageUrl',e.target.value); setPreview(e.target.value); }}
                placeholder="https://…" style={iSty} />
            </div>
            <div>
              <label style={lSty}>Card Gradient (CSS)</label>
              <input value={form.gradient} onChange={e => F('gradient',e.target.value)}
                placeholder="linear-gradient(135deg, #0f3460, #6366f1)" style={iSty} />
            </div>
            <div style={{ gridColumn:'1/-1' }}>
              <label style={lSty}>Available Sizes *</label>
              <div style={{ display:'flex', gap:'0.5rem', flexWrap:'wrap' }}>
                {SIZES.map(s => (
                  <button key={s} type="button" onClick={() => toggleSize(s)}
                    style={{
                      padding:'0.35rem 0.85rem', borderRadius:8, fontSize:'0.82rem', fontWeight:700,
                      border:'1px solid', cursor:'pointer',
                      background: form.sizes.includes(s) ? '#6366f1' : '#f8fafc',
                      borderColor: form.sizes.includes(s) ? '#6366f1' : '#e2e8f0',
                      color: form.sizes.includes(s) ? '#fff' : '#64748b',
                      transition:'all 0.15s',
                    }}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label style={{ ...lSty, display:'flex', alignItems:'center', gap:'0.5rem', cursor:'pointer' }}>
                <input type="checkbox" checked={form.topSeller} onChange={e => F('topSeller',e.target.checked)}
                  style={{ width:16, height:16, accentColor:'#6366f1' }} />
                Mark as Top Seller (shows on homepage)
              </label>
            </div>
          </div>

          {preview && (
            <div style={{ marginTop:'1rem', display:'flex', gap:'1rem', alignItems:'center' }}>
              <img src={preview} alt="preview" onError={() => setPreview(null)}
                style={{ width:80, height:80, objectFit:'cover', borderRadius:10, border:'1px solid #e2e8f0' }} />
              <span style={{ fontSize:'0.75rem', color:'#94a3b8' }}>Image preview</span>
            </div>
          )}

          {err && (
            <div style={{ marginTop:'0.75rem', padding:'0.6rem 1rem', background:'#fef2f2', border:'1px solid #fecaca', borderRadius:8, color:'#dc2626', fontSize:'0.82rem' }}>
              {err}
            </div>
          )}

          <button onClick={handleSave} disabled={saving}
            style={{
              marginTop:'1.25rem', width:'100%', padding:'0.9rem',
              background: saving ? '#94a3b8' : '#6366f1',
              border:'none', borderRadius:12, color:'#fff',
              fontSize:'1rem', fontWeight:700, cursor: saving?'not-allowed':'pointer',
              fontFamily:'var(--font-display)', letterSpacing:'0.04em', transition:'all 0.2s',
            }}>
            {saving ? 'Saving…' : editId ? 'Update Product' : 'Publish to Store'}
          </button>
        </div>
      )}

      {/* ── PRODUCT LIST ── */}
      {view==='list' && (
        <>
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search products…"
            style={{ padding:'0.6rem 1rem', borderRadius:10, border:'1px solid #e2e8f0', background:'#fff', fontSize:'0.875rem', fontFamily:'var(--font-body)', outline:'none', color:'#1e1b4b', maxWidth:320 }} />

          {loading ? (
            <div style={{ display:'flex', justifyContent:'center', padding:'2rem' }}><div className="spinner" /></div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:'0.5rem' }}>
              {displayed.map(p => (
                <div key={p.id||p._id} style={{
                  display:'grid', gridTemplateColumns:'56px 1fr 100px 100px auto auto',
                  gap:'1rem', alignItems:'center',
                  background:'#fff', borderRadius:12, padding:'0.75rem 1rem',
                  border:'1px solid #e2e8f0', boxShadow:'0 1px 2px rgba(0,0,0,0.04)',
                }}>
                  <div style={{ width:48, height:48, borderRadius:10, overflow:'hidden', background:p.gradient||'#6366f1', display:'flex', alignItems:'center', justifyContent:'center' }}>
                    {p.imageUrl
                      ? <img src={p.imageUrl} alt={p.name} style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                      : <span style={{ fontSize:'1.4rem', fontWeight:800, color:'#fff' }}>{p.name?.charAt(0)}</span>
                    }
                  </div>

                  <div>
                    <div style={{ fontWeight:600, fontSize:'0.875rem', color:'#1e1b4b' }}>{p.name}</div>
                    <div style={{ fontSize:'0.72rem', color:'#94a3b8' }}>
                      {CATS.find(c=>c.value===p.category)?.label||p.category} · ₹{(p.price||0).toLocaleString('en-IN')}
                      {p.topSeller && ' · Top'}
                    </div>
                  </div>

                  <div style={{ textAlign:'right' }}>
                    <div style={{ fontSize:'0.68rem', color:'#94a3b8' }}>Stock</div>
                    <div style={{ fontWeight:700, color: (p.stock||0)===0?'#ef4444':(p.stock||0)<=10?'#f59e0b':'#10b981' }}>
                      {p.stock||0}
                    </div>
                  </div>

                  <div style={{ textAlign:'right' }}>
                    <div style={{ fontSize:'0.68rem', color:'#94a3b8' }}>Rating</div>
                    <div style={{ fontWeight:700, color:'#f59e0b' }}>{p.rating||'—'}</div>
                  </div>

                  <button onClick={() => startEdit(p)}
                    style={{ padding:'0.4rem 0.85rem', background:'#eff6ff', border:'1px solid #bfdbfe', borderRadius:8, color:'#3b82f6', fontSize:'0.75rem', fontWeight:600, cursor:'pointer' }}>
                    Edit
                  </button>
                  <button onClick={() => handleDelete(p.id||p._id, p.name)}
                    style={{ padding:'0.4rem 0.85rem', background:'#fef2f2', border:'1px solid #fecaca', borderRadius:8, color:'#ef4444', fontSize:'0.75rem', fontWeight:600, cursor:'pointer' }}>
                    Del
                  </button>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
