// ── CONFIG ───────────────────────────────────────────────────
// Uses Vite proxy in dev (/api → http://localhost:5000/api)
// Falls back to absolute URL if VITE_API_URL env var is set
export const API = import.meta.env.VITE_API_URL || '/api';

export async function apiFetch(endpoint, options = {}, token = null) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  let res;
  try {
    res = await fetch(`${API}${endpoint}`, { ...options, headers });
  } catch (networkErr) {
    throw new Error('Cannot connect to server. Please make sure the backend is running.');
  }

  // Safely parse JSON — guard against empty body (204, etc.)
  let data = {};
  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    const text = await res.text();
    if (text) {
      try { data = JSON.parse(text); }
      catch { data = { message: 'Invalid response from server.' }; }
    }
  }

  if (!res.ok) {
    if (res.status === 401 && token) {
      window.dispatchEvent(new CustomEvent('unauthorized'));
    }
    throw new Error(data.message || `Request failed (${res.status})`);
  }
  return data;
}

export const categoryLabels = {
  all: 'All T-Shirts',
  polo: 'Polo T-Shirts',
  'acid-wash': 'Acid Wash T-Shirts',
  oversized: 'Oversized T-Shirts',
  graphic: 'Graphic Tees',
  plain: 'Plain / Solid Tees',
};

export function discount(p) {
  if (!p.origPrice) return 0;
  return Math.round((1 - p.price / p.origPrice) * 100);
}

export function stars(r) {
  const full  = Math.floor(r);
  const half  = r % 1 >= 0.5 ? 1 : 0;
  const empty = 5 - full - half;
  return '★'.repeat(full) + (half ? '½' : '') + '☆'.repeat(empty);
}

export function formatDate(dt) {
  return new Date(dt).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}
