import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'

const GREEN = 'var(--green)'
const CARD = 'var(--dark-card)'
const BORDER = 'var(--dark-border)'
const WHITE = 'var(--white)'
const MUTED = 'var(--text-muted)'
const SECONDARY = 'var(--text-secondary)'

function getCtrColor(ctr) {
  if (ctr == null) return MUTED
  if (ctr >= 7) return '#37CA37'
  if (ctr >= 5) return '#3B82F6'
  if (ctr >= 3) return '#F59E0B'
  return '#EF4444'
}

// ── ENTRY FORM MODAL ──
function ThumbnailForm({ entry, onSave, onClose }) {
  const { user } = useAuth()
  const [form, setForm] = useState(entry || {
    video_title: '', publish_date: '', thumbnail_a: '', thumbnail_b: '', thumbnail_c: '',
    initial_pick: null, pick_reason: '', ab_test_run: false, ab_test_variants: '',
    winner: null, winning_ctr: null, losing_ctr_1: null, losing_ctr_2: null, takeaway: '',
  })
  const [saving, setSaving] = useState(false)

  const ctrDelta = (form.winning_ctr && form.losing_ctr_1)
    ? (parseFloat(form.winning_ctr) - parseFloat(form.losing_ctr_1)).toFixed(2)
    : null

  async function handleSave() {
    if (!form.video_title.trim()) return alert('Video title is required')
    setSaving(true)
    const payload = {
      ...form,
      ctr_delta: ctrDelta ? parseFloat(ctrDelta) : null,
      updated_at: new Date().toISOString(),
    }
    delete payload.id; delete payload.created_at; delete payload.created_by

    if (entry?.id) {
      await supabase.from('yt_thumbnail_tests').update(payload).eq('id', entry.id)
    } else {
      payload.created_by = user.id
      await supabase.from('yt_thumbnail_tests').insert(payload)
    }
    setSaving(false); onSave()
  }

  async function handleDelete() {
    if (!entry?.id || !confirm('Delete this entry?')) return
    await supabase.from('yt_thumbnail_tests').delete().eq('id', entry.id)
    onSave()
  }

  const f = (key, val) => setForm({ ...form, [key]: val })

  return (
    <div style={overlay} onClick={onClose}>
      <div style={{ ...modal, maxWidth: 700, maxHeight: '90vh', overflow: 'auto' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ fontSize: 18, fontWeight: 600, color: WHITE }}>{entry?.id ? 'Edit Thumbnail Test' : 'Log Thumbnail Test'}</h2>
          <button onClick={onClose} style={closeBtn}>&times;</button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12 }}>
          <div style={fieldGroup}>
            <label style={labelStyle}>Video Title *</label>
            <input style={inputStyle} value={form.video_title} onChange={e => f('video_title', e.target.value)} placeholder="Full title as it appears on YouTube" />
          </div>
          <div style={fieldGroup}>
            <label style={labelStyle}>Publish Date</label>
            <input style={inputStyle} type="date" value={form.publish_date || ''} onChange={e => f('publish_date', e.target.value)} />
          </div>
        </div>

        {/* Thumbnail Descriptions */}
        <div style={{ background: 'var(--dark)', border: `1px solid ${BORDER}`, borderRadius: 10, padding: 16, margin: '16px 0' }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: WHITE, marginBottom: 12 }}>Thumbnail Descriptions</div>
          <p style={{ fontSize: 11, color: MUTED, marginBottom: 12, lineHeight: 1.5 }}>
            Describe each thumbnail in detail: layout, text overlay, facial expression, colors, main visual element. Be specific enough that someone who didn't see it could picture it.
          </p>
          {['a', 'b', 'c'].map(letter => (
            <div key={letter} style={{ ...fieldGroup, marginBottom: 10 }}>
              <label style={{ ...labelStyle, display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{
                  width: 22, height: 22, borderRadius: 4, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 12, fontWeight: 700, background: form.winner === letter ? '#37CA3720' : 'var(--dark-card)',
                  color: form.winner === letter ? '#37CA37' : MUTED, border: `1px solid ${form.winner === letter ? '#37CA3740' : BORDER}`,
                }}>{letter.toUpperCase()}</span>
                Thumbnail {letter.toUpperCase()} {form.winner === letter && <span style={{ fontSize: 10, color: '#37CA37' }}>WINNER</span>}
              </label>
              <textarea style={{ ...inputStyle, minHeight: 50, fontSize: 12 }} value={form[`thumbnail_${letter}`] || ''}
                onChange={e => f(`thumbnail_${letter}`, e.target.value)}
                placeholder="Layout, text, expression, colors, key visual element..." />
            </div>
          ))}
        </div>

        {/* Selection and Testing */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div style={fieldGroup}>
            <label style={labelStyle}>Which one did you pick first?</label>
            <div style={{ display: 'flex', gap: 6 }}>
              {['a', 'b', 'c'].map(l => (
                <button key={l} onClick={() => f('initial_pick', l)} style={{
                  flex: 1, padding: '8px 0', borderRadius: 6, fontSize: 14, fontWeight: 700, cursor: 'pointer',
                  border: form.initial_pick === l ? '2px solid #3B82F6' : `1px solid ${BORDER}`,
                  background: form.initial_pick === l ? '#3B82F620' : 'var(--dark)',
                  color: form.initial_pick === l ? '#3B82F6' : MUTED,
                }}>{l.toUpperCase()}</button>
              ))}
            </div>
          </div>
          <div style={fieldGroup}>
            <label style={labelStyle}>Which one won?</label>
            <div style={{ display: 'flex', gap: 6 }}>
              {['a', 'b', 'c'].map(l => (
                <button key={l} onClick={() => f('winner', l)} style={{
                  flex: 1, padding: '8px 0', borderRadius: 6, fontSize: 14, fontWeight: 700, cursor: 'pointer',
                  border: form.winner === l ? '2px solid #37CA37' : `1px solid ${BORDER}`,
                  background: form.winner === l ? '#37CA3720' : 'var(--dark)',
                  color: form.winner === l ? '#37CA37' : MUTED,
                }}>{l.toUpperCase()}</button>
              ))}
            </div>
          </div>
        </div>

        <div style={fieldGroup}>
          <label style={labelStyle}>Why did you pick that one initially? (1 sentence)</label>
          <input style={inputStyle} value={form.pick_reason || ''} onChange={e => f('pick_reason', e.target.value)} placeholder="What made you choose it?" />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div style={fieldGroup}>
            <label style={labelStyle}>YouTube A/B Test Run?</label>
            <div style={{ display: 'flex', gap: 6 }}>
              {[true, false].map(v => (
                <button key={String(v)} onClick={() => f('ab_test_run', v)} style={{
                  flex: 1, padding: '8px 0', borderRadius: 6, fontSize: 13, cursor: 'pointer',
                  border: form.ab_test_run === v ? `2px solid ${GREEN}` : `1px solid ${BORDER}`,
                  background: form.ab_test_run === v ? 'rgba(55,202,55,0.1)' : 'var(--dark)',
                  color: form.ab_test_run === v ? GREEN : MUTED,
                }}>{v ? 'Yes' : 'No'}</button>
              ))}
            </div>
          </div>
          {form.ab_test_run && (
            <div style={fieldGroup}>
              <label style={labelStyle}>Which two were tested?</label>
              <input style={inputStyle} value={form.ab_test_variants || ''} onChange={e => f('ab_test_variants', e.target.value)} placeholder="e.g. A vs B" />
            </div>
          )}
        </div>

        {/* CTR Data */}
        <div style={{ background: 'var(--dark)', border: `1px solid ${BORDER}`, borderRadius: 10, padding: 16, margin: '16px 0' }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: WHITE, marginBottom: 4 }}>CTR Results</div>
          <p style={{ fontSize: 11, color: MUTED, marginBottom: 12 }}>
            YouTube Studio &gt; click video &gt; Analytics &gt; Reach tab &gt; "Impressions click-through rate"
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            <div style={fieldGroup}>
              <label style={labelStyle}>Winning CTR %</label>
              <input style={inputStyle} type="number" step="0.01" value={form.winning_ctr || ''} onChange={e => f('winning_ctr', e.target.value ? parseFloat(e.target.value) : null)} placeholder="e.g. 6.8" />
            </div>
            <div style={fieldGroup}>
              <label style={labelStyle}>Runner-up CTR %</label>
              <input style={inputStyle} type="number" step="0.01" value={form.losing_ctr_1 || ''} onChange={e => f('losing_ctr_1', e.target.value ? parseFloat(e.target.value) : null)} placeholder="e.g. 4.2" />
            </div>
            <div style={fieldGroup}>
              <label style={labelStyle}>3rd CTR % (if applicable)</label>
              <input style={inputStyle} type="number" step="0.01" value={form.losing_ctr_2 || ''} onChange={e => f('losing_ctr_2', e.target.value ? parseFloat(e.target.value) : null)} placeholder="e.g. 3.9" />
            </div>
          </div>
          {ctrDelta && (
            <div style={{ textAlign: 'center', marginTop: 8, padding: '8px 0', background: 'var(--dark-card)', borderRadius: 6 }}>
              <span style={{ fontSize: 12, color: MUTED }}>CTR Delta: </span>
              <span style={{ fontSize: 18, fontWeight: 700, color: parseFloat(ctrDelta) > 0 ? '#37CA37' : '#EF4444' }}>
                {parseFloat(ctrDelta) > 0 ? '+' : ''}{ctrDelta}%
              </span>
            </div>
          )}
        </div>

        <div style={fieldGroup}>
          <label style={labelStyle}>What did you learn? (1-2 sentences)</label>
          <textarea style={{ ...inputStyle, minHeight: 60 }} value={form.takeaway || ''} onChange={e => f('takeaway', e.target.value)}
            placeholder="What does this result tell you about what works? What should we do more of or stop doing?" />
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 16, paddingTop: 16, borderTop: `1px solid ${BORDER}` }}>
          <div>{entry?.id && <button onClick={handleDelete} style={{ ...btnStyle, background: '#EF444418', color: '#EF4444', border: '1px solid #EF444440' }}>Delete</button>}</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={onClose} style={{ ...btnStyle, background: 'transparent', color: SECONDARY, border: `1px solid ${BORDER}` }}>Cancel</button>
            <button onClick={handleSave} disabled={saving} style={{ ...btnStyle, background: GREEN, color: '#000', fontWeight: 600 }}>
              {saving ? 'Saving...' : entry?.id ? 'Update' : 'Log Test'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── MAIN COMPONENT ──
export default function ThumbnailTracker() {
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [showPatterns, setShowPatterns] = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const { data } = await supabase.from('yt_thumbnail_tests').select('*').order('publish_date', { ascending: false })
    setEntries(data || [])
    setLoading(false)
  }

  // Stats
  const stats = useMemo(() => {
    const withCtr = entries.filter(e => e.winning_ctr != null)
    const withDelta = entries.filter(e => e.ctr_delta != null)
    return {
      total: entries.length,
      avgWinningCtr: withCtr.length ? (withCtr.reduce((s, e) => s + (e.winning_ctr || 0), 0) / withCtr.length).toFixed(1) : '--',
      avgDelta: withDelta.length ? (withDelta.reduce((s, e) => s + (e.ctr_delta || 0), 0) / withDelta.length).toFixed(2) : '--',
      abTestsRun: entries.filter(e => e.ab_test_run).length,
      winnerBreakdown: ['a', 'b', 'c'].map(l => ({
        letter: l.toUpperCase(),
        count: entries.filter(e => e.winner === l).length,
      })),
    }
  }, [entries])

  // Pattern analysis -- group takeaways
  const patterns = useMemo(() => {
    const withTakeaway = entries.filter(e => e.takeaway?.trim())
    return withTakeaway.map(e => ({
      title: e.video_title,
      date: e.publish_date,
      winner: e.winner?.toUpperCase(),
      ctr: e.winning_ctr,
      delta: e.ctr_delta,
      takeaway: e.takeaway,
    }))
  }, [entries])

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: WHITE, margin: 0 }}>Thumbnail Split Test Tracker</h1>
          <p style={{ fontSize: 13, color: MUTED, marginTop: 4 }}>Log every thumbnail test. Build pattern recognition that compounds over time.</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {entries.length >= 3 && (
            <button onClick={() => setShowPatterns(!showPatterns)} style={{ ...btnStyle, background: 'var(--dark-card)', color: SECONDARY, border: `1px solid ${BORDER}` }}>
              {showPatterns ? 'Hide' : 'Show'} Patterns
            </button>
          )}
          <button onClick={() => { setEditing(null); setShowForm(true) }} style={{ ...btnStyle, background: GREEN, color: '#000', fontWeight: 600, fontSize: 14, padding: '10px 20px' }}>
            + Log Test
          </button>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
        <div style={statCard}>
          <div style={{ fontSize: 28, fontWeight: 700, color: WHITE }}>{stats.total}</div>
          <div style={{ fontSize: 12, color: MUTED }}>Tests Logged</div>
        </div>
        <div style={statCard}>
          <div style={{ fontSize: 28, fontWeight: 700, color: getCtrColor(parseFloat(stats.avgWinningCtr)) }}>{stats.avgWinningCtr}%</div>
          <div style={{ fontSize: 12, color: MUTED }}>Avg Winning CTR</div>
        </div>
        <div style={statCard}>
          <div style={{ fontSize: 28, fontWeight: 700, color: parseFloat(stats.avgDelta) > 0 ? '#37CA37' : MUTED }}>
            {stats.avgDelta !== '--' ? `+${stats.avgDelta}%` : '--'}
          </div>
          <div style={{ fontSize: 12, color: MUTED }}>Avg CTR Delta</div>
        </div>
        <div style={statCard}>
          <div style={{ fontSize: 28, fontWeight: 700, color: '#3B82F6' }}>{stats.abTestsRun}</div>
          <div style={{ fontSize: 12, color: MUTED }}>A/B Tests Run</div>
        </div>
      </div>

      {/* Winner breakdown */}
      {stats.total > 0 && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          {stats.winnerBreakdown.filter(w => w.count > 0).map(w => (
            <span key={w.letter} style={{
              padding: '4px 12px', borderRadius: 6, fontSize: 12, fontWeight: 600,
              background: '#37CA3718', color: '#37CA37', border: '1px solid #37CA3740',
            }}>
              Thumbnail {w.letter} won {w.count}x
            </span>
          ))}
        </div>
      )}

      {/* Pattern Review Panel */}
      {showPatterns && patterns.length > 0 && (
        <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 10, padding: 20, marginBottom: 20 }}>
          <h3 style={{ fontSize: 15, fontWeight: 600, color: WHITE, marginBottom: 12 }}>Pattern Review -- All Takeaways</h3>
          <p style={{ fontSize: 12, color: MUTED, marginBottom: 16 }}>Review these at the end of each month. What thumbnail elements are consistently winning?</p>
          {patterns.map((p, i) => (
            <div key={i} style={{ padding: '10px 0', borderBottom: i < patterns.length - 1 ? `1px solid ${BORDER}` : 'none' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: WHITE }}>{p.title}</span>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  {p.ctr && <span style={{ fontSize: 12, color: getCtrColor(p.ctr) }}>{p.ctr}% CTR</span>}
                  {p.delta && <span style={{ fontSize: 11, color: p.delta > 0 ? '#37CA37' : '#EF4444' }}>({p.delta > 0 ? '+' : ''}{p.delta}%)</span>}
                </div>
              </div>
              <div style={{ fontSize: 12, color: SECONDARY, lineHeight: 1.5 }}>{p.takeaway}</div>
            </div>
          ))}
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: MUTED }}>Loading...</div>
      ) : entries.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 40, color: MUTED }}>No thumbnail tests logged yet. Click "+ Log Test" after publishing a video.</div>
      ) : (
        <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 10, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                  <th style={{ ...thStyle, textAlign: 'left', minWidth: 200 }}>Video</th>
                  <th style={thStyle}>Date</th>
                  <th style={thStyle}>Pick</th>
                  <th style={thStyle}>Winner</th>
                  <th style={thStyle}>Win CTR</th>
                  <th style={thStyle}>Delta</th>
                  <th style={thStyle}>A/B?</th>
                  <th style={{ ...thStyle, minWidth: 200, textAlign: 'left' }}>Takeaway</th>
                </tr>
              </thead>
              <tbody>
                {entries.map(e => (
                  <tr key={e.id} style={{ borderBottom: `1px solid ${BORDER}`, cursor: 'pointer' }}
                    onClick={() => { setEditing(e); setShowForm(true) }}
                    onMouseEnter={ev => ev.currentTarget.style.background = 'var(--dark-light)'}
                    onMouseLeave={ev => ev.currentTarget.style.background = 'transparent'}>
                    <td style={{ ...tdStyle, textAlign: 'left', fontWeight: 600, color: WHITE }}>{e.video_title}</td>
                    <td style={tdStyle}>{e.publish_date ? new Date(e.publish_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '--'}</td>
                    <td style={tdStyle}>
                      {e.initial_pick && <span style={{ fontSize: 14, fontWeight: 700, color: '#3B82F6' }}>{e.initial_pick.toUpperCase()}</span>}
                    </td>
                    <td style={tdStyle}>
                      {e.winner && <span style={{ fontSize: 14, fontWeight: 700, color: '#37CA37' }}>{e.winner.toUpperCase()}</span>}
                    </td>
                    <td style={tdStyle}>
                      {e.winning_ctr != null && <span style={{ fontWeight: 600, color: getCtrColor(e.winning_ctr) }}>{e.winning_ctr}%</span>}
                    </td>
                    <td style={tdStyle}>
                      {e.ctr_delta != null && (
                        <span style={{ fontWeight: 600, color: e.ctr_delta > 0 ? '#37CA37' : '#EF4444' }}>
                          {e.ctr_delta > 0 ? '+' : ''}{e.ctr_delta}%
                        </span>
                      )}
                    </td>
                    <td style={tdStyle}>
                      <span style={{ fontSize: 11, color: e.ab_test_run ? GREEN : MUTED }}>{e.ab_test_run ? 'Yes' : 'No'}</span>
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'left', fontSize: 12, color: SECONDARY, maxWidth: 250, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {e.takeaway || '--'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showForm && (
        <ThumbnailForm entry={editing} onSave={() => { setShowForm(false); setEditing(null); load() }} onClose={() => { setShowForm(false); setEditing(null) }} />
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
