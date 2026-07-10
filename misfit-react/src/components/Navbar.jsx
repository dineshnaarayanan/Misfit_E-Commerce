import { useApp } from '../context/AppContext';

export default function Navbar({ onSearch }) {
  const { cart, currentUser, logout, setLoginOpen, setCartOpen, setOrdersOpen,
          setWishlistOpen, setAdminOpen, setProfileOpen, setAddProductOpen,
          setLocationModalOpen,
          compareProducts, setCompareOpen } = useApp();
  const cartCount = cart.reduce((s, i) => s + i.qty, 0);

  // Shorten the address for display in the header
  function shortAddress(addr) {
    if (!addr) return null;
    const parts = addr.split(',');
    // Show first 2 meaningful parts
    return parts.slice(0, 2).join(',').trim();
  }

  const displayAddress = currentUser?.address ? shortAddress(currentUser.address) : null;

  return (
    <header className="navbar" id="navbar">
      {/* Left: Logo */}
      <div className="nav-left">
        <a href="#" className="brand-logo">
          <div className="logo-icon">M</div>
          <span className="brand-name">MisFit</span>
        </a>
      </div>

      {/* Center: Search bar */}
      <div className="nav-center">
        <div className="search-bar">
          <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <input
            type="text"
            placeholder="Search for t-shirts, styles, colours…"
            onChange={e => onSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Right: Actions */}
      <div className="nav-right">
        {/* Delivery location - dynamic, user-specific */}
        <div className="nav-delivery" onClick={() => setLocationModalOpen(true)} title="Set your delivery location">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
          </svg>
          <div className="delivery-text">
            {displayAddress ? (
              <>
                <span className="delivery-label">Deliver to</span>
                <span className="delivery-pin">{displayAddress}</span>
              </>
            ) : (
              <>
                <span className="delivery-label">Delivery</span>
                <span className="delivery-pin" style={{ color: 'var(--accent)' }}>Set Location</span>
              </>
            )}
          </div>
        </div>

        {/* Admin quick-add button */}
        {currentUser?.role === 'admin' && (
          <button
            id="quick-add-product-btn"
            onClick={() => setAddProductOpen(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.4rem',
              padding: '0.45rem 1rem',
              background: 'linear-gradient(135deg, #6366f1, #818cf8)',
              border: 'none', borderRadius: 50,
              color: '#fff', fontWeight: 700, fontSize: '0.82rem',
              cursor: 'pointer', fontFamily: 'var(--font-body)',
              boxShadow: '0 2px 10px rgba(99,102,241,0.35)',
              transition: 'all 0.2s', whiteSpace: 'nowrap',
            }}
            onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-1px)'}
            onMouseLeave={e => e.currentTarget.style.transform = 'none'}
          >
            + Add Product
          </button>
        )}

        {/* Compare button */}
        <button 
          className="cart-btn" 
          onClick={() => setCompareOpen(true)}
          title="Compare T-Shirts"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="20" x2="18" y2="10"></line>
            <line x1="12" y1="20" x2="12" y2="4"></line>
            <line x1="6" y1="20" x2="6" y2="14"></line>
          </svg>
          <span className="cart-label">Compare</span>
          <span className={`cart-count ${compareProducts?.length > 0 ? 'visible' : ''}`} style={{ background: '#3b82f6' }}>
            {compareProducts?.length}
          </span>
        </button>

        <button className="cart-btn" onClick={() => setCartOpen(true)}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
            <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
          </svg>
          <span className="cart-label">Cart</span>
          <span className={`cart-count ${cartCount > 0 ? 'visible' : ''}`}>{cartCount}</span>
        </button>

        <div className="auth-section">
          {currentUser ? (
            <div className="user-display">
              <div className="user-avatar">{currentUser.name[0].toUpperCase()}</div>
              <span>
                {currentUser.name.split(' ')[0]}
                {currentUser.role === 'admin' && <span className="admin-badge">Admin</span>}
              </span>
              <div className="user-dropdown">
                {currentUser.role === 'admin' && (
                  <button onClick={() => setAdminOpen(true)}>Admin Panel</button>
                )}
                <button onClick={() => setProfileOpen(true)}>My Profile</button>
                <button onClick={() => setOrdersOpen(true)}>My Orders</button>
                <button onClick={() => setWishlistOpen(true)}>Wishlist</button>
                <button onClick={() => setCartOpen(true)}>My Cart</button>
                <button onClick={logout}>Logout</button>
              </div>
            </div>
          ) : (
            <button className="login-btn" onClick={() => setLoginOpen(true)}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
              </svg>
              <span>Login</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
