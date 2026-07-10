/* ─────────────────────────────────────────────────────
   ProfileModal.jsx  —  Editable user profile
   ───────────────────────────────────────────────────── */
import { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { apiFetch } from '../api';

export default function ProfileModal() {
  const { currentUser, token, profileOpen, setProfileOpen, login, showToast, setLocationModalOpen } = useApp();

  const [editing, setEditing] = useState(false);
  const [saving,  setSaving]  = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', address: '' });
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [tab, setTab] = useState('info'); // 'info' | 'password'
  const [pwError, setPwError] = useState('');

  // Sync form when modal opens or user changes
  useEffect(() => {
    if (currentUser) {
      setForm({ 
        name: currentUser.name || '', 
        phone: currentUser.phone || '',
        address: currentUser.address || '',
      });
    }
    setEditing(false);
    setPwError('');
    setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    setTab('info');
  }, [currentUser, profileOpen]);

  if (!profileOpen || !currentUser) return null;

  const initials = currentUser.name
    ? currentUser.name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
    : '?';

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const data = await apiFetch('/auth/me', {
        method: 'PUT',
        body: JSON.stringify({ 
          name: form.name.trim(), 
          phone: form.phone.trim(),
          address: form.address.trim(),
        }),
      }, token);
      // Update context with new user data
      login({ token, user: data.user });
      showToast('Profile updated!', 'success');
      setEditing(false);
    } catch (err) {
      showToast(err.message || 'Failed to update profile', 'error');
    } finally {
      setSaving(false);
    }
  }

  async function handlePasswordChange(e) {
    e.preventDefault();
    setPwError('');
    if (pwForm.newPassword !== pwForm.confirmPassword) {
      setPwError('New passwords do not match.');
      return;
    }
    if (pwForm.newPassword.length < 6) {
      setPwError('Password must be at least 6 characters.');
      return;
    }
    setSaving(true);
    try {
      await apiFetch('/auth/me/password', {
        method: 'PUT',
        body: JSON.stringify({
          currentPassword: pwForm.currentPassword,
          newPassword: pwForm.newPassword,
        }),
      }, token);
      showToast('Password changed!', 'success');
      setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      setPwError(err.message || 'Failed to change password');
    } finally {
      setSaving(false);
    }
  }

  const isGoogleUser = currentUser.googleId && !currentUser.password;

  return (
    <div className="modal-overlay" style={{ display: 'flex' }} onClick={() => setProfileOpen(false)}>
      <div
        className="profile-modal"
        onClick={e => e.stopPropagation()}
      >
        {/* ── Header ── */}
        <div className="profile-modal-header">
          <div className="profile-avatar-lg">{initials}</div>
          <div>
            <div className="profile-name">{currentUser.name}</div>
            <div className="profile-email">{currentUser.email}</div>
            <div className="profile-role-badge">
              {currentUser.role === 'admin' ? 'Admin' : 'Customer'}
            </div>
          </div>
          <button className="modal-close" style={{ marginLeft: 'auto' }} onClick={() => setProfileOpen(false)}>x</button>
        </div>

        {/* ── Tabs ── */}
        <div className="profile-tabs">
          <button
            className={`profile-tab ${tab === 'info' ? 'active' : ''}`}
            onClick={() => setTab('info')}
          >
            Personal Info
          </button>
          {!isGoogleUser && (
            <button
              className={`profile-tab ${tab === 'password' ? 'active' : ''}`}
              onClick={() => setTab('password')}
            >
              Change Password
            </button>
          )}
        </div>

        {/* ── Tab: Personal Info ── */}
        {tab === 'info' && (
          <div className="profile-body">
            {/* Info rows (read mode) */}
            {!editing ? (
              <div className="profile-info-grid">
                <ProfileRow label="Full Name"    value={currentUser.name || '—'} />
                <ProfileRow label="Email"        value={currentUser.email} />
                <ProfileRow label="Phone"        value={currentUser.phone || 'Not set'} />
                <ProfileRow 
                  label="Saved Address" 
                  value={currentUser.address || 'Not set'}
                  action={
                    <button
                      onClick={() => { setProfileOpen(false); setLocationModalOpen(true); }}
                      style={{ fontSize: '0.75rem', padding: '0.2rem 0.6rem', background: 'var(--accent-dim)', border: 'none', borderRadius: 6, color: 'var(--accent)', cursor: 'pointer', fontFamily: 'var(--font-body)', fontWeight: 600 }}
                    >
                      Update via GPS
                    </button>
                  }
                />
                <ProfileRow label="Member Since" value={new Date(currentUser.createdAt || Date.now()).toLocaleDateString('en-IN', { year: 'numeric', month: 'long' })} />
                <ProfileRow label="Login Method" value={isGoogleUser ? 'Google Account' : 'Email & Password'} />

                <button
                  className="profile-edit-btn"
                  onClick={() => setEditing(true)}
                >
                  Edit Profile
                </button>
              </div>
            ) : (
              /* Edit form */
              <form className="profile-form" onSubmit={handleSave}>
                <div className="profile-field">
                  <label>Full Name</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="Your full name"
                    required
                    minLength={2}
                  />
                </div>
                <div className="profile-field">
                  <label>Phone Number</label>
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                    placeholder="+91 XXXXX XXXXX"
                  />
                </div>
                <div className="profile-field" style={{ opacity: 0.6 }}>
                  <label>Email Address</label>
                  <input type="email" value={currentUser.email} disabled />
                  <span style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>Email cannot be changed</span>
                </div>
                <div className="profile-field">
                  <label>Delivery Address</label>
                  <textarea
                    value={form.address}
                    onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
                    placeholder="E.g., 123 Main Street, City, State, ZIP"
                    rows={2}
                    style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', resize: 'vertical', fontFamily: 'var(--font-body)', fontSize: '0.875rem' }}
                  />
                  <span style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>
                    Or use the "Update via GPS" button in view mode to auto-detect
                  </span>
                </div>

                <div className="profile-form-actions">
                  <button type="button" className="btn-secondary" onClick={() => setEditing(false)} disabled={saving}>
                    Cancel
                  </button>
                  <button type="submit" className="btn-primary" disabled={saving}>
                    {saving ? 'Saving…' : 'Save Changes'}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* ── Tab: Change Password ── */}
        {tab === 'password' && !isGoogleUser && (
          <div className="profile-body">
            <form className="profile-form" onSubmit={handlePasswordChange}>
              <div className="profile-field">
                <label>Current Password</label>
                <input
                  type="password"
                  value={pwForm.currentPassword}
                  onChange={e => setPwForm(f => ({ ...f, currentPassword: e.target.value }))}
                  placeholder="Enter current password"
                  required
                />
              </div>
              <div className="profile-field">
                <label>New Password</label>
                <input
                  type="password"
                  value={pwForm.newPassword}
                  onChange={e => setPwForm(f => ({ ...f, newPassword: e.target.value }))}
                  placeholder="At least 6 characters"
                  required
                  minLength={6}
                />
              </div>
              <div className="profile-field">
                <label>Confirm New Password</label>
                <input
                  type="password"
                  value={pwForm.confirmPassword}
                  onChange={e => setPwForm(f => ({ ...f, confirmPassword: e.target.value }))}
                  placeholder="Repeat new password"
                  required
                />
              </div>
              {pwError && <div className="auth-error">{pwError}</div>}
              <div className="profile-form-actions">
                <button type="submit" className="btn-primary" style={{ width: '100%' }} disabled={saving}>
                  {saving ? 'Updating…' : 'Change Password'}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}

function ProfileRow({ label, value, action }) {
  return (
    <div className="profile-row">
      <div style={{ flex: 1 }}>
        <div className="profile-row-label">{label}</div>
        <div className="profile-row-value">{value}</div>
      </div>
      {action && <div style={{ marginLeft: '0.75rem', flexShrink: 0 }}>{action}</div>}
    </div>
  );
}
