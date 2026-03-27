import { useState, useEffect } from 'react'
import { supabase } from "../lib/supabase"
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/AuthContext'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const { signIn, user, loading } = useAuth()
  const navigate = useNavigate()

  // Redirect to dashboard once user is authenticated and profile is loaded
  useEffect(() => {
    if (user && !loading) {
      navigate('/dashboard', { replace: true })
    }
  }, [user, loading, navigate])

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSubmitting(true)

    try {
      await signIn(email, password)
      // Navigation handled by useEffect above
    } catch (err) {
      setError(err.message === 'Invalid login credentials'
        ? 'Invalid email or password.'
        : 'Something went wrong. Try again.')
      setSubmitting(false)
    }
  }

  async function handleForgotPassword() {
    if (!email) { setError("Enter your email first, then click Forgot password."); return; }
    setError("");
    const { error: resetErr } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + "/reset-password",
    });
    if (resetErr) { setError(resetErr.message); }
    else { setError(""); alert("Check your email for a password reset link."); }
  }
  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.logoArea}>
          <img src="/logo.avif" alt="PeachFit" style={{width:48,height:48,objectFit:"contain"}}/>
          <h1 style={styles.title}>PeachFit Media Hub</h1>
          <p style={styles.subtitle}>Sign in to your department portal</p>
        </div>

        <form onSubmit={handleSubmit} style={styles.form}>
          {error && <div style={styles.error}>{error}</div>}

          <div style={styles.field}>
            <label style={styles.label}>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@peachfitwellness.com"
              required
              style={styles.input}
            />
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
              style={styles.input}
            />
          </div>

          <button
            type="submit"
            disabled={submitting || loading}
            style={{
              ...styles.button,
              opacity: (submitting || loading) ? 0.6 : 1,
            }}
          >
            {submitting || loading ? 'Signing in...' : 'Sign In'}
          </button>

          <button type="button" onClick={handleForgotPassword} style={{background:"transparent",border:"none",color:"#6B7280",fontSize:13,cursor:"pointer",padding:"8px 0",textAlign:"center",width:"100%"}}>
            Forgot your password?
          </button>
        </form>

        <p style={styles.footer}>
          PeachFit Wellness -- Media Department
        </p>
      </div>
    </div>
  )
}

const styles = {
  container: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    background: 'var(--dark)',
    padding: '20px',
  },
  card: {
    width: '100%',
    maxWidth: '400px',
    background: 'var(--dark-card)',
    border: '1px solid var(--dark-border)',
    borderRadius: '16px',
    padding: '40px 32px',
  },
  logoArea: {
    textAlign: 'center',
    marginBottom: '32px',
  },
  logoMark: {
    width: '56px',
    height: '56px',
    borderRadius: '14px',
    background: 'var(--green)',
    color: 'var(--black)',
    fontSize: '28px',
    fontWeight: '700',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 16px',
  },
  title: {
    fontSize: '22px',
    fontWeight: '600',
    color: 'var(--white)',
    marginBottom: '4px',
  },
  subtitle: {
    fontSize: '14px',
    color: 'var(--text-secondary)',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  label: {
    fontSize: '13px',
    fontWeight: '500',
    color: 'var(--text-secondary)',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  input: {
    padding: '12px 14px',
    background: 'var(--dark)',
    border: '1px solid var(--dark-border)',
    borderRadius: '10px',
    color: 'var(--white)',
    fontSize: '15px',
    outline: 'none',
    transition: 'border-color 0.2s',
  },
  button: {
    padding: '14px',
    background: 'var(--green)',
    color: 'var(--black)',
    border: 'none',
    borderRadius: '10px',
    fontSize: '15px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'opacity 0.2s',
    marginTop: '4px',
  },
  error: {
    padding: '10px 14px',
    background: 'rgba(224, 75, 75, 0.1)',
    border: '1px solid rgba(224, 75, 75, 0.3)',
    borderRadius: '8px',
    color: '#E04B4B',
    fontSize: '13px',
  },
  footer: {
    textAlign: 'center',
    fontSize: '12px',
    color: 'var(--text-muted)',
    marginTop: '24px',
  },
}
