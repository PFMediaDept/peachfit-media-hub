import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function AdminUsers() {
  const [users, setUsers] = useState([])
  const [allBranches, setAllBranches] = useState([])
  const [showInvite, setShowInvite] = useState(false)
  const [inviteForm, setInviteForm] = useState({
    email: '',
    full_name: '',
    title: '',
    role: 'member',
    branch_ids: [],
  })
  const [inviteLoading, setInviteLoading] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    fetchUsers()
    fetchBranches()
  }, [])

  async function fetchUsers() {
    const { data } = await supabase
      .from('profiles')
      .select('*, user_branches(branch_id, branches(name, slug))')
      .order('full_name')
    setUsers(data || [])
  }

  async function fetchBranches() {
    const { data } = await supabase
      .from('branches')
      .select('*')
      .order('name')
    setAllBranches(data || [])
  }

  async function handleInvite(e) {
    e.preventDefault()
    setInviteLoading(true)
    setMessage('')

    try {
      const { data, error } = await supabase.auth.admin.inviteUserByEmail(
        inviteForm.email,
        { data: { full_name: inviteForm.full_name } }
      )

      if (error) {
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email: inviteForm.email,
          password: crypto.randomUUID().slice(0, 16),
          options: {
            data: { full_name: inviteForm.full_name },
          },
        })
        if (signUpError) throw signUpError

        const userId = signUpData.user?.id
        if (userId) {
          await supabase.from('profiles').upsert({
            id: userId,
            email: inviteForm.email,
            full_name: inviteForm.full_name,
            title: inviteForm.title,
            role: inviteForm.role,
          })

          if (inviteForm.branch_ids.length > 0) {
            await supabase.from('user_branches').insert(
              inviteForm.branch_ids.map(bid => ({
                user_id: userId,
                branch_id: bid,
              }))
            )
          }
        }
      }

      setMessage('Invite sent successfully.')
      setShowInvite(false)
      setInviteForm({ email: '', full_name: '', title: '', role: 'member', branch_ids: [] })
      fetchUsers()
    } catch (err) {
      setMessage('Error: ' + err.message)
    } finally {
      setInviteLoading(false)
    }
  }

  function toggleBranch(branchId) {
    setInviteForm(prev => ({
      ...prev,
      branch_ids: prev.branch_ids.includes(branchId)
        ? prev.branch_ids.filter(id => id !== branchId)
        : [...prev.branch_ids, branchId],
    }))
  }

  return (
    <div>
      <div style={styles.header}>
        <h1 style={styles.title}>User management</h1>
        <button onClick={() => setShowInvite(!showInvite)} style={styles.addBtn}>
          + Invite user
        </button>
      </div>

      {message && (
        <div style={styles.message}>{message}</div>
      )}

      {showInvite && (
        <form onSubmit={handleInvite} style={styles.inviteForm}>
          <div style={styles.formRow}>
            <div style={styles.field}>
              <label style={styles.label}>Full name</label>
              <input
                type="text"
                value={inviteForm.full_name}
                onChange={e => setInviteForm(p => ({ ...p, full_name: e.target.value }))}
                required
                style={styles.input}
              />
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Email</label>
              <input
                type="email"
                value={inviteForm.email}
                onChange={e => setInviteForm(p => ({ ...p, email: e.target.value }))}
                required
                style={styles.input}
              />
            </div>
          </div>
          <div style={styles.formRow}>
            <div style={styles.field}>
              <label style={styles.label}>Title</label>
              <input
                type="text"
                value={inviteForm.title}
                onChange={e => setInviteForm(p => ({ ...p, title: e.target.value }))}
                placeholder="e.g. Long Form Editor"
                style={styles.input}
              />
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Role</label>
              <select
                value={inviteForm.role}
                onChange={e => setInviteForm(p => ({ ...p, role: e.target.value }))}
                style={styles.input}
              >
                <option value="member">Member</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          </div>
          <div style={styles.field}>
            <label style={styles.label}>Assign branches</label>
            <div style={styles.branchPicker}>
              {allBranches.map(b => (
                <label key={b.id} style={styles.branchOption}>
                  <input
                    type="checkbox"
                    checked={inviteForm.branch_ids.includes(b.id)}
                    onChange={() => toggleBranch(b.id)}
                  />
                  <span>{b.name}</span>
                </label>
              ))}
            </div>
          </div>
          <button type="submit" disabled={inviteLoading} style={styles.submitBtn}>
            {inviteLoading ? 'Sending...' : 'Send invite'}
          </button>
        </form>
      )}

      <div style={styles.userList}>
        {users.map(u => (
          <div key={u.id} style={styles.userCard}>
            <div style={styles.userAvatar}>
              {u.full_name?.charAt(0) || 'U'}
            </div>
            <div style={styles.userInfo}>
              <div style={styles.userName}>{u.full_name || 'Unnamed'}</div>
              <div style={styles.userEmail}>{u.email}</div>
            </div>
            <div style={styles.userMeta}>
              <div style={styles.userTitle}>{u.title || '--'}</div>
              <div style={styles.userBranches}>
                {u.user_branches?.map(ub => (
                  <span key={ub.branch_id} style={styles.branchBadge}>
                    {ub.branches?.name}
                  </span>
                ))}
              </div>
            </div>
            <div style={{
              ...styles.roleBadge,
              background: u.role === 'admin'
                ? 'rgba(55, 202, 55, 0.1)'
                : 'rgba(255,255,255,0.04)',
              color: u.role === 'admin' ? 'var(--green)' : 'var(--text-muted)',
            }}>
              {u.role}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

const styles = {
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '24px',
  },
  title: {
    fontSize: '24px',
    fontWeight: '600',
    color: 'var(--white)',
  },
  addBtn: {
    padding: '10px 20px',
    background: 'var(--green)',
    color: 'var(--black)',
    border: 'none',
    borderRadius: '10px',
    fontSize: '14px',
    fontWeight: '600',
  },
  message: {
    padding: '10px 14px',
    background: 'rgba(55, 202, 55, 0.1)',
    border: '1px solid rgba(55, 202, 55, 0.2)',
    borderRadius: '8px',
    color: 'var(--green)',
    fontSize: '13px',
    marginBottom: '16px',
  },
  inviteForm: {
    padding: '24px',
    background: 'var(--dark-card)',
    border: '1px solid var(--dark-border)',
    borderRadius: '12px',
    marginBottom: '24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  formRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '12px',
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  label: {
    fontSize: '12px',
    fontWeight: '500',
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  input: {
    padding: '10px 12px',
    background: 'var(--dark)',
    border: '1px solid var(--dark-border)',
    borderRadius: '8px',
    color: 'var(--white)',
    fontSize: '14px',
    outline: 'none',
  },
  branchPicker: {
    display: 'flex',
    gap: '16px',
    flexWrap: 'wrap',
  },
  branchOption: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '14px',
    color: 'var(--text-secondary)',
    cursor: 'pointer',
  },
  submitBtn: {
    padding: '12px 24px',
    background: 'var(--green)',
    color: 'var(--black)',
    border: 'none',
    borderRadius: '10px',
    fontSize: '14px',
    fontWeight: '600',
    alignSelf: 'flex-start',
  },
  userList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  userCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
    padding: '14px 18px',
    background: 'var(--dark-card)',
    border: '1px solid var(--dark-border)',
    borderRadius: '10px',
  },
  userAvatar: {
    width: '36px',
    height: '36px',
    borderRadius: '8px',
    background: 'rgba(255,255,255,0.06)',
    color: 'var(--text-secondary)',
    fontSize: '14px',
    fontWeight: '600',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  userInfo: {
    flex: 1,
    minWidth: 0,
  },
  userName: {
    fontSize: '14px',
    fontWeight: '500',
    color: 'var(--white)',
  },
  userEmail: {
    fontSize: '12px',
    color: 'var(--text-muted)',
  },
  userMeta: {
    textAlign: 'right',
  },
  userTitle: {
    fontSize: '13px',
    color: 'var(--text-secondary)',
    marginBottom: '4px',
  },
  userBranches: {
    display: 'flex',
    gap: '4px',
    justifyContent: 'flex-end',
    flexWrap: 'wrap',
  },
  branchBadge: {
    padding: '2px 8px',
    background: 'rgba(255,255,255,0.04)',
    borderRadius: '4px',
    fontSize: '11px',
    color: 'var(--text-muted)',
  },
  roleBadge: {
    padding: '4px 10px',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: '500',
    flexShrink: 0,
  },
}
