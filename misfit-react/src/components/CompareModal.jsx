import { useApp } from '../context/AppContext';
import { stars, discount, categoryLabels } from '../api';

// Helper to infer cloth and material from product details
function getProductSpecs(p) {
  if (!p) return { material: '—', cloth: '—' };
  
  // Infer Material
  let material = '100% Premium Cotton';
  const desc = (p.description || '').toLowerCase();
  const name = (p.name || '').toLowerCase();

  if (desc.includes('fleece') || name.includes('fleece')) {
    material = '260gsm Cotton-Blend Fleece';
  } else if (desc.includes('220gsm') || name.includes('220gsm')) {
    material = '220gsm Combed Cotton';
  } else if (desc.includes('piqué') || desc.includes('pique') || name.includes('polo')) {
    material = 'Piqué Knit Cotton';
  } else if (desc.includes('280gsm') || name.includes('heavyweight')) {
    material = '280gsm Heavyweight Cotton';
  } else if (desc.includes('200gsm') || name.includes('slate')) {
    material = '200gsm Single Jersey Cotton';
  } else if (desc.includes('jersey') || name.includes('solid')) {
    material = 'Premium Jersey Cotton';
  } else if (desc.includes('bleach') || desc.includes('acid') || name.includes('acid')) {
    material = '240gsm Acid-Washed Cotton';
  }

  // Infer Cloth (Fit style)
  let cloth = 'Regular Fit T-Shirt';
  const cat = p.category;
  if (cat === 'oversized') {
    cloth = 'Boxy Oversized Streetwear Fit';
  } else if (cat === 'acid-wash') {
    cloth = 'Vintage Acid Wash Drop-Shoulder';
  } else if (cat === 'polo') {
    cloth = 'Structured Custom Polo Fit';
  } else if (cat === 'graphic') {
    cloth = 'Classic Graphic Fit';
  } else if (cat === 'plain') {
    cloth = 'Solid Foundation Regular Fit';
  }

  return { material, cloth };
}

