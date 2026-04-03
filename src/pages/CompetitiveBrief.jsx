import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'

const GREEN = 'var(--green)'
const CARD = 'var(--dark-card)'
const BORDER = 'var(--dark-border)'
const WHITE = 'var(--white)'
const MUTED = 'var(--text-muted)'
const SECONDARY = 'var(--text-secondary)'

function formatDate(d) {
  if (!d) return '--'
  return new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function getMonday(date) {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  d.setDate(diff)
  return d.toISOString().split('T')[0]
}

function getFriday(mondayStr) {
  const d = new Date(mondayStr + 'T00:00:00')
  d.setDate(d.getDate() + 4)
  return d.toISOString().split('T')[0]
}

// ── BRIEF FORM MODAL ──
function BriefForm({ brief, onSave, onClose }) {
  const { user } = useAuth()
  const today = new Date().toISOString().split('T')[0]
  const defaultMonday = getMonday(today)

  const [form, setForm] = useState(brief ? {
    week_start: brief.week_start,
    week_end: brief.week_end,
    channels_reviewed: brief.channels_reviewed || [],
    top_performer_title: brief.top_performer_title || '',
    top_performer_channel: brief.top_performer_channel || '',
    top_performer_analysis: brief.top_performer_analysis || '',
    peachfit_adaptation: brief.peachfit_adaptation || '',
    trends_observed: brief.trends_observed || '',
  } : {
    week_start: defaultMonday,
    week_end: getFriday(defaultMonday),
    channels_reviewed: ['Casey Kelly'],
    top_performer_title: '',
    top_performer_channel: '',
    top_performer_analysis: '',
    peachfit_adaptation: '',
    trends_observed: '',
  })

  const [videos, setVideos] = useState([])
  const [ideas, setIdeas] = useState([])
  const [channelInput, setChannelInput] = useState('')
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState('videos')

  useEffect(() => {
    if (brief?.id) {
      loadChildren()
    } else {
      setVideos([{ channel_name: '', video_title: '', views_at_review: null, days_since_posted: null, notable_element: '' }])
      setIdeas([{ concept: '', inspired_by: '' }])
    }
  }, [brief?.id])

  async function loadChildren() {
    const [vRes, iRes] = await Promise.all([
      supabase.from('yt_competitive_videos').select('*').eq('brief_id', brief.id).order('sort_order'),
      supabase.from('yt_competitive_ideas').select('*').eq('brief_id', brief.id).order('sort_order'),
    ])
    setVideos(vRes.data?.length ? vRes.data : [{ channel_name: '', video_title: '', views_at_review: null, days_since_posted: null, notable_element: '' }])
    setIdeas(iRes.data?.length ? iRes.data : [{ concept: '', inspired_by: '' }])
  }

  function addChannel() {
    if (!channelInput.trim()) return
    if (form.channels_reviewed.includes(channelInput.trim())) return
    setForm({ ...form, channels_reviewed: [...form.channels_reviewed, channelInput.trim()] })
    setChannelInput('')
  }

  function removeChannel(ch) {
    setForm({ ...form, channels_reviewed: form.channels_reviewed.filter(c => c !== ch) })
  }

  function updateVideo(i, key, val) {
    const updated = [...videos]
    updated[i] = { ...updated[i], [key]: val }
    setVideos(updated)
  }

  function addVideo() {
    setVideos([...videos, { channel_name: '', video_title: '', views_at_review: null, days_since_posted: null, notable_element: '' }])
  }

  function removeVideo(i) {
    if (videos.length <= 1) return
    setVideos(videos.filter((_, idx) => idx !== i))
  }

  function updateIdea(i, key, val) {
    const updated = [...ideas]
    updated[i] = { ...updated[i], [key]: val }
    setIdeas(updated)
  }

  function addIdea() {
    setIdeas([...ideas, { concept: '', inspired_by: '' }])
  }

  function removeIdea(i) {
    if (ideas.length <= 1) return
    setIdeas(ideas.filter((_, idx) => idx !== i))
  }

  async function handleSave() {
    if (!form.week_start) return alert('Week start date is required')
    setSaving(true)

    const payload = { ...form, updated_at: new Date().toISOString() }

    let briefId = brief?.id
    if (briefId) {
      await supabase.from('yt_competitive_briefs').update(payload).eq('id', briefId)
    } else {
      payload.created_by = user.id
      const { data } = await supabase.from('yt_competitive_briefs').insert(payload).select().single()
      briefId = data?.id
    }

    if (briefId) {
      // Upsert videos
      await supabase.from('yt_competitive_videos').delete().eq('brief_id', briefId)
      const validVideos = videos.filter(v => v.video_title?.trim())
      if (validVideos.length) {
        await supabase.from('yt_competitive_videos').insert(
          validVideos.map((v, i) => ({ brief_id: briefId, channel_name: v.channel_name, video_title: v.video_title, views_at_review: v.views_at_review, days_since_posted: v.days_since_posted, notable_element: v.notable_element, sort_order: i }))
        )
      }

      // Upsert ideas
      await supabase.from('yt_competitive_ideas').delete().eq('brief_id', briefId)
      const validIdeas = ideas.filter(id => id.concept?.trim())
      if (validIdeas.length) {
        await supabase.from('yt_competitive_ideas').insert(
          validIdeas.map((id, i) => ({ brief_id: briefId, concept: id.concept, inspired_by: id.inspired_by, sort_order: i }))
        )
      }
    }

    setSaving(false); onSave()
  }

  async function handleDelete() {
    if (!brief?.id || !confirm('Delete this brief and all its data?')) return
    await supabase.from('yt_competitive_briefs').delete().eq('id', brief.id)
    onSave()
  }

  const tabs = [
    { key: 'videos', label: `Videos (${videos.filter(v => v.video_title?.trim()).length})` },
    { key: 'analysis', label: 'Analysis' },
    { key: 'ideas', label: `Ideas (${ideas.filter(i => i.concept?.trim()).length})` },
  ]

  return (
    <div style={overlay} onClick={onClose}>
      <div style={{ ...modal, maxWidth: 800, maxHeight: '90vh', overflow: 'auto' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ fontSize: 18, fontWeight: 600, color: WHITE }}>{brief?.id ? 'Edit Brief' : 'New Competitive Brief'}</h2>
          <button onClick={onClose} style={closeBtn}>&times;</button>
        </div>

        {/* Header info */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
          <div style={fieldGroup}>
            <label style={labelStyle}>Week Start (Monday)</label>
            <input style={inputStyle} type="date" value={form.week_start} onChange={e => {
              const ws = e.target.value
              setForm({ ...form, week_start: ws, week_end: getFriday(ws) })
            }} />
          </div>
          <div style={fieldGroup}>
            <label style={labelStyle}>Week End (Friday)</label>
            <input style={{ ...inputStyle, color: MUTED }} type="date" value={form.week_end} disabled />
          </div>
        </div>

        {/* Channels */}
        <div style={{ ...fieldGroup, marginBottom: 16 }}>
          <label style={labelStyle}>Channels Reviewed</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
            {form.channels_reviewed.map(ch => (
              <span key={ch} style={{ padding: '4px 10px', borderRadius: 6, fontSize: 12, fontWeight: 600, background: '#3B82F618', color: '#3B82F6', border: '1px solid #3B82F640', display: 'flex', alignItems: 'center', gap: 6 }}>
                {ch}
                <button onClick={() => removeChannel(ch)} style={{ background: 'transparent', border: 'none', color: '#3B82F6', cursor: 'pointer', fontSize: 14, padding: 0 }}>&times;</button>
              </span>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <input style={{ ...inputStyle, flex: 1 }} value={channelInput} onChange={e => setChannelInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addChannel())}
              placeholder="Add channel name and press Enter" />
            <button onClick={addChannel} style={{ ...btnStyle, background: 'var(--dark)', color: SECONDARY, border: `1px solid ${BORDER}` }}>Add</button>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 16, borderBottom: `1px solid ${BORDER}`, paddingBottom: 0 }}>
          {tabs.map(t => (
            <button key={t.key} onClick={() => setActiveTab(t.key)} style={{
              padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer', border: 'none', borderRadius: '6px 6px 0 0',
              background: activeTab === t.key ? 'var(--dark-card)' : 'transparent',
              color: activeTab === t.key ? WHITE : MUTED,
              borderBottom: activeTab === t.key ? `2px solid ${GREEN}` : '2px solid transparent',
            }}>{t.label}</button>
          ))}
        </div>

        {/* Videos Tab */}
        {activeTab === 'videos' && (
          <div>
            <p style={{ fontSize: 11, color: MUTED, marginBottom: 12, lineHeight: 1.5 }}>
              Log every video your tracked channels posted this week. Watch the first 60 seconds of each. Note what stands out.
            </p>
            {videos.map((v, i) => (
              <div key={i} style={{ background: 'var(--dark)', border: `1px solid ${BORDER}`, borderRadius: 8, padding: 12, marginBottom: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: MUTED }}>Video {i + 1}</span>
                  {videos.length > 1 && <button onClick={() => removeVideo(i)} style={{ background: 'transparent', border: 'none', color: '#EF4444', cursor: 'pointer', fontSize: 12 }}>Remove</button>}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 8, marginBottom: 8 }}>
                  <input style={{ ...inputStyle, fontSize: 12 }} value={v.channel_name || ''} onChange={e => updateVideo(i, 'channel_name', e.target.value)} placeholder="Channel name" />
                  <input style={{ ...inputStyle, fontSize: 12 }} value={v.video_title || ''} onChange={e => updateVideo(i, 'video_title', e.target.value)} placeholder="Video title" />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 2fr', gap: 8 }}>
                  <input style={{ ...inputStyle, fontSize: 12 }} type="number" value={v.views_at_review || ''} onChange={e => updateVideo(i, 'views_at_review', e.target.value ? parseInt(e.target.value) : null)} placeholder="Views" />
                  <input style={{ ...inputStyle, fontSize: 12 }} type="number" value={v.days_since_posted || ''} onChange={e => updateVideo(i, 'days_since_posted', e.target.value ? parseInt(e.target.value) : null)} placeholder="Days ago" />
                  <input style={{ ...inputStyle, fontSize: 12 }} value={v.notable_element || ''} onChange={e => updateVideo(i, 'notable_element', e.target.value)} placeholder="What stands out? (title angle, thumbnail, format, hook)" />
                </div>
              </div>
            ))}
            <button onClick={addVideo} style={{ ...btnStyle, width: '100%', background: 'var(--dark)', color: SECONDARY, border: `1px dashed ${BORDER}`, marginTop: 4 }}>+ Add Video</button>
          </div>
        )}

        {/* Analysis Tab */}
        {activeTab === 'analysis' && (
          <div>
            <div style={{ background: 'var(--dark)', border: `1px solid ${BORDER}`, borderRadius: 10, padding: 16, marginBottom: 16 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: WHITE, marginBottom: 12 }}>Top Performer This Week</div>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12, marginBottom: 12 }}>
                <div style={fieldGroup}>
                  <label style={labelStyle}>Video Title</label>
                  <input style={inputStyle} value={form.top_performer_title} onChange={e => setForm({ ...form, top_performer_title: e.target.value })} placeholder="Which video did best relative to their normal?" />
                </div>
                <div style={fieldGroup}>
                  <label style={labelStyle}>Channel</label>
                  <input style={inputStyle} value={form.top_performer_channel} onChange={e => setForm({ ...form, top_performer_channel: e.target.value })} placeholder="Channel name" />
                </div>
              </div>
              <div style={fieldGroup}>
                <label style={labelStyle}>Why did this video perform better than their average? (3-5 sentences)</label>
                <textarea style={{ ...inputStyle, minHeight: 80 }} value={form.top_performer_analysis} onChange={e => setForm({ ...form, top_performer_analysis: e.target.value })}
                  placeholder="Look at the title, thumbnail, topic, format, hook. What was different about this one? Be specific." />
              </div>
              <div style={fieldGroup}>
                <label style={labelStyle}>Can PeachFit do our own version? If yes, how?</label>
                <textarea style={{ ...inputStyle, minHeight: 60 }} value={form.peachfit_adaptation} onChange={e => setForm({ ...form, peachfit_adaptation: e.target.value })}
                  placeholder="Not copying -- adapting. What's the PeachFit angle? Or 'Not applicable -- [reason]'" />
              </div>
            </div>

            <div style={fieldGroup}>
              <label style={labelStyle}>Trends and Patterns (2-4 sentences)</label>
              <textarea style={{ ...inputStyle, minHeight: 60 }} value={form.trends_observed} onChange={e => setForm({ ...form, trends_observed: e.target.value })}
                placeholder="Anything multiple channels are doing? New formats trending? Title patterns? 'No new trends this week' is fine if honest." />
            </div>
          </div>
        )}

        {/* Ideas Tab */}
        {activeTab === 'ideas' && (
          <div>
            <p style={{ fontSize: 11, color: MUTED, marginBottom: 12, lineHeight: 1.5 }}>
              List 2-3 video concepts inspired by this week's research. These feed directly into the Video Concept Backlog.
            </p>
            {ideas.map((idea, i) => (
              <div key={i} style={{ background: 'var(--dark)', border: `1px solid ${BORDER}`, borderRadius: 8, padding: 12, marginBottom: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: MUTED }}>Idea {i + 1}</span>
                  {ideas.length > 1 && <button onClick={() => removeIdea(i)} style={{ background: 'transparent', border: 'none', color: '#EF4444', cursor: 'pointer', fontSize: 12 }}>Remove</button>}
                </div>
                <div style={fieldGroup}>
                  <input style={inputStyle} value={idea.concept || ''} onChange={e => updateIdea(i, 'concept', e.target.value)} placeholder="Video concept idea" />
                </div>
                <div style={fieldGroup}>
                  <input style={{ ...inputStyle, fontSize: 12 }} value={idea.inspired_by || ''} onChange={e => updateIdea(i, 'inspired_by', e.target.value)} placeholder="Got this from: (which competitor video or trend)" />
                </div>
              </div>
            ))}
            <button onClick={addIdea} style={{ ...btnStyle, width: '100%', background: 'var(--dark)', color: SECONDARY, border: `1px dashed ${BORDER}`, marginTop: 4 }}>+ Add Idea</button>
          </div>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 20, paddingTop: 16, borderTop: `1px solid ${BORDER}` }}>
          <div>{brief?.id && <button onClick={handleDelete} style={{ ...btnStyle, background: '#EF444418', color: '#EF4444', border: '1px solid #EF444440' }}>Delete</button>}</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={onClose} style={{ ...btnStyle, background: 'transparent', color: SECONDARY, border: `1px solid ${BORDER}` }}>Cancel</button>
            <button onClick={handleSave} disabled={saving} style={{ ...btnStyle, background: GREEN, color: '#000', fontWeight: 600 }}>
              {saving ? 'Saving...' : brief?.id ? 'Update Brief' : 'Submit Brief'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── MAIN COMPONENT ──
export default function CompetitiveBrief() {
  const [briefs, setBriefs] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [expandedId, setExpandedId] = useState(null)
  const [childData, setChildData] = useState({})

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const { data } = await supabase.from('yt_competitive_briefs').select('*').order('week_start', { ascending: false })
    setBriefs(data || [])
    setLoading(false)
  }

  async function loadChildren(briefId) {
    if (childData[briefId]) {
      setExpandedId(expandedId === briefId ? null : briefId)
      return
    }
    const [vRes, iRes] = await Promise.all([
      supabase.from('yt_competitive_videos').select('*').eq('brief_id', briefId).order('sort_order'),
      supabase.from('yt_competitive_ideas').select('*').eq('brief_id', briefId).order('sort_order'),
    ])
    setChildData(prev => ({ ...prev, [briefId]: { videos: vRes.data || [], ideas: iRes.data || [] } }))
    setExpandedId(briefId)
  }

  // Stats
  const stats = useMemo(() => {
    return {
      total: briefs.length,
      totalIdeas: Object.values(childData).reduce((s, d) => s + (d.ideas?.length || 0), 0),
      channelsTracked: [...new Set(briefs.flatMap(b => b.channels_reviewed || []))].length,
      streak: calculateStreak(briefs),
    }
  }, [briefs, childData])

  function calculateStreak(briefs) {
    if (!briefs.length) return 0
    let streak = 0
    const now = new Date()
    const thisMonday = getMonday(now.toISOString().split('T')[0])
    let checkDate = thisMonday

    for (let i = 0; i < 52; i++) {
      const found = briefs.find(b => b.week_start === checkDate)
      if (found) {
        streak++
        const d = new Date(checkDate + 'T00:00:00')
        d.setDate(d.getDate() - 7)
        checkDate = d.toISOString().split('T')[0]
      } else {
        break
      }
    }
    return streak
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: WHITE, margin: 0 }}>Competitive Intel Briefs</h1>
          <p style={{ fontSize: 13, color: MUTED, marginTop: 4 }}>Weekly research on what competitors are doing. Due every Friday.</p>
        </div>
        <button onClick={() => { setEditing(null); setShowForm(true) }} style={{ ...btnStyle, background: GREEN, color: '#000', fontWeight: 600, fontSize: 14, padding: '10px 20px' }}>
          + New Brief
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
        <div style={statCard}>
          <div style={{ fontSize: 28, fontWeight: 700, color: WHITE }}>{stats.total}</div>
          <div style={{ fontSize: 12, color: MUTED }}>Briefs Submitted</div>
        </div>
        <div style={statCard}>
          <div style={{ fontSize: 28, fontWeight: 700, color: GREEN }}>{stats.streak}w</div>
          <div style={{ fontSize: 12, color: MUTED }}>Week Streak</div>
        </div>
        <div style={statCard}>
          <div style={{ fontSize: 28, fontWeight: 700, color: '#3B82F6' }}>{stats.channelsTracked}</div>
          <div style={{ fontSize: 12, color: MUTED }}>Channels Tracked</div>
        </div>
        <div style={statCard}>
          <div style={{ fontSize: 28, fontWeight: 700, color: '#F59E0B' }}>{stats.totalIdeas}</div>
          <div style={{ fontSize: 12, color: MUTED }}>Ideas Generated</div>
        </div>
      </div>

      {/* Briefs list */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: MUTED }}>Loading...</div>
      ) : briefs.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 40, color: MUTED }}>No briefs yet. Click "+ New Brief" to start your first weekly research brief.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {briefs.map(b => {
            const isExpanded = expandedId === b.id
            const children = childData[b.id]
            return (
              <div key={b.id} style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 10, overflow: 'hidden' }}>
                {/* Brief header row */}
                <div style={{ display: 'flex', alignItems: 'center', padding: '14px 18px', cursor: 'pointer', gap: 16 }}
                  onClick={() => loadChildren(b.id)}>
                  <span style={{ fontSize: 12, color: MUTED, transform: isExpanded ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s' }}>&#9654;</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: WHITE }}>
                      Week of {formatDate(b.week_start)} -- {formatDate(b.week_end)}
                    </div>
                    <div style={{ fontSize: 12, color: MUTED, marginTop: 2 }}>
                      {(b.channels_reviewed || []).join(', ')}
                    </div>
                  </div>
                  {b.top_performer_title && (
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 11, color: MUTED }}>Top performer</div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: GREEN }}>{b.top_performer_channel}</div>
                    </div>
                  )}
                  <button onClick={e => { e.stopPropagation(); setEditing(b); setShowForm(true) }}
                    style={{ ...btnStyle, background: 'var(--dark)', color: SECONDARY, border: `1px solid ${BORDER}`, fontSize: 11, padding: '4px 10px' }}>Edit</button>
                </div>

                {/* Expanded content */}
                {isExpanded && children && (
                  <div style={{ borderTop: `1px solid ${BORDER}`, padding: '16px 18px' }}>
                    {/* Videos */}
                    {children.videos.length > 0 && (
                      <div style={{ marginBottom: 16 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>Videos Logged ({children.videos.length})</div>
                        <div style={{ overflowX: 'auto' }}>
                          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                            <thead>
                              <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                                <th style={{ ...thStyle, textAlign: 'left' }}>Channel</th>
                                <th style={{ ...thStyle, textAlign: 'left' }}>Title</th>
                                <th style={thStyle}>Views</th>
                                <th style={thStyle}>Days Ago</th>
                                <th style={{ ...thStyle, textAlign: 'left' }}>What Stands Out</th>
                              </tr>
                            </thead>
                            <tbody>
                              {children.videos.map((v, i) => (
                                <tr key={i} style={{ borderBottom: `1px solid ${BORDER}` }}>
                                  <td style={{ ...tdStyle, textAlign: 'left', fontWeight: 600, color: '#3B82F6' }}>{v.channel_name}</td>
                                  <td style={{ ...tdStyle, textAlign: 'left', color: WHITE }}>{v.video_title}</td>
                                  <td style={tdStyle}>{v.views_at_review ? v.views_at_review.toLocaleString() : '--'}</td>
                                  <td style={tdStyle}>{v.days_since_posted ?? '--'}</td>
                                  <td style={{ ...tdStyle, textAlign: 'left', color: SECONDARY }}>{v.notable_element || '--'}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {/* Top Performer Analysis */}
                    {b.top_performer_title && (
                      <div style={{ background: 'var(--dark)', borderRadius: 8, padding: 14, marginBottom: 12 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: GREEN, marginBottom: 6 }}>Top Performer: "{b.top_performer_title}" -- {b.top_performer_channel}</div>
                        {b.top_performer_analysis && <div style={{ fontSize: 13, color: SECONDARY, lineHeight: 1.5, marginBottom: 8 }}>{b.top_performer_analysis}</div>}
                        {b.peachfit_adaptation && <div style={{ fontSize: 12, color: WHITE, lineHeight: 1.5 }}><strong>PeachFit angle:</strong> {b.peachfit_adaptation}</div>}
                      </div>
                    )}

                    {/* Trends */}
                    {b.trends_observed && (
                      <div style={{ marginBottom: 12 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: MUTED, marginBottom: 4 }}>Trends Observed</div>
                        <div style={{ fontSize: 13, color: SECONDARY, lineHeight: 1.5 }}>{b.trends_observed}</div>
                      </div>
                    )}

                    {/* Ideas */}
                    {children.ideas.length > 0 && (
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 600, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>Ideas for Backlog ({children.ideas.length})</div>
                        {children.ideas.map((idea, i) => (
                          <div key={i} style={{ padding: '6px 0', borderBottom: i < children.ideas.length - 1 ? `1px solid ${BORDER}` : 'none', display: 'flex', gap: 8 }}>
                            <span style={{ color: GREEN, fontWeight: 700, fontSize: 13 }}>{i + 1}.</span>
                            <div>
                              <div style={{ fontSize: 13, color: WHITE }}>{idea.concept}</div>
                              {idea.inspired_by && <div style={{ fontSize: 11, color: MUTED }}>Inspired by: {idea.inspired_by}</div>}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {showForm && (
        <BriefForm brief={editing} onSave={() => { setShowForm(false); setEditing(null); setChildData({}); load() }} onClose={() => { setShowForm(false); setEditing(null) }} />
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
const thStyle = { padding: '8px 10px', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: 'center', whiteSpace: 'nowrap' }
const tdStyle = { padding: '8px 10px', textAlign: 'center', verticalAlign: 'middle' }
