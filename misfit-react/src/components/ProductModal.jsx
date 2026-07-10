import { useState, useEffect } from 'react';
import { useApp }               from '../context/AppContext';
import { apiFetch, stars, discount, categoryLabels, formatDate } from '../api';

export default function ProductModal() {
  const { productModal, setProductModal, setSelectorModal, addToCart, openPayment, token, showToast, currentUser } = useApp();
  const [selectedSize,   setSelectedSize]   = useState(null);
  const [selectedColour, setSelectedColour] = useState(null);
  const [reviews,        setReviews]        = useState([]);
  const [reviewRating,   setReviewRating]   = useState('');
  const [reviewComment,  setReviewComment]  = useState('');
  const [submitting,     setSubmitting]     = useState(false);

  const p = productModal;

  useEffect(() => {
    if (!p) return;
    setSelectedSize(null);
    setSelectedColour(null);
    loadReviews(p.id);
  }, [p]);

  async function loadReviews(id) {
    try {
      const data = await apiFetch(`/reviews/${id}`, {}, token);
      setReviews(data.reviews || []);
    } catch { setReviews([]); }
  }

  async function submitReview() {
    if (!currentUser) { showToast('Please login to submit a review', 'error'); return; }
    const rating = parseFloat(reviewRating);
    if (!rating || rating < 1 || rating > 5) { showToast('Please enter a rating between 1 and 5', 'error'); return; }
    setSubmitting(true);
    try {
      await apiFetch(`/reviews/${p.id}`, {
        method: 'POST',
        body: JSON.stringify({ rating, comment: reviewComment.trim() }),
      }, token);
      setReviewRating('');
      setReviewComment('');
      showToast('Review submitted!', 'success');
      loadReviews(p.id);
    } catch (err) { showToast(err.message || 'Failed to submit review', 'error'); }
    finally { setSubmitting(false); }
  }

  function handleAddToCart() {
    const reqColour = p.colours && p.colours.length > 0;
    if (!selectedSize || (reqColour && !selectedColour)) {
      setSelectorModal({ product: p, action: 'cart' });
      setProductModal(null);
    } else {
      addToCart(p, selectedSize, selectedColour || 'Standard');
      setProductModal(null);
    }
  }

  function handleBuyNow() {
    const reqColour = p.colours && p.colours.length > 0;
    if (!selectedSize || (reqColour && !selectedColour)) {
      setSelectorModal({ product: p, action: 'buy' });
      setProductModal(null);
    } else {
      setProductModal(null);
      openPayment([{ product: p, size: selectedSize, colour: selectedColour || 'Standard', qty: 1 }]);
    }
  }

  if (!p) return null;
  const disc       = discount(p);
  const outOfStock = p.stock <= 0;

  return (
    <div className="modal-overlay" style={{ display: 'flex' }}>
      <div className="product-modal">
        <button className="modal-close" onClick={() => setProductModal(null)}>x</button>
        <div className="product-modal-inner">
          {/* Image */}
          <div className="product-modal-img" style={{ background: p.gradient }}>
            {p.imageUrl
              ? <img src={p.imageUrl} alt={p.name} />
              : <span style={{ fontFamily: 'var(--font-display)', fontSize: '8rem', color: 'rgba(0,0,0,0.05)' }}>{p.letter}</span>
            }
          </div>

          {/* Info */}
          <div className="product-modal-info">
            <div className="modal-tags">
              <span className="modal-tag">{categoryLabels[p.category]}</span>
              {p.topSeller && <span className="modal-tag" style={{ background: 'rgba(251,191,36,0.15)', color: '#fbbf24' }}>Top Seller</span>}
              {disc > 0    && <span className="modal-tag" style={{ background: 'rgba(34,197,94,0.15)', color: '#22c55e' }}>{disc}% OFF</span>}
            </div>

            <h2 className="modal-name">{p.name}</h2>
            <div className="modal-price">
              ₹{p.price.toLocaleString('en-IN')}
              {p.origPrice && <span>₹{p.origPrice.toLocaleString('en-IN')}</span>}
            </div>
            <div className="modal-rating">
              <span className="star">{stars(p.rating)}</span>
              {p.rating} · {p.reviews} reviews
              {outOfStock
                ? <span style={{ marginLeft: '0.5rem', color: 'var(--error)', fontWeight: 700 }}>· Out of Stock</span>
                : p.stock <= 5
                ? <span style={{ marginLeft: '0.5rem', color: '#fbbf24', fontWeight: 600 }}>· Only {p.stock} left!</span>
                : <span style={{ marginLeft: '0.5rem', color: 'var(--success)' }}>· In Stock</span>
              }
            </div>
            <p className="modal-desc">{p.description || p.desc || ''}</p>

            {p.colours && p.colours.length > 0 && (
              <div className="modal-section">
                <h4>Available Colours</h4>
                <div className="colour-swatches">
                  {(p.colours || []).map((c, i) => (
                    <div
                      key={c}
                      className={`colour-swatch ${selectedColour === c ? 'active' : ''}`}
                      style={{ background: (p.colourHex || [])[i] || '#888' }}
                      title={c}
                      onClick={() => setSelectedColour(c)}
                    />
                  ))}
                </div>
              </div>
            )}

            <div className="modal-section">
              <h4>Available Sizes</h4>
              <div className="size-picker">
                {(p.sizes || []).map(s => (
                  <button
                    key={s}
                    className={`size-option ${selectedSize === s ? 'active' : ''}`}
                    onClick={() => setSelectedSize(s)}
                  >{s}</button>
                ))}
              </div>
            </div>

            {outOfStock && (
              <div style={{
                background: 'rgba(239,68,68,0.1)', border: '1px solid var(--error)',
                borderRadius: 'var(--radius)', padding: '0.65rem 1rem',
                color: 'var(--error)', fontWeight: 600, fontSize: '0.85rem',
                textAlign: 'center', marginBottom: '0.5rem',
              }}>
                This product is currently out of stock. Check back soon!
              </div>
            )}
            <div className="modal-actions">
              <button
                className="btn-cart"
                onClick={handleAddToCart}
                disabled={outOfStock}
                style={outOfStock ? { opacity: 0.45, cursor: 'not-allowed' } : {}}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 16, height: 16 }}>
                  <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
                  <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
                </svg>
                {outOfStock ? 'Out of Stock' : 'Add to Cart'}
              </button>
              <button
                className="btn-buy"
                onClick={handleBuyNow}
                disabled={outOfStock}
                style={outOfStock ? { opacity: 0.45, cursor: 'not-allowed' } : {}}
              >
                {outOfStock ? 'Unavailable' : 'Buy Now →'}
              </button>
            </div>

            {/* Reviews */}
            <div className="modal-section reviews-section">
              <h4>Customer Reviews</h4>
              {reviews.length === 0
                ? <p style={{ color: 'var(--muted)', fontSize: '.85rem', padding: '.5rem 0' }}>No reviews yet. Be the first!</p>
                : reviews.map((r, i) => (
                  <div key={i} className="review-item">
                    <div className="review-header">
                      <span className="review-author">{r.user_name || r.userName || 'User'}</span>
                      <span className="review-stars">{stars(r.rating)}</span>
                      <span className="review-date">{formatDate(r.createdAt || r.created_at)}</span>
                    </div>
                    {r.comment && <p className="review-comment">{r.comment}</p>}
                  </div>
                ))
              }
              <div className="review-form">
                <h5>Write a Review</h5>
                <div className="review-form-row">
                  <input
                    type="number" min="1" max="5" step="0.5"
                    placeholder="Rating (1-5)"
                    value={reviewRating}
                    onChange={e => setReviewRating(e.target.value)}
                  />
                  <input
                    type="text" placeholder="Share your thoughts…"
                    value={reviewComment}
                    onChange={e => setReviewComment(e.target.value)}
                  />
                  <button className="btn-review" onClick={submitReview} disabled={submitting}>
                    {submitting ? 'Submitting…' : 'Submit Review'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
