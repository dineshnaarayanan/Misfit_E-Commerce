import { useState } from 'react';
import { useApp }   from '../context/AppContext';
import { apiFetch } from '../api';
import { GoogleLogin } from '@react-oauth/google';

export default function AuthModal() {
  const { loginOpen, setLoginOpen, login, showToast } = useApp();
  const [tab,       setTab]       = useState('login');
  const [role,      setRole]      = useState('user');
  const [loading,   setLoading]   = useState(false);
  const [loginErr,  setLoginErr]  = useState('');
  const [regErr,    setRegErr]    = useState('');

  // Login fields
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');

  // Register fields
  const [regName,     setRegName]     = useState('');
  const [regEmail,    setRegEmail]    = useState('');
  const [regPhone,    setRegPhone]    = useState('');
  const [regPassword, setRegPassword] = useState('');

  if (!loginOpen) return null;

  // ── Friendly error message helper ──────────────────────────
  function friendlyError(err) {
    if (err.message === 'Failed to fetch' || err.name === 'TypeError') {
      return 'Cannot connect to server. Make sure the backend is running on port 5000.';
    }
    return err.message || 'Something went wrong. Please try again.';
  }

  async function handleGoogleSuccess(credentialResponse) {
    setLoading(true); setLoginErr(''); setRegErr('');
    try {
      const data = await apiFetch('/auth/google', {
        method: 'POST',
        body: JSON.stringify({ token: credentialResponse.credential }),
      });
      login(data);
      setLoginOpen(false);
      showToast(data.message || `Welcome, ${data.user.name}!`, 'success');
    } catch (err) {
      const msg = friendlyError(err);
      tab === 'login' ? setLoginErr(msg) : setRegErr(msg);
    } finally {
      setLoading(false);
    }
  }

  function handleGoogleError() {
    const msg = 'Google authentication failed or was cancelled.';
    tab === 'login' ? setLoginErr(msg) : setRegErr(msg);
  }

  async function handleLogin() {
    if (!email.trim()) { setLoginErr('Please enter your email address.'); return; }
    if (!password)     { setLoginErr('Please enter your password.'); return; }
    setLoading(true); setLoginErr('');
    try {
      const data = await apiFetch('/auth/login', {
        method: 'POST', body: JSON.stringify({ email: email.trim(), password }),
      });
      login(data);
      setLoginOpen(false);
      showToast(`Welcome back, ${data.user.name}!`, 'success');
    } catch (err) { setLoginErr(friendlyError(err)); }
    finally { setLoading(false); }
  }

  async function handleRegister() {
    if (!regName.trim())  { setRegErr('Please enter your full name.'); return; }
    if (!regEmail.trim()) { setRegErr('Please enter your email address.'); return; }
    if (!regPassword)     { setRegErr('Please create a password.'); return; }
    if (regPassword.length < 6) { setRegErr('Password must be at least 6 characters.'); return; }
    setLoading(true); setRegErr('');
    try {
      const data = await apiFetch('/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          name:     regName.trim(),
          email:    regEmail.trim(),
          phone:    regPhone.trim(),
          password: regPassword,
        }),
      });
      login(data);
      setLoginOpen(false);
      showToast(`Welcome to MisFit, ${data.user.name}!`, 'success');
    } catch (err) { setRegErr(friendlyError(err)); }
    finally { setLoading(false); }
  }


  return (
    <div className="modal-overlay" style={{ display: 'flex' }}>
      <div className="auth-modal" style={{ textAlign: 'center', padding: '2.5rem 2rem' }}>
        <button className="modal-close" onClick={() => setLoginOpen(false)}>x</button>

        <div className="auth-brand" style={{ justifyContent: 'center', marginBottom: '2rem' }}>
          <div className="logo-icon" style={{ borderRadius: '8px', background: 'var(--surface2)', border: '2px solid var(--accent)', color: 'var(--accent)' }}>M</div>
          <span className="brand-name" style={{ fontSize: '1.8rem' }}>MisFit</span>
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
          <GoogleLogin
            onSuccess={handleGoogleSuccess}
            onError={handleGoogleError}
            text={tab === 'login' ? 'signin_with' : 'signup_with'}
          />
        </div>

        <div className="auth-divider">
          <span>or you can sign in with</span>
        </div>

        {tab === 'login' ? (
          <>
            <div className="form-group" style={{ textAlign: 'left' }}>
              <input type="email" placeholder="Email Address" value={email} onChange={e => setEmail(e.target.value)} />
            </div>
            <div className="form-group" style={{ textAlign: 'left', marginBottom: '1.5rem' }}>
              <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleLogin()} />
            </div>

            <button className="btn-auth" onClick={handleLogin} disabled={loading}>{loading ? 'Signing In…' : 'Sign In'}</button>
            <p className="auth-error">{loginErr}</p>

            <p style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: '1rem' }}>By continuing, you agree to Terms & Privacy Policy.</p>

            <div className="auth-links" style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1.5rem', fontSize: '0.85rem' }}>
              <span style={{ color: 'var(--muted)', cursor: 'pointer' }}>Forgot Password?</span>
              <span style={{ color: 'var(--accent)', cursor: 'pointer', fontWeight: '600' }} onClick={() => setTab('register')}>Sign Up</span>
            </div>
          </>
        ) : (
          <>
            <div className="form-group" style={{ textAlign: 'left' }}>
              <input type="text" placeholder="Full Name" value={regName} onChange={e => setRegName(e.target.value)} />
            </div>
            <div className="form-group" style={{ textAlign: 'left' }}>
              <input type="email" placeholder="Email Address" value={regEmail} onChange={e => setRegEmail(e.target.value)} />
            </div>
            <div className="form-group" style={{ textAlign: 'left' }}>
              <input type="tel" placeholder="Phone Number" value={regPhone} onChange={e => setRegPhone(e.target.value)} />
            </div>
            <div className="form-group" style={{ textAlign: 'left' }}>
              <input type="password" placeholder="Create a password" value={regPassword} onChange={e => setRegPassword(e.target.value)} />
            </div>

            <button className="btn-auth" onClick={handleRegister} disabled={loading} style={{ marginTop: '0.5rem' }}>{loading ? 'Creating account…' : 'Sign Up'}</button>
            <p className="auth-error">{regErr}</p>

            <p style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: '1rem' }}>By continuing, you agree to Terms & Privacy Policy.</p>

            <div className="auth-links" style={{ display: 'flex', justifyContent: 'center', marginTop: '1.5rem', fontSize: '0.85rem' }}>
              <span style={{ color: 'var(--muted)' }}>Already have an account? <span style={{ color: 'var(--accent)', cursor: 'pointer', fontWeight: '600' }} onClick={() => setTab('login')}>Sign In</span></span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
