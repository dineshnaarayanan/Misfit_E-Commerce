import { useState, useEffect } from 'react';
import { useApp }               from '../context/AppContext';
import { apiFetch }             from '../api';
import ProductCard              from './ProductCard';

export default function WishlistModal() {
  const { wishlistOpen, setWishlistOpen, token } = useApp();
  const [items,   setItems]   = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!wishlistOpen) return;
    setLoading(true);
    apiFetch('/wishlist', {}, token)
      .then(d => setItems(d.wishlist || []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [wishlistOpen, token]);

  if (!wishlistOpen) return null;

  return (
    <div className="modal-overlay" style={{ display: 'flex' }}>
      <div className="wishlist-modal">
        <button className="modal-close" onClick={() => setWishlistOpen(false)}>x</button>
        <h3>My Wishlist</h3>
        {loading ? (
          <div className="spinner-wrap"><div className="spinner" /></div>
        ) : items.length === 0 ? (
          <p style={{ color: 'var(--muted)', textAlign: 'center', padding: '2rem' }}>Your wishlist is empty.</p>
        ) : (
          <div className="products-grid" style={{ padding: 0 }}>
            {items.map(p => <ProductCard key={p.id} product={p} />)}
          </div>
        )}
      </div>
    </div>
  );
}
