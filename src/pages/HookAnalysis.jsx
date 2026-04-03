import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'

const GREEN = 'var(--green)'
const CARD = 'var(--dark-card)'
const BORDER = 'var(--dark-border)'
const WHITE = 'var(--white)'
const MUTED = 'var(--text-muted)'
const SECONDARY = 'var(--text-secondary)'

const HOOK_TYPES = [
  { value: 'challenge-experiment', label: 'Challenge / Experiment', desc: 'Announces a specific challenge or experiment', example: '"I ate nothing but gas station food for 7 days..."' },
  { value: 'curiosity-question', label: 'Curiosity Question', desc: 'Asks a question that creates tension', example: '"Can you actually lose weight eating fast food?"' },
  { value: 'shock-surprise', label: 'Shock / Surprise Result', desc: 'Leads with an unexpected outcome', example: '"I lost 12 pounds in one week eating pizza every day."' },
  { value: 'transformation-tease', label: 'Transformation Tease', desc: 'Shows or references a body transformation', example: '"After losing 130 pounds, here\'s what I eat every single day."' },
  { value: 'direct-promise', label: 'Direct Promise', desc: 'States exactly what the viewer will get', example: '"I\'m going to show you exactly how to lose weight in your 20s."' },
  { value: 'myth-bust', label: 'Myth Bust', desc: 'Challenges a common belief', example: '"Everything you\'ve been told about dieting is wrong."' },
  { value: 'story-open', label: 'Story Open', desc: 'Starts with a personal story or moment', example: '"A year ago I was 300 pounds and couldn\'t walk up a flight of stairs."' },
]

const HOOK_COLORS = {
  'challenge-experiment': '#F97316',
  'curiosity-question': '#3B82F6',
  'shock-surprise': '#EF4444',
  'transformation-tease': '#EC4899',
  'direct-promise': '#10B981',
  'myth-bust': '#8B5CF6',
  'story-open': '#F59E0B',
}

function getRetentionColor(pct) {
  if (pct == null) return MUTED
  if (pct >= 70) return '#37CA37'
  if (pct >= 60) return '#3B82F6'
  if (pct >= 50) return '#F59E0B'
  return '#EF4444'
}

function RetentionBar({ value, label }) {
  if (value == null) return <span style={{ fontSize: 11, color: MUTED }}>--</span>
  const color = getRetentionColor(value)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
      <div style={{ width: 50, height: 6, background: 'var(--dark-border)', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ width: `${Math.min(value, 100)}%`, height: '100%', background: color, borderRadius: 3 }} />
      </div>
      <span style={{ fontSize: 12, fontWeight: 600, color }}>{value}%</span>
    </div>
  )
}

