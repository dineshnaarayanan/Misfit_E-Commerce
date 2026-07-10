/* ═══════════════════════════════════════════════════════════
   OrdersModal.jsx  —  Customer "My Orders" panel
   Shows: order status tracker, payment method + paid/unpaid,
   courier tracking, delivery address, all items
═══════════════════════════════════════════════════════════ */
import { useState, useEffect } from 'react';
import { useApp }   from '../context/AppContext';
import { apiFetch } from '../api';

// ── Courier tracking URL builders ─────────────────────────
const COURIER_URLS = {
  'Delhivery':  id => `https://www.delhivery.com/track/package/${id}`,
  'DTDC':       id => `https://www.dtdc.in/trace.asp?strCnno=${id}`,
  'Blue Dart':  id => `https://www.bluedart.com/tracking?trackFor=0&track=${id}`,
  'India Post': id => `https://www.indiapost.gov.in/vas/pages/trackconsignment.aspx`,
  'XpressBees': id => `https://www.xpressbees.com/shipment/tracking?awbNo=${id}`,
};

// ── Status pipeline ───────────────────────────────────────
const STATUS_STEPS = [
  { key: 'pending',          label: 'Ordered',       icon: '' },
  { key: 'confirmed',        label: 'Confirmed',     icon: '' },
  { key: 'packed',           label: 'Packed',        icon: '' },
  { key: 'shipped',          label: 'Shipped',       icon: '' },
  { key: 'out-for-delivery', label: 'Out for Delivery', icon: '' },
  { key: 'delivered',        label: 'Delivered',     icon: '' },
];
const STATUS_COLOR = {
  pending: '#fbbf24', confirmed: '#34d399', packed: '#60a5fa',
  shipped: '#a78bfa', 'out-for-delivery': '#f97316',
  delivered: '#22c55e', cancelled: '#ef4444', returned: '#fb923c', refunded: '#94a3b8',
};

// ── Payment helpers ───────────────────────────────────────
function getPaymentInfo(o) {
  const method = (o.paymentMethod || 'cod').toLowerCase();
  const isOnline = method !== 'cod';
  const isPaid = isOnline
    ? (o.status !== 'cancelled' && o.razorpayPaymentId)
    : o.status === 'delivered'; // COD is "paid" only on delivery

  return {
    label:  method === 'cod' ? 'Cash on Delivery' : 'Online Payment',
    icon:   method === 'cod' ? '' : '',
    color:  '#10b981',
    isPaid,
    paidLabel: method === 'cod'
      ? (o.status === 'delivered' ? 'Paid (COD)' : 'Pay on Delivery')
      : (isPaid ? 'Payment Confirmed' : 'Payment Pending'),
    paidColor: method === 'cod'
      ? (o.status === 'delivered' ? '#10b981' : '#f59e0b')
      : (isPaid ? '#10b981' : '#ef4444'),
  };
}

function fmtDate(d) {
  return d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
}

