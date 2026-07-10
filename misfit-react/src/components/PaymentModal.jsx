import { useState } from 'react';
import { useApp }   from '../context/AppContext';
import { apiFetch } from '../api';

/*
  Full Razorpay Payment Flow:
  1. User clicks "Pay with Razorpay"
  2. Frontend calls POST /api/payment/order → gets razorpay_order_id
  3. Razorpay checkout modal opens in browser
  4. On success: POST /api/payment/verify → HMAC signature check
  5. On verify OK: POST /api/orders → DB order created
  6. On COD: skip steps 2-4, go straight to POST /api/orders
*/

const PAYMENT_METHODS = [
  { val: 'razorpay', label: 'Pay Online (Card / Netbanking)', icon: '' },
  { val: 'upi',      label: 'UPI Payment (GPay, PhonePe, Paytm)', icon: '' },
  { val: 'gpay',     label: 'Google Pay (Manual QR Verify)',  icon: '' },
  { val: 'cod',      label: 'Cash on Delivery',                      icon: '' },
  { val: 'original', label: 'Original (Without Pay)',                icon: '' },
];

export default function PaymentModal() {
  const { paymentItems, setPaymentItems, placeOrder, showToast, token, currentUser } = useApp();
  const [address, setAddress] = useState('');
  const [method,  setMethod]  = useState('razorpay');
  const [loading, setLoading] = useState(false);
  const [step,    setStep]    = useState('checkout'); // 'checkout' | 'processing' | 'success' | 'gpay_verify'
  const [utr,     setUtr]     = useState('');
  const [fetchingLocation, setFetchingLocation] = useState(false);

  // ── Automatic Geolocation Fetching ──────────────────────────
  const handleFetchLocation = () => {
    if (!navigator.geolocation) {
      showToast('Geolocation is not supported by your browser.', 'error');
      return;
    }
    setFetchingLocation(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
          if (!res.ok) throw new Error('Failed to resolve address');
          const data = await res.json();
          if (data && data.display_name) {
            setAddress(data.display_name);
            showToast('Delivery address auto-populated from GPS!', 'success');
          } else {
            throw new Error('Address not found');
          }
        } catch (err) {
          console.error(err);
          showToast('Failed to retrieve address details. Please type manually.', 'error');
        } finally {
          setFetchingLocation(false);
        }
      },
      (error) => {
        console.error(error);
        let errorMsg = 'Failed to retrieve location.';
        if (error.code === error.PERMISSION_DENIED) {
          errorMsg = 'Location permission denied. Please allow location access.';
        }
        showToast(errorMsg, 'error');
        setFetchingLocation(false);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  if (!paymentItems) return null;

  const total = paymentItems.reduce((s, i) => s + i.product.price * i.qty, 0);

  // ── Load Razorpay SDK dynamically ──────────────────────────
  function loadRazorpayScript() {
    return new Promise((resolve) => {
      if (window.Razorpay) return resolve(true);
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload  = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  }

  // ── Offline checkout ───────────────────────────────────────────
  async function handleOfflinePayment(selectedMethod) {
    if (!address.trim()) { showToast('Please enter a delivery address', 'error'); return; }
    setLoading(true);
    try {
      await placeOrder(address, selectedMethod, null, null);
      setStep('success');
      setTimeout(() => { setPaymentItems(null); setStep('checkout'); }, 3000);
    } catch (err) {
      showToast(err.message || 'Failed to place order', 'error');
    } finally { setLoading(false); }
  }

  // ── Razorpay Online Payment ────────────────────────────────
  async function handleRazorpay() {
    if (!address.trim()) { showToast('Please enter a delivery address', 'error'); return; }
    setLoading(true);

    try {
      // 1. Load Razorpay SDK
      const loaded = await loadRazorpayScript();
      if (!loaded) {
        showToast('Failed to load Razorpay. Check your internet connection.', 'error');
        setLoading(false);
        return;
      }

      // 2. Create Razorpay order on backend
      const orderData = await apiFetch('/payment/order', {
        method: 'POST',
        body: JSON.stringify({ amount: total, currency: 'INR', receipt: `misfit_${Date.now()}` }),
      }, token);

      if (!orderData.success) throw new Error(orderData.message);

      // 3. Open Razorpay checkout
      const options = {
        key:         orderData.keyId,
        amount:      orderData.amount,
        currency:    orderData.currency,
        name:        'MisFit',
        description: `Order for ${paymentItems.length} item(s)`,
        order_id:    orderData.razorpayOrderId,
        prefill: {
          name:  currentUser?.name  || '',
          email: currentUser?.email || '',
          ...(method === 'upi' ? { method: 'upi' } : {})
        },
        theme: { color: '#6366f1' },

        handler: async function (response) {
          // 4. Verify payment signature on backend
          setStep('processing');
          try {
            const verifyData = await apiFetch('/payment/verify', {
              method: 'POST',
              body: JSON.stringify({
                razorpay_order_id:   response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature:  response.razorpay_signature,
              }),
            }, token);

            if (!verifyData.success) throw new Error('Payment verification failed.');

            // 5. Create DB order only after verification
            await placeOrder(
              address,
              method,
              verifyData.razorpayOrderId,
              verifyData.razorpayPaymentId,
            );
            setStep('success');
            setTimeout(() => { setPaymentItems(null); setStep('checkout'); }, 3500);
          } catch (err) {
            showToast(`Payment verification failed: ${err.message}`, 'error');
            setStep('checkout');
          }
        },

        modal: {
          ondismiss: () => {
            showToast('Payment cancelled. Your cart is safe.', 'error');
            setStep('checkout');
            setLoading(false);
          },
        },
      };

      new window.Razorpay(options).open();
      setLoading(false);
    } catch (err) {
      showToast(err.message || 'Payment failed. Please try again.', 'error');
      setLoading(false);
    }
  }

  function handlePay() {
    if (method === 'cod' || method === 'original') {
      handleOfflinePayment(method);
    } else if (method === 'gpay') {
      if (!address.trim()) { showToast('Please enter a delivery address', 'error'); return; }
      setStep('gpay_verify');
    } else {
      handleRazorpay();
    }
  }

  async function handleGpayVerify() {
    if (!utr.trim()) { showToast('Please enter the Transaction ID (UTR)', 'error'); return; }
    setLoading(true);
    try {
      await placeOrder(address, 'gpay', null, `UTR_${utr}`);
      setStep('success');
      setTimeout(() => { setPaymentItems(null); setStep('checkout'); }, 3000);
    } catch (err) {
      showToast(err.message || 'Failed to place order', 'error');
    } finally { setLoading(false); }
  }

  // ── SUCCESS SCREEN ─────────────────────────────────────────
  if (step === 'success') {
    return (
      <div className="modal-overlay" style={{ display: 'flex' }}>
        <div className="payment-modal" style={{ textAlign: 'center', padding: '3rem 2rem' }}>
          <div style={{ fontSize: '1.8rem', marginBottom: '1rem', color: 'var(--success)', fontWeight: 700 }}>Order Confirmed</div>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', color: 'var(--success)', marginBottom: '0.5rem' }}>
            Order Placed!
          </h3>
          <p style={{ color: 'var(--muted2)', fontSize: '0.9rem' }}>
            Check "My Orders" to track your delivery.
          </p>
        </div>
      </div>
    );
  }

  // ── PROCESSING SCREEN ──────────────────────────────────────
  if (step === 'processing') {
    return (
      <div className="modal-overlay" style={{ display: 'flex' }}>
        <div className="payment-modal" style={{ textAlign: 'center', padding: '3rem 2rem' }}>
          <div className="spinner" style={{ margin: '0 auto 1.5rem' }} />
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', marginBottom: '0.5rem' }}>
            Verifying Payment…
          </h3>
          <p style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>Please do not close this window.</p>
        </div>
      </div>
    );
  }

  // ── GPAY MANUAL VERIFY SCREEN ──────────────────────────────
  if (step === 'gpay_verify') {
    const upiLink = `upi://pay?pa=dnaarayanan@okicici&pn=Dinesh%20Naarayanan%20krishnan&am=${total}&cu=INR`;
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(upiLink)}`;
    
    return (
      <div className="modal-overlay" style={{ display: 'flex' }}>
        <div className="payment-modal" style={{ textAlign: 'center', padding: '1.5rem', maxHeight: '90vh', overflowY: 'auto' }}>
          <button className="modal-close" onClick={() => setStep('checkout')}>x</button>
          
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', marginBottom: '0.5rem' }}>
            Pay with Google Pay
          </h3>
          <p style={{ color: 'var(--muted)', fontSize: '0.85rem', marginBottom: '1rem' }}>
            Scan the QR code below using any UPI app to pay <strong style={{ color: 'var(--accent)' }}>₹{total.toLocaleString('en-IN')}</strong>.
          </p>

          <div style={{ background: '#fff', padding: '1rem', borderRadius: '12px', display: 'inline-block', marginBottom: '1rem' }}>
            <img src={qrUrl} alt="UPI QR Code" style={{ width: '180px', height: '180px', display: 'block' }} />
          </div>

          <p style={{ color: 'var(--muted)', fontSize: '0.85rem', marginBottom: '1rem' }}>
            UPI ID: <strong>dnaarayanan@okicici</strong><br/>
            Name: <strong>Dinesh Naarayanan krishnan</strong>
          </p>

          <a href={upiLink} className="btn-buy" style={{ display: 'inline-block', width: '100%', marginBottom: '1.5rem', padding: '0.8rem', textDecoration: 'none' }}>
            Tap here to open UPI App (Mobile)
          </a>

          <div style={{ textAlign: 'left', marginBottom: '1rem' }}>
            <label style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>Enter 12-digit UTR / Transaction ID after paying:</label>
            <input 
              type="text" 
              placeholder="e.g. 312345678901" 
              value={utr} 
              onChange={e => setUtr(e.target.value)}
              style={{ width: '100%', padding: '0.75rem', marginTop: '0.4rem', border: '1px solid var(--border)', borderRadius: '4px', background: 'var(--bg-card)', color: 'var(--text)' }}
            />
          </div>

          <button 
            className="btn-buy" 
            style={{ width: '100%', padding: '0.8rem' }}
            onClick={handleGpayVerify}
            disabled={loading}
          >
            {loading ? 'Verifying…' : 'Verify Payment & Place Order'}
          </button>
        </div>
      </div>
    );
  }

  // ── MAIN CHECKOUT SCREEN ───────────────────────────────────
  return (
    <div className="modal-overlay" style={{ display: 'flex' }}>
      <div className="payment-modal">
        <button className="modal-close" onClick={() => setPaymentItems(null)}>x</button>
        <h3>Secure Checkout</h3>

        {/* Order Summary */}
        <div className="payment-summary">
          {paymentItems.map((i, idx) => (
            <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '.4rem' }}>
              <span>{i.product.name} <span style={{ color: 'var(--muted)' }}>({i.size} · {i.colour}) ×{i.qty}</span></span>
              <span>₹{(i.product.price * i.qty).toLocaleString('en-IN')}</span>
            </div>
          ))}
          <div style={{ borderTop: '1px solid var(--border)', marginTop: '.75rem', paddingTop: '.75rem', display: 'flex', justifyContent: 'space-between', fontWeight: 700, color: 'var(--text)' }}>
            <span>Total</span>
            <span style={{ color: 'var(--accent)', fontSize: '1.1rem' }}>₹{total.toLocaleString('en-IN')}</span>
          </div>
          <div style={{ marginTop: '.5rem', fontSize: '.72rem', color: 'var(--muted)' }}>
            Free delivery on orders above ₹499 · 3–5 business days
          </div>
        </div>

        {/* Payment Methods */}
        <div className="payment-methods">
          <h4>Payment Method</h4>
          {PAYMENT_METHODS.map(m => (
            <label key={m.val} className="payment-option" style={method === m.val ? { borderColor: 'var(--accent)', background: 'var(--accent-dim)' } : {}}>
              <input type="radio" name="payment" value={m.val} checked={method === m.val} onChange={() => setMethod(m.val)} />
              <span style={{ fontSize: '1rem', marginRight: '.25rem' }}>{m.icon}</span>
              {m.label}
            </label>
          ))}
        </div>

        {/* Delivery Address */}
        <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <label style={{ margin: 0 }}>Delivery Address</label>
            <button
              type="button"
              onClick={handleFetchLocation}
              disabled={fetchingLocation}
              style={{
                background: 'none',
                border: 'none',
                color: fetchingLocation ? 'var(--muted)' : 'var(--accent)',
                fontSize: '0.75rem',
                fontWeight: 600,
                cursor: fetchingLocation ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                padding: '0.2rem 0.5rem',
                borderRadius: '6px',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                if (!fetchingLocation) e.currentTarget.style.background = 'rgba(99, 102, 241, 0.08)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'none';
              }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '4px' }}>
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                <circle cx="12" cy="10" r="3"></circle>
              </svg>
              {fetchingLocation ? 'Fetching...' : 'Detect Location'}
            </button>
          </div>
          <textarea
            rows="2"
            placeholder="Street, City, State, Pincode"
            value={address}
            onChange={e => setAddress(e.target.value)}
          />
        </div>

        {/* Pay Button */}
        <button
          className="btn-buy"
          style={{ width: '100%', marginTop: '1rem', padding: '0.9rem', fontSize: '1rem' }}
          onClick={handlePay}
          disabled={loading}
        >
          {loading
            ? 'Processing…'
            : method === 'cod'
            ? 'Confirm Order (COD)'
            : method === 'original'
            ? 'Confirm Order (Original)'
            : method === 'gpay'
            ? `Pay ₹${total.toLocaleString('en-IN')} with GPay`
            : method === 'upi'
            ? `Pay ₹${total.toLocaleString('en-IN')} with UPI`
            : `Pay ₹${total.toLocaleString('en-IN')} with Razorpay`}
        </button>

        <p style={{ textAlign: 'center', fontSize: '.72rem', color: 'var(--muted)', marginTop: '.75rem' }}>
          {method === 'razorpay' || method === 'upi' ? 'Secured by Razorpay — PCI DSS Compliant' : 'Pay when your order arrives'}
        </p>
      </div>
    </div>
  );
}
