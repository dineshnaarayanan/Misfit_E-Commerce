import { useApp }             from '../context/AppContext';
import { discount, stars, categoryLabels } from '../api';

export default function ProductCard({ product: p }) {
  const { wishlistIds, toggleWishlist, setProductModal, compareProducts, toggleCompare } = useApp();
  const disc      = discount(p);
  const wished    = wishlistIds.has(String(p.id));
  const outOfStock = p.stock <= 0;
  const isComparing = (compareProducts || []).some(cp => cp.id === p.id);

  function handleWishlist(e) {
    e.stopPropagation();
    toggleWishlist(p.id);
  }

  function handleCompare(e) {
    e.stopPropagation();
    toggleCompare(p);
  }

  return (
    <div
      className="product-card"
      onClick={() => setProductModal(p)}
      style={outOfStock ? { opacity: 0.65 } : {}}
    >
      <div className="product-img" style={{ background: p.gradient }}>
        {p.imageUrl
          ? <img src={p.imageUrl} alt={p.name} loading="lazy" />
          : <span className="product-img-placeholder">{p.letter}</span>
        }
        {/* Category tag */}
        <span className="product-tag">{categoryLabels[p.category] || p.category}</span>

        {/* Out of Stock overlay */}
        {outOfStock && (
          <div style={{
            position: 'absolute', inset: 0,
            background: 'rgba(0,0,0,0.55)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            borderRadius: 'var(--radius-lg) var(--radius-lg) 0 0',
          }}>
            <span style={{
              background: '#ef4444', color: '#fff', padding: '0.3rem 0.85rem',
              borderRadius: '50px', fontSize: '0.72rem', fontWeight: '700',
              textTransform: 'uppercase', letterSpacing: '0.08em',
            }}>Out of Stock</span>
          </div>
        )}

        {/* Top Seller badge */}
        {p.topSeller && !outOfStock && (
          <span className="product-badge">Top Seller</span>
        )}

        {/* Wishlist button */}
        <button
          className={`wishlist-btn ${wished ? 'wished' : ''}`}
          onClick={handleWishlist}
          title={wished ? 'Remove from wishlist' : 'Add to wishlist'}
        >
          {wished ? '♥' : '♡'}
        </button>

        {/* Compare button */}
        <button
          className={`compare-btn ${isComparing ? 'comparing' : ''}`}
          onClick={handleCompare}
          title={isComparing ? 'Remove from comparison' : 'Add to comparison'}
          style={{
            position: 'absolute',
            bottom: '0.6rem',
            left: '0.6rem',
            background: isComparing ? 'var(--accent)' : 'rgba(0,0,0,0.6)',
            border: 'none',
            borderRadius: '50%',
            width: '32px',
            height: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            cursor: 'pointer',
            backdropFilter: 'blur(4px)',
            transition: 'all var(--transition)',
            zIndex: 2,
          }}
          onMouseEnter={(e) => {
            if (!isComparing) {
              e.currentTarget.style.background = 'rgba(0,0,0,0.8)';
              e.currentTarget.style.color = 'var(--accent)';
            }
          }}
          onMouseLeave={(e) => {
            if (!isComparing) {
              e.currentTarget.style.background = 'rgba(0,0,0,0.6)';
              e.currentTarget.style.color = '#fff';
            }
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="20" x2="18" y2="10"></line>
            <line x1="12" y1="20" x2="12" y2="4"></line>
            <line x1="6" y1="20" x2="6" y2="14"></line>
          </svg>
        </button>
      </div>

      <div className="product-info">
        <div className="product-name">{p.name}</div>
        <div className="product-price-row">
          <span className="product-price">₹{p.price.toLocaleString('en-IN')}</span>
          {p.origPrice && <span className="product-orig">₹{p.origPrice.toLocaleString('en-IN')}</span>}
          {disc > 0     && <span className="product-discount">{disc}% off</span>}
        </div>
        <div className="product-rating">
          <span className="star">{stars(p.rating)}</span>
          <span>{p.rating} ({p.reviews})</span>
          {outOfStock
            ? <span style={{ color: 'var(--error)', fontWeight: 600, marginLeft: 'auto' }}>Sold Out</span>
            : p.stock <= 5
            ? <span style={{ color: '#fbbf24', fontWeight: 600, marginLeft: 'auto' }}>Only {p.stock} left!</span>
            : null
          }
        </div>
      </div>
    </div>
  );
}
