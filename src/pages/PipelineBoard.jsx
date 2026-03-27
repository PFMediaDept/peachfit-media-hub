import MobilePipeline from "./MobilePipeline"
import { useState, useEffect, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'

// ── COLOR MAPS ──
const PILL_COLORS = {
  // Priority
  high: '#EF4444', medium: '#F59E0B', low: '#3B82F6',
  // Content Pillars (YouTube)
  transformation: '#EC4899', educational: '#8B5CF6', experiment: '#F97316', 'grocery-meal': '#10B981', 'docu-series': '#6366F1',
  // Content Pillars (Short Form)
  cooking: '#F97316', education: '#8B5CF6', lifestyle: '#EC4899', 'trending-reactive': '#EF4444',
  // Content Pillars (Ads)
  vsl: '#EF4444', 'ugc-style': '#F59E0B', testimonial: '#10B981', 'direct-response': '#3B82F6', 'brand-awareness': '#8B5CF6',
  // Content Pillars (Production)
  'youtube-shoot': '#3B82F6', 'ad-shoot': '#F97316', 'photo-shoot': '#EC4899', 'b-roll': '#10B981', equipment: 'var(--text-muted)',
  // Content Tiers
  flagship: '#EF4444', standard: '#3B82F6', 'quick-turn': '#10B981', 'high-production': '#8B5CF6', hero: '#EF4444', iteration: '#F59E0B',
  // QC Results
  pass: '#10B981', 'minor-revisions': '#F59E0B', 'targeted-revisions': '#F97316', 'major-revisions': '#EF4444', restart: '#DC2626',
  // Thumbnail Status
  'not-started': 'var(--text-muted)', 'in-progress': '#F59E0B', ready: '#10B981', 'ab-testing': '#8B5CF6',
}

function getPillColor(value) {
  return PILL_COLORS[value] || 'var(--text-muted)'
}

// ── PILL SELECT COMPONENT ──
function PillSelect({ label, value, options, onChange, placeholder }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    function handleClick(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const selected = options.find(o => o.value === value)
  const color = selected ? getPillColor(selected.value) : null

  return (
    <div style={modal.field}>
      <label style={modal.label}>{label}</label>
      <div ref={ref} style={{ position: 'relative' }}>
        <div style={dd.trigger} onClick={() => setOpen(!open)}>
          {selected ? (
            <span style={{ ...dd.pill, background: color + '18', color: color, borderColor: color + '40' }}>{selected.label}</span>
          ) : (
            <span style={dd.placeholder}>{placeholder || 'Select...'}</span>
          )}
          <span style={dd.arrow}>{open ? '▲' : '▼'}</span>
        </div>
        {open && (
          <div style={dd.menu}>
            {placeholder && (
              <div style={dd.menuItem} onClick={() => { onChange(null); setOpen(false) }}>
                <span style={dd.emptyPill}>--</span>
              </div>
            )}
            {options.map(o => {
              const c = getPillColor(o.value)
              const isActive = o.value === value
              return (
                <div key={o.value} style={{ ...dd.menuItem, ...(isActive ? dd.menuItemActive : {}) }} onClick={() => { onChange(o.value); setOpen(false) }}>
                  <span style={{ ...dd.pill, background: c + '18', color: c, borderColor: c + '40' }}>{o.label}</span>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

// ── HELPERS ──
function getDueDateStyle(dateStr) {
  if (!dateStr) return {}
  const now = new Date(); now.setHours(0, 0, 0, 0)
  const due = new Date(dateStr + 'T00:00:00')
  const diff = Math.floor((due - now) / (1000 * 60 * 60 * 24))
  if (diff < 0) return { color: '#EF4444', fontWeight: '600' }
  if (diff === 0) return { color: '#F59E0B', fontWeight: '600' }
  if (diff <= 2) return { color: '#F59E0B' }
  return { color: 'var(--text-muted)' }
}

function getDueDateLabel(dateStr) {
  if (!dateStr) return ''
  const now = new Date(); now.setHours(0, 0, 0, 0)
  const due = new Date(dateStr + 'T00:00:00')
  const diff = Math.floor((due - now) / (1000 * 60 * 60 * 24))
  if (diff < 0) return 'Overdue'
  if (diff === 0) return 'Due today'
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function getInitials(name) {
  if (!name) return '?'
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

// Subtask colors mapped to pipeline stage colors by sort_order
const SUBTASK_COLORS = {
  youtube: {
    1: 'var(--text-muted)',  // Idea validated -- Idea Bank gray
    2: '#F59E0B',  // Script drafted -- In Production amber
    3: '#F59E0B',  // Script reviewed -- In Production amber
    4: '#F59E0B',  // Filming scheduled -- In Production amber
    5: '#F59E0B',  // Filming complete -- In Production amber
    6: '#F59E0B',  // Raw footage uploaded -- In Production amber
    7: '#3B82F6',  // Editor assigned -- Rough Cut blue
    8: '#3B82F6',  // Rough cut delivered -- Rough Cut blue
    9: '#EC4899',  // QC reviewed rough -- QC Review pink
    10: '#EC4899', // Loom feedback sent -- QC Review pink
    11: '#8B5CF6', // Revisions complete -- Final Cut purple
    12: '#EC4899', // QC reviewed final -- QC Review pink
    13: '#F97316', // Thumbnails designed -- Thumbnail Ready orange
    14: '#F97316', // Thumbnail selected -- Thumbnail Ready orange
    15: '#10B981', // Metadata prepared -- Publishing Queue green
    16: '#37CA37', // Published -- Published green
  },
  'short-form': {
    1: '#F59E0B',  // Script/talking points -- Script amber
    2: '#3B82F6',  // Filming complete -- Filming blue
    3: '#3B82F6',  // Raw footage uploaded -- Filming blue
    4: '#8B5CF6',  // Editing complete -- Editing purple
    5: '#8B5CF6',  // Captions added -- Editing purple
    6: '#EC4899',  // QC review pass -- QC Review pink
    7: '#10B981',  // Approved video uploaded -- Ready to Post green
    8: '#10B981',  // Sound added -- Ready to Post green
    9: '#10B981',  // Caption added -- Ready to Post green
    10: '#37CA37', // Scheduled -- Scheduled green
    11: '#37CA37', // Published -- Published green
  },
}

// ── OPTION DEFINITIONS ──
const YT_PILLARS = [{ value: 'transformation', label: 'Transformation' }, { value: 'educational', label: 'Educational' }, { value: 'experiment', label: 'Experiment' }, { value: 'grocery-meal', label: 'Grocery / Meal' }, { value: 'docu-series', label: 'Docu-Series' }]
const YT_TIERS = [{ value: 'flagship', label: 'Flagship' }, { value: 'standard', label: 'Standard' }, { value: 'quick-turn', label: 'Quick Turnaround' }]
const SF_PILLARS = [{ value: 'transformation', label: 'Transformation' }, { value: 'cooking', label: 'Cooking' }, { value: 'education', label: 'Education' }, { value: 'lifestyle', label: 'Lifestyle' }, { value: 'trending-reactive', label: 'Trending / Reactive' }]
const SF_TIERS = [{ value: 'quick-turn', label: 'Quick Turnaround' }, { value: 'standard', label: 'Standard' }, { value: 'high-production', label: 'High Production' }]
const ADS_PILLARS = [{ value: 'vsl', label: 'VSL' }, { value: 'ugc-style', label: 'UGC Style' }, { value: 'testimonial', label: 'Testimonial' }, { value: 'direct-response', label: 'Direct Response' }, { value: 'brand-awareness', label: 'Brand Awareness' }]
const ADS_TIERS = [{ value: 'hero', label: 'Hero (high production)' }, { value: 'standard', label: 'Standard' }, { value: 'iteration', label: 'Iteration / Hook Swap' }]
const PROD_PILLARS = [{ value: 'youtube-shoot', label: 'YouTube Shoot' }, { value: 'ad-shoot', label: 'Ad Shoot' }, { value: 'photo-shoot', label: 'Photo Shoot' }, { value: 'b-roll', label: 'B-Roll Capture' }, { value: 'equipment', label: 'Equipment / Setup' }]
const PRIORITIES = [{ value: 'high', label: 'High' }, { value: 'medium', label: 'Medium' }, { value: 'low', label: 'Low' }]
const QC_RESULTS = [{ value: 'pass', label: 'Pass' }, { value: 'minor-revisions', label: 'Minor Revisions' }, { value: 'targeted-revisions', label: 'Targeted Revisions' }, { value: 'major-revisions', label: 'Major Revisions' }, { value: 'restart', label: 'Restart' }]
const THUMB_STATUSES = [{ value: 'not-started', label: 'Not Started' }, { value: 'in-progress', label: 'In Progress' }, { value: 'ready', label: 'Ready' }, { value: 'ab-testing', label: 'A/B Testing' }]

// ── TASK DETAIL MODAL ──
function TaskDetail({ task, statuses, members, branchSlug, onClose, onUpdate }) {
  const [form, setForm] = useState({ ...task })
  const [subtasks, setSubtasks] = useState([])
  const [comments, setComments] = useState([])
  const [newComment, setNewComment] = useState('')
  const [saving, setSaving] = useState(false)
  const { user } = useAuth()

  useEffect(() => { fetchSubtasks(); fetchComments() }, [task.id])

  async function fetchSubtasks() {
    const { data } = await supabase.from('pipeline_subtasks').select('*').eq('task_id', task.id).order('sort_order')
    setSubtasks(data || [])
  }
  async function fetchComments() {
    const { data } = await supabase.from('pipeline_comments').select('*').eq('task_id', task.id).order('created_at', { ascending: false })
    setComments(data || [])
  }
  async function toggleSubtask(st) {
    await supabase.from('pipeline_subtasks').update({ completed: !st.completed, completed_at: !st.completed ? new Date().toISOString() : null, completed_by: !st.completed ? user.id : null }).eq('id', st.id)
    fetchSubtasks()
  }
  async function addComment() {
    if (!newComment.trim()) return
    await supabase.from('pipeline_comments').insert({ task_id: task.id, user_id: user.id, body: newComment.trim() })
    setNewComment(''); fetchComments()
  }
  async function handleSave() {
    setSaving(true)
    const { id, created_at, created_by, profiles, pipeline_subtasks, ...updates } = form
    const { error } = await supabase.from('pipeline_tasks').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', task.id)
    if (error) console.error('Save error:', error)
    setSaving(false); onUpdate()
  }
  async function handleDelete() {
    if (!confirm('Delete this task and all subtasks?')) return
    await supabase.from('pipeline_tasks').delete().eq('id', task.id)
    onUpdate(); onClose()
  }

  const completedCount = subtasks.filter(s => s.completed).length
  const isYouTube = branchSlug === 'youtube'
  const isShortForm = branchSlug === 'short-form'
  const isAds = branchSlug === 'ads-creative'
  const isProduction = branchSlug === 'production'

  const statusOpts = statuses.map(s => ({ value: s.id, label: s.name }))
  const memberOpts = members.map(m => ({ value: m.id, label: m.full_name }))

  return (
    <div style={modal.overlay} onClick={onClose}>
      <div style={modal.container} onClick={e => e.stopPropagation()}>
        {/* Title bar */}
        <div style={modal.header}>
          <input type="text" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} style={modal.titleInput} />
          <button onClick={onClose} style={modal.closeBtn}>✕</button>
        </div>

        {/* ClickUp-style top bar: Status, Assignee, Priority, Dates */}
        <div style={modal.topBar}>
          <div style={modal.topBarItem}>
            <span style={modal.topBarLabel}>Status</span>
            <select value={form.status_id || ''} onChange={e => setForm(p => ({ ...p, status_id: e.target.value }))} style={{ ...modal.topBarSelect, background: (statuses.find(s => s.id === form.status_id)?.color || 'var(--text-muted)') + '25', color: statuses.find(s => s.id === form.status_id)?.color || 'var(--text-muted)', borderColor: (statuses.find(s => s.id === form.status_id)?.color || 'var(--text-muted)') + '50' }}>
              {statuses.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div style={modal.topBarItem}>
            <span style={modal.topBarLabel}>Assignee</span>
            <select value={form.assignee_id || ''} onChange={e => setForm(p => ({ ...p, assignee_id: e.target.value || null }))} style={modal.topBarSelect}>
              <option value="">Unassigned</option>
              {members.map(m => <option key={m.id} value={m.id}>{m.full_name}</option>)}
            </select>
          </div>
          <div style={modal.topBarItem}>
            <span style={modal.topBarLabel}>Priority</span>
            <select value={form.priority || ''} onChange={e => setForm(p => ({ ...p, priority: e.target.value || null }))} style={{ ...modal.topBarSelect, color: form.priority === 'high' ? '#EF4444' : form.priority === 'medium' ? '#F59E0B' : form.priority === 'low' ? '#3B82F6' : 'var(--text-secondary)' }}>
              <option value="">None</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
          <div style={modal.topBarItem}>
            <span style={modal.topBarLabel}>Due Date</span>
            <input type="date" value={form.due_date || ''} onChange={e => setForm(p => ({ ...p, due_date: e.target.value || null }))} style={modal.topBarInput} />
          </div>
          <div style={modal.topBarItem}>
            <span style={modal.topBarLabel}>Publish Date</span>
            <input type="date" value={form.publish_date || ''} onChange={e => setForm(p => ({ ...p, publish_date: e.target.value || null }))} style={modal.topBarInput} />
          </div>
        </div>

        <div style={modal.body}>
          <div style={modal.main}>
            <div style={modal.section}>
              <label style={modal.label}>Description / Notes</label>
              <textarea value={form.description || ''} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} rows={3} style={modal.textarea} placeholder="Add notes..." />
            </div>
            <div style={modal.section}>
              <label style={modal.label}>Subtasks ({completedCount}/{subtasks.length})</label>
              <div style={modal.progressTrack}><div style={{ ...modal.progressFill, width: subtasks.length > 0 ? (completedCount / subtasks.length * 100) + '%' : '0%' }} /></div>
              <div style={modal.subtaskList}>
                {subtasks.map(st => {
                  const stColor = (st.color && st.color !== 'var(--text-muted)') ? st.color : SUBTASK_COLORS[branchSlug]?.[st.sort_order] || 'var(--text-muted)'
                  const stAssignee = members.find(m => m.id === st.assignee_id)
                  return (
                    <div key={st.id} style={modal.subtaskItem}>
                      <div style={{ ...modal.subtaskDot, background: stColor }} title={`Stage color`} />
                      <div onClick={() => toggleSubtask(st)} style={{ ...modal.checkbox, background: st.completed ? 'var(--green)' : 'transparent', borderColor: st.completed ? 'var(--green)' : 'var(--dark-border)', cursor: 'pointer' }}>
                        {st.completed && <span style={{ color: 'var(--black)', fontSize: '10px', fontWeight: '700' }}>✓</span>}
                      </div>
                      <span onClick={() => toggleSubtask(st)} style={{ textDecoration: st.completed ? 'line-through' : 'none', color: st.completed ? 'var(--text-muted)' : 'var(--text-primary)', fontSize: '13px', flex: 1, cursor: 'pointer' }}>{st.title}</span>
                      <select
                        value={st.assignee_id || ''}
                        onClick={e => e.stopPropagation()}
                        onChange={async e => {
                          const val = e.target.value || null
                          await supabase.from('pipeline_subtasks').update({ assignee_id: val }).eq('id', st.id)
                          fetchSubtasks()
                        }}
                        style={modal.subtaskAssignee}
                        title={stAssignee ? stAssignee.full_name : 'Assign'}
                      >
                        <option value="">--</option>
                        {members.map(m => <option key={m.id} value={m.id}>{m.full_name}</option>)}
                      </select>
                    </div>
                  )
                })}
              </div>
            </div>
            <div style={modal.section}>
              <label style={modal.label}>Activity</label>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                <input type="text" value={newComment} onChange={e => setNewComment(e.target.value)} onKeyDown={e => e.key === 'Enter' && addComment()} placeholder="Add a note..." style={{ ...modal.input, flex: 1 }} />
                <button onClick={addComment} style={modal.commentBtn}>Post</button>
              </div>
              {comments.map(c => (
                <div key={c.id} style={modal.comment}>
                  <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--green)' }}>Note</div>
                  <div style={{ fontSize: '13px', color: 'var(--text-secondary)', whiteSpace: 'pre-wrap' }}>{c.body}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>{new Date(c.created_at).toLocaleString()}</div>
                </div>
              ))}
            </div>
          </div>

          {/* ── SIDEBAR ── */}
          <div style={modal.sidebar}>

            {isYouTube && (<>
              <PillSelect label="Content Pillar" value={form.content_pillar} options={YT_PILLARS} onChange={v => setForm(p => ({ ...p, content_pillar: v }))} placeholder="Select..." />
              <PillSelect label="Content Tier" value={form.content_tier} options={YT_TIERS} onChange={v => setForm(p => ({ ...p, content_tier: v }))} placeholder="Select..." />
              <div style={modal.field}><label style={modal.label}>Editor Assigned</label>
                <input type="text" value={form.editor_assigned || ''} onChange={e => setForm(p => ({ ...p, editor_assigned: e.target.value }))} placeholder="Editor name" style={modal.input} /></div>
              <div style={modal.field}><label style={modal.label}>QC Date</label>
                <input type="date" value={form.qc_date || ''} onChange={e => setForm(p => ({ ...p, qc_date: e.target.value || null }))} style={modal.input} /></div>
              <PillSelect label="QC Result" value={form.qc_result} options={QC_RESULTS} onChange={v => setForm(p => ({ ...p, qc_result: v }))} placeholder="Select..." />
              <div style={modal.field}><label style={modal.label}>QC Score (%)</label>
                <input type="number" min="0" max="100" value={form.qc_score || ''} onChange={e => setForm(p => ({ ...p, qc_score: parseInt(e.target.value) || null }))} style={modal.input} /></div>
              <PillSelect label="Thumbnail Status" value={form.thumbnail_status || 'not-started'} options={THUMB_STATUSES} onChange={v => setForm(p => ({ ...p, thumbnail_status: v }))} />
              <div style={modal.field}><label style={modal.label}>Talent</label>
                {['Jacob Correia','Ryan Snow','Ethan Bernard','Frankie','Other'].map(t => (
                  <label key={t} style={modal.checkLabel}><input type="checkbox" checked={(form.talent||[]).includes(t)} onChange={() => { const a=form.talent||[]; setForm(p=>({...p,talent:a.includes(t)?a.filter(x=>x!==t):[...a,t]})) }} />{t}</label>
                ))}</div>
            </>)}

            {isShortForm && (<>
              <div style={modal.field}><label style={modal.label}>SOB (School Of Bots)</label>
                <label style={{ ...modal.checkLabel, background: form.is_sob ? 'rgba(244,171,156,0.15)' : 'transparent', padding: '4px 8px', borderRadius: '6px', border: form.is_sob ? '1px solid rgba(244,171,156,0.3)' : '1px solid transparent' }}><input type="checkbox" checked={form.is_sob || false} onChange={e => setForm(p => ({ ...p, is_sob: e.target.checked }))} /><span style={{ color: form.is_sob ? '#F4AB9C' : 'var(--text-secondary)', fontWeight: form.is_sob ? '600' : '400' }}>SOB Content</span></label></div>
              <PillSelect label="Content Pillar" value={form.content_pillar} options={SF_PILLARS} onChange={v => setForm(p => ({ ...p, content_pillar: v }))} placeholder="Select..." />
              <PillSelect label="Content Tier" value={form.content_tier} options={SF_TIERS} onChange={v => setForm(p => ({ ...p, content_tier: v }))} placeholder="Select..." />
              <div style={modal.field}><label style={modal.label}>Backlog Week</label>
                <input type="text" value={form.backlog_week || ''} onChange={e => setForm(p => ({ ...p, backlog_week: e.target.value }))} placeholder="e.g. Week of 3/31" style={modal.input} /></div>
              <div style={modal.field}><label style={modal.label}>Platform</label>
                {['Instagram Reels','TikTok','YouTube Shorts'].map(p => (
                  <label key={p} style={modal.checkLabel}><input type="checkbox" checked={(form.platform||[]).includes(p)} onChange={() => { const a=form.platform||[]; setForm(prev=>({...prev,platform:a.includes(p)?a.filter(x=>x!==p):[...a,p]})) }} />{p}</label>
                ))}</div>
              <PillSelect label="QC Reviewer" value={form.qc_reviewer} options={[{ value: 'Garrett Harper', label: 'Garrett Harper' },{ value: 'Jacob Correia', label: 'Jacob Correia' },{ value: 'Tommy Bannister', label: 'Tommy Bannister' }]} onChange={v => setForm(p => ({ ...p, qc_reviewer: v }))} placeholder="Select..." />
              <div style={modal.field}><label style={modal.label}>Talent</label>
                {['Jacob Correia','Frankie','Ryan Snow','Ethan Bernard','Other'].map(t => (
                  <label key={t} style={modal.checkLabel}><input type="checkbox" checked={(form.talent||[]).includes(t)} onChange={() => { const a=form.talent||[]; setForm(prev=>({...prev,talent:a.includes(t)?a.filter(x=>x!==t):[...a,t]})) }} />{t}</label>
                ))}</div>
            </>)}

            {isAds && (<>
              <PillSelect label="Content Pillar" value={form.content_pillar} options={ADS_PILLARS} onChange={v => setForm(p => ({ ...p, content_pillar: v }))} placeholder="Select..." />
              <PillSelect label="Content Tier" value={form.content_tier} options={ADS_TIERS} onChange={v => setForm(p => ({ ...p, content_tier: v }))} placeholder="Select..." />
              <div style={modal.field}><label style={modal.label}>Editor Assigned</label>
                <input type="text" value={form.editor_assigned || ''} onChange={e => setForm(p => ({ ...p, editor_assigned: e.target.value }))} placeholder="Editor name" style={modal.input} /></div>
              <PillSelect label="QC Result" value={form.qc_result} options={QC_RESULTS.filter(o => o.value !== 'targeted-revisions')} onChange={v => setForm(p => ({ ...p, qc_result: v }))} placeholder="Select..." />
              <div style={modal.field}><label style={modal.label}>Talent</label>
                {['Jacob Correia','Ryan Snow','Frankie','Other'].map(t => (
                  <label key={t} style={modal.checkLabel}><input type="checkbox" checked={(form.talent||[]).includes(t)} onChange={() => { const a=form.talent||[]; setForm(p=>({...p,talent:a.includes(t)?a.filter(x=>x!==t):[...a,t]})) }} />{t}</label>
                ))}</div>
            </>)}

            {isProduction && (<>
              <PillSelect label="Content Pillar" value={form.content_pillar} options={PROD_PILLARS} onChange={v => setForm(p => ({ ...p, content_pillar: v }))} placeholder="Select..." />
              <div style={modal.field}><label style={modal.label}>Crew Lead / PA</label>
                <input type="text" value={form.editor_assigned || ''} onChange={e => setForm(p => ({ ...p, editor_assigned: e.target.value }))} placeholder="Crew lead" style={modal.input} /></div>
              <div style={modal.field}><label style={modal.label}>Talent</label>
                {['Jacob Correia','Ryan Snow','Frankie','Other'].map(t => (
                  <label key={t} style={modal.checkLabel}><input type="checkbox" checked={(form.talent||[]).includes(t)} onChange={() => { const a=form.talent||[]; setForm(p=>({...p,talent:a.includes(t)?a.filter(x=>x!==t):[...a,t]})) }} />{t}</label>
                ))}</div>
            </>)}

            <div style={modal.field}><label style={modal.label}>First Pass</label>
              <label style={modal.checkLabel}><input type="checkbox" checked={form.first_pass || false} onChange={e => setForm(p => ({ ...p, first_pass: e.target.checked }))} />Completed</label></div>
            <div style={modal.field}><label style={modal.label}>Script Link</label>
              <input type="url" value={form.script_link || ''} onChange={e => setForm(p => ({ ...p, script_link: e.target.value }))} placeholder="Google Doc URL" style={modal.input} /></div>
            <div style={modal.field}><label style={modal.label}>Drive Folder</label>
              <input type="url" value={form.drive_folder_link || ''} onChange={e => setForm(p => ({ ...p, drive_folder_link: e.target.value }))} placeholder="Google Drive URL" style={modal.input} /></div>
            <div style={modal.field}><label style={modal.label}>Video Link</label>
              <input type="url" value={form.video_link || ''} onChange={e => setForm(p => ({ ...p, video_link: e.target.value }))} placeholder="Drive link to video file" style={modal.input} /></div>
            <div style={modal.field}><label style={modal.label}>Google Doc (briefs/notes)</label>
              <input type="url" value={form.google_doc_link || ''} onChange={e => setForm(p => ({ ...p, google_doc_link: e.target.value }))} placeholder="Google Doc URL" style={modal.input} /></div>

            <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
              <button onClick={handleSave} disabled={saving} style={modal.saveBtn}>{saving ? 'Saving...' : 'Save Changes'}</button>
              <button onClick={handleDelete} style={modal.deleteBtn}>Delete</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── TASK CARD ──
function TaskCard({ task, members, subtaskCounts, onClick }) {
  const priorityColors = { high: '#EF4444', medium: '#F59E0B', low: '#3B82F6' }
  const assignee = members.find(m => m.id === task.assignee_id)
  const dueDateStyle = getDueDateStyle(task.due_date)
  const dueDateLabel = getDueDateLabel(task.due_date)
  const pubDateLabel = task.publish_date ? new Date(task.publish_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''
  const stCount = subtaskCounts[task.id]
  const pillarColor = getPillColor(task.content_pillar)
  const tierColor = getPillColor(task.content_tier)
  const talentList = (task.talent || []).join(', ')

  return (
    <div style={board.card} className="pipeline-card" onClick={() => onClick(task)} draggable
      onDragStart={e => { e.dataTransfer.setData('taskId', task.id); e.dataTransfer.setData('fromStatus', task.status_id); e.currentTarget.style.opacity = '0.4' }}
      onDragEnd={e => { e.currentTarget.style.opacity = '1' }}>
      {/* Title */}
      <div style={board.cardTitle}>{task.title}</div>

      {/* Tags row: priority, pillar, tier */}
      <div style={board.cardMeta}>
        {task.priority && <span style={{ ...board.tag, background: priorityColors[task.priority] + '20', color: priorityColors[task.priority] }}>{task.priority}</span>}
        {task.content_pillar && <span style={{ ...board.tag, background: pillarColor + '18', color: pillarColor }}>{task.content_pillar}</span>}
        {task.content_tier && <span style={{ ...board.tag, background: tierColor + '18', color: tierColor }}>{task.content_tier}</span>}
        {task.thumbnail_status && task.thumbnail_status !== 'not-started' && <span style={{ ...board.tag, background: 'rgba(249,115,22,0.15)', color: '#F97316' }}>🖼 {task.thumbnail_status}</span>}
        {task.is_sob && <span style={{ ...board.tag, background: 'rgba(244,171,156,0.15)', color: '#F4AB9C', fontWeight: '600' }}>SOB</span>}
      </div>

      {/* Info rows */}
      <div style={board.cardDetails}>
        {talentList && <div style={board.cardDetail}><span style={board.cardDetailLabel}>Talent</span><span style={board.cardDetailValue}>{talentList}</span></div>}
        {task.editor_assigned && <div style={board.cardDetail}><span style={board.cardDetailLabel}>Editor</span><span style={board.cardDetailValue}>{task.editor_assigned}</span></div>}
      </div>

      {/* Footer: assignee, dates, subtasks */}
      <div style={board.cardFooter}>
        {assignee && <span style={board.assigneeBadge} title={assignee.full_name}>{getInitials(assignee.full_name)}</span>}
        {task.due_date && <span style={{ ...board.cardDatePill, ...dueDateStyle }}>{dueDateLabel}</span>}
        {pubDateLabel && <span style={board.cardDatePill} title="Publish date">📅 {pubDateLabel}</span>}
        {stCount && stCount.total > 0 && (
          <span style={{ ...board.tag, fontSize: '10px', color: stCount.done === stCount.total ? 'var(--green)' : 'var(--text-muted)' }}>✓ {stCount.done}/{stCount.total}</span>
        )}
      </div>
    </div>
  )
}

// ── MAIN PIPELINE BOARD ──
export default function PipelineBoard() {
  const { slug } = useParams()
  const { user } = useAuth()
  const [statuses, setStatuses] = useState([])
  const [tasks, setTasks] = useState([])
  const [members, setMembers] = useState([])
  const [subtaskCounts, setSubtaskCounts] = useState({})
  const [selectedTask, setSelectedTask] = useState(null)
  const [newTaskStatus, setNewTaskStatus] = useState(null)
  const [newTitle, setNewTitle] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [dragOverColumn, setDragOverColumn] = useState(null)

  useEffect(() => { fetchStatuses(); fetchTasks(); fetchMembers() }, [slug])

  async function fetchStatuses() {
    const { data } = await supabase.from('pipeline_statuses').select('*').eq('branch_slug', slug).order('sort_order')
    setStatuses(data || [])
  }
  async function fetchTasks() {
    const { data, error } = await supabase.from('pipeline_tasks').select('*').eq('branch_slug', slug).order('sort_order')
    if (error) console.error('fetchTasks error:', error)
    const list = data || []; setTasks(list)
    if (list.length > 0) {
      const { data: subs } = await supabase.from('pipeline_subtasks').select('task_id, completed').in('task_id', list.map(t => t.id))
      const counts = {}; (subs || []).forEach(s => { if (!counts[s.task_id]) counts[s.task_id] = { done: 0, total: 0 }; counts[s.task_id].total++; if (s.completed) counts[s.task_id].done++ })
      setSubtaskCounts(counts)
    }
  }
  async function fetchMembers() {
    const { data } = await supabase.from('profiles').select('id, full_name').order('full_name')
    setMembers(data || [])
  }
  async function createTask(statusId) {
    if (!newTitle.trim()) return
    const maxOrder = Math.max(0, ...tasks.filter(t => t.status_id === statusId).map(t => t.sort_order || 0))
    const { error } = await supabase.from('pipeline_tasks').insert({ branch_slug: slug, status_id: statusId, title: newTitle.trim(), sort_order: maxOrder + 1, created_by: user.id })
    if (error) console.error('createTask error:', error)
    setNewTitle(''); setNewTaskStatus(null); fetchTasks()
  }
  async function moveTask(taskId, toStatusId) {
    const maxOrder = Math.max(0, ...tasks.filter(t => t.status_id === toStatusId).map(t => t.sort_order || 0))
    await supabase.from('pipeline_tasks').update({ status_id: toStatusId, sort_order: maxOrder + 1, updated_at: new Date().toISOString() }).eq('id', taskId)
    fetchTasks()
  }
  function handleDrop(e, statusId) {
    e.preventDefault(); setDragOverColumn(null)
    const taskId = e.dataTransfer.getData('taskId'), fromStatus = e.dataTransfer.getData('fromStatus')
    if (fromStatus !== statusId) moveTask(taskId, statusId)
  }

  const filtered = searchQuery.trim()
    ? tasks.filter(t => t.title.toLowerCase().includes(searchQuery.toLowerCase()) || (t.content_pillar||'').toLowerCase().includes(searchQuery.toLowerCase()) || (t.editor_assigned||'').toLowerCase().includes(searchQuery.toLowerCase()) || (t.description||'').toLowerCase().includes(searchQuery.toLowerCase()))
    : tasks

  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)
  useEffect(() => { const h = () => setIsMobile(window.innerWidth < 768); window.addEventListener("resize", h); return () => window.removeEventListener("resize", h); }, [])

  if (isMobile) return <MobilePipeline statuses={statuses} tasks={filtered} members={members} branchSlug={slug} subtaskCounts={subtaskCounts} onUpdate={fetchTasks} onCreateTask={fetchTasks} />

  return (
    <div>
      <div style={board.toolbar} className="pipeline-toolbar">
        <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search tasks..." style={board.searchInput} className="pipeline-search" />
        <span style={board.taskCount}>{filtered.length} task{filtered.length !== 1 ? 's' : ''}</span>
      </div>
      <div style={board.container} className="pipeline-container">
        {statuses.map(status => {
          const col = filtered.filter(t => t.status_id === status.id)
          const isOver = dragOverColumn === status.id
          return (
            <div key={status.id} className="pipeline-column" style={{ ...board.column, ...(isOver ? board.columnDragOver : {}) }}
              onDragOver={e => { e.preventDefault(); setDragOverColumn(status.id) }}
              onDragLeave={() => setDragOverColumn(null)} onDrop={e => handleDrop(e, status.id)}>
              <div style={board.columnHeader} className="pipeline-column-header">
                <div style={{ ...board.statusPill, background: status.color + '20', color: status.color, borderColor: status.color + '40' }}>
                  <div style={{ ...board.statusDot, background: status.color }} />{status.name}
                </div>
                <span style={board.columnCount}>{col.length}</span>
              </div>
              <div style={board.cardList} className="pipeline-card-list">
                {col.map(task => (<TaskCard key={task.id} task={task} members={members} subtaskCounts={subtaskCounts} onClick={setSelectedTask} />))}
              </div>
              {newTaskStatus === status.id ? (
                <div style={board.newTaskForm}>
                  <input type="text" value={newTitle} onChange={e => setNewTitle(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') createTask(status.id); if (e.key === 'Escape') setNewTaskStatus(null) }} placeholder="Task title..." autoFocus style={board.newTaskInput} />
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button onClick={() => createTask(status.id)} style={board.newTaskBtn}>Add</button>
                    <button onClick={() => setNewTaskStatus(null)} style={board.newTaskCancel}>Cancel</button>
                  </div>
                </div>
              ) : (
                <button onClick={() => { setNewTaskStatus(status.id); setNewTitle('') }} style={board.addTaskBtn} className="pipeline-add-btn">+ Add task</button>
              )}
            </div>
          )
        })}
      </div>
      {selectedTask && (
        <TaskDetail task={selectedTask} statuses={statuses} members={members} branchSlug={slug}
          onClose={() => setSelectedTask(null)} onUpdate={() => { fetchTasks(); setSelectedTask(null) }} />
      )}
    </div>
  )
}

// ── STYLES ──
const dd = {
  trigger: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 10px', background: 'var(--dark)', border: '1px solid var(--dark-border)', borderRadius: '8px', cursor: 'pointer', minHeight: '36px' },
  arrow: { fontSize: '8px', color: 'var(--text-muted)', marginLeft: '8px' },
  placeholder: { fontSize: '13px', color: 'var(--text-muted)' },
  pill: { display: 'inline-flex', alignItems: 'center', padding: '3px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: '600', border: '1px solid', whiteSpace: 'nowrap' },
  emptyPill: { fontSize: '12px', color: 'var(--text-muted)', padding: '3px 10px' },
  menu: { position: 'absolute', top: '100%', left: 0, right: 0, marginTop: '4px', background: 'var(--dark-card)', border: '1px solid var(--dark-border)', borderRadius: '10px', padding: '4px', zIndex: 50, maxHeight: '220px', overflowY: 'auto', boxShadow: '0 8px 24px rgba(0,0,0,0.4)' },
  menuItem: { padding: '6px 8px', borderRadius: '6px', cursor: 'pointer', transition: 'background 0.1s' },
  menuItemActive: { background: 'rgba(255,255,255,0.06)' },
}

const board = {
  toolbar: { display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' },
  searchInput: { padding: '8px 14px', background: 'var(--dark-card)', border: '1px solid var(--dark-border)', borderRadius: '8px', color: 'var(--white)', fontSize: '13px', outline: 'none', width: '260px' },
  taskCount: { fontSize: '12px', color: 'var(--text-muted)' },
  container: { display: 'flex', gap: '12px', overflowX: 'auto', paddingBottom: '20px', minHeight: 'calc(100vh - 240px)' },
  column: { minWidth: '280px', maxWidth: '280px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', padding: '12px', display: 'flex', flexDirection: 'column', transition: 'background 0.15s' },
  columnDragOver: { background: 'rgba(55,202,55,0.04)', outline: '1px dashed rgba(55,202,55,0.3)', outlineOffset: '-1px' },
  columnHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', padding: '2px 0' },
  statusPill: { display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '600', border: '1px solid', letterSpacing: '0.2px' },
  statusDot: { width: '7px', height: '7px', borderRadius: '50%', flexShrink: 0 },
  columnCount: { fontSize: '12px', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.06)', padding: '2px 8px', borderRadius: '10px' },
  cardList: { display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 },
  card: { padding: '12px 14px', background: 'var(--dark-card)', border: '1px solid var(--dark-border)', borderRadius: '8px', cursor: 'pointer', transition: 'border-color 0.15s, opacity 0.15s' },
  cardTitle: { fontSize: '13px', fontWeight: '500', color: 'var(--white)', marginBottom: '8px', lineHeight: '1.4' },
  cardMeta: { display: 'flex', gap: '4px', flexWrap: 'wrap', marginBottom: '6px' },
  tag: { padding: '2px 6px', background: 'rgba(255,255,255,0.06)', borderRadius: '4px', fontSize: '11px', color: 'var(--text-muted)', textTransform: 'capitalize' },
  cardFooter: { display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', marginTop: '6px', paddingTop: '8px', borderTop: '1px solid var(--dark-border)' },
  cardDetails: { display: 'flex', flexDirection: 'column', gap: '3px', marginTop: '4px' },
  cardDetail: { display: 'flex', gap: '6px', fontSize: '11px', lineHeight: '1.3' },
  cardDetailLabel: { color: 'var(--text-muted)', flexShrink: 0, minWidth: '38px' },
  cardDetailValue: { color: 'var(--text-secondary)' },
  cardDatePill: { fontSize: '11px', color: 'var(--text-muted)', padding: '1px 6px', background: 'rgba(255,255,255,0.04)', borderRadius: '4px' },
  assigneeBadge: { width: '22px', height: '22px', borderRadius: '50%', background: 'var(--green)', color: 'var(--black)', fontSize: '9px', fontWeight: '700', display: 'flex', alignItems: 'center', justifyContent: 'center', letterSpacing: '-0.5px' },
  dueDate: { fontSize: '11px' },
  addTaskBtn: { padding: '8px', background: 'transparent', border: '1px dashed var(--dark-border)', borderRadius: '8px', color: 'var(--text-muted)', fontSize: '12px', cursor: 'pointer', marginTop: '6px', textAlign: 'center' },
  newTaskForm: { padding: '10px', background: 'var(--dark-card)', border: '1px solid var(--dark-border)', borderRadius: '8px', marginTop: '6px', display: 'flex', flexDirection: 'column', gap: '8px' },
  newTaskInput: { padding: '8px 10px', background: 'var(--dark)', border: '1px solid var(--dark-border)', borderRadius: '6px', color: 'var(--white)', fontSize: '13px', outline: 'none' },
  newTaskBtn: { padding: '6px 14px', background: 'var(--green)', color: 'var(--black)', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: '600', cursor: 'pointer' },
  newTaskCancel: { padding: '6px 14px', background: 'transparent', border: '1px solid var(--dark-border)', borderRadius: '6px', color: 'var(--text-muted)', fontSize: '12px', cursor: 'pointer' },
}

const modal = {
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: '40px', zIndex: 1000, overflowY: 'auto' },
  container: { width: '100%', maxWidth: '1000px', background: 'var(--dark-card)', border: '1px solid var(--dark-border)', borderRadius: '16px', margin: '0 20px 40px', overflow: 'hidden' },
  header: { display: 'flex', alignItems: 'center', gap: '12px', padding: '20px 24px 12px', borderBottom: 'none' },
  titleInput: { flex: 1, background: 'transparent', border: 'none', color: 'var(--white)', fontSize: '22px', fontWeight: '700', outline: 'none' },
  closeBtn: { width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(255,255,255,0.06)', border: 'none', color: 'var(--text-muted)', fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  topBar: { display: 'flex', gap: '24px', padding: '8px 24px 16px', borderBottom: '1px solid var(--dark-border)', flexWrap: 'wrap', alignItems: 'flex-start' },
  topBarItem: { display: 'flex', flexDirection: 'column', gap: '4px', minWidth: '120px' },
  topBarLabel: { fontSize: '11px', fontWeight: '500', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.3px' },
  topBarSelect: { padding: '6px 10px', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--dark-border)', borderRadius: '6px', color: 'var(--text-secondary)', fontSize: '13px', fontWeight: '500', outline: 'none', cursor: 'pointer', fontFamily: 'inherit' },
  topBarInput: { padding: '6px 10px', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--dark-border)', borderRadius: '6px', color: 'var(--text-secondary)', fontSize: '13px', outline: 'none', fontFamily: 'inherit' },
  body: { display: 'flex', minHeight: '500px' },
  main: { flex: 1, padding: '24px', overflowY: 'auto', maxHeight: '70vh' },
  sidebar: { width: '320px', padding: '24px', borderLeft: '1px solid var(--dark-border)', overflowY: 'auto', maxHeight: '70vh', display: 'flex', flexDirection: 'column', gap: '12px' },
  section: { marginBottom: '24px' },
  label: { fontSize: '11px', fontWeight: '600', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px', display: 'block' },
  input: { width: '100%', padding: '8px 10px', background: 'var(--dark)', border: '1px solid var(--dark-border)', borderRadius: '6px', color: 'var(--white)', fontSize: '13px', outline: 'none' },
  textarea: { width: '100%', padding: '10px 12px', background: 'var(--dark)', border: '1px solid var(--dark-border)', borderRadius: '8px', color: 'var(--white)', fontSize: '13px', outline: 'none', resize: 'vertical', fontFamily: 'inherit' },
  field: { display: 'flex', flexDirection: 'column', gap: '4px' },
  checkLabel: { display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--text-secondary)', cursor: 'pointer' },
  progressTrack: { height: '4px', background: 'var(--dark-border)', borderRadius: '2px', overflow: 'hidden', marginBottom: '10px' },
  progressFill: { height: '100%', background: 'var(--green)', borderRadius: '2px', transition: 'width 0.3s' },
  subtaskList: { display: 'flex', flexDirection: 'column', gap: '2px' },
  subtaskItem: { display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 8px', borderRadius: '6px' },
  subtaskDot: { width: '8px', height: '8px', borderRadius: '50%', flexShrink: 0 },
  subtaskAssignee: { width: 'auto', minWidth: '100px', padding: '2px 4px', background: 'var(--dark)', border: '1px solid var(--dark-border)', borderRadius: '4px', color: 'var(--text-muted)', fontSize: '10px', outline: 'none', cursor: 'pointer', flexShrink: 0, textAlign: 'center' },
  checkbox: { width: '18px', height: '18px', borderRadius: '4px', border: '2px solid', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  comment: { padding: '10px 12px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', marginBottom: '6px' },
  commentBtn: { padding: '8px 16px', background: 'var(--green)', color: 'var(--black)', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: '600', cursor: 'pointer', flexShrink: 0 },
  saveBtn: { flex: 1, padding: '10px', background: 'var(--green)', color: 'var(--black)', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' },
  deleteBtn: { padding: '10px 16px', background: 'rgba(255,80,80,0.1)', border: '1px solid rgba(255,80,80,0.2)', borderRadius: '8px', color: '#ff5050', fontSize: '13px', cursor: 'pointer' },
}
