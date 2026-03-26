import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function AdminSOPs() {
  const [sops, setSops] = useState([])
  const [branches, setBranches] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ title: '', description: '', category: '', loom_url: '', doc_url: '', branch_slugs: [] })
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    fetchSOPs()
    fetchBranches()
  }, [])

  async function fetchSOPs() {
    const { data } = await supabase.from('sops').select('*').order('category').order('title')
    setSops(data || [])
  }

  async function fetchBranches() {
    const { data } = await supabase.from('branches').select('*').order('name')
    setBranches(data || [])
  }

  function openNew() {
    setEditing(null)
    setForm({ title: '', description: '', category: '', loom_url: '', doc_url: '', branch_slugs: [] })
    setShowForm(true)
    setMessage('')
  }

  function openEdit(sop) {
    setEditing(sop.id)
    setForm({
      title: sop.title || '',
      description: sop.description || '',
      category: sop.category || '',
      loom_url: sop.loom_url || '',
      doc_url: sop.doc_url || '',
      branch_slugs: sop.branch_slugs || [],
    })
    setShowForm(true)
    setMessage('')
  }

  function toggleBranch(slug) {
    setForm(prev => ({
      ...prev,
      branch_slugs: prev.branch_slugs.includes(slug)
        ? prev.branch_slugs.filter(s => s !== slug)
        : [...prev.branch_slugs, slug],
    }))
  }

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    try {
      if (editing) {
        const { error } = await supabase.from('sops').update({
          title: form.title,
          description: form.description,
          category: form.category,
          loom_url: form.loom_url,
          doc_url: form.doc_url,
          branch_slugs: form.branch_slugs,
          updated_at: new Date().toISOString(),
        }).eq('id', editing)
        if (error) throw error
        setMessage('SOP updated.')
      } else {
        const { error } = await supabase.from('sops').insert({
          title: form.title,
          description: form.description,
          category: form.category,
          loom_url: form.loom_url,
          doc_url: form.doc_url,
          branch_slugs: form.branch_slugs,
        })
        if (error) throw error
        setMessage('SOP created.')
      }
      setShowForm(false)
      setEditing(null)
      fetchSOPs()
    } catch (err) {
      setMessage('Error: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id) {
    if (!confirm('Delete this SOP?')) return
    await supabase.from('sops').delete().eq('id', id)
    fetchSOPs()
    setMessage('SOP deleted.')
  }

  const grouped = sops.reduce((acc, sop) => {
    const cat = sop.category || 'General'
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(sop)
    return acc
  }, {})

  return (
    <div>
      <div style={styles.header}>
        <h1 style={styles.title}>SOP manager</h1>
        <button onClick={openNew} style={styles.addBtn}>+ Add SOP</button>
      </div>

      {message && <div style={styles.message}>{message}</div>}

      {showForm && (
        <form onSubmit={handleSave} style={styles.form}>
          <div style={styles.formTitle}>{editing ? 'Edit SOP' : 'New SOP'}</div>
          <div style={styles.formRow}>
            <div style={styles.field}>
              <label style={styles.label}>Title</label>
              <input type="text" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} required style={styles.input} />
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Category</label>
              <input type="text" value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))} placeholder="e.g. Editing, Publishing, General" style={styles.input} />
            </div>
          </div>
          <div style={styles.field}>
            <label style={styles.label}>Description</label>
            <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} rows={2} style={{ ...styles.input, resize: 'vertical' }} />
          </div>
          <div style={styles.formRow}>
            <div style={styles.field}>
              <label style={styles.label}>Loom URL</label>
              <input type="url" value={form.loom_url} onChange={e => setForm(p => ({ ...p, loom_url: e.target.value }))} placeholder="https://loom.com/share/..." style={styles.input} />
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Google Doc URL</label>
              <input type="url" value={form.doc_url} onChange={e => setForm(p => ({ ...p, doc_url: e.target.value }))} placeholder="https://docs.google.com/..." style={styles.input} />
            </div>
          </div>
          <div style={styles.field}>
            <label style={styles.label}>Assign to branches</label>
            <div style={styles.branchPicker}>
              {branches.map(b => (
                <label key={b.id} style={styles.branchOption}>
                  <input type="checkbox" checked={form.branch_slugs.includes(b.slug)} onChange={() => toggleBranch(b.slug)} />
                  <span>{b.name}</span>
                </label>
              ))}
            </div>
          </div>
          <div style={styles.formActions}>
            <button type="submit" disabled={saving} style={styles.submitBtn}>{saving ? 'Saving...' : editing ? 'Update SOP' : 'Create SOP'}</button>
            <button type="button" onClick={() => setShowForm(false)} style={styles.cancelBtn}>Cancel</button>
          </div>
        </form>
      )}

      {Object.keys(grouped).length === 0 ? (
        <div style={styles.empty}>No SOPs yet. Click "+ Add SOP" to create one.</div>
      ) : (
        Object.entries(grouped).map(([category, items]) => (
          <div key={category} style={{ marginBottom: '24px' }}>
            <h3 style={styles.catLabel}>{category}</h3>
            <div style={styles.list}>
              {items.map(sop => (
                <div key={sop.id} style={styles.card}>
                  <div style={{ flex: 1 }}>
                    <div style={styles.cardTitle}>{sop.title}</div>
                    {sop.description && <div style={styles.cardDesc}>{sop.description}</div>}
                    <div style={styles.cardMeta}>
                      {sop.branch_slugs?.map(s => (
                        <span key={s} style={styles.badge}>{s}</span>
                      ))}
                      {sop.loom_url && <a href={sop.loom_url} target="_blank" rel="noopener noreferrer" style={styles.link}>Loom</a>}
                      {sop.doc_url && <a href={sop.doc_url} target="_blank" rel="noopener noreferrer" style={styles.link}>Doc</a>}
                    </div>
                  </div>
                  <div style={styles.cardActions}>
                    <button onClick={() => openEdit(sop)} style={styles.editBtn}>Edit</button>
                    <button onClick={() => handleDelete(sop.id)} style={styles.deleteBtn}>Delete</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))
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
  formRow: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' },
  field: { display: 'flex', flexDirection: 'column', gap: '6px' },
  label: { fontSize: '12px', fontWeight: '500', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' },
  input: { padding: '10px 12px', background: 'var(--dark)', border: '1px solid var(--dark-border)', borderRadius: '8px', color: 'var(--white)', fontSize: '14px', outline: 'none' },
  branchPicker: { display: 'flex', gap: '16px', flexWrap: 'wrap' },
  branchOption: { display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', color: 'var(--text-secondary)', cursor: 'pointer' },
  formActions: { display: 'flex', gap: '10px' },
  submitBtn: { padding: '12px 24px', background: 'var(--green)', color: 'var(--black)', border: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: '600' },
  cancelBtn: { padding: '12px 24px', background: 'transparent', border: '1px solid var(--dark-border)', borderRadius: '10px', color: 'var(--text-secondary)', fontSize: '14px' },
  empty: { padding: '24px', background: 'var(--dark-card)', border: '1px solid var(--dark-border)', borderRadius: '12px', color: 'var(--text-muted)', fontSize: '14px' },
  catLabel: { fontSize: '13px', fontWeight: '600', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px' },
  list: { display: 'flex', flexDirection: 'column', gap: '6px' },
  card: { display: 'flex', alignItems: 'flex-start', gap: '14px', padding: '16px 20px', background: 'var(--dark-card)', border: '1px solid var(--dark-border)', borderRadius: '10px' },
  cardTitle: { fontSize: '14px', fontWeight: '500', color: 'var(--white)', marginBottom: '4px' },
  cardDesc: { fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '8px' },
  cardMeta: { display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' },
  badge: { padding: '2px 8px', background: 'rgba(255,255,255,0.04)', borderRadius: '4px', fontSize: '11px', color: 'var(--text-muted)' },
  link: { fontSize: '12px', fontWeight: '500', color: 'var(--green)', textDecoration: 'none' },
  cardActions: { display: 'flex', gap: '6px', flexShrink: 0 },
  editBtn: { padding: '6px 12px', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--dark-border)', borderRadius: '6px', color: 'var(--text-secondary)', fontSize: '12px', cursor: 'pointer' },
  deleteBtn: { padding: '6px 12px', background: 'rgba(255,80,80,0.08)', border: '1px solid rgba(255,80,80,0.15)', borderRadius: '6px', color: '#ff5050', fontSize: '12px', cursor: 'pointer' },
}
