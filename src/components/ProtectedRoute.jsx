import { Navigate } from 'react-router-dom'
import { useAuth } from '../lib/AuthContext'

export function ProtectedRoute({ children, adminOnly = false }) {
  const { user, isAdmin, loading } = useAuth()

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        background: 'var(--dark)',
        color: 'var(--text-secondary)',
        fontFamily: 'Outfit, Arial, sans-serif',
        fontSize: '14px',
      }}>
        Loading...
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (adminOnly && !isAdmin) {
    return <Navigate to="/dashboard" replace />
  }

  return children
}
