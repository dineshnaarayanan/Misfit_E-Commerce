/* ═══════════════════════════════════════════════════════
   QuickAddProduct.jsx
   Admin-only modal accessible directly from the storefront navbar.
   On success → product appears immediately in the store.
═══════════════════════════════════════════════════════ */
import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { apiFetch } from '../api';

const CATS = [
  { value: 'polo',      label: 'Polo T-Shirts'     },
  { value: 'acid-wash', label: 'Acid Wash'          },
  { value: 'oversized', label: 'Oversized'          },
  { value: 'graphic',   label: 'Graphic Tees'       },
  { value: 'plain',     label: 'Plain / Solid'      },
];
const ALL_SIZES = ['XS','S','M','L','XL','XXL','3XL'];
const EMPTY = {
  name:'', category:'polo', price:'', origPrice:'',
  description:'', imageUrl:'', gradient:'',
  sizes:['S','M','L','XL'], stock:'100', topSeller:false,
};

export default function QuickAddProduct() {
  const { addProductOpen, setAddProductOpen, token, setProducts, showToast } = useApp();
  const [form,    setForm]    = useState(EMPTY);
  const [err,     setErr]     = useState('');
  const [saving,  setSaving]  = useState(false);
  const [preview, setPreview] = useState('');

  if (!addProductOpen) return null;

  const F = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const toggleSize = s => setForm(f => ({
    ...f, sizes: f.sizes.includes(s) ? f.sizes.filter(x => x !== s) : [...f.sizes, s]
  }));

  const close = () => {
    setAddProductOpen(false);
    setForm(EMPTY);
    setErr('');
    setPreview('');
  };

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name.trim())           { setErr('Product name is required'); return; }
    if (!form.price || isNaN(+form.price)) { setErr('Valid selling price is required'); return; }
    if (!form.description.trim())    { setErr('Description is required'); return; }
    if (!form.sizes.length)          { setErr('Select at least one size'); return; }

    setErr(''); setSaving(true);
    const payload = {
      name:        form.name.trim(),
      category:    form.category,
      price:       +form.price,
      origPrice:   form.origPrice ? +form.origPrice : undefined,
      description: form.description.trim(),
      sizes:       form.sizes,
      stock:       +form.stock || 100,
      imageUrl:    form.imageUrl.trim() || undefined,
      gradient:    form.gradient.trim() || 'linear-gradient(135deg,#1e1b4b,#6366f1)',
      topSeller:   form.topSeller,
      letter:      form.name.trim().charAt(0).toUpperCase(),
    };

    try {
      const d = await apiFetch('/products', { method: 'POST', body: JSON.stringify(payload) }, token);
      const newProduct = d.product || payload;
      // Immediately inject into global product list so it shows on the storefront
      setProducts(prev => [{ ...newProduct, id: newProduct._id || newProduct.id }, ...prev]);
      showToast(`"${payload.name}" is now live in the store!`, 'success');
      close();
    } catch (e) {
      setErr(e.message || 'Failed to add product');
    } finally {
      setSaving(false);
    }
  }

  const overlay = {
    position: 'fixed', inset: 0, zIndex: 99999,
    background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: '1rem',
  };
  const modal = {
    background: '#fff', borderRadius: 20, width: '100%', maxWidth: 680,
    maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 25px 80px rgba(0,0,0,0.25)',
  };
  const iSty = {
    width: '100%', padding: '0.65rem 0.9rem',
    background: '#f8fafc', border: '1.5px solid #e2e8f0',
    borderRadius: 10, color: '#1e1b4b', fontSize: '0.875rem',
    fontFamily: 'var(--font-body)', outline: 'none', boxSizing: 'border-box',
    transition: 'border-color 0.2s',
  };
  const lSty = {
    display: 'block', fontSize: '0.68rem', fontWeight: 700,
    textTransform: 'uppercase', letterSpacing: '0.08em',
    color: '#64748b', marginBottom: 6,
  };

  return (
    <div style={overlay} onClick={e => e.target === e.currentTarget && close()}>
      <div style={modal}>

        {/* Header */}
        <div style={{
          padding: '1.5rem 1.75rem 1rem',
          borderBottom: '1px solid #f1f5f9',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          position: 'sticky', top: 0, background: '#fff', borderRadius: '20px 20px 0 0', zIndex: 1,
        }}>
          <div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', color: '#1e1b4b', margin: 0, letterSpacing: '0.04em' }}>
              Add New Product
            </h2>
            <p style={{ fontSize: '0.75rem', color: '#94a3b8', margin: '2px 0 0' }}>
              Product will appear instantly on the storefront after saving
            </p>
          </div>
          <button onClick={close} style={{
            width: 36, height: 36, borderRadius: '50%', border: '1px solid #e2e8f0',
            background: '#f8fafc', cursor: 'pointer', fontSize: '1rem', color: '#64748b',
          }}>x</button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ padding: '1.5rem 1.75rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>

            {/* Product Name — full width */}
            <div style={{ gridColumn: '1/-1' }}>
              <label style={lSty}>Product Name *</label>
              <input value={form.name} onChange={e => F('name', e.target.value)}
                placeholder="e.g. Black Dragon Oversized Tee" style={iSty} />
            </div>

            {/* Category */}
            <div>
              <label style={lSty}>Category</label>
              <select value={form.category} onChange={e => F('category', e.target.value)} style={iSty}>
                {CATS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>

            {/* Stock */}
            <div>
              <label style={lSty}>Stock (units)</label>
              <input type="number" value={form.stock} onChange={e => F('stock', e.target.value)}
                min="0" style={iSty} />
            </div>

            {/* Selling Price */}
            <div>
              <label style={lSty}>Selling Price (₹) *</label>
              <input type="number" value={form.price} onChange={e => F('price', e.target.value)}
                placeholder="799" style={iSty} />
            </div>

            {/* MRP */}
            <div>
              <label style={lSty}>MRP / Original Price (₹)</label>
              <input type="number" value={form.origPrice} onChange={e => F('origPrice', e.target.value)}
                placeholder="1299 (leave blank if no discount)" style={iSty} />
            </div>

            {/* Description — full width */}
            <div style={{ gridColumn: '1/-1' }}>
              <label style={lSty}>Description *</label>
              <textarea value={form.description} onChange={e => F('description', e.target.value)}
                rows={3} placeholder="Describe the fit, material, care instructions…"
                style={{ ...iSty, resize: 'vertical', lineHeight: 1.6 }} />
            </div>

            {/* Image URL */}
            <div style={{ gridColumn: '1/-1' }}>
              <label style={lSty}>Product Image URL</label>
              <input value={form.imageUrl}
                onChange={e => { F('imageUrl', e.target.value); setPreview(e.target.value); }}
                placeholder="https://i.imgur.com/… or any direct image link" style={iSty} />
              {/* Live image preview */}
              {preview && (
                <div style={{ marginTop: '0.75rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
                  <img src={preview} alt="preview"
                    onError={() => setPreview('')}
                    style={{ width: 90, height: 90, objectFit: 'cover', borderRadius: 12, border: '2px solid #e2e8f0' }} />
                  <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
                    <div style={{ fontWeight: 700, color: '#10b981', marginBottom: 2 }}>Image preview</div>
                    <div>This is how the product image will look on the store</div>
                  </div>
                </div>
              )}
            </div>

            {/* Card Gradient */}
            <div style={{ gridColumn: '1/-1' }}>
              <label style={lSty}>Card Background Gradient (optional)</label>
              <input value={form.gradient} onChange={e => F('gradient', e.target.value)}
                placeholder="linear-gradient(135deg, #0f3460, #6366f1)" style={iSty} />
            </div>

            {/* Sizes */}
            <div style={{ gridColumn: '1/-1' }}>
              <label style={lSty}>Available Sizes * (click to toggle)</label>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {ALL_SIZES.map(s => (
                  <button key={s} type="button" onClick={() => toggleSize(s)}
                    style={{
                      padding: '0.4rem 0.9rem', borderRadius: 8, fontSize: '0.82rem', fontWeight: 700,
                      border: '1.5px solid', cursor: 'pointer', transition: 'all 0.15s',
                      background: form.sizes.includes(s) ? '#6366f1' : '#f8fafc',
                      borderColor: form.sizes.includes(s) ? '#6366f1' : '#e2e8f0',
                      color: form.sizes.includes(s) ? '#fff' : '#64748b',
                    }}>
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* Top Seller checkbox */}
            <div style={{ gridColumn: '1/-1' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', cursor: 'pointer', fontSize: '0.875rem', color: '#1e1b4b', fontWeight: 600 }}>
                <input type="checkbox" checked={form.topSeller} onChange={e => F('topSeller', e.target.checked)}
                  style={{ width: 18, height: 18, accentColor: '#6366f1' }} />
                Mark as Top Seller (shows on homepage highlights section)
              </label>
            </div>
          </div>

          {/* Error */}
          {err && (
            <div style={{
              marginTop: '1rem', padding: '0.65rem 1rem',
              background: '#fef2f2', border: '1px solid #fecaca',
              borderRadius: 10, color: '#dc2626', fontSize: '0.82rem', fontWeight: 600,
            }}>
              {err}
            </div>
          )}

          {/* Submit */}
          <button type="submit" disabled={saving}
            style={{
              width: '100%', marginTop: '1.25rem',
              padding: '0.95rem',
              background: saving ? '#94a3b8' : 'linear-gradient(135deg, #6366f1, #818cf8)',
              border: 'none', borderRadius: 12,
              color: '#fff', fontSize: '1rem', fontWeight: 700,
              cursor: saving ? 'not-allowed' : 'pointer',
              fontFamily: 'var(--font-display)', letterSpacing: '0.05em',
              boxShadow: saving ? 'none' : '0 4px 15px rgba(99,102,241,0.4)',
              transition: 'all 0.2s',
            }}>
            {saving ? 'Saving to Store…' : 'Publish Product to Store'}
          </button>
        </form>
      </div>
    </div>
  );
}