// ── ENTRY FORM MODAL ──
function HookForm({ entry, onSave, onClose }) {
  const { user } = useAuth()
  const [form, setForm] = useState(entry || {
    video_title: '', publish_date: '', hook_type: null, hook_text: '', hook_duration_seconds: null,
    visual_treatment: '', retention_10s: null, retention_30s: null, retention_60s: null,
    dropoff_point: '', assessment: '',
  })
  const [saving, setSaving] = useState(false)
  const [showGuide, setShowGuide] = useState(false)

  async function handleSave() {
    if (!form.video_title.trim()) return alert('Video title is required')
    setSaving(true)
    const payload = { ...form, updated_at: new Date().toISOString() }
    delete payload.id; delete payload.created_at; delete payload.created_by

    if (entry?.id) {
      await supabase.from('yt_hook_analysis').update(payload).eq('id', entry.id)
    } else {
      payload.created_by = user.id
      await supabase.from('yt_hook_analysis').insert(payload)
    }
    setSaving(false); onSave()
  }

  async function handleDelete() {
    if (!entry?.id || !confirm('Delete this entry?')) return
    await supabase.from('yt_hook_analysis').delete().eq('id', entry.id)
    onSave()
  }

  const f = (key, val) => setForm({ ...form, [key]: val })

  return (
    <div style={overlay} onClick={onClose}>
      <div style={{ ...modal, maxWidth: 720, maxHeight: '90vh', overflow: 'auto' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ fontSize: 18, fontWeight: 600, color: WHITE }}>{entry?.id ? 'Edit Hook Analysis' : 'Log Hook Analysis'}</h2>
          <button onClick={onClose} style={closeBtn}>&times;</button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12 }}>
          <div style={fieldGroup}>
            <label style={labelStyle}>Video Title *</label>
            <input style={inputStyle} value={form.video_title} onChange={e => f('video_title', e.target.value)} placeholder="Full title as on YouTube" />
          </div>
          <div style={fieldGroup}>
            <label style={labelStyle}>Publish Date</label>
            <input style={inputStyle} type="date" value={form.publish_date || ''} onChange={e => f('publish_date', e.target.value)} />
          </div>
        </div>

        {/* Hook Type Selection */}
        <div style={{ background: 'var(--dark)', border: `1px solid ${BORDER}`, borderRadius: 10, padding: 16, margin: '12px 0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: WHITE }}>Hook Type</span>
            <button onClick={() => setShowGuide(!showGuide)} style={{ background: 'transparent', border: 'none', color: '#3B82F6', fontSize: 12, cursor: 'pointer', textDecoration: 'underline' }}>
              {showGuide ? 'Hide guide' : 'Show hook type guide'}
            </button>
          </div>

          {showGuide && (
            <div style={{ marginBottom: 12, padding: 12, background: 'var(--dark-card)', borderRadius: 8 }}>
              {HOOK_TYPES.map(ht => (
                <div key={ht.value} style={{ padding: '6px 0', borderBottom: `1px solid ${BORDER}` }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: HOOK_COLORS[ht.value], flexShrink: 0 }} />
                    <span style={{ fontSize: 13, fontWeight: 600, color: WHITE }}>{ht.label}</span>
                  </div>
                  <div style={{ fontSize: 11, color: MUTED, marginLeft: 16 }}>{ht.desc}</div>
                  <div style={{ fontSize: 11, color: SECONDARY, marginLeft: 16, fontStyle: 'italic' }}>{ht.example}</div>
                </div>
              ))}
            </div>
          )}

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {HOOK_TYPES.map(ht => {
              const isSelected = form.hook_type === ht.value
              const color = HOOK_COLORS[ht.value]
              return (
                <button key={ht.value} onClick={() => f('hook_type', ht.value)} style={{
                  padding: '6px 12px', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                  border: isSelected ? `2px solid ${color}` : `1px solid ${BORDER}`,
                  background: isSelected ? color + '20' : 'var(--dark-card)',
                  color: isSelected ? color : MUTED,
                }}>{ht.label}</button>
              )
            })}
          </div>
        </div>

        <div style={fieldGroup}>
          <label style={labelStyle}>Hook Text (copy exact first 2-3 sentences from the script)</label>
          <textarea style={{ ...inputStyle, minHeight: 60 }} value={form.hook_text || ''} onChange={e => f('hook_text', e.target.value)}
            placeholder="Write the exact words from the start of the video..." />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div style={fieldGroup}>
            <label style={labelStyle}>Hook Duration (seconds)</label>
            <input style={inputStyle} type="number" value={form.hook_duration_seconds || ''} onChange={e => f('hook_duration_seconds', e.target.value ? parseInt(e.target.value) : null)}
              placeholder="When does the main content begin?" />
            <div style={{ fontSize: 11, color: MUTED, marginTop: 4 }}>Watch the video. Note the timestamp where the hook ends and the actual topic starts.</div>
          </div>
          <div style={fieldGroup}>
            <label style={labelStyle}>What was on screen during the hook?</label>
            <input style={inputStyle} value={form.visual_treatment || ''} onChange={e => f('visual_treatment', e.target.value)}
              placeholder="Talking head, B-roll, overlays, transformation clip..." />
          </div>
        </div>

        {/* Retention Data */}
        <div style={{ background: 'var(--dark)', border: `1px solid ${BORDER}`, borderRadius: 10, padding: 16, margin: '12px 0' }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: WHITE, marginBottom: 4 }}>Retention Data</div>
          <p style={{ fontSize: 11, color: MUTED, marginBottom: 12, lineHeight: 1.5 }}>
            YouTube Studio &gt; click video &gt; Analytics &gt; Engagement tab &gt; hover over the retention graph at each timestamp.
            <br />70%+ at 30s = hook is working. Below 60% = something is wrong.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 12 }}>
            <div style={fieldGroup}>
              <label style={labelStyle}>Retention at 10s</label>
              <input style={inputStyle} type="number" step="0.1" value={form.retention_10s || ''} onChange={e => f('retention_10s', e.target.value ? parseFloat(e.target.value) : null)} placeholder="%" />
            </div>
            <div style={fieldGroup}>
              <label style={labelStyle}>Retention at 30s</label>
              <input style={inputStyle} type="number" step="0.1" value={form.retention_30s || ''} onChange={e => f('retention_30s', e.target.value ? parseFloat(e.target.value) : null)} placeholder="%" />
            </div>
            <div style={fieldGroup}>
              <label style={labelStyle}>Retention at 60s</label>
              <input style={inputStyle} type="number" step="0.1" value={form.retention_60s || ''} onChange={e => f('retention_60s', e.target.value ? parseFloat(e.target.value) : null)} placeholder="%" />
            </div>
            <div style={fieldGroup}>
              <label style={labelStyle}>Sharp drop-off point</label>
              <input style={inputStyle} value={form.dropoff_point || ''} onChange={e => f('dropoff_point', e.target.value)} placeholder="e.g. 0:45 or No drop" />
            </div>
          </div>

          {(form.retention_10s || form.retention_30s || form.retention_60s) && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: 24, marginTop: 12, padding: '12px 0', background: 'var(--dark-card)', borderRadius: 6 }}>
              {[{ label: '10s', val: form.retention_10s }, { label: '30s', val: form.retention_30s }, { label: '60s', val: form.retention_60s }].map(p => (
                <div key={p.label} style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 11, color: MUTED, marginBottom: 4 }}>{p.label}</div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: getRetentionColor(p.val) }}>{p.val != null ? `${p.val}%` : '--'}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={fieldGroup}>
          <label style={labelStyle}>Did this hook work? Why or why not? (1-2 sentences)</label>
          <textarea style={{ ...inputStyle, minHeight: 60 }} value={form.assessment || ''} onChange={e => f('assessment', e.target.value)}
            placeholder="Use the retention numbers to support your answer. What would you change?" />
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 16, paddingTop: 16, borderTop: `1px solid ${BORDER}` }}>
          <div>{entry?.id && <button onClick={handleDelete} style={{ ...btnStyle, background: '#EF444418', color: '#EF4444', border: '1px solid #EF444440' }}>Delete</button>}</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={onClose} style={{ ...btnStyle, background: 'transparent', color: SECONDARY, border: `1px solid ${BORDER}` }}>Cancel</button>
            <button onClick={handleSave} disabled={saving} style={{ ...btnStyle, background: GREEN, color: '#000', fontWeight: 600 }}>
              {saving ? 'Saving...' : entry?.id ? 'Update' : 'Log Hook'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── MAIN COMPONENT ──
export default function HookAnalysis() {
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [showInsights, setShowInsights] = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const { data } = await supabase.from('yt_hook_analysis').select('*').order('publish_date', { ascending: false })
    setEntries(data || [])
    setLoading(false)
  }

  // Stats
  const stats = useMemo(() => {
    const with30s = entries.filter(e => e.retention_30s != null)
    return {
      total: entries.length,
      avgRetention30s: with30s.length ? (with30s.reduce((s, e) => s + e.retention_30s, 0) / with30s.length).toFixed(1) : '--',
      above70: with30s.filter(e => e.retention_30s >= 70).length,
      below60: with30s.filter(e => e.retention_30s < 60).length,
    }
  }, [entries])

  // Hook type performance breakdown
  const hookTypeStats = useMemo(() => {
    const byType = {}
    entries.forEach(e => {
      if (!e.hook_type || e.retention_30s == null) return
      if (!byType[e.hook_type]) byType[e.hook_type] = { total: 0, sum30s: 0, count: 0 }
      byType[e.hook_type].total++
      byType[e.hook_type].sum30s += e.retention_30s
      byType[e.hook_type].count++
    })
    return Object.entries(byType).map(([type, data]) => ({
      type,
      label: HOOK_TYPES.find(h => h.value === type)?.label || type,
      color: HOOK_COLORS[type] || MUTED,
      count: data.total,
      avgRetention: (data.sum30s / data.count).toFixed(1),
    })).sort((a, b) => parseFloat(b.avgRetention) - parseFloat(a.avgRetention))
  }, [entries])

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: WHITE, margin: 0 }}>Hook Analysis Log</h1>
          <p style={{ fontSize: 13, color: MUTED, marginTop: 4 }}>Track which hook styles keep viewers watching. Build a performance database that compounds.</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {hookTypeStats.length >= 2 && (
            <button onClick={() => setShowInsights(!showInsights)} style={{ ...btnStyle, background: CARD, color: SECONDARY, border: `1px solid ${BORDER}` }}>
              {showInsights ? 'Hide' : 'Show'} Hook Rankings
            </button>
          )}
          <button onClick={() => { setEditing(null); setShowForm(true) }} style={{ ...btnStyle, background: GREEN, color: '#000', fontWeight: 600, fontSize: 14, padding: '10px 20px' }}>
            + Log Hook
          </button>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
        <div style={statCard}>
          <div style={{ fontSize: 28, fontWeight: 700, color: WHITE }}>{stats.total}</div>
          <div style={{ fontSize: 12, color: MUTED }}>Hooks Logged</div>
        </div>
        <div style={statCard}>
          <div style={{ fontSize: 28, fontWeight: 700, color: getRetentionColor(parseFloat(stats.avgRetention30s)) }}>{stats.avgRetention30s}%</div>
          <div style={{ fontSize: 12, color: MUTED }}>Avg Retention at 30s</div>
        </div>
        <div style={statCard}>
          <div style={{ fontSize: 28, fontWeight: 700, color: '#37CA37' }}>{stats.above70}</div>
          <div style={{ fontSize: 12, color: MUTED }}>Hooks Above 70%</div>
        </div>
        <div style={statCard}>
          <div style={{ fontSize: 28, fontWeight: 700, color: '#EF4444' }}>{stats.below60}</div>
          <div style={{ fontSize: 12, color: MUTED }}>Hooks Below 60%</div>
        </div>
      </div>

      {/* Hook Type Rankings */}
      {showInsights && hookTypeStats.length > 0 && (
        <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 10, padding: 20, marginBottom: 20 }}>
          <h3 style={{ fontSize: 15, fontWeight: 600, color: WHITE, marginBottom: 4 }}>Hook Type Performance Rankings</h3>
          <p style={{ fontSize: 12, color: MUTED, marginBottom: 16 }}>Sorted by average retention at 30 seconds. More data = more reliable rankings.</p>
          {hookTypeStats.map((ht, i) => (
            <div key={ht.type} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: i < hookTypeStats.length - 1 ? `1px solid ${BORDER}` : 'none' }}>
              <span style={{ fontSize: 16, fontWeight: 700, color: MUTED, width: 24 }}>#{i + 1}</span>
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: ht.color, flexShrink: 0 }} />
              <span style={{ flex: 1, fontSize: 14, fontWeight: 600, color: WHITE }}>{ht.label}</span>
              <span style={{ fontSize: 12, color: MUTED }}>{ht.count} video{ht.count !== 1 ? 's' : ''}</span>
              <span style={{ fontSize: 18, fontWeight: 700, color: getRetentionColor(parseFloat(ht.avgRetention)), minWidth: 60, textAlign: 'right' }}>
                {ht.avgRetention}%
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: MUTED }}>Loading...</div>
      ) : entries.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 40, color: MUTED }}>No hooks logged yet. Click "+ Log Hook" after publishing a video.</div>
      ) : (
        <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 10, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                  <th style={{ ...thStyle, textAlign: 'left', minWidth: 180 }}>Video</th>
                  <th style={thStyle}>Date</th>
                  <th style={{ ...thStyle, minWidth: 120 }}>Hook Type</th>
                  <th style={thStyle}>Duration</th>
                  <th style={thStyle}>10s</th>
                  <th style={thStyle}>30s</th>
                  <th style={thStyle}>60s</th>
                  <th style={thStyle}>Drop-off</th>
                  <th style={{ ...thStyle, textAlign: 'left', minWidth: 180 }}>Assessment</th>
                </tr>
              </thead>
              <tbody>
                {entries.map(e => {
                  const htColor = HOOK_COLORS[e.hook_type] || MUTED
                  const htLabel = HOOK_TYPES.find(h => h.value === e.hook_type)?.label || e.hook_type || '--'
                  return (
                    <tr key={e.id} style={{ borderBottom: `1px solid ${BORDER}`, cursor: 'pointer' }}
                      onClick={() => { setEditing(e); setShowForm(true) }}
                      onMouseEnter={ev => ev.currentTarget.style.background = 'var(--dark-light)'}
                      onMouseLeave={ev => ev.currentTarget.style.background = 'transparent'}>
                      <td style={{ ...tdStyle, textAlign: 'left', fontWeight: 600, color: WHITE }}>{e.video_title}</td>
                      <td style={tdStyle}>{e.publish_date ? new Date(e.publish_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '--'}</td>
                      <td style={tdStyle}>
                        <span style={{ padding: '3px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600, background: htColor + '18', color: htColor, border: `1px solid ${htColor}40` }}>
                          {htLabel}
                        </span>
                      </td>
                      <td style={tdStyle}>{e.hook_duration_seconds ? `${e.hook_duration_seconds}s` : '--'}</td>
                      <td style={tdStyle}><RetentionBar value={e.retention_10s} /></td>
                      <td style={tdStyle}><RetentionBar value={e.retention_30s} /></td>
                      <td style={tdStyle}><RetentionBar value={e.retention_60s} /></td>
                      <td style={{ ...tdStyle, fontSize: 12, color: e.dropoff_point ? '#F59E0B' : MUTED }}>{e.dropoff_point || '--'}</td>
                      <td style={{ ...tdStyle, textAlign: 'left', fontSize: 12, color: SECONDARY, maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {e.assessment || '--'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showForm && (
        <HookForm entry={editing} onSave={() => { setShowForm(false); setEditing(null); load() }} onClose={() => { setShowForm(false); setEditing(null) }} />
      )}
    </div>
  )
}

// ── STYLES ──
const overlay = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }
const modal = { background: 'var(--dark-card)', border: '1px solid var(--dark-border)', borderRadius: 12, padding: 24, width: '95%', color: 'var(--white)' }
const closeBtn = { background: 'transparent', border: 'none', color: 'var(--text-muted)', fontSize: 24, cursor: 'pointer', padding: 4 }
const fieldGroup = { marginBottom: 12 }
const labelStyle = { display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4 }
const inputStyle = { width: '100%', padding: '8px 12px', background: 'var(--dark)', border: '1px solid var(--dark-border)', borderRadius: 6, color: 'var(--white)', fontSize: 13, fontFamily: 'Outfit, Arial, sans-serif', outline: 'none' }
const btnStyle = { padding: '8px 16px', borderRadius: 6, border: 'none', fontSize: 13, cursor: 'pointer', fontFamily: 'Outfit, Arial, sans-serif' }
const statCard = { background: 'var(--dark-card)', border: '1px solid var(--dark-border)', borderRadius: 10, padding: '16px 20px' }
const thStyle = { padding: '10px 12px', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: 'center', whiteSpace: 'nowrap' }
const tdStyle = { padding: '10px 12px', textAlign: 'center', verticalAlign: 'middle' }
