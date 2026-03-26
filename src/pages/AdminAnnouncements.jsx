import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'

export default function AdminAnnouncements() {
  const { user } = useAuth()
  const [items, setItems] = useState([])
  const [branches, setBranches] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ title: '', body: '', branch_slug: '' })
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    fetchItems()
    fetchBranches()
  }, [])

  async function fetchItems() {
    const { data } = await supabase.from('announcements').select('*, profiles(full_name)').order('created_at', { ascending: false })
    setItems(data || [])
  }

  async function fetchBranches() {
    const { data } = await supabase.from('branches').select('*').order('name')
    setBranches(data || [])
  }

  function openNew() {
    setEditing(null)
    setForm({ title: '', body: '', branch_slug: '' })
    setShowForm(true)
    setMessage('')
  }

  function openEdit(item) {
    setEditing(item.id)
    setForm({ title: item.title || '', body: item.body || '', branch_slug: item.branch_slug || '' })
    setShowForm(true)
    setMessage('')
  }

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    try {
      const payload = {
        title: form.title,
        body: form.body,
        branch_slug: form.branch_slug || null,
      }
      if (editing) {
        const { error } = await supabase.from('announcements').update(payload).eq('id', editing)
        if (error) throw error
        setMessage('Announcement updated.')
      } else {
        const { error } = await supabase.from('announcements').insert({ ...payload, created_by: user.id })
        if (error) throw error
        setMessage('Announcement created.')
      }
      setShowForm(false)
      setEditing(null)
      fetchItems()
    } catch (err) {
      setMessage('Error: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id) {
    if (!confirm('Delete this announcement?')) return
    await supabase.from('announcements').delete().eq('id', id)
    fetchItems()
    setMessage('Announcement deleted.')
  }

  return (
    <div>
      <div style={styles.header}>
        <h1 style={styles.title}>Announcements</h1>
        <button onClick={openNew} style={styles.addBtn}>+ New announcement</button>
      </div>

      {message && <div style={styles.message}>{message}</div>}

      {showForm && (
        <form onSubmit={handleSave} style={styles.form}>
          <div style={styles.formTitle}>{editing ? 'Edit announcement' : 'New announcement'}</div>
          <div style={styles.field}>
            <label style={styles.label}>Title</label>
            <input type="text" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} required style={styles.input} />
          </div>
          <div style={styles.field}>
            <label style={styles.label}>Body</label>
            <textarea value={form.body} onChange={e => setForm(p => ({ ...p, body: e.target.value }))} rows={4} style={{ ...styles.input, resize: 'vertical' }} />
          </div>
          <div style={styles.field}>
            <label style={styles.label}>Branch (optional -- leave blank for department-wide)</label>
            <select value={form.branch_slug} onChange={e => setForm(p => ({ ...p, branch_slug: e.target.value }))} style={styles.input}>
              <option value="">All branches</option>
              {branches.map(b => <option key={b.id} value={b.slug}>{b.name}</option>)}
            </select>
          </div>
          <div style={styles.formActions}>
            <button type="submit" disabled={saving} style={styles.submitBtn}>{saving ? 'Saving...' : editing ? 'Update' : 'Post announcement'}</button>
            <button type="button" onClick={() => setShowForm(false)} style={styles.cancelBtn}>Cancel</button>
          </div>
        </form>
      )}

      {items.length === 0 ? (
        <div style={styles.empty}>No announcements yet.</div>
      ) : (
        <div style={styles.list}>
          {items.map(item => (
            <div key={item.id} style={styles.card}>
              <div style={{ flex: 1 }}>
                <div style={styles.cardTitle}>{item.title}</div>
                {item.body && <div style={styles.cardBody}>{item.body}</div>}
                <div style={styles.cardMeta}>
                  <span>{item.profiles?.full_name || 'Admin'}</span>
                  <span>--</span>
                  <span>{new Date(item.created_at).toLocaleDateString()}</span>
                  {item.branch_slug && <span style={styles.badge}>{item.branch_slug}</span>}
                </div>
              </div>
              <div style={styles.cardActions}>
                <button onClick={() => openEdit(item)} style={styles.editBtn}>Edit</button>
                <button onClick={() => handleDelete(item.id)} style={styles.deleteBtn}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

const styles = {
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' },
  title: { fontSize: '24px', fontWeight: '600', color: 'var(--white)' },
  addBtn: { padding: '10px 20px', background: 'var(--green)', color: 'var(--black)', border: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: '600' },
  message: { padding: '10px 14px', background: 'rgba(55, 202, 55, 0.1)', border: '1px solid rgba(55, 202, 55, 0.2)', borderRadius: '8px', color: 'var(--green)', fontSize: '13px', marginBottom: '16px' },
  form: { padding: '24px', background: 'var(--dark-card)', border: '1px solid var(--dark-border)', borderRadius: '12px', marginBottom: '24px', display: 'flex', flexDirection: 'column', gap: '16px' },
  formTitle: { fontSize: '16px', fontWeight: '600', color: 'var(--white)' },
  field: { display: 'flex', flexDirection: 'column', gap: '6px' },
  label: { fontSize: '12px', fontWeight: '500', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' },
  input: { padding: '10px 12px', background: 'var(--dark)', border: '1px solid var(--dark-border)', borderRadius: '8px', color: 'var(--white)', fontSize: '14px', outline: 'none' },
  formActions: { display: 'flex', gap: '10px' },
  submitBtn: { padding: '12px 24px', background: 'var(--green)', color: 'var(--black)', border: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: '600' },
  cancelBtn: { padding: '12px 24px', background: 'transparent', border: '1px solid var(--dark-border)', borderRadius: '10px', color: 'var(--text-secondary)', fontSize: '14px' },
  empty: { padding: '24px', background: 'var(--dark-card)', border: '1px solid var(--dark-border)', borderRadius: '12px', color: 'var(--text-muted)', fontSize: '14px' },
  list: { display: 'flex', flexDirection: 'column', gap: '8px' },
  card: { display: 'flex', alignItems: 'flex-start', gap: '14px', padding: '18px 20px', background: 'var(--dark-card)', border: '1px solid var(--dark-border)', borderRadius: '10px' },
  cardTitle: { fontSize: '15px', fontWeight: '500', color: 'var(--white)', marginBottom: '6px' },
  cardBody: { fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.6', whiteSpace: 'pre-wrap', marginBottom: '8px' },
  cardMeta: { display: 'flex', gap: '6px', alignItems: 'center', fontSize: '12px', color: 'var(--text-muted)' },
  badge: { padding: '2px 8px', background: 'rgba(255,255,255,0.04)', borderRadius: '4px', fontSize: '11px' },
  cardActions: { display: 'flex', gap: '6px', flexShrink: 0 },
  editBtn: { padding: '6px 12px', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--dark-border)', borderRadius: '6px', color: 'var(--text-secondary)', fontSize: '12px', cursor: 'pointer' },
  deleteBtn: { padding: '6px 12px', background: 'rgba(255,80,80,0.08)', border: '1px solid rgba(255,80,80,0.15)', borderRadius: '6px', color: '#ff5050', fontSize: '12px', cursor: 'pointer' },
}