export default function CompareModal() {
  const {
    compareOpen,
    setCompareOpen,
    compareProducts,
    setCompareProducts,
    products,
    showToast,
    addToCart
  } = useApp();

  if (!compareOpen) return null;

  const p1 = compareProducts[0];
  const p2 = compareProducts[1];

  // Get available products for selection dropdown
  const otherProducts = products.filter(p => !compareProducts.some(cp => cp.id === p.id));

  const handleSelectProduct = (index, productId) => {
    const selected = products.find(p => p.id === productId);
    if (!selected) return;
    
    setCompareProducts(prev => {
      const next = [...prev];
      next[index] = selected;
      return next.filter(Boolean);
    });
  };

  const handleRemoveProduct = (productId) => {
    setCompareProducts(prev => prev.filter(p => p.id !== productId));
  };

  const handleQuickAdd = (p) => {
    // Add to cart with default first size and color
    const size = p.sizes && p.sizes.length > 0 ? p.sizes[0] : 'M';
    const colour = p.colours && p.colours.length > 0 ? p.colours[0] : 'Black';
    addToCart(p, size, colour);
  };

  const specs1 = getProductSpecs(p1);
  const specs2 = getProductSpecs(p2);

  return (
    <div className="modal-overlay" style={{ display: 'flex' }} onClick={() => setCompareOpen(false)}>
      <div 
        className="compare-modal-content"
        onClick={e => e.stopPropagation()}
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)',
          width: '100%',
          maxWidth: '850px',
          maxHeight: '90vh',
          boxShadow: 'var(--shadow)',
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}
      >
        {/* Header */}
        <div style={{
          padding: '1.5rem 2rem',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <h3 style={{
              fontFamily: 'var(--font-display)',
              fontSize: '1.8rem',
              letterSpacing: '0.04em',
              margin: 0
            }}>Compare T-Shirts</h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--muted)', margin: '4px 0 0' }}>
              Compare material, pricing, ratings and fits side-by-side
            </p>
          </div>
          <button 
            className="modal-close" 
            style={{ position: 'static' }}
            onClick={() => setCompareOpen(false)}
          >
            x
          </button>
        </div>

        {/* Comparison Grid */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '2rem'
        }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '2rem'
          }}>
            {/* COLUMN 1 */}
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {p1 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  {/* Image & Basic Details */}
                  <div style={{ position: 'relative' }}>
                    <div style={{
                      aspectRatio: '4/3',
                      background: p1.gradient,
                      borderRadius: 'var(--radius)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      overflow: 'hidden',
                      boxShadow: 'inset 0 0 40px rgba(0,0,0,0.2)'
                    }}>
                      {p1.imageUrl ? (
                        <img src={p1.imageUrl} alt={p1.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <span style={{ fontFamily: 'var(--font-display)', fontSize: '5rem', color: 'rgba(0,0,0,0.08)' }}>
                          {p1.letter}
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => handleRemoveProduct(p1.id)}
                      style={{
                        position: 'absolute',
                        top: '0.5rem',
                        right: '0.5rem',
                        background: 'rgba(239, 68, 68, 0.9)',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '50%',
                        width: '24px',
                        height: '24px',
                        cursor: 'pointer',
                        fontSize: '0.75rem',
                        fontWeight: 'bold',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 2px 6px rgba(0,0,0,0.2)'
                      }}
                      title="Remove product"
                    >
                      x
                    </button>
                  </div>

                  <div>
                    <span className="modal-tag" style={{ background: 'var(--accent-dim)', color: 'var(--accent)', marginRight: '0.5rem' }}>
                      {categoryLabels[p1.category]}
                    </span>
                    {p1.topSeller && (
                      <span className="modal-tag" style={{ background: 'rgba(251,191,36,0.15)', color: '#fbbf24' }}>
                        Top Seller
                      </span>
                    )}
                    <h4 style={{ fontFamily: 'var(--font-body)', fontSize: '1.1rem', fontWeight: 700, margin: '0.5rem 0 0.25rem' }}>
                      {p1.name}
                    </h4>
                  </div>

                  {/* Attributes Spec Table */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', background: 'var(--surface2)', padding: '1rem', borderRadius: 'var(--radius)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '0.4rem' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--muted)', fontWeight: 600 }}>PRICE</span>
                      <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--accent)' }}>
                        ₹{p1.price.toLocaleString('en-IN')}
                        {p1.origPrice && (
                          <span style={{ fontSize: '0.72rem', textDecoration: 'line-through', color: 'var(--muted2)', marginLeft: '6px', fontWeight: 400 }}>
                            ₹{p1.origPrice.toLocaleString('en-IN')}
                          </span>
                        )}
                      </span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '0.4rem' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--muted)', fontWeight: 600 }}>FABRIC / CLOTH</span>
                      <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text)', textAlign: 'right' }}>
                        {specs1.cloth}
                      </span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '0.4rem' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--muted)', fontWeight: 600 }}>MATERIAL</span>
                      <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text)', textAlign: 'right' }}>
                        {specs1.material}
                      </span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '0.4rem' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--muted)', fontWeight: 600 }}>RATING</span>
                      <span style={{ fontSize: '0.82rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span style={{ color: '#fbbf24' }}>{stars(p1.rating)}</span>
                        {p1.rating} ({p1.reviews} reviews)
                      </span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '0.4rem' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--muted)', fontWeight: 600 }}>SIZES</span>
                      <span style={{ fontSize: '0.82rem', color: 'var(--muted2)', fontWeight: 600 }}>
                        {p1.sizes.join(' · ')}
                      </span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--muted)', fontWeight: 600 }}>COLOURS</span>
                      <span style={{ fontSize: '0.82rem', color: 'var(--muted2)', fontWeight: 600 }}>
                        {p1.colours.join(', ')}
                      </span>
                    </div>
                  </div>

                  {/* Description */}
                  <div>
                    <h5 style={{ textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--muted)', fontSize: '0.7rem', margin: '0 0 0.4rem' }}>Description</h5>
                    <p style={{ fontSize: '0.78rem', color: 'var(--muted2)', lineHeight: 1.5, margin: 0 }}>
                      {p1.description || p1.desc || 'No description available.'}
                    </p>
                  </div>

                  {/* Quick Add */}
                  <button
                    className="btn-buy"
                    onClick={() => handleQuickAdd(p1)}
                    disabled={p1.stock <= 0}
                    style={{ width: '100%', padding: '0.7rem', fontSize: '0.85rem' }}
                  >
                    {p1.stock <= 0 ? 'Out of Stock' : 'Add default to Cart'}
                  </button>
                </div>
              ) : (
                <div style={{
                  border: '2px dashed var(--border)',
                  borderRadius: 'var(--radius-lg)',
                  aspectRatio: '4/3',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '2rem',
                  textAlign: 'center',
                  background: 'var(--surface2)'
                }}>
                  <p style={{ color: 'var(--muted2)', fontSize: '0.875rem', marginBottom: '1rem' }}>
                    Select a product to compare
                  </p>
                  <select
                    onChange={(e) => handleSelectProduct(0, e.target.value)}
                    defaultValue=""
                    style={{
                      width: '100%',
                      padding: '0.6rem',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius)',
                      background: 'var(--surface)',
                      color: 'var(--text)',
                      fontFamily: 'var(--font-body)',
                      fontSize: '0.8rem',
                      outline: 'none'
                    }}
                  >
                    <option value="" disabled>Choose T-Shirt...</option>
                    {otherProducts.map(p => (
                      <option key={p.id} value={p.id}>{p.name} - ₹{p.price}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* COLUMN 2 */}
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {p2 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  {/* Image & Basic Details */}
                  <div style={{ position: 'relative' }}>
                    <div style={{
                      aspectRatio: '4/3',
                      background: p2.gradient,
                      borderRadius: 'var(--radius)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      overflow: 'hidden',
                      boxShadow: 'inset 0 0 40px rgba(0,0,0,0.2)'
                    }}>
                      {p2.imageUrl ? (
                        <img src={p2.imageUrl} alt={p2.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <span style={{ fontFamily: 'var(--font-display)', fontSize: '5rem', color: 'rgba(0,0,0,0.08)' }}>
                          {p2.letter}
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => handleRemoveProduct(p2.id)}
                      style={{
                        position: 'absolute',
                        top: '0.5rem',
                        right: '0.5rem',
                        background: 'rgba(239, 68, 68, 0.9)',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '50%',
                        width: '24px',
                        height: '24px',
                        cursor: 'pointer',
                        fontSize: '0.75rem',
                        fontWeight: 'bold',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 2px 6px rgba(0,0,0,0.2)'
                      }}
                      title="Remove product"
                    >
                      x
                    </button>
                  </div>

                  <div>
                    <span className="modal-tag" style={{ background: 'var(--accent-dim)', color: 'var(--accent)', marginRight: '0.5rem' }}>
                      {categoryLabels[p2.category]}
                    </span>
                    {p2.topSeller && (
                      <span className="modal-tag" style={{ background: 'rgba(251,191,36,0.15)', color: '#fbbf24' }}>
                        Top Seller
                      </span>
                    )}
                    <h4 style={{ fontFamily: 'var(--font-body)', fontSize: '1.1rem', fontWeight: 700, margin: '0.5rem 0 0.25rem' }}>
                      {p2.name}
                    </h4>
                  </div>

                  {/* Attributes Spec Table */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', background: 'var(--surface2)', padding: '1rem', borderRadius: 'var(--radius)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '0.4rem' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--muted)', fontWeight: 600 }}>PRICE</span>
                      <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--accent)' }}>
                        ₹{p2.price.toLocaleString('en-IN')}
                        {p2.origPrice && (
                          <span style={{ fontSize: '0.72rem', textDecoration: 'line-through', color: 'var(--muted2)', marginLeft: '6px', fontWeight: 400 }}>
                            ₹{p2.origPrice.toLocaleString('en-IN')}
                          </span>
                        )}
                      </span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '0.4rem' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--muted)', fontWeight: 600 }}>FABRIC / CLOTH</span>
                      <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text)', textAlign: 'right' }}>
                        {specs2.cloth}
                      </span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '0.4rem' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--muted)', fontWeight: 600 }}>MATERIAL</span>
                      <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text)', textAlign: 'right' }}>
                        {specs2.material}
                      </span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '0.4rem' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--muted)', fontWeight: 600 }}>RATING</span>
                      <span style={{ fontSize: '0.82rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span style={{ color: '#fbbf24' }}>{stars(p2.rating)}</span>
                        {p2.rating} ({p2.reviews} reviews)
                      </span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '0.4rem' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--muted)', fontWeight: 600 }}>SIZES</span>
                      <span style={{ fontSize: '0.82rem', color: 'var(--muted2)', fontWeight: 600 }}>
                        {p2.sizes.join(' · ')}
                      </span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--muted)', fontWeight: 600 }}>COLOURS</span>
                      <span style={{ fontSize: '0.82rem', color: 'var(--muted2)', fontWeight: 600 }}>
                        {p2.colours.join(', ')}
                      </span>
                    </div>
                  </div>

                  {/* Description */}
                  <div>
                    <h5 style={{ textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--muted)', fontSize: '0.7rem', margin: '0 0 0.4rem' }}>Description</h5>
                    <p style={{ fontSize: '0.78rem', color: 'var(--muted2)', lineHeight: 1.5, margin: 0 }}>
                      {p2.description || p2.desc || 'No description available.'}
                    </p>
                  </div>

                  {/* Quick Add */}
                  <button
                    className="btn-buy"
                    onClick={() => handleQuickAdd(p2)}
                    disabled={p2.stock <= 0}
                    style={{ width: '100%', padding: '0.7rem', fontSize: '0.85rem' }}
                  >
                    {p2.stock <= 0 ? 'Out of Stock' : 'Add default to Cart'}
                  </button>
                </div>
              ) : (
                <div style={{
                  border: '2px dashed var(--border)',
                  borderRadius: 'var(--radius-lg)',
                  aspectRatio: '4/3',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '2rem',
                  textAlign: 'center',
                  background: 'var(--surface2)'
                }}>
                  <p style={{ color: 'var(--muted2)', fontSize: '0.875rem', marginBottom: '1rem' }}>
                    Select a product to compare
                  </p>
                  <select
                    onChange={(e) => handleSelectProduct(1, e.target.value)}
                    defaultValue=""
                    style={{
                      width: '100%',
                      padding: '0.6rem',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius)',
                      background: 'var(--surface)',
                      color: 'var(--text)',
                      fontFamily: 'var(--font-body)',
                      fontSize: '0.8rem',
                      outline: 'none'
                    }}
                  >
                    <option value="" disabled>Choose T-Shirt...</option>
                    {otherProducts.map(p => (
                      <option key={p.id} value={p.id}>{p.name} - ₹{p.price}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
