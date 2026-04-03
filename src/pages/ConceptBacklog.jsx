import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'

const GREEN = 'var(--green)'
const CARD = 'var(--dark-card)'
const BORDER = 'var(--dark-border)'
const WHITE = 'var(--white)'
const MUTED = 'var(--text-muted)'
const SECONDARY = 'var(--text-secondary)'

const FORMAT_OPTIONS = [
  'Challenge', 'Experiment', 'Educational', 'Grocery Haul',
  'Routine', 'Transformation', 'Reaction', 'Food Review',
  'Docu-Series', 'Collab', 'Other'
]

const STATUS_OPTIONS = [
  { value: 'backlog', label: 'Backlog', color: '#6B7280' },
  { value: 'approved', label: 'Approved', color: '#3B82F6' },
  { value: 'scripting', label: 'Scripting', color: '#F59E0B' },
  { value: 'pre-production', label: 'Pre-Production', color: '#8B5CF6' },
  { value: 'filming', label: 'Filming', color: '#EC4899' },
  { value: 'filmed', label: 'Filmed', color: '#F97316' },
  { value: 'published', label: 'Published', color: '#37CA37' },
  { value: 'parking-lot', label: 'Parking Lot', color: '#9CA3AF' },
]

const SOB_TRIGGERS = ['COACH', 'LOSE', 'WHY', 'DIET', 'General FTJ CTA', 'None']

function getStatusColor(status) {
  return STATUS_OPTIONS.find(s => s.value === status)?.color || '#6B7280'
}

function getScoreColor(score) {
  if (score >= 17) return '#37CA37'
  if (score >= 14) return '#3B82F6'
  if (score >= 12) return '#F59E0B'
  return '#EF4444'
}

function ScoreBar({ value, max = 5 }) {
  const pct = (value / max) * 100
  const color = value >= 4 ? '#37CA37' : value >= 3 ? '#F59E0B' : '#EF4444'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ flex: 1, height: 6, background: 'var(--dark-border)', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 3, transition: 'width 0.3s' }} />
      </div>
      <span style={{ fontSize: 13, fontWeight: 600, color, minWidth: 16, textAlign: 'right' }}>{value}</span>
    </div>
  )
}

