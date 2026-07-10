import { useApp } from '../context/AppContext';

export default function CartDrawer() {
  const { cart, cartOpen, setCartOpen, removeFromCart, updateCartQty, openPayment, currentUser, setLoginOpen } = useApp();
  const total = cart.reduce((s, i) => s + i.product.price * i.qty, 0);

  function checkout() {
    if (!currentUser) { setLoginOpen(true); return; }
    setCartOpen(false);
    openPayment(cart);
  }

  return (
    <>
      <div className={`cart-overlay ${cartOpen ? 'open' : ''}`} onClick={() => setCartOpen(false)} />
      <div className={`cart-drawer ${cartOpen ? 'open' : ''}`}>
        <div className="cart-header">
          <h3>Your Cart</h3>
          <button onClick={() => setCartOpen(false)}>x</button>
        </div>

        {cart.length === 0 ? (
          <div className="cart-empty">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
            </svg>
            <p>Your cart is empty</p>
          </div>
        ) : (
          <>
            <div className="cart-items">
              {cart.map(item => (
                <div key={item.cartItemId} className="cart-item">
                  <div className="cart-item-img" style={{ background: item.product.gradient }}>
                    {item.product.imageUrl
                      ? <img src={item.product.imageUrl} alt={item.product.name} />
                      : item.product.letter
                    }
                  </div>
                  <div className="cart-item-info">
                    <div className="cart-item-name">{item.product.name}</div>
                    <div className="cart-item-meta">{item.size} · {item.colour}</div>
                    <div className="cart-item-price">₹{(item.product.price * item.qty).toLocaleString('en-IN')}</div>
                    <div className="cart-qty" style={{ flexWrap: 'wrap' }}>
                      <button onClick={(e) => { e.stopPropagation(); updateCartQty(item.cartItemId, -1); }}>−</button>
                      <span>{item.qty}</span>
                      <button onClick={(e) => { e.stopPropagation(); updateCartQty(item.cartItemId, 1); }}>+</button>
                      <button 
                        className="btn-delete" 
                        style={{ marginLeft: 'auto' }} 
                        onClick={(e) => { e.stopPropagation(); removeFromCart(item.cartItemId); }}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="cart-footer">
              <div className="cart-total">
                <span>Total</span>
                <span>₹{total.toLocaleString('en-IN')}</span>
              </div>
              <button className="btn-checkout" onClick={checkout}>Proceed to Checkout →</button>
            </div>
          </>
        )}
      </div>
    </>
  );
}
