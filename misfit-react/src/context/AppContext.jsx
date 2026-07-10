import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { apiFetch } from '../api';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [token, setToken]             = useState(null);
  const [cart, setCart]               = useState([]);
  const [wishlistIds, setWishlistIds] = useState(new Set());
  const [products, setProducts]       = useState([]);
  const [toast, setToast]             = useState({ msg: '', type: '', show: false });
  const toastTimer = useRef(null);

  // ── Modals ───────────────────────────────────────────────────
  const [productModal,  setProductModal]  = useState(null);
  const [selectorModal, setSelectorModal] = useState(null);
  const [loginOpen,     setLoginOpen]     = useState(false);
  const [adminOpen,     setAdminOpen]     = useState(false);
  const [ordersOpen,    setOrdersOpen]    = useState(false);
  const [wishlistOpen,  setWishlistOpen]  = useState(false);
  const [profileOpen,   setProfileOpen]   = useState(false);
  const [paymentItems,  setPaymentItems]  = useState(null);
  const [cartOpen,      setCartOpen]      = useState(false);
  const [addProductOpen, setAddProductOpen] = useState(false);
  const [locationModalOpen, setLocationModalOpen] = useState(false);
  const [compareProducts, setCompareProducts] = useState([]);
  const [compareOpen,     setCompareOpen]     = useState(false);

  // ── Filters (shared between Sidebar + App) ───────────────────
  const [activeFilters, setActiveFilters] = useState({
    sizes: [],
    maxPrice: 2999,
  });

  // ── Toast (queued, no overlap) ───────────────────────────────
  const showToast = useCallback((msg, type = 'default') => {
    clearTimeout(toastTimer.current);
    setToast({ msg, type, show: false }); // hide first to reset animation
    requestAnimationFrame(() => {
      setToast({ msg, type, show: true });
      toastTimer.current = setTimeout(
        () => setToast(t => ({ ...t, show: false })),
        3500
      );
    });
  }, []);

  // ── API helper with token ────────────────────────────────────
  const api = useCallback(
    (endpoint, options = {}) => apiFetch(endpoint, options, token),
    [token]
  );

  // ── Session restore on mount ─────────────────────────────────
  useEffect(() => {
    const savedToken = localStorage.getItem('misfit_token');
    const savedUser  = localStorage.getItem('misfit_user');
    if (savedToken && savedUser) {
      try {
        setToken(savedToken);
        setCurrentUser(JSON.parse(savedUser));
      } catch {
        localStorage.removeItem('misfit_token');
        localStorage.removeItem('misfit_user');
      }
    }
  }, []);

  // ── Fetch all products on mount for comparison and global use ──
  useEffect(() => {
    apiFetch('/products')
      .then(d => setProducts(d.products || []))
      .catch(() => {});
  }, []);

  // ── Load cart & wishlist when user logs in ───────────────────
  useEffect(() => {
    if (!currentUser || !token) return;
    apiFetch('/cart', {}, token)
      .then(d => setCart(d.items || []))
      .catch(() => {});
    apiFetch('/wishlist/ids', {}, token)
      .then(d => setWishlistIds(new Set(d.ids || [])))
      .catch(() => {});
  }, [currentUser, token]);

  // ── Auth ─────────────────────────────────────────────────────
  const login = useCallback((data) => {
    setToken(data.token);
    setCurrentUser(data.user);
    localStorage.setItem('misfit_token', data.token);
    localStorage.setItem('misfit_user', JSON.stringify(data.user));
  }, []);

  const logout = useCallback((isAuto = false) => {
    setCurrentUser(null);
    setToken(null);
    setCart([]);
    setWishlistIds(new Set());
    localStorage.removeItem('misfit_token');
    localStorage.removeItem('misfit_user');
    if (isAuto) {
      showToast('Session expired. Please log in again.', 'error');
      setLoginOpen(true);
    } else {
      showToast('Logged out successfully.');
    }
  }, [showToast]);

  // ── Global unauthorized handler ──────────────────────────────
  useEffect(() => {
    const handleUnauthorized = () => logout(true);
    window.addEventListener('unauthorized', handleUnauthorized);
    return () => window.removeEventListener('unauthorized', handleUnauthorized);
  }, [logout]);

  // ── Cart ─────────────────────────────────────────────────────
  const addToCart = useCallback(async (product, size, colour) => {
    if (!currentUser) {
      showToast('Please login to add items to your cart', 'error');
      setLoginOpen(true);
      return;
    }
    if (product.stock <= 0) {
      showToast(`"${product.name}" is out of stock.`, 'error');
      return;
    }
    try {
      const data = await apiFetch('/cart', {
        method: 'POST',
        body: JSON.stringify({ productId: product.id, size, colour, qty: 1 }),
      }, token);
      setCart(data.items || []);
      showToast(`${product.name} added to cart`, 'success');
    } catch (err) {
      showToast(err.message || 'Failed to add to cart', 'error');
    }
  }, [currentUser, token, showToast]);

  const removeFromCart = useCallback(async (cartItemId) => {
    try {
      const data = await apiFetch(`/cart/${cartItemId}`, { method: 'DELETE' }, token);
      setCart(data.items || []);
      showToast(data.message || 'Item removed from cart', 'success');
    } catch (err) {
      showToast(err.message || 'Failed to remove item', 'error');
    }
  }, [token, showToast]);

  const updateCartQty = useCallback(async (cartItemId, delta) => {
    try {
      const data = await apiFetch(`/cart/${cartItemId}`, {
        method: 'PATCH',
        body: JSON.stringify({ delta }),
      }, token);
      setCart(data.items || []);
    } catch (err) {
      showToast(err.message || 'Failed to update quantity', 'error');
    }
  }, [token, showToast]);

  // ── Wishlist ─────────────────────────────────────────────────
  const toggleWishlist = useCallback(async (productId) => {
    if (!currentUser) {
      showToast('Please login to use wishlist', 'error');
      setLoginOpen(true);
      return;
    }
    try {
      const data = await apiFetch(`/wishlist/${productId}`, { method: 'POST' }, token);
      setWishlistIds(prev => {
        const next = new Set(prev);
        if (data.wishlisted) next.add(String(productId));
        else next.delete(String(productId));
        return next;
      });
      showToast(data.message, data.wishlisted ? 'success' : 'default');
    } catch (err) {
      showToast(err.message || 'Failed to update wishlist', 'error');
    }
  }, [currentUser, token, showToast]);

  // ── Payment / checkout ───────────────────────────────────────
  const openPayment = useCallback((items) => {
    if (!currentUser) { setLoginOpen(true); return; }
    setPaymentItems(items);
    setCartOpen(false);
  }, [currentUser]);

  // placeOrder now accepts razorpayOrderId & razorpayPaymentId for online payments
  const placeOrder = useCallback(async (address, paymentMethod, razorpayOrderId = null, razorpayPaymentId = null) => {
    const orderItems = (paymentItems || []).map(i => ({
      productId: i.product.id,
      size:      i.size,
      colour:    i.colour,
      qty:       i.qty,
    }));
    const data = await apiFetch('/orders', {
      method: 'POST',
      body: JSON.stringify({
        items:             orderItems,
        address,
        paymentMethod,
        razorpayOrderId,
        razorpayPaymentId,
      }),
    }, token);
    setCart([]);
    setPaymentItems(null);
    showToast(`Order #${String(data.order.id).slice(-6)} placed! Track in "My Orders".`, 'success');
  }, [paymentItems, token, showToast]);

  const toggleCompare = useCallback((product) => {
    setCompareProducts((prev) => {
      const exists = prev.find(p => p.id === product.id);
      if (exists) {
        showToast(`${product.name} removed from comparison`, 'default');
        return prev.filter(p => p.id !== product.id);
      }
      if (prev.length >= 2) {
        showToast('You can compare up to 2 products. Remove one first.', 'error');
        setCompareOpen(true);
        return prev;
      }
      showToast(`${product.name} added to comparison`, 'success');
      const next = [...prev, product];
      if (next.length === 2) {
        setCompareOpen(true);
      }
      return next;
    });
  }, [showToast]);

  return (
    <AppContext.Provider value={{
      currentUser, token, cart, wishlistIds, products, setProducts,
      toast, showToast,
      api,
      login, logout,
      addToCart, removeFromCart, updateCartQty,
      toggleWishlist,
      openPayment, placeOrder, paymentItems, setPaymentItems,
      activeFilters, setActiveFilters,
      productModal,  setProductModal,
      selectorModal, setSelectorModal,
      loginOpen,  setLoginOpen,
      adminOpen,  setAdminOpen,
      ordersOpen, setOrdersOpen,
      wishlistOpen, setWishlistOpen,
      profileOpen,  setProfileOpen,
      cartOpen, setCartOpen,
      addProductOpen, setAddProductOpen,
      locationModalOpen, setLocationModalOpen,
      compareProducts, setCompareProducts,
      compareOpen, setCompareOpen,
      toggleCompare,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export const useApp = () => useContext(AppContext);
