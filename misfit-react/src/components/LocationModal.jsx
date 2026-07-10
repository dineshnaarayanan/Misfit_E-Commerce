/* ─────────────────────────────────────────────────────
   LocationModal.jsx  —  Fetch and set user location
   ───────────────────────────────────────────────────── */
import { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { apiFetch } from '../api';

export default function LocationModal() {
  const { locationModalOpen, setLocationModalOpen, currentUser, token, login, showToast } = useApp();
  
  const [address, setAddress] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [fetching, setFetching] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (locationModalOpen && currentUser) {
      setAddress(currentUser.address || '');
      setLatitude(currentUser.latitude || '');
      setLongitude(currentUser.longitude || '');
    }
  }, [locationModalOpen, currentUser]);

  if (!locationModalOpen) return null;

  async function handleFetchLocation() {
    if (!navigator.geolocation) {
      showToast('Geolocation is not supported by your browser', 'error');
      return;
    }

    setFetching(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude: lat, longitude: lon } = position.coords;
        setLatitude(lat.toString());
        setLongitude(lon.toString());
        
        try {
          // Reverse geocoding via OpenStreetMap Nominatim API
          const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`);
          const data = await response.json();
          if (data && data.display_name) {
            setAddress(data.display_name);
            showToast('Location detected successfully!', 'success');
          } else {
            showToast('Could not resolve address', 'error');
          }
        } catch (error) {
          showToast('Failed to fetch address from coordinates', 'error');
        } finally {
          setFetching(false);
        }
      },
      (error) => {
        setFetching(false);
        if (error.code === error.PERMISSION_DENIED) {
          showToast('Location access denied by user.', 'error');
        } else {
          showToast('Failed to get current location.', 'error');
        }
      }
    );
  }

  async function handleSave(e) {
    e.preventDefault();
    if (!currentUser) {
      showToast('You must be logged in to save your location.', 'error');
      setLocationModalOpen(false);
      return;
    }

    setSaving(true);
    try {
      const data = await apiFetch('/auth/me', {
        method: 'PUT',
        body: JSON.stringify({ 
          address: address.trim(),
          latitude: String(latitude),
          longitude: String(longitude)
        }),
      }, token);
      
      // Update global user state immediately
      login({ token, user: data.user });
      showToast('Location saved successfully!', 'success');
      setLocationModalOpen(false);
    } catch (err) {
      showToast(err.message || 'Failed to save location', 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-overlay" style={{ display: 'flex' }} onClick={() => setLocationModalOpen(false)}>
      <div 
        className="profile-modal" 
        onClick={e => e.stopPropagation()} 
        style={{ maxWidth: '400px' }}
      >
        <div className="profile-modal-header" style={{ borderBottom: '1px solid var(--border)', paddingBottom: '1rem', marginBottom: '1rem' }}>
          <h3 style={{ margin: 0, fontFamily: 'var(--font-display)' }}>Set Your Location</h3>
          <button className="modal-close" style={{ marginLeft: 'auto' }} onClick={() => setLocationModalOpen(false)}>x</button>
        </div>

        <div className="profile-body" style={{ padding: '0 1.5rem 1.5rem' }}>
          <p style={{ fontSize: '0.9rem', color: 'var(--muted)', marginBottom: '1.5rem' }}>
            We need your location to show accurate delivery options and times.
          </p>

          <button 
            type="button" 
            className="btn-secondary" 
            onClick={handleFetchLocation} 
            disabled={fetching}
            style={{ width: '100%', marginBottom: '1.5rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem' }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 16, height: 16 }}>
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
            </svg>
            {fetching ? 'Detecting Location...' : 'Detect Current Location'}
          </button>

          <form className="profile-form" onSubmit={handleSave}>
            <div className="profile-field">
              <label>Delivery Address</label>
              <textarea
                value={address}
                onChange={e => setAddress(e.target.value)}
                placeholder="E.g., 123 Main Street, City, State, ZIP"
                rows={3}
                required
                style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', resize: 'vertical' }}
              />
            </div>
            
            <div className="profile-form-actions" style={{ marginTop: '1.5rem' }}>
              <button type="button" className="btn-secondary" onClick={() => setLocationModalOpen(false)} disabled={saving}>
                Cancel
              </button>
              <button type="submit" className="btn-primary" disabled={saving}>
                {saving ? 'Saving...' : 'Save Location'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