// ── Progress Tracker Component ────────────────────────────
function StatusTracker({ status }) {
  const currentIdx = STATUS_STEPS.findIndex(s => s.key === status);
  const isCancelled = status === 'cancelled';

  if (isCancelled) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', gap: '0.6rem',
        padding: '0.75rem 1rem', background: '#fef2f2',
        border: '1px solid #fecaca', borderRadius: 10, marginTop: '1rem',
      }}>
        <span style={{ fontSize: '1.2rem' }}></span>
        <div>
          <div style={{ fontWeight: 700, color: '#dc2626', fontSize: '0.875rem' }}>Order Cancelled</div>
          <div style={{ fontSize: '0.72rem', color: '#ef4444', marginTop: 2 }}>This order has been cancelled</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ marginTop: '1rem', padding: '1rem', background: '#f8fafc', borderRadius: 12, border: '1px solid #e2e8f0' }}>
      <div style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#64748b', marginBottom: '0.85rem' }}>
        Order Status
      </div>
      <div style={{ display: 'flex', alignItems: 'center' }}>
        {STATUS_STEPS.map((step, i) => {
          const done   = i <= currentIdx;
          const active = i === currentIdx;
          const color  = done ? '#6366f1' : '#e2e8f0';
          return (
            <div key={step.key} style={{ display: 'flex', alignItems: 'center', flex: i < STATUS_STEPS.length - 1 ? '1 0 auto' : 'none' }}>
              {/* Step dot + label */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 56 }}>
                <div style={{
                  width: active ? 36 : 28, height: active ? 36 : 28,
                  borderRadius: '50%',
                  background: done ? color : '#e2e8f0',
                  border: `3px solid ${done ? color : '#d1d5db'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: active ? '1rem' : '0.8rem',
                  boxShadow: active ? `0 0 0 4px ${color}25` : 'none',
                  transition: 'all 0.3s',
                  flexShrink: 0,
                }}>
                  {done ? step.icon : <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#d1d5db', display: 'block' }} />}
                </div>
                <div style={{
                  fontSize: '0.6rem', fontWeight: active ? 700 : 400, marginTop: 4,
                  color: done ? color : '#94a3b8', textAlign: 'center', whiteSpace: 'nowrap',
                }}>
                  {step.label}
                </div>
              </div>
              {/* Connector line */}
              {i < STATUS_STEPS.length - 1 && (
                <div style={{
                  flex: 1, height: 3, borderRadius: 2, margin: '0 4px', marginBottom: 16,
                  background: i < currentIdx ? '#6366f1' : '#e2e8f0',
                  transition: 'background 0.3s',
                }} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Main Modal ────────────────────────────────────────────
export default function OrdersModal() {
  const { ordersOpen, setOrdersOpen, token } = useApp();
  const [orders,   setOrders]   = useState([]);
  const [loading,  setLoading]  = useState(false);
  const [expanded, setExpanded] = useState(null);
  const [filter,   setFilter]   = useState('all'); // all | active | delivered | cancelled

  useEffect(() => {
    if (!ordersOpen || !token) return;
    setLoading(true);
    apiFetch('/orders/my', {}, token)
      .then(d => setOrders(d.orders || []))
      .catch(() => setOrders([]))
      .finally(() => setLoading(false));
  }, [ordersOpen, token]);

  if (!ordersOpen) return null;

  const active    = orders.filter(o => !['delivered','cancelled','returned'].includes(o.status));
  const delivered = orders.filter(o => o.status === 'delivered');
  const cancelled = orders.filter(o => ['cancelled','returned','refunded'].includes(o.status));

  const displayed = filter === 'all'      ? orders
    : filter === 'active'    ? active
    : filter === 'delivered' ? delivered
    : cancelled;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999, background: '#f8fafc',
      display: 'flex', flexDirection: 'column',
    }}>
      <div style={{
        background: '#fff', width: '100%', maxWidth: 1000, margin: '0 auto',
        display: 'flex', flexDirection: 'column', height: '100%',
        boxShadow: '0 0 40px rgba(0,0,0,0.05)', overflow: 'hidden',
      }}>

        {/* ── Header ── */}
        <div style={{
          padding: '1.5rem 1.75rem 1.1rem',
          borderBottom: '1px solid #f1f5f9',
          display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
          background: '#fff', flexShrink: 0,
        }}>
          <div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', color: '#1e1b4b', margin: 0, letterSpacing: '0.04em' }}>
               My Orders
            </h2>
            <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: 4 }}>
              {orders.length} order{orders.length !== 1 ? 's' : ''} · {active.length} active
            </p>
          </div>
          <button onClick={() => setOrdersOpen(false)} style={{
            padding: '0.5rem 1rem', borderRadius: 8, border: '1px solid #e2e8f0',
            background: '#f8fafc', cursor: 'pointer', fontSize: '0.85rem', color: '#64748b',
            fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem'
          }}>← Back to Store</button>
        </div>

        {/* ── Filter tabs ── */}
        <div style={{ padding: '0.75rem 1.75rem', borderBottom: '1px solid #f1f5f9', display: 'flex', gap: 6, flexShrink: 0 }}>
          {[
            { key: 'all',       label: `All (${orders.length})`       },
            { key: 'active',    label: `Active (${active.length})`    },
            { key: 'delivered', label: `Delivered (${delivered.length})` },
            { key: 'cancelled', label: `Cancelled (${cancelled.length})` },
          ].map(f => (
            <button key={f.key} onClick={() => setFilter(f.key)}
              style={{
                padding: '0.35rem 0.85rem', borderRadius: 50, fontSize: '0.75rem', fontWeight: 600,
                border: '1px solid', cursor: 'pointer', transition: 'all 0.15s',
                background: filter === f.key ? 'rgba(99,102,241,0.1)' : '#f8fafc',
                borderColor: filter === f.key ? '#6366f1' : '#e2e8f0',
                color: filter === f.key ? '#6366f1' : '#64748b',
              }}>
              {f.label}
            </button>
          ))}
        </div>

        {/* ── Order list ── */}
        <div style={{ overflowY: 'auto', flex: 1, padding: '1rem 1.75rem 1.75rem' }}>

          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
              <div className="spinner" />
            </div>
          ) : displayed.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}></div>
              <p style={{ fontWeight: 600, color: '#1e1b4b' }}>No orders here yet</p>
              <p style={{ fontSize: '0.82rem' }}>Start shopping to see your orders!</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              {displayed.map(o => {
                const oid     = (o._id || o.id).toString();
                const isExp   = expanded === oid;
                const sColor  = ['cancelled','returned','refunded'].includes(o.status) ? (STATUS_COLOR[o.status] || '#94a3b8') : '#10b981';
                const payment = getPaymentInfo(o);

                return (
                  <div key={oid} style={{
                    background: '#fff', borderRadius: 16,
                    border: `1px solid ${o.status === 'cancelled' ? '#fecaca' : o.status === 'delivered' ? '#bbf7d0' : '#e2e8f0'}`,
                    boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
                    overflow: 'hidden',
                  }}>

                    {/* ── Order summary row (always visible) ── */}
                    <div style={{ padding: '1rem 1.25rem' }}>
                      {/* Top: ID + date + expand */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                        <div>
                          <div style={{ fontFamily: 'monospace', fontSize: '0.85rem', fontWeight: 800, color: '#6366f1' }}>
                            Order #{oid.slice(-8).toUpperCase()}
                          </div>
                          <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: 2 }}>
                            Placed on {fmtDate(o.createdAt || o.created_at)}
                          </div>
                        </div>
                        <button onClick={() => setExpanded(isExp ? null : oid)}
                          style={{
                            background: 'none', border: '1px solid #e2e8f0',
                            borderRadius: 8, padding: '0.3rem 0.75rem',
                            color: '#64748b', cursor: 'pointer', fontSize: '0.75rem',
                            fontFamily: 'var(--font-body)', fontWeight: 600,
                          }}>
                          {isExp ? '▲ Less' : '▼ Details'}
                        </button>
                      </div>

                      {/* Status + Payment row */}
                      <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
                        {/* Order Status */}
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
                          padding: '0.25rem 0.75rem', borderRadius: 50,
                          background: `${sColor}15`, border: `1px solid ${sColor}35`,
                          color: sColor, fontSize: '0.75rem', fontWeight: 700,
                          textTransform: 'capitalize',
                        }}>
                          {o.status === 'out-for-delivery' ? '' : o.status === 'delivered' ? '' : o.status === 'cancelled' ? '' : o.status === 'pending' ? '' : o.status === 'confirmed' ? '' : ''}
                          &nbsp;{o.status?.replace('-', ' ')}
                        </span>

                        {/* Payment method + paid status */}
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
                          padding: '0.25rem 0.75rem', borderRadius: 50,
                          background: `${payment.color}12`, border: `1px solid ${payment.color}30`,
                          color: payment.color, fontSize: '0.75rem', fontWeight: 700,
                        }}>
                          {payment.icon} {payment.label}
                        </span>

                        {/* Paid / not paid indicator */}
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
                          padding: '0.25rem 0.75rem', borderRadius: 50,
                          background: `${payment.paidColor}12`, border: `1px solid ${payment.paidColor}30`,
                          color: payment.paidColor, fontSize: '0.75rem', fontWeight: 700,
                        }}>
                          {payment.paidLabel}
                        </span>

                        {o.trackingId && (
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
                            padding: '0.25rem 0.75rem', borderRadius: 50,
                            background: '#10b98115', border: '1px solid #10b98135',
                            color: '#10b981', fontSize: '0.75rem', fontWeight: 700,
                          }}>
                            Tracking Available
                          </span>
                        )}
                      </div>

                      {/* Items preview (collapsed: 1 line) */}
                      {!isExp && (
                        <div style={{ fontSize: '0.78rem', color: '#64748b', marginBottom: '0.5rem' }}>
                          {(o.items || []).map(i => `${i.name} ×${i.qty}`).join(' · ')}
                        </div>
                      )}

                      {/* Total + Address (collapsed view) */}
                      {!isExp && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                          <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#1e1b4b' }}>
                            Total: <span style={{ color: '#6366f1' }}>₹{(o.total || 0).toLocaleString('en-IN')}</span>
                          </div>
                          {o.trackingId && (
                            <button onClick={() => setExpanded(oid)}
                              style={{
                                padding: '0.35rem 0.85rem', background: 'rgba(99,102,241,0.1)',
                                border: '1px solid rgba(99,102,241,0.3)', borderRadius: 8,
                                color: '#6366f1', fontSize: '0.75rem', fontWeight: 700,
                                cursor: 'pointer', fontFamily: 'var(--font-body)',
                              }}>
                              Track My Package →
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    {/* ── EXPANDED DETAILS ── */}
                    {isExp && (
                      <div style={{ borderTop: '1px solid #f1f5f9', background: '#f8fafc', padding: '1rem 1.25rem' }}>

                        {/* Status progress tracker */}
                        {!['cancelled','returned','refunded'].includes(o.status) && (
                          <StatusTracker status={o.status} />
                        )}
                        {o.status === 'cancelled' && (
                          <div style={{ padding: '0.75rem 1rem', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, marginTop: '0.75rem' }}>
                            <span style={{ fontSize: '1rem' }}></span>&nbsp;
                            <strong style={{ color: '#dc2626' }}>Order Cancelled</strong>
                          </div>
                        )}

                        {/* All items */}
                        <div style={{ marginTop: '1rem' }}>
                          <div style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#64748b', marginBottom: '0.5rem' }}>
                            Order Items
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                            {(o.items || []).map((item, i) => (
                              <div key={i} style={{
                                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                padding: '0.55rem 0.85rem', background: '#fff',
                                borderRadius: 10, border: '1px solid #e2e8f0',
                                fontSize: '0.82rem',
                              }}>
                                <div>
                                  <span style={{ fontWeight: 600, color: '#1e1b4b' }}>{item.name}</span>
                                  <span style={{ color: '#94a3b8', marginLeft: '0.65rem' }}>
                                    {item.size} · {item.colour} · ×{item.qty}
                                  </span>
                                </div>
                                <span style={{ fontWeight: 700, color: '#6366f1' }}>
                                  ₹{((item.price || 0) * item.qty).toLocaleString('en-IN')}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Order details grid */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem', marginTop: '0.85rem' }}>
                          <InfoBox icon="" label="Order Total" value={`₹${(o.total || 0).toLocaleString('en-IN')}`} />
                          <InfoBox icon={payment.icon} label="Payment Method" value={payment.label} />
                          <InfoBox icon={payment.isPaid ? '' : ''} label="Payment Status" value={payment.paidLabel} color={payment.paidColor} />
                          <InfoBox icon="" label="Order Date" value={fmtDate(o.createdAt || o.created_at)} />
                          {o.estimatedDeliveryDate && (
                            <InfoBox icon="" label="Est. Delivery" value={fmtDate(o.estimatedDeliveryDate)} color="#16a34a" />
                          )}
                          {o.deliveryDate && (
                            <InfoBox icon="" label="Delivered On" value={fmtDate(o.deliveryDate)} color="#16a34a" />
                          )}
                        </div>

                        {/* Delivery address */}
                        <div style={{ marginTop: '0.65rem', padding: '0.75rem 0.9rem', background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10 }}>
                          <div style={{ fontSize: '0.62rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#64748b', marginBottom: 4 }}>
                            Delivery Address
                          </div>
                          <div style={{ fontSize: '0.82rem', color: '#1e1b4b', lineHeight: 1.6 }}>{o.address}</div>
                        </div>

                        {/* Courier tracking */}
                        {o.trackingId && (
                          <div style={{ marginTop: '0.65rem', padding: '0.85rem 1rem', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10 }}>
                            <div style={{ fontSize: '0.62rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#16a34a', marginBottom: '0.6rem' }}>
                              Courier Tracking
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem', fontSize: '0.82rem', marginBottom: '0.75rem' }}>
                              <div><span style={{ color: '#64748b' }}>Courier:</span> <strong style={{ color: '#1e1b4b' }}>{o.courierName}</strong></div>
                              <div><span style={{ color: '#64748b' }}>Tracking ID:</span> <strong style={{ fontFamily: 'monospace', color: '#6366f1' }}>{o.trackingId}</strong></div>
                              {o.shippingDate && (
                                <div><span style={{ color: '#64748b' }}>Shipped:</span> <strong>{fmtDate(o.shippingDate)}</strong></div>
                              )}
                              {o.estimatedDeliveryDate && (
                                <div><span style={{ color: '#64748b' }}>Est. Delivery:</span> <strong style={{ color: '#16a34a' }}>{fmtDate(o.estimatedDeliveryDate)}</strong></div>
                              )}
                            </div>
                            {COURIER_URLS[o.courierName] && (
                              <a href={COURIER_URLS[o.courierName](o.trackingId)} target="_blank" rel="noopener noreferrer"
                                style={{
                                  display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
                                  padding: '0.5rem 1.1rem', background: '#16a34a', color: '#fff',
                                  borderRadius: 8, fontSize: '0.82rem', fontWeight: 700, textDecoration: 'none',
                                }}>
                                Track on {o.courierName} →
                              </a>
                            )}
                          </div>
                        )}

                        {/* Total footer */}
                        <div style={{ marginTop: '0.85rem', padding: '0.85rem 1rem', background: 'linear-gradient(135deg, rgba(99,102,241,0.06), rgba(129,140,248,0.04))', border: '1px solid rgba(99,102,241,0.15)', borderRadius: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '0.82rem', color: '#64748b', fontWeight: 600 }}>Order Total (incl. all items)</span>
                          <span style={{ fontSize: '1.2rem', fontWeight: 800, color: '#6366f1' }}>₹{(o.total || 0).toLocaleString('en-IN')}</span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function InfoBox({ icon, label, value, color }) {
  return (
    <div style={{ padding: '0.65rem 0.85rem', background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
      <span style={{ fontSize: '1rem', flexShrink: 0 }}>{icon}</span>
      <div>
        <div style={{ fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#94a3b8', marginBottom: 2 }}>{label}</div>
        <div style={{ fontSize: '0.82rem', fontWeight: 700, color: color || '#1e1b4b' }}>{value}</div>
      </div>
    </div>
  );
}
