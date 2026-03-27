import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

const GREEN = '#37CA37';
const BG = 'var(--dark)';
const CARD = 'var(--dark-card)';
const CARD_LIGHT = 'var(--dark-light)';
const BORDER = 'var(--dark-border)';
const WHITE = 'var(--white)';

export default function ResetPassword() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Supabase handles the token exchange from the email link automatically
    // We just need to wait for the session to be established
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setSessionReady(true);
      }
    });

    // Also check if already in recovery mode
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setSessionReady(true);
    });

    return () => subscription.unsubscribe();
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setSubmitting(true);

    const { error: updateError } = await supabase.auth.updateUser({
      password: password,
    });

    if (updateError) {
      setError(updateError.message);
      setSubmitting(false);
    } else {
      setSuccess(true);
      setTimeout(() => navigate('/dashboard', { replace: true }), 2000);
    }
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.logoArea}>
          <img src="/logo.avif" alt="PeachFit" style={{ width: 48, height: 48, objectFit: 'contain', marginBottom: 12 }} />
          <h1 style={styles.title}>Reset Password</h1>
          <p style={styles.subtitle}>Enter your new password below</p>
        </div>

        {success ? (
          <div style={styles.successBox}>
            <span style={{ fontSize: 24, marginBottom: 8 }}>✓</span>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: GREEN, margin: '0 0 4px' }}>Password Updated</h3>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>Redirecting to dashboard...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={styles.form}>
            {error && <div style={styles.error}>{error}</div>}

            {!sessionReady && (
              <div style={{ padding: 16, background: CARD_LIGHT, borderRadius: 8, border: `1px solid ${BORDER}`, marginBottom: 16, textAlign: 'center' }}>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>Loading session... If this takes too long, try clicking the reset link in your email again.</p>
              </div>
            )}

            <div style={styles.field}>
              <label style={styles.label}>New Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Minimum 8 characters"
                required
                minLength={8}
                style={styles.input}
              />
            </div>

            <div style={styles.field}>
              <label style={styles.label}>Confirm Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="Re-enter your password"
                required
                style={styles.input}
              />
            </div>

            <button type="submit" disabled={submitting || !sessionReady} style={{ ...styles.button, opacity: submitting || !sessionReady ? 0.5 : 1 }}>
              {submitting ? 'Updating...' : 'Set New Password'}
            </button>
          </form>
        )}

        <div style={{ textAlign: 'center', marginTop: 16 }}>
          <a href="/login" style={{ fontSize: 13, color: 'var(--text-muted)', textDecoration: 'none' }}>
            Back to sign in
          </a>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: BG, padding: 20, fontFamily: 'Outfit, Arial, sans-serif',
  },
  card: {
    width: '100%', maxWidth: 400, background: CARD, border: `1px solid ${BORDER}`,
    borderRadius: 16, padding: 32, boxShadow: '0 16px 48px rgba(0,0,0,0.3)',
  },
  logoArea: {
    display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 28,
  },
  title: {
    fontSize: 22, fontWeight: 700, color: WHITE, margin: '0 0 4px', textAlign: 'center',
  },
  subtitle: {
    fontSize: 14, color: 'var(--text-muted)', margin: 0, textAlign: 'center',
  },
  form: { display: 'flex', flexDirection: 'column', gap: 16 },
  field: { display: 'flex', flexDirection: 'column', gap: 6 },
  label: { fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' },
  input: {
    background: CARD_LIGHT, border: `1px solid ${BORDER}`, borderRadius: 8,
    color: WHITE, padding: '10px 14px', fontSize: 14, outline: 'none',
    fontFamily: 'Outfit, Arial, sans-serif', boxSizing: 'border-box',
  },
  button: {
    background: GREEN, border: 'none', borderRadius: 8, color: '#000',
    padding: '12px', fontSize: 14, fontWeight: 700, cursor: 'pointer', marginTop: 4,
  },
  error: {
    background: '#EF444415', border: '1px solid #EF444433', borderRadius: 8,
    color: '#EF4444', padding: '10px 14px', fontSize: 13,
  },
  successBox: {
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    padding: 24, background: GREEN + '10', border: `1px solid ${GREEN}33`,
    borderRadius: 12, textAlign: 'center',
  },
};
