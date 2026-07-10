import { useState, useEffect, useCallback, useRef } from 'react';
import { useApp }               from './context/AppContext';
import { apiFetch, categoryLabels } from './api';
import Navbar         from './components/Navbar';
import Sidebar        from './components/Sidebar';
import HeroSlider     from './components/HeroSlider';
import ProductCard    from './components/ProductCard';
import ProductModal   from './components/ProductModal';
import SelectorModal  from './components/SelectorModal';
import CartDrawer     from './components/CartDrawer';
import AuthModal      from './components/AuthModal';
import PaymentModal   from './components/PaymentModal';
import OrdersModal    from './components/OrdersModal';
import WishlistModal  from './components/WishlistModal';
import Toast          from './components/Toast';
import ProfileModal   from './components/ProfileModal';
import AdminModal     from './components/AdminModal';
import QuickAddProduct from './components/QuickAddProduct';
import CompareModal from './components/CompareModal';
import LocationModal from './components/LocationModal';

const CAT_CARDS = [
  { key:'polo',      label:'Polo',      letter:'P', img:'/cat-images/polo.png',      bg:'linear-gradient(135deg,#0f3460,#16213e)' },
  { key:'acid-wash', label:'Acid Wash', letter:'A', img:'/cat-images/acid-wash.png', bg:'linear-gradient(135deg,#6a0572,#ab0adc)' },
  { key:'oversized', label:'Oversized', letter:'O', img:'/cat-images/oversized.png', bg:'linear-gradient(135deg,#1a1a1a,#6366f1)' },
  { key:'graphic',   label:'Graphic',   letter:'G', img:'/cat-images/graphic.png',   bg:'linear-gradient(135deg,#7b2d00,#6366f1)' },
  { key:'plain',     label:'Solid',     letter:'S', img:'/cat-images/solid.png',     bg:'linear-gradient(135deg,#2c2c2c,#555)' },
];

export default function App() {
  const { showToast, currentUser, token, logout } = useApp();

  const [selectedCategory, setSelectedCategory] = useState('all');
  const [topSellers,   setTopSellers]   = useState([]);
  const [listProducts, setListProducts] = useState([]);
  const [listTitle,    setListTitle]    = useState('All T-Shirts');
  const [view,         setView]         = useState('home');
  const [loading,      setLoading]      = useState(false);


  const [activeFilters, setActiveFilters] = useState({ sizes: [], maxPrice: 2999 });
  const searchTimer  = useRef(null);
  const searchQuery  = useRef('');

  useEffect(() => {
    apiFetch('/products/top-sellers')
      .then(d => setTopSellers(d.products || []))
      .catch(() => setTopSellers([]));
  }, []);

  const fetchProducts = useCallback(async (params = {}) => {
    const { category, search, sizes, maxPrice } = params;
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      if (category && category !== 'all') qs.set('category', category);
      if (search)             qs.set('search', search);
      if (sizes?.length)      qs.set('sizes', sizes.join(','));
      if (maxPrice && maxPrice < 2999) qs.set('maxPrice', maxPrice);
      const d = await apiFetch(`/products?${qs.toString()}`);
      setListProducts(d.products || []);
    } catch { setListProducts([]); }
    finally  { setLoading(false); }
  }, []);

  const filterCategory = useCallback((cat) => {
    setSelectedCategory(cat);
    setActiveFilters({ sizes: [], maxPrice: 2999 });
    if (cat === 'all') { setView('home'); return; }
    setView('products');
    setListTitle(categoryLabels[cat] || cat);
    fetchProducts({ category: cat });
  }, [fetchProducts]);

  const handleFilterChange = useCallback((filters) => {
    setActiveFilters(filters);
    if (view !== 'products' && selectedCategory === 'all') {
      setView('products'); setListTitle('All T-Shirts');
    }
    fetchProducts({
      category: selectedCategory !== 'all' ? selectedCategory : undefined,
      search: searchQuery.current || undefined,
      ...filters,
    });
  }, [view, selectedCategory, fetchProducts]);

  function handleSearch(q) {
    searchQuery.current = q;
    clearTimeout(searchTimer.current);
    if (!q.trim()) { setView('home'); setSelectedCategory('all'); return; }
    searchTimer.current = setTimeout(() => {
      setView('products');
      setListTitle(`Search: "${q}"`);
      fetchProducts({ search: q, ...activeFilters });
    }, 350);
  }

  return (
    <>
      <Navbar onSearch={handleSearch} />
      <div className="layout">
        <Sidebar
          selectedCategory={selectedCategory}
          onFilterCategory={filterCategory}
          onFilterChange={handleFilterChange}
        />
        <main className="main-content">
          {view === 'home' ? (
            <section id="homePage">
              <HeroSlider onFilter={filterCategory} />
              <div className="section-header">
                <h2 className="section-title">Shop by Style</h2>
                <div className="section-line" />
              </div>
              <div className="category-cards">
                {CAT_CARDS.map(c => (
                  <div key={c.key} className="cat-card" onClick={() => filterCategory(c.key)}>
                    <div className="cat-card-img" style={{ background:c.bg, overflow:'hidden', position:'relative' }}>
                      <img src={c.img} alt={c.label} style={{ width:'100%', height:'100%', objectFit:'cover', position:'absolute', inset:0, zIndex:1 }} />
                      <span className="cat-card-letter" style={{ position:'relative', zIndex:0 }}>{c.letter}</span>
                    </div>
                    <span className="cat-card-name">{c.label}</span>
                  </div>
                ))}
              </div>
              <div className="section-header">
                <h2 className="section-title">Top Sellers</h2>
                <div className="section-line" />
              </div>
              {topSellers.length === 0
                ? <div className="products-grid"><div className="spinner-wrap"><div className="spinner" /></div></div>
                : <div className="products-grid">{topSellers.map(p => <ProductCard key={p.id} product={p} />)}</div>
              }
            </section>
          ) : (
            <section id="productsPage">
              <div className="page-header">
                <h2 className="page-title">{listTitle}</h2>
                <span className="product-count">{listProducts.length} product{listProducts.length!==1?'s':''}</span>
              </div>
              {loading
                ? <div className="products-grid"><div className="spinner-wrap"><div className="spinner" /></div></div>
                : listProducts.length === 0
                ? <div style={{ padding:'3rem', textAlign:'center', color:'var(--muted)' }}>
                    <p>No products found. Try adjusting your filters.</p>
                  </div>
                : <div className="products-grid">{listProducts.map(p => <ProductCard key={p.id} product={p} />)}</div>
              }
            </section>
          )}
        </main>
      </div>

      <ProductModal />
      <SelectorModal />
      <CartDrawer />
      <AuthModal />
      <PaymentModal />
      <OrdersModal />
      <WishlistModal />
      <ProfileModal />
      <AdminModal />
      <LocationModal />
      <QuickAddProduct />
      <CompareModal />
      <Toast />
    </>
  );
}
