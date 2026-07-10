import { useState } from 'react';
import { useApp }   from '../context/AppContext';

const CATEGORIES = [
  { key: 'all',       label: 'All T-Shirts',  icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg> },
  { key: 'polo',      label: 'Polo T-Shirts', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.38 3.46 16 2a4 4 0 0 1-8 0L3.62 3.46a2 2 0 0 0-1.34 2.23l.58 3.57a1 1 0 0 0 .99.84H6v10c0 1.1.9 2 2 2h8a2 2 0 0 0 2-2V10h2.15a1 1 0 0 0 .99-.84l.58-3.57a2 2 0 0 0-1.34-2.23z"/></svg> },
  { key: 'acid-wash', label: 'Acid Wash',     icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v20M2 12h20M4.93 4.93l14.14 14.14M19.07 4.93 4.93 19.07"/></svg> },
  { key: 'oversized', label: 'Oversized',     icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg> },
  { key: 'graphic',   label: 'Graphic Tees',  icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M8.56 2.75c4.37 6.03 6.02 9.42 8.03 17.72m2.54-15.38c-3.72 4.35-8.94 5.66-16.88 5.85m19.5 1.9c-3.5-.93-6.63-.82-8.94 0-2.58.92-5.01 2.86-7.44 6.32"/></svg> },
  { key: 'plain',     label: 'Plain / Solid', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="2" width="20" height="20" rx="2" ry="2"/></svg> },
];

const SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];

export default function Sidebar({ selectedCategory, onFilterCategory, onFilterChange }) {
  const { currentUser, setAdminOpen } = useApp();
  const [activeSizes, setActiveSizes] = useState([]);
  const [priceMax,    setPriceMax]    = useState(2999);

  function toggleSize(size) {
    setActiveSizes(prev => {
      const next = prev.includes(size)
        ? prev.filter(s => s !== size)
        : [...prev, size];
      // Notify parent so it can re-fetch products
      onFilterChange?.({ sizes: next, maxPrice: priceMax });
      return next;
    });
  }

  function handlePriceChange(e) {
    const val = parseInt(e.target.value);
    setPriceMax(val);
    document.getElementById('sidebarPriceMax').textContent = `₹${val.toLocaleString('en-IN')}`;
  }

  function handlePriceCommit(e) {
    const val = parseInt(e.target.value);
    onFilterChange?.({ sizes: activeSizes, maxPrice: val });
  }

  function clearFilters() {
    setActiveSizes([]);
    setPriceMax(2999);
    document.getElementById('sidebarPriceMax').textContent = '₹2,999';
    onFilterChange?.({ sizes: [], maxPrice: 2999 });
  }

  const hasFilters = activeSizes.length > 0 || priceMax < 2999;

  return (
    <aside className="sidebar">
      {/* ── CATEGORIES ── */}
      <div className="sidebar-section">
        <h3 className="sidebar-title">Categories</h3>
        <ul className="category-list">
          {CATEGORIES.map(c => (
            <li
              key={c.key}
              className={`cat-item ${selectedCategory === c.key ? 'active' : ''}`}
              onClick={() => onFilterCategory(c.key)}
            >
              {c.icon}
              {c.label}
            </li>
          ))}
        </ul>
      </div>

      {/* ── SIZE FILTER (now wired to API) ── */}
      <div className="sidebar-section">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h3 className="sidebar-title" style={{ padding: '0.75rem 1.25rem 0.5rem' }}>Filter by Size</h3>
          {activeSizes.length > 0 && (
            <button
              onClick={() => { setActiveSizes([]); onFilterChange?.({ sizes: [], maxPrice: priceMax }); }}
              style={{ marginRight: '1rem', fontSize: '0.7rem', color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer' }}
            >
              Clear
            </button>
          )}
        </div>
        <div className="size-filters">
          {SIZES.map(sz => (
            <button
              key={sz}
              className={`size-tag ${activeSizes.includes(sz) ? 'active' : ''}`}
              onClick={() => toggleSize(sz)}
            >
              {sz}
            </button>
          ))}
        </div>
      </div>

      {/* ── PRICE FILTER (now wired to API) ── */}
      <div className="sidebar-section">
        <h3 className="sidebar-title">Price Range</h3>
        <div className="price-range">
          <input
            type="range" min="199" max="2999" step="50"
            defaultValue="2999"
            onChange={handlePriceChange}
            onMouseUp={handlePriceCommit}
            onTouchEnd={handlePriceCommit}
          />
          <div className="price-labels">
            <span>₹199</span>
            <span id="sidebarPriceMax">₹2,999</span>
          </div>
        </div>
      </div>

      {/* ── CLEAR ALL ── */}
      {hasFilters && (
        <div className="sidebar-section" style={{ paddingTop: '0' }}>
          <button
            onClick={clearFilters}
            style={{
              margin: '0 1.25rem', padding: '0.5rem 1rem', width: 'calc(100% - 2.5rem)',
              background: 'var(--accent-dim)', border: '1px solid var(--accent)',
              borderRadius: 'var(--radius)', color: 'var(--accent)', fontSize: '0.8rem',
              fontWeight: '600', cursor: 'pointer', fontFamily: 'var(--font-body)',
            }}
          >
            Clear All Filters
          </button>
        </div>
      )}

      {/* ── ADMIN SECTION ── */}
      {currentUser?.role === 'admin' && (
        <div className="sidebar-section">
          <h3 className="sidebar-title" style={{ color: 'var(--accent)' }}>Admin</h3>
          <ul className="category-list">
            <li className="cat-item" onClick={() => setAdminOpen(true)}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
              </svg>
              Admin Panel
            </li>
          </ul>
        </div>
      )}
    </aside>
  );
}
