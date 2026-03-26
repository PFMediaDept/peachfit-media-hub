import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

function AdminSection({ table, title, fields, fetchOrder }) {
  const [items, setItems] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({})
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => { fetchItems() }, [])

  async function fetchItems() {
    let query = supabase.from(table).select('*')
    if (fetchOrder) fetchOrder.forEach(o => { query = query.order(o) })
    const { data } = await query
    setItems(data || [])
  }

  function blankForm() {
    const obj = {}
    fields.forEach(f => { obj[f.key] = f.default || '' })
    return obj
  }

  function openNew() {
    setEditing(null)
    setForm(blankForm())
    setShowForm(true)
    setMessage('')
  }

  function openEdit(item) {
    setEditing(item.id)
    const obj = {}
    fields.forEach(f => { obj[f.key] = item[f.key] ?? f.default ?? '' })
    setForm(obj)
    setShowForm(true)
    setMessage('')
  }

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    try {
      if (editing) {
        const { error } = await supabase.from(table).update(form).eq('id', editing)
        if (error) throw error
        setMessage('Updated.')
      } else {
        const { error } = await supabase.from(table).insert(form)
        if (error) throw error
        setMessage('Created.')
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
    if (!confirm('Delete this item?')) return
    await supabase.from(table).delete().eq('id', id)
    fetchItems()
    setMessage('Deleted.')
  }

  return (
    <div style={{ marginBottom: '40px' }}>
      <div style={styles.sectionHeader}>
        <h2 style={styles.sectionTitle}>{title}</h2>
        <button onClick={openNew} style={styles.addBtn}>+ Add</button>
      </div>

      {message && <div style={styles.message}>{message}</div>}

      {showForm && (
        <form onSubmit={handleSave} style={styles.form}>
          {fields.map(f => (
            <div key={f.key} style={styles.field}>
              <label style={styles.label}>{f.label}</label>
              {f.type === 'textarea' ? (
                <textarea value={form[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))} rows={3} style={{ ...styles.input, resize: 'vertical' }} />
              ) : (
                <input type={f.type || 'text'} value={form[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: f.type === 'number' ? parseInt(e.target.value) || 0 : e.target.value }))} required={f.required} style={styles.input} />
              )}
            </div>
          ))}
          <div style={styles.formActions}>
            <button type="submit" disabled={saving} style={styles.submitBtn}>{saving ? 'Saving...' : editing ? 'Update' : 'Create'}</button>
            <button type="button" onClick={() => setShowForm(false)} style={styles.cancelBtn}>Cancel</button>
          </div>
        </form>
      )}

      {items.length === 0 ? (
        <div style={styles.empty}>None yet.</div>
      ) : (
        <div style={styles.list}>
          {items.map(item => (
            <div key={item.id} style={styles.card}>
              <div style={{ flex: 1 }}>
                <div style={styles.cardTitle}>{item[fields[0].key]}</div>
                {fields[1] && item[fields[1].key] && (
                  <div style={styles.cardDesc}>{String(item[fields[1].key]).substring(0, 120)}{String(item[fields[1].key]).length > 120 ? '...' : ''}</div>
                )}
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

function BranchSettings() {
  const [settings, setSettings] = useState([])
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    supabase.from('branch_settings').select('*, branches!branch_settings_branch_slug_fkey(name)')
      .then(({ data }) => setSettings(data || []))
  }, [])

  async function handleSave(slug, url) {
    setSaving(true)
    const { error } = await supabase.from('branch_settings').update({ clickup_embed_url: url, updated_at: new Date().toISOString() }).eq('branch_slug', slug)
    if (error) setMessage('Error: ' + error.message)
    else setMessage('Saved.')
    setSaving(false)
  }

  return (
    <div style={{ marginBottom: '40px' }}>
      <h2 style={styles.sectionTitle}>ClickUp pipeline embeds</h2>
      <p style={styles.sectionDesc}>Set the ClickUp embed URL for each branch pipeline view.</p>
      {message && <div style={styles.message}>{message}</div>}
      <div style={styles.list}>
        {settings.map(s => (
          <div key={s.id} style={styles.settingCard}>
            <div style={styles.settingLabel}>{s.branches?.name || s.branch_slug}</div>
            <input
              type="url"
              defaultValue={s.clickup_embed_url || ''}
              placeholder="https://sharing.clickup.com/..."
              style={{ ...styles.input, flex: 1 }}
              onBlur={e => handleSave(s.branch_slug, e.target.value)}
            />
          </div>
        ))}
      </div>
    </div>
  )
}

export default function AdminSettings() {
  return (
    <div>
      <h1 style={styles.title}>Admin settings</h1>

      <BranchSettings />

      <AdminSection
        table="quick_links"
        title="Quick links"
        fields={[
          { key: 'title', label: 'Title', required: true },
          { key: 'description', label: 'Description' },
          { key: 'category', label: 'Category', default: 'General' },
          { key: 'url', label: 'URL', type: 'url', required: true },
        ]}
        fetchOrder={['category', 'title']}
      />

      <AdminSection
        table="brand_assets"
        title="Brand assets"
        fields={[
          { key: 'title', label: 'Title', required: true },
          { key: 'description', label: 'Description' },
          { key: 'category', label: 'Category', default: 'General' },
          { key: 'url', label: 'URL', type: 'url' },
        ]}
        fetchOrder={['category', 'title']}
      />

      <AdminSection
        table="standards"
        title="Department standards"
        fields={[
          { key: 'title', label: 'Title', required: true },
          { key: 'body', label: 'Body', type: 'textarea' },
          { key: 'sort_order', label: 'Sort order', type: 'number', default: 0 },
        ]}
        fetchOrder={['sort_order']}
      />
    </div>
  )
}

const styles = {
  title: { fontSize: '24px', fontWeight: '600', color: 'var(--white)', marginBottom: '32px' },
  sectionHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' },
  sectionTitle: { fontSize: '18px', fontWeight: '600', color: 'var(--white)' },
  sectionDesc: { fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px', marginTop: '4px' },
  addBtn: { padding: '8px 16px', background: 'var(--green)', color: 'var(--black)', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: '600' },
  message: { padding: '10px 14px', background: 'rgba(55, 202, 55, 0.1)', border: '1px solid rgba(55, 202, 55, 0.2)', borderRadius: '8px', color: 'var(--green)', fontSize: '13px', marginBottom: '16px' },
  form: { padding: '24px', background: 'var(--dark-card)', border: '1px solid var(--dark-border)', borderRadius: '12px', marginBottom: '16px', display: 'flex', flexDirection: 'column', gap: '14px' },
  field: { display: 'flex', flexDirection: 'column', gap: '6px' },
  label: { fontSize: '12px', fontWeight: '500', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' },
  input: { padding: '10px 12px', background: 'var(--dark)', border: '1px solid var(--dark-border)', borderRadius: '8px', color: 'var(--white)', fontSize: '14px', outline: 'none' },
  formActions: { display: 'flex', gap: '10px' },
  submitBtn: { padding: '10px 20px', background: 'var(--green)', color: 'var(--black)', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: '600' },
  cancelBtn: { padding: '10px 20px', background: 'transparent', border: '1px solid var(--dark-border)', borderRadius: '8px', color: 'var(--text-secondary)', fontSize: '13px' },
  empty: { padding: '20px', background: 'var(--dark-card)', border: '1px solid var(--dark-border)', borderRadius: '10px', color: 'var(--text-muted)', fontSize: '13px' },
  list: { display: 'flex', flexDirection: 'column', gap: '6px' },
  card: { display: 'flex', alignItems: 'center', gap: '14px', padding: '14px 18px', background: 'var(--dark-card)', border: '1px solid var(--dark-border)', borderRadius: '10px' },
  cardTitle: { fontSize: '14px', fontWeight: '500', color: 'var(--white)' },
  cardDesc: { fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' },
  cardActions: { display: 'flex', gap: '6px', flexShrink: 0 },
  editBtn: { padding: '6px 12px', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--dark-border)', borderRadius: '6px', color: 'var(--text-secondary)', fontSize: '12px', cursor: 'pointer' },
  deleteBtn: { padding: '6px 12px', background: 'rgba(255,80,80,0.08)', border: '1px solid rgba(255,80,80,0.15)', borderRadius: '6px', color: '#ff5050', fontSize: '12px', cursor: 'pointer' },
  settingCard: { display: 'flex', alignItems: 'center', gap: '14px', padding: '14px 18px', background: 'var(--dark-card)', border: '1px solid var(--dark-border)', borderRadius: '10px' },
  settingLabel: { fontSize: '14px', fontWeight: '500', color: 'var(--white)', width: '120px', flexShrink: 0 },
}
