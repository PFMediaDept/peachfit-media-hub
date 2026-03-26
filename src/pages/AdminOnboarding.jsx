import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function AdminOnboarding() {
  const [tasks, setTasks] = useState([])
  const [branches, setBranches] = useState([])
  const [activeBranch, setActiveBranch] = useState('youtube')
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ title: '', description: '', sort_order: 0 })
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    fetchBranches()
  }, [])

  useEffect(() => {
    fetchTasks()
  }, [activeBranch])

  async function fetchBranches() {
    const { data } = await supabase.from('branches').select('*').order('name')
    setBranches(data || [])
  }

  async function fetchTasks() {
    const { data } = await supabase.from('onboarding_tasks').select('*').eq('branch_slug', activeBranch).order('sort_order')
    setTasks(data || [])
  }

  function openNew() {
    setEditing(null)
    setForm({ title: '', description: '', sort_order: tasks.length + 1 })
    setShowForm(true)
    setMessage('')
  }

  function openEdit(task) {
    setEditing(task.id)
    setForm({ title: task.title || '', description: task.description || '', sort_order: task.sort_order || 0 })
    setShowForm(true)
    setMessage('')
  }

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    try {
      if (editing) {
        const { error } = await supabase.from('onboarding_tasks').update({
          title: form.title,
          description: form.description,
          sort_order: form.sort_order,
        }).eq('id', editing)
        if (error) throw error
        setMessage('Task updated.')
      } else {
        const { error } = await supabase.from('onboarding_tasks').insert({
          branch_slug: activeBranch,
          title: form.title,
          description: form.description,
          sort_order: form.sort_order,
        })
        if (error) throw error
        setMessage('Task created.')
      }
      setShowForm(false)
      setEditing(null)
      fetchTasks()
    } catch (err) {
      setMessage('Error: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id) {
    if (!confirm('Delete this onboarding task?')) return
    await supabase.from('onboarding_tasks').delete().eq('id', id)
    fetchTasks()
    setMessage('Task deleted.')
  }

  return (
    <div>
      <div style={styles.header}>
        <h1 style={styles.title}>Onboarding editor</h1>
        <button onClick={openNew} style={styles.addBtn}>+ Add task</button>
      </div>

      <div style={styles.tabs}>
        {branches.map(b => (
          <button key={b.id} onClick={() => { setActiveBranch(b.slug); setShowForm(false); setMessage('') }}
            style={{ ...styles.tab, ...(activeBranch === b.slug ? styles.tabActive : {}) }}>
            {b.name}
          </button>
        ))}
      </div>

      {message && <div style={styles.message}>{message}</div>}

      {showForm && (
        <form onSubmit={handleSave} style={styles.form}>
          <div style={styles.formTitle}>{editing ? 'Edit task' : 'New task'} -- {activeBranch}</div>
          <div style={styles.formRow}>
            <div style={{ ...styles.field, flex: 1 }}>
              <label style={styles.label}>Task title</label>
              <input type="text" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} required style={styles.input} />
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Order</label>
              <input type="number" value={form.sort_order} onChange={e => setForm(p => ({ ...p, sort_order: parseInt(e.target.value) || 0 }))} style={{ ...styles.input, width: '80px' }} />
            </div>
          </div>
          <div style={styles.field}>
            <label style={styles.label}>Description (optional)</label>
            <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} rows={2} style={{ ...styles.input, resize: 'vertical' }} />
          </div>
          <div style={styles.formActions}>
            <button type="submit" disabled={saving} style={styles.submitBtn}>{saving ? 'Saving...' : editing ? 'Update' : 'Add task'}</button>
            <button type="button" onClick={() => setShowForm(false)} style={styles.cancelBtn}>Cancel</button>
          </div>
        </form>
      )}

      {tasks.length === 0 ? (
        <div style={styles.empty}>No onboarding tasks for {activeBranch} yet.</div>
      ) : (
        <div style={styles.list}>
          {tasks.map((task, i) => (
            <div key={task.id} style={styles.card}>
              <div style={styles.orderBadge}>{task.sort_order}</div>
              <div style={{ flex: 1 }}>
                <div style={styles.cardTitle}>{task.title}</div>
                {task.description && <div style={styles.cardDesc}>{task.description}</div>}
              </div>
              <div style={styles.cardActions}>
                <button onClick={() => openEdit(task)} style={styles.editBtn}>Edit</button>
                <button onClick={() => handleDelete(task.id)} style={styles.deleteBtn}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

const styles = {
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' },
  title: { fontSize: '24px', fontWeight: '600', color: 'var(--white)' },
  addBtn: { padding: '10px 20px', background: 'var(--green)', color: 'var(--black)', border: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: '600' },
  tabs: { display: 'flex', gap: '4px', marginBottom: '20px' },
  tab: { padding: '8px 16px', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--dark-border)', borderRadius: '8px', color: 'var(--text-secondary)', fontSize: '13px', fontWeight: '500', cursor: 'pointer' },
  tabActive: { background: 'var(--green)', color: 'var(--black)', borderColor: 'var(--green)' },
  message: { padding: '10px 14px', background: 'rgba(55, 202, 55, 0.1)', border: '1px solid rgba(55, 202, 55, 0.2)', borderRadius: '8px', color: 'var(--green)', fontSize: '13px', marginBottom: '16px' },
  form: { padding: '24px', background: 'var(--dark-card)', border: '1px solid var(--dark-border)', borderRadius: '12px', marginBottom: '24px', display: 'flex', flexDirection: 'column', gap: '16px' },
  formTitle: { fontSize: '16px', fontWeight: '600', color: 'var(--white)' },
  formRow: { display: 'flex', gap: '12px' },
  field: { display: 'flex', flexDirection: 'column', gap: '6px' },
  label: { fontSize: '12px', fontWeight: '500', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' },
  input: { padding: '10px 12px', background: 'var(--dark)', border: '1px solid var(--dark-border)', borderRadius: '8px', color: 'var(--white)', fontSize: '14px', outline: 'none' },
  formActions: { display: 'flex', gap: '10px' },
  submitBtn: { padding: '12px 24px', background: 'var(--green)', color: 'var(--black)', border: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: '600' },
  cancelBtn: { padding: '12px 24px', background: 'transparent', border: '1px solid var(--dark-border)', borderRadius: '10px', color: 'var(--text-secondary)', fontSize: '14px' },
  empty: { padding: '24px', background: 'var(--dark-card)', border: '1px solid var(--dark-border)', borderRadius: '12px', color: 'var(--text-muted)', fontSize: '14px' },
  list: { display: 'flex', flexDirection: 'column', gap: '6px' },
  card: { display: 'flex', alignItems: 'center', gap: '14px', padding: '14px 18px', background: 'var(--dark-card)', border: '1px solid var(--dark-border)', borderRadius: '10px' },
  orderBadge: { width: '28px', height: '28px', borderRadius: '6px', background: 'rgba(255,255,255,0.06)', color: 'var(--text-muted)', fontSize: '12px', fontWeight: '600', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  cardTitle: { fontSize: '14px', fontWeight: '500', color: 'var(--white)' },
  cardDesc: { fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' },
  cardActions: { display: 'flex', gap: '6px', flexShrink: 0 },
  editBtn: { padding: '6px 12px', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--dark-border)', borderRadius: '6px', color: 'var(--text-secondary)', fontSize: '12px', cursor: 'pointer' },
  deleteBtn: { padding: '6px 12px', background: 'rgba(255,80,80,0.08)', border: '1px solid rgba(255,80,80,0.15)', borderRadius: '6px', color: '#ff5050', fontSize: '12px', cursor: 'pointer' },
}