// ── CONCEPT FORM MODAL ──
function ConceptForm({ concept, onSave, onClose }) {
  const { user } = useAuth()
  const [form, setForm] = useState(concept || {
    title: '', summary: '', format: '', source: '', reference_url: '',
    cta_alignment: '', sob_trigger_word: '', notes: '', status: 'backlog',
    score_audience_demand: null, score_revenue_potential: null,
    score_production_feasibility: null, score_competitive_edge: null,
    reason_audience: '', reason_revenue: '', reason_production: '', reason_competitive: '',
  })
  const [saving, setSaving] = useState(false)
  const [activeScoreTab, setActiveScoreTab] = useState('audience')

  const totalScore = (form.score_audience_demand || 0) + (form.score_revenue_potential || 0) +
    (form.score_production_feasibility || 0) + (form.score_competitive_edge || 0)
  const allScored = form.score_audience_demand && form.score_revenue_potential &&
    form.score_production_feasibility && form.score_competitive_edge

  async function handleSave() {
    if (!form.title.trim()) return alert('Title is required')
    setSaving(true)
    const payload = { ...form, updated_at: new Date().toISOString() }
    delete payload.id; delete payload.concept_number; delete payload.created_at; delete payload.total_score

    if (concept?.id) {
      await supabase.from('yt_concept_backlog').update(payload).eq('id', concept.id)
    } else {
      payload.created_by = user.id
      await supabase.from('yt_concept_backlog').insert(payload)
    }
    setSaving(false)
    onSave()
  }

  async function handleDelete() {
    if (!concept?.id) return
    if (!confirm('Delete this concept permanently?')) return
    await supabase.from('yt_concept_backlog').delete().eq('id', concept.id)
    onSave()
  }

  const scoreGuides = {
    audience: {
      label: 'Audience Demand', key: 'score_audience_demand', reasonKey: 'reason_audience',
      desc: 'Do people actually want to see this?',
      levels: {
        1: 'Nobody searching for this. Very niche.',
        2: 'Low search volume. Minimal audience signals.',
        3: 'Some search volume. A few comments or DMs.',
        4: 'Good search volume. Related topics trending.',
        5: 'Lots of people searching. Audience actively asking for it.',
      }
    },
    revenue: {
      label: 'Revenue Potential', key: 'score_revenue_potential', reasonKey: 'reason_revenue',
      desc: 'Does this connect to Fat-to-Jacked?',
      levels: {
        1: 'Pure entertainment. Hard to work in a CTA.',
        2: 'Weak tie to weight loss coaching.',
        3: 'Natural tie to the journey. CTA could fit.',
        4: 'Addresses a problem FTJ solves. Good CTA fit.',
        5: 'Directly addresses FTJ pain point. CTA writes itself.',
      }
    },
    production: {
      label: 'Production Feasibility', key: 'score_production_feasibility', reasonKey: 'reason_production',
      desc: 'How easy is this to film?',
      levels: {
        1: 'Multiple days, special locations, outside talent.',
        2: 'Above-average complexity. Extra planning needed.',
        3: 'Standard filming day. 1-2 locations. Normal gear.',
        4: 'Simple setup. Can batch with other content.',
        5: 'One session. Minimal setup. Low complexity.',
      }
    },
    competitive: {
      label: 'Competitive Edge', key: 'score_competitive_edge', reasonKey: 'reason_competitive',
      desc: 'Can PeachFit do this better than others?',
      levels: {
        1: 'Competitors already did this well. No PeachFit angle.',
        2: 'Common topic. Minor differentiation possible.',
        3: 'Others have done similar, but Jacob\'s story gives us a spin.',
        4: 'Fresh angle. PeachFit has a clear advantage.',
        5: 'Nobody has done this. Or PeachFit owns this topic.',
      }
    },
  }

  const activeGuide = scoreGuides[activeScoreTab]

  return (
    <div style={overlay} onClick={onClose}>
      <div style={{ ...modal, maxWidth: 780, maxHeight: '90vh', overflow: 'auto' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ fontSize: 18, fontWeight: 600, color: WHITE }}>{concept?.id ? 'Edit Concept' : 'New Video Concept'}</h2>
          <button onClick={onClose} style={closeBtn}>&times;</button>
        </div>

        {/* Title and Summary */}
        <div style={fieldGroup}>
          <label style={labelStyle}>Working Title *</label>
          <input style={inputStyle} value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}
            placeholder="Write it exactly as it would appear on YouTube" />
        </div>
        <div style={fieldGroup}>
          <label style={labelStyle}>What is this video? (1-2 sentences)</label>
          <textarea style={{ ...inputStyle, minHeight: 60 }} value={form.summary || ''} onChange={e => setForm({ ...form, summary: e.target.value })}
            placeholder="What happens in this video? Why would someone click?" />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div style={fieldGroup}>
            <label style={labelStyle}>Format</label>
            <select style={inputStyle} value={form.format || ''} onChange={e => setForm({ ...form, format: e.target.value })}>
              <option value="">Select format...</option>
              {FORMAT_OPTIONS.map(f => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>
          <div style={fieldGroup}>
            <label style={labelStyle}>Status</label>
            <select style={inputStyle} value={form.status || 'backlog'} onChange={e => setForm({ ...form, status: e.target.value })}>
              {STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
        </div>

        {/* Scoring Section */}
        <div style={{ background: 'var(--dark)', border: `1px solid ${BORDER}`, borderRadius: 10, padding: 16, margin: '16px 0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: WHITE }}>Scoring</span>
            {allScored && (
              <span style={{ fontSize: 22, fontWeight: 700, color: getScoreColor(totalScore) }}>
                {totalScore}/20
              </span>
            )}
          </div>

          {/* Score tabs */}
          <div style={{ display: 'flex', gap: 4, marginBottom: 12 }}>
            {Object.entries(scoreGuides).map(([key, guide]) => {
              const val = form[guide.key]
              const isActive = activeScoreTab === key
              return (
                <button key={key} onClick={() => setActiveScoreTab(key)} style={{
                  flex: 1, padding: '8px 4px', fontSize: 11, fontWeight: 600, border: 'none', borderRadius: 6, cursor: 'pointer',
                  background: isActive ? 'var(--dark-card)' : 'transparent', color: isActive ? WHITE : MUTED,
                  transition: 'all 0.15s',
                }}>
                  {guide.label.split(' ')[0]}
                  {val && <span style={{ display: 'block', fontSize: 16, color: val >= 4 ? '#37CA37' : val >= 3 ? '#F59E0B' : '#EF4444', marginTop: 2 }}>{val}</span>}
                </button>
              )
            })}
          </div>

          {/* Active score panel */}
          <div style={{ background: 'var(--dark-card)', borderRadius: 8, padding: 14 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: WHITE, marginBottom: 2 }}>{activeGuide.label}</div>
            <div style={{ fontSize: 12, color: MUTED, marginBottom: 12 }}>{activeGuide.desc}</div>

            <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
              {[1, 2, 3, 4, 5].map(n => {
                const isSelected = form[activeGuide.key] === n
                const color = n >= 4 ? '#37CA37' : n >= 3 ? '#F59E0B' : '#EF4444'
                return (
                  <button key={n} onClick={() => setForm({ ...form, [activeGuide.key]: n })} style={{
                    width: 44, height: 44, borderRadius: 8, fontSize: 16, fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s',
                    border: isSelected ? `2px solid ${color}` : `1px solid var(--dark-border)`,
                    background: isSelected ? color + '20' : 'var(--dark)',
                    color: isSelected ? color : MUTED,
                  }}>{n}</button>
                )
              })}
            </div>

            {/* Level descriptions */}
            <div style={{ fontSize: 12, color: SECONDARY, lineHeight: 1.6 }}>
              {Object.entries(activeGuide.levels).map(([level, desc]) => (
                <div key={level} style={{
                  padding: '3px 0', opacity: form[activeGuide.key] == level ? 1 : 0.5,
                  fontWeight: form[activeGuide.key] == level ? 600 : 400,
                  color: form[activeGuide.key] == level ? WHITE : SECONDARY,
                }}>
                  <span style={{ color: MUTED, marginRight: 6 }}>{level}.</span>{desc}
                </div>
              ))}
            </div>

            <div style={{ marginTop: 10 }}>
              <label style={{ ...labelStyle, fontSize: 11 }}>Why did you give this score? (1 sentence)</label>
              <input style={{ ...inputStyle, fontSize: 12 }} value={form[activeGuide.reasonKey] || ''}
                onChange={e => setForm({ ...form, [activeGuide.reasonKey]: e.target.value })}
                placeholder="Explain your reasoning..." />
            </div>
          </div>

          {allScored && totalScore < 12 && (
            <div style={{ marginTop: 10, padding: '8px 12px', background: '#EF444418', border: '1px solid #EF444440', borderRadius: 6, fontSize: 12, color: '#EF4444' }}>
              Score is below 12. This concept should go to Parking Lot unless you have a strong reason to keep it.
            </div>
          )}
        </div>

        {/* Source and references */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div style={fieldGroup}>
            <label style={labelStyle}>Where did this idea come from?</label>
            <input style={inputStyle} value={form.source || ''} onChange={e => setForm({ ...form, source: e.target.value })}
              placeholder="Competitive research, audience comment, etc." />
          </div>
          <div style={fieldGroup}>
            <label style={labelStyle}>Reference / Comparable URL</label>
            <input style={inputStyle} value={form.reference_url || ''} onChange={e => setForm({ ...form, reference_url: e.target.value })}
              placeholder="Link to similar video" />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div style={fieldGroup}>
            <label style={labelStyle}>CTA Fit</label>
            <input style={inputStyle} value={form.cta_alignment || ''} onChange={e => setForm({ ...form, cta_alignment: e.target.value })}
              placeholder="What would the CTA sound like?" />
          </div>
          <div style={fieldGroup}>
            <label style={labelStyle}>SOB Trigger Word</label>
            <select style={inputStyle} value={form.sob_trigger_word || ''} onChange={e => setForm({ ...form, sob_trigger_word: e.target.value })}>
              <option value="">Select...</option>
              {SOB_TRIGGERS.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>

        <div style={fieldGroup}>
          <label style={labelStyle}>Notes</label>
          <textarea style={{ ...inputStyle, minHeight: 50 }} value={form.notes || ''} onChange={e => setForm({ ...form, notes: e.target.value })}
            placeholder="Seasonal timing, ties to campaign, etc." />
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 16, paddingTop: 16, borderTop: `1px solid ${BORDER}` }}>
          <div>
            {concept?.id && (
              <button onClick={handleDelete} style={{ ...btnStyle, background: '#EF444418', color: '#EF4444', border: '1px solid #EF444440' }}>
                Delete
              </button>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={onClose} style={{ ...btnStyle, background: 'transparent', color: SECONDARY, border: `1px solid ${BORDER}` }}>Cancel</button>
            <button onClick={handleSave} disabled={saving} style={{ ...btnStyle, background: GREEN, color: '#000', fontWeight: 600 }}>
              {saving ? 'Saving...' : concept?.id ? 'Update' : 'Add to Backlog'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── MAIN COMPONENT ──
export default function ConceptBacklog() {
  const { user } = useAuth()
  const [concepts, setConcepts] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [filterStatus, setFilterStatus] = useState('active')
  const [filterFormat, setFilterFormat] = useState('')
  const [sortBy, setSortBy] = useState('total_score')
  const [sortDir, setSortDir] = useState('desc')
  const [search, setSearch] = useState('')

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const { data } = await supabase.from('yt_concept_backlog').select('*').order('created_at', { ascending: false })
    setConcepts(data || [])
    setLoading(false)
  }

  // Filtered and sorted
  const filtered = useMemo(() => {
    let list = [...concepts]

    // Status filter
    if (filterStatus === 'active') {
      list = list.filter(c => !['published', 'parking-lot'].includes(c.status))
    } else if (filterStatus === 'parking-lot') {
      list = list.filter(c => c.status === 'parking-lot')
    } else if (filterStatus !== 'all') {
      list = list.filter(c => c.status === filterStatus)
    }

    // Format filter
    if (filterFormat) list = list.filter(c => c.format === filterFormat)

    // Search
    if (search) {
      const s = search.toLowerCase()
      list = list.filter(c => c.title?.toLowerCase().includes(s) || c.summary?.toLowerCase().includes(s))
    }

    // Sort
    list.sort((a, b) => {
      let av = a[sortBy], bv = b[sortBy]
      if (av == null) return 1; if (bv == null) return -1
      if (typeof av === 'string') return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av)
      return sortDir === 'asc' ? av - bv : bv - av
    })

    return list
  }, [concepts, filterStatus, filterFormat, sortBy, sortDir, search])

  // Stats
  const stats = useMemo(() => {
    const active = concepts.filter(c => !['published', 'parking-lot'].includes(c.status))
    const scored = active.filter(c => c.total_score)
    const readyForScript = active.filter(c => c.status === 'backlog' && c.total_score >= 12)
      .sort((a, b) => (b.total_score || 0) - (a.total_score || 0))
      .slice(0, 5)

    return {
      totalActive: active.length,
      avgScore: scored.length ? (scored.reduce((s, c) => s + (c.total_score || 0), 0) / scored.length).toFixed(1) : '--',
      belowTarget: active.length < 20,
      needed: Math.max(0, 20 - active.length),
      parkingLot: concepts.filter(c => c.status === 'parking-lot').length,
      published: concepts.filter(c => c.status === 'published').length,
      top5: readyForScript,
      byStatus: STATUS_OPTIONS.map(s => ({
        ...s,
        count: concepts.filter(c => c.status === s.value).length,
      })).filter(s => s.count > 0),
    }
  }, [concepts])

  function handleSort(col) {
    if (sortBy === col) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(col); setSortDir('desc')
    }
  }

  const sortArrow = (col) => sortBy === col ? (sortDir === 'asc' ? ' ↑' : ' ↓') : ''

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: WHITE, margin: 0 }}>Video Concept Backlog</h1>
          <p style={{ fontSize: 13, color: MUTED, marginTop: 4 }}>Maintain 20+ scored concepts at all times. Top 5 should always be ready for scripting.</p>
        </div>
        <button onClick={() => { setEditing(null); setShowForm(true) }} style={{ ...btnStyle, background: GREEN, color: '#000', fontWeight: 600, fontSize: 14, padding: '10px 20px' }}>
          + New Concept
        </button>
      </div>

      {/* Health Dashboard */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
        <div style={statCard}>
          <div style={{ fontSize: 28, fontWeight: 700, color: stats.belowTarget ? '#EF4444' : GREEN }}>{stats.totalActive}</div>
          <div style={{ fontSize: 12, color: MUTED }}>Active Concepts</div>
          {stats.belowTarget && (
            <div style={{ fontSize: 11, color: '#EF4444', marginTop: 4, fontWeight: 600 }}>
              Need {stats.needed} more to hit 20
            </div>
          )}
        </div>
        <div style={statCard}>
          <div style={{ fontSize: 28, fontWeight: 700, color: stats.avgScore !== '--' ? getScoreColor(parseFloat(stats.avgScore)) : MUTED }}>{stats.avgScore}</div>
          <div style={{ fontSize: 12, color: MUTED }}>Avg Score /20</div>
        </div>
        <div style={statCard}>
          <div style={{ fontSize: 28, fontWeight: 700, color: '#37CA37' }}>{stats.published}</div>
          <div style={{ fontSize: 12, color: MUTED }}>Published</div>
        </div>
        <div style={statCard}>
          <div style={{ fontSize: 28, fontWeight: 700, color: '#9CA3AF' }}>{stats.parkingLot}</div>
          <div style={{ fontSize: 12, color: MUTED }}>Parking Lot</div>
        </div>
      </div>

      {/* Status breakdown pills */}
      {stats.byStatus.length > 0 && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
          {stats.byStatus.map(s => (
            <span key={s.value} style={{
              padding: '4px 10px', borderRadius: 6, fontSize: 12, fontWeight: 600,
              background: s.color + '18', color: s.color, border: `1px solid ${s.color}40`,
              cursor: 'pointer',
            }} onClick={() => setFilterStatus(s.value)}>
              {s.label}: {s.count}
            </span>
          ))}
        </div>
      )}

      {/* Backlog warning */}
      {stats.belowTarget && (
        <div style={{
          padding: '12px 16px', background: '#EF444410', border: '1px solid #EF444430', borderRadius: 8,
          marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <span style={{ fontSize: 20 }}>&#9888;</span>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#EF4444' }}>Backlog below target</div>
            <div style={{ fontSize: 12, color: SECONDARY }}>You have {stats.totalActive} active concepts. The minimum is 20. Add {stats.needed} more scored concepts.</div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <select style={filterSelect} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="active">Active (excl. Published & Parking Lot)</option>
          <option value="all">All</option>
          <option value="backlog">Backlog Only</option>
          <option value="approved">Approved</option>
          <option value="scripting">Scripting</option>
          <option value="pre-production">Pre-Production</option>
          <option value="parking-lot">Parking Lot</option>
          <option value="published">Published</option>
        </select>
        <select style={filterSelect} value={filterFormat} onChange={e => setFilterFormat(e.target.value)}>
          <option value="">All Formats</option>
          {FORMAT_OPTIONS.map(f => <option key={f} value={f}>{f}</option>)}
        </select>
        <input style={{ ...filterSelect, width: 200 }} placeholder="Search titles..." value={search} onChange={e => setSearch(e.target.value)} />
        <div style={{ marginLeft: 'auto', fontSize: 12, color: MUTED }}>{filtered.length} concept{filtered.length !== 1 ? 's' : ''}</div>
      </div>

      {/* Table */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: MUTED }}>Loading...</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 40, color: MUTED }}>
          {concepts.length === 0 ? 'No concepts yet. Click "+ New Concept" to start building the backlog.' : 'No concepts match your filters.'}
        </div>
      ) : (
        <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 10, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                  <th style={thStyle} onClick={() => handleSort('concept_number')}>#</th>
                  <th style={{ ...thStyle, textAlign: 'left', minWidth: 220 }} onClick={() => handleSort('title')}>Title{sortArrow('title')}</th>
                  <th style={thStyle}>Format</th>
                  <th style={thStyle} onClick={() => handleSort('total_score')}>Score{sortArrow('total_score')}</th>
                  <th style={thStyle} onClick={() => handleSort('score_audience_demand')}>Aud{sortArrow('score_audience_demand')}</th>
                  <th style={thStyle} onClick={() => handleSort('score_revenue_potential')}>Rev{sortArrow('score_revenue_potential')}</th>
                  <th style={thStyle} onClick={() => handleSort('score_production_feasibility')}>Prod{sortArrow('score_production_feasibility')}</th>
                  <th style={thStyle} onClick={() => handleSort('score_competitive_edge')}>Comp{sortArrow('score_competitive_edge')}</th>
                  <th style={thStyle}>Status</th>
                  <th style={thStyle}>CTA</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(c => {
                  const score = c.total_score || 0
                  const sColor = getStatusColor(c.status)
                  return (
                    <tr key={c.id} style={{ borderBottom: `1px solid ${BORDER}`, cursor: 'pointer', transition: 'background 0.1s' }}
                      onClick={() => { setEditing(c); setShowForm(true) }}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--dark-light)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                      <td style={{ ...tdStyle, color: MUTED, fontSize: 11 }}>{c.concept_number}</td>
                      <td style={{ ...tdStyle, textAlign: 'left' }}>
                        <div style={{ fontWeight: 600, color: WHITE, lineHeight: 1.3 }}>{c.title}</div>
                        {c.summary && <div style={{ fontSize: 11, color: MUTED, marginTop: 2, lineHeight: 1.3, maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.summary}</div>}
                      </td>
                      <td style={tdStyle}>
                        {c.format && <span style={{ fontSize: 11, color: SECONDARY }}>{c.format}</span>}
                      </td>
                      <td style={tdStyle}>
                        <span style={{ fontSize: 16, fontWeight: 700, color: getScoreColor(score) }}>{score || '--'}</span>
                      </td>
                      <td style={tdStyle}><ScoreBar value={c.score_audience_demand || 0} /></td>
                      <td style={tdStyle}><ScoreBar value={c.score_revenue_potential || 0} /></td>
                      <td style={tdStyle}><ScoreBar value={c.score_production_feasibility || 0} /></td>
                      <td style={tdStyle}><ScoreBar value={c.score_competitive_edge || 0} /></td>
                      <td style={tdStyle}>
                        <span style={{
                          padding: '3px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600,
                          background: sColor + '18', color: sColor, border: `1px solid ${sColor}40`,
                        }}>{STATUS_OPTIONS.find(s => s.value === c.status)?.label || c.status}</span>
                      </td>
                      <td style={tdStyle}>
                        {c.sob_trigger_word && <span style={{ fontSize: 11, color: GREEN, fontWeight: 600 }}>{c.sob_trigger_word}</span>}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Form modal */}
      {showForm && (
        <ConceptForm
          concept={editing}
          onSave={() => { setShowForm(false); setEditing(null); load() }}
          onClose={() => { setShowForm(false); setEditing(null) }}
        />
      )}
    </div>
  )
}

// ── STYLES ──
const overlay = {
  position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex',
  alignItems: 'center', justifyContent: 'center', zIndex: 1000,
}
const modal = {
  background: 'var(--dark-card)', border: `1px solid var(--dark-border)`, borderRadius: 12,
  padding: 24, width: '95%', color: 'var(--white)',
}
const closeBtn = {
  background: 'transparent', border: 'none', color: 'var(--text-muted)', fontSize: 24, cursor: 'pointer', padding: 4,
}
const fieldGroup = { marginBottom: 12 }
const labelStyle = { display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4 }
const inputStyle = {
  width: '100%', padding: '8px 12px', background: 'var(--dark)', border: '1px solid var(--dark-border)',
  borderRadius: 6, color: 'var(--white)', fontSize: 13, fontFamily: 'Outfit, Arial, sans-serif', outline: 'none',
}
const btnStyle = {
  padding: '8px 16px', borderRadius: 6, border: 'none', fontSize: 13, cursor: 'pointer', fontFamily: 'Outfit, Arial, sans-serif',
}
const statCard = {
  background: 'var(--dark-card)', border: '1px solid var(--dark-border)', borderRadius: 10, padding: '16px 20px',
}
const filterSelect = {
  padding: '7px 12px', background: 'var(--dark-card)', border: '1px solid var(--dark-border)',
  borderRadius: 6, color: 'var(--white)', fontSize: 12, fontFamily: 'Outfit, Arial, sans-serif', outline: 'none',
}
const thStyle = {
  padding: '10px 12px', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase',
  letterSpacing: '0.5px', cursor: 'pointer', textAlign: 'center', whiteSpace: 'nowrap', userSelect: 'none',
}
const tdStyle = { padding: '10px 12px', textAlign: 'center', verticalAlign: 'middle' }
