import { useState, useEffect, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'

// ── TASK DETAIL MODAL ──
function TaskDetail({ task, statuses, members, branchSlug, onClose, onUpdate }) {
  const [form, setForm] = useState({ ...task })
  const [subtasks, setSubtasks] = useState([])
  const [comments, setComments] = useState([])
  const [newComment, setNewComment] = useState('')
  const [saving, setSaving] = useState(false)
  const { user } = useAuth()

  useEffect(() => {
    fetchSubtasks()
    fetchComments()
  }, [task.id])

  async function fetchSubtasks() {
    const { data } = await supabase.from('pipeline_subtasks').select('*').eq('task_id', task.id).order('sort_order')
    setSubtasks(data || [])
  }

  async function fetchComments() {
    const { data } = await supabase.from('pipeline_comments').select('*').eq('task_id', task.id).order('created_at', { ascending: false })
    setComments(data || [])
  }

  async function toggleSubtask(st) {
    await supabase.from('pipeline_subtasks').update({
      completed: !st.completed,
      completed_at: !st.completed ? new Date().toISOString() : null,
      completed_by: !st.completed ? user.id : null,
    }).eq('id', st.id)
    fetchSubtasks()
  }

  async function addComment() {
    if (!newComment.trim()) return
    await supabase.from('pipeline_comments').insert({ task_id: task.id, user_id: user.id, body: newComment.trim() })
    setNewComment('')
    fetchComments()
  }

  async function handleSave() {
    setSaving(true)
    const { id, created_at, created_by, profiles, pipeline_subtasks, ...updates } = form
    await supabase.from('pipeline_tasks').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', task.id)
    setSaving(false)
    onUpdate()
  }

  async function handleDelete() {
    if (!confirm('Delete this task and all subtasks?')) return
    await supabase.from('pipeline_tasks').delete().eq('id', task.id)
    onUpdate()
    onClose()
  }

  const completedCount = subtasks.filter(s => s.completed).length

  const isYouTube = branchSlug === 'youtube'
  const isShortForm = branchSlug === 'short-form'

  return (
    <div style={modal.overlay} onClick={onClose}>
      <div style={modal.container} onClick={e => e.stopPropagation()}>
        <div style={modal.header}>
          <input type="text" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} style={modal.titleInput} />
          <button onClick={onClose} style={modal.closeBtn}>x</button>
        </div>

        <div style={modal.body}>
          <div style={modal.main}>
            {/* Description */}
            <div style={modal.section}>
              <label style={modal.label}>Description / Notes</label>
              <textarea value={form.description || ''} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} rows={3} style={modal.textarea} placeholder="Add notes..." />
            </div>

            {/* Subtasks */}
            <div style={modal.section}>
              <label style={modal.label}>Subtasks ({completedCount}/{subtasks.length})</label>
              <div style={modal.progressTrack}>
                <div style={{ ...modal.progressFill, width: subtasks.length > 0 ? `${(completedCount / subtasks.length) * 100}%` : '0%' }} />
              </div>
              <div style={modal.subtaskList}>
                {subtasks.map(st => (
                  <div key={st.id} style={modal.subtaskItem} onClick={() => toggleSubtask(st)}>
                    <div style={{ ...modal.checkbox, background: st.completed ? 'var(--green)' : 'transparent', borderColor: st.completed ? 'var(--green)' : 'var(--dark-border)' }}>
                      {st.completed && <span style={{ color: 'var(--black)', fontSize: '10px', fontWeight: '700' }}>✓</span>}
                    </div>
                    <span style={{ textDecoration: st.completed ? 'line-through' : 'none', color: st.completed ? 'var(--text-muted)' : 'var(--text-primary)', fontSize: '13px' }}>{st.title}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Comments */}
            <div style={modal.section}>
              <label style={modal.label}>Activity</label>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                <input type="text" value={newComment} onChange={e => setNewComment(e.target.value)} onKeyDown={e => e.key === 'Enter' && addComment()} placeholder="Add a note..." style={{ ...modal.input, flex: 1 }} />
                <button onClick={addComment} style={modal.commentBtn}>Post</button>
              </div>
              {comments.map(c => (
                <div key={c.id} style={modal.comment}>
                  <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--green)' }}>{c.profiles?.full_name || 'Unknown'}</div>
                  <div style={{ fontSize: '13px', color: 'var(--text-secondary)', whiteSpace: 'pre-wrap' }}>{c.body}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>{new Date(c.created_at).toLocaleString()}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Sidebar fields */}
          <div style={modal.sidebar}>
            <div style={modal.field}>
              <label style={modal.label}>Status</label>
              <select value={form.status_id || ''} onChange={e => setForm(p => ({ ...p, status_id: e.target.value }))} style={modal.input}>
                {statuses.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>

            <div style={modal.field}>
              <label style={modal.label}>Assignee</label>
              <select value={form.assignee_id || ''} onChange={e => setForm(p => ({ ...p, assignee_id: e.target.value || null }))} style={modal.input}>
                <option value="">Unassigned</option>
                {members.map(m => <option key={m.id} value={m.id}>{m.full_name}</option>)}
              </select>
            </div>

            <div style={modal.field}>
              <label style={modal.label}>Priority</label>
              <select value={form.priority || ''} onChange={e => setForm(p => ({ ...p, priority: e.target.value || null }))} style={modal.input}>
                <option value="">None</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>

            <div style={modal.field}>
              <label style={modal.label}>Due Date</label>
              <input type="date" value={form.due_date || ''} onChange={e => setForm(p => ({ ...p, due_date: e.target.value || null }))} style={modal.input} />
            </div>

            <div style={modal.field}>
              <label style={modal.label}>Publish Date</label>
              <input type="date" value={form.publish_date || ''} onChange={e => setForm(p => ({ ...p, publish_date: e.target.value || null }))} style={modal.input} />
            </div>

            {isYouTube && (
              <>
                <div style={modal.field}>
                  <label style={modal.label}>Content Pillar</label>
                  <select value={form.content_pillar || ''} onChange={e => setForm(p => ({ ...p, content_pillar: e.target.value || null }))} style={modal.input}>
                    <option value="">Select...</option>
                    <option value="transformation">Transformation</option>
                    <option value="educational">Educational</option>
                    <option value="experiment">Experiment</option>
                    <option value="grocery-meal">Grocery / Meal</option>
                    <option value="docu-series">Docu-Series</option>
                  </select>
                </div>

                <div style={modal.field}>
                  <label style={modal.label}>Content Tier</label>
                  <select value={form.content_tier || ''} onChange={e => setForm(p => ({ ...p, content_tier: e.target.value || null }))} style={modal.input}>
                    <option value="">Select...</option>
                    <option value="flagship">Flagship</option>
                    <option value="standard">Standard</option>
                    <option value="quick-turn">Quick Turnaround</option>
                  </select>
                </div>

                <div style={modal.field}>
                  <label style={modal.label}>Editor Assigned</label>
                  <input type="text" value={form.editor_assigned || ''} onChange={e => setForm(p => ({ ...p, editor_assigned: e.target.value }))} placeholder="Editor name" style={modal.input} />
                </div>

                <div style={modal.field}>
                  <label style={modal.label}>QC Date</label>
                  <input type="date" value={form.qc_date || ''} onChange={e => setForm(p => ({ ...p, qc_date: e.target.value || null }))} style={modal.input} />
                </div>

                <div style={modal.field}>
                  <label style={modal.label}>QC Result</label>
                  <select value={form.qc_result || ''} onChange={e => setForm(p => ({ ...p, qc_result: e.target.value || null }))} style={modal.input}>
                    <option value="">Select...</option>
                    <option value="pass">Pass</option>
                    <option value="minor-revisions">Minor Revisions</option>
                    <option value="targeted-revisions">Targeted Revisions</option>
                    <option value="major-revisions">Major Revisions</option>
                    <option value="restart">Restart</option>
                  </select>
                </div>

                <div style={modal.field}>
                  <label style={modal.label}>QC Score (%)</label>
                  <input type="number" min="0" max="100" value={form.qc_score || ''} onChange={e => setForm(p => ({ ...p, qc_score: parseInt(e.target.value) || null }))} style={modal.input} />
                </div>

                <div style={modal.field}>
                  <label style={modal.label}>Thumbnail Status</label>
                  <select value={form.thumbnail_status || 'not-started'} onChange={e => setForm(p => ({ ...p, thumbnail_status: e.target.value }))} style={modal.input}>
                    <option value="not-started">Not Started</option>
                    <option value="in-progress">In Progress</option>
                    <option value="ready">Ready</option>
                    <option value="ab-testing">A/B Testing</option>
                  </select>
                </div>

                <div style={modal.field}>
                  <label style={modal.label}>Talent</label>
                  {['Jacob Correia', 'Ryan Snow', 'Ethan Bernard', 'Frankie', 'Other'].map(t => (
                    <label key={t} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                      <input type="checkbox" checked={(form.talent || []).includes(t)} onChange={() => {
                        const arr = form.talent || []
                        setForm(p => ({ ...p, talent: arr.includes(t) ? arr.filter(x => x !== t) : [...arr, t] }))
                      }} />
                      {t}
                    </label>
                  ))}
                </div>
              </>
            )}

            {isShortForm && (
              <>
                <div style={modal.field}>
                  <label style={modal.label}>Content Pillar</label>
                  <select value={form.content_pillar || ''} onChange={e => setForm(p => ({ ...p, content_pillar: e.target.value || null }))} style={modal.input}>
                    <option value="">Select...</option>
                    <option value="transformation">Transformation</option>
                    <option value="cooking">Cooking</option>
                    <option value="education">Education</option>
                    <option value="lifestyle">Lifestyle</option>
                    <option value="trending-reactive">Trending / Reactive</option>
                  </select>
                </div>

                <div style={modal.field}>
                  <label style={modal.label}>Content Tier</label>
                  <select value={form.content_tier || ''} onChange={e => setForm(p => ({ ...p, content_tier: e.target.value || null }))} style={modal.input}>
                    <option value="">Select...</option>
                    <option value="quick-turn">Quick Turnaround</option>
                    <option value="standard">Standard</option>
                    <option value="high-production">High Production</option>
                  </select>
                </div>

                <div style={modal.field}>
                  <label style={modal.label}>Backlog Week</label>
                  <input type="text" value={form.backlog_week || ''} onChange={e => setForm(p => ({ ...p, backlog_week: e.target.value }))} placeholder="e.g. Week of 3/31" style={modal.input} />
                </div>

                <div style={modal.field}>
                  <label style={modal.label}>Platform</label>
                  {['Instagram Reels', 'TikTok', 'YouTube Shorts'].map(p => (
                    <label key={p} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                      <input type="checkbox" checked={(form.platform || []).includes(p)} onChange={() => {
                        const arr = form.platform || []
                        setForm(prev => ({ ...prev, platform: arr.includes(p) ? arr.filter(x => x !== p) : [...arr, p] }))
                      }} />
                      {p}
                    </label>
                  ))}
                </div>

                <div style={modal.field}>
                  <label style={modal.label}>QC Reviewer</label>
                  <select value={form.qc_reviewer || ''} onChange={e => setForm(p => ({ ...p, qc_reviewer: e.target.value || null }))} style={modal.input}>
                    <option value="">Select...</option>
                    <option value="Garrett Harper">Garrett Harper</option>
                    <option value="Jacob Correia">Jacob Correia</option>
                    <option value="Tommy Bannister">Tommy Bannister</option>
                  </select>
                </div>

                <div style={modal.field}>
                  <label style={modal.label}>Talent</label>
                  {['Jacob Correia', 'Frankie', 'Ryan Snow', 'Ethan Bernard', 'Other'].map(t => (
                    <label key={t} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                      <input type="checkbox" checked={(form.talent || []).includes(t)} onChange={() => {
                        const arr = form.talent || []
                        setForm(prev => ({ ...prev, talent: arr.includes(t) ? arr.filter(x => x !== t) : [...arr, t] }))
                      }} />
                      {t}
                    </label>
                  ))}
                </div>
              </>
            )}

            <div style={modal.field}>
              <label style={modal.label}>First Pass</label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                <input type="checkbox" checked={form.first_pass || false} onChange={e => setForm(p => ({ ...p, first_pass: e.target.checked }))} />
                Completed
              </label>
            </div>

            <div style={modal.field}>
              <label style={modal.label}>Script Link</label>
              <input type="url" value={form.script_link || ''} onChange={e => setForm(p => ({ ...p, script_link: e.target.value }))} placeholder="Google Doc URL" style={modal.input} />
            </div>

            <div style={modal.field}>
              <label style={modal.label}>Drive Folder</label>
              <input type="url" value={form.drive_folder_link || ''} onChange={e => setForm(p => ({ ...p, drive_folder_link: e.target.value }))} placeholder="Google Drive URL" style={modal.input} />
            </div>

            <div style={modal.field}>
              <label style={modal.label}>Video Link</label>
              <input type="url" value={form.video_link || ''} onChange={e => setForm(p => ({ ...p, video_link: e.target.value }))} placeholder="Drive link to video file" style={modal.input} />
            </div>

            <div style={modal.field}>
              <label style={modal.label}>Google Doc (briefs/notes)</label>
              <input type="url" value={form.google_doc_link || ''} onChange={e => setForm(p => ({ ...p, google_doc_link: e.target.value }))} placeholder="Google Doc URL" style={modal.input} />
            </div>

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
function TaskCard({ task, onClick }) {
  const priorityColors = { high: '#EF4444', medium: '#F59E0B', low: '#3B82F6' }

  return (
    <div style={board.card} onClick={() => onClick(task)} draggable
      onDragStart={e => { e.dataTransfer.setData('taskId', task.id); e.dataTransfer.setData('fromStatus', task.status_id) }}>
      <div style={board.cardTitle}>{task.title}</div>
      <div style={board.cardMeta}>
        {task.priority && <span style={{ ...board.tag, background: priorityColors[task.priority] + '20', color: priorityColors[task.priority] }}>{task.priority}</span>}
        {task.content_pillar && <span style={board.tag}>{task.content_pillar}</span>}
        {task.content_tier && <span style={board.tag}>{task.content_tier}</span>}
      </div>
      <div style={board.cardFooter}>
        {task.assignee_id && <span style={board.assigneeBadge}>{task.profiles?.full_name?.charAt(0) || '?'}</span>}
        {task.due_date && <span style={board.dueDate}>{new Date(task.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>}
        {task.thumbnail_status && task.thumbnail_status !== 'not-started' && <span style={{ ...board.tag, fontSize: '10px' }}>🖼 {task.thumbnail_status}</span>}
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
  const [selectedTask, setSelectedTask] = useState(null)
  const [newTaskStatus, setNewTaskStatus] = useState(null)
  const [newTitle, setNewTitle] = useState('')

  useEffect(() => {
    fetchStatuses()
    fetchTasks()
    fetchMembers()
  }, [slug])

  async function fetchStatuses() {
    const { data } = await supabase.from('pipeline_statuses').select('*').eq('branch_slug', slug).order('sort_order')
    setStatuses(data || [])
  }

  async function fetchTasks() {
    const { data } = await supabase.from('pipeline_tasks').select('*').eq('branch_slug', slug).order('sort_order')
    setTasks(data || [])
  }

  async function fetchMembers() {
    const { data } = await supabase.from('profiles').select('id, full_name').order('full_name')
    setMembers(data || [])
  }

  async function createTask(statusId) {
    if (!newTitle.trim()) return
    const maxOrder = Math.max(0, ...tasks.filter(t => t.status_id === statusId).map(t => t.sort_order || 0))
    await supabase.from('pipeline_tasks').insert({
      branch_slug: slug,
      status_id: statusId,
      title: newTitle.trim(),
      sort_order: maxOrder + 1,
      created_by: user.id,
    })
    setNewTitle('')
    setNewTaskStatus(null)
    fetchTasks()
  }

  async function moveTask(taskId, toStatusId) {
    const maxOrder = Math.max(0, ...tasks.filter(t => t.status_id === toStatusId).map(t => t.sort_order || 0))
    await supabase.from('pipeline_tasks').update({ status_id: toStatusId, sort_order: maxOrder + 1, updated_at: new Date().toISOString() }).eq('id', taskId)
    fetchTasks()
  }

  function handleDrop(e, statusId) {
    e.preventDefault()
    const taskId = e.dataTransfer.getData('taskId')
    const fromStatus = e.dataTransfer.getData('fromStatus')
    if (fromStatus !== statusId) {
      moveTask(taskId, statusId)
    }
  }

  return (
    <div>
      <div style={board.container}>
        {statuses.map(status => {
          const columnTasks = tasks.filter(t => t.status_id === status.id)
          return (
            <div key={status.id} style={board.column}
              onDragOver={e => e.preventDefault()}
              onDrop={e => handleDrop(e, status.id)}>
              <div style={board.columnHeader}>
                <div style={{ ...board.statusDot, background: status.color }} />
                <span style={board.columnName}>{status.name}</span>
                <span style={board.columnCount}>{columnTasks.length}</span>
              </div>

              <div style={board.cardList}>
                {columnTasks.map(task => (
                  <TaskCard key={task.id} task={task} onClick={setSelectedTask} />
                ))}
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
                <button onClick={() => { setNewTaskStatus(status.id); setNewTitle('') }} style={board.addTaskBtn}>+ Add task</button>
              )}
            </div>
          )
        })}
      </div>

      {selectedTask && (
        <TaskDetail
          task={selectedTask}
          statuses={statuses}
          members={members}
          branchSlug={slug}
          onClose={() => setSelectedTask(null)}
          onUpdate={() => { fetchTasks(); setSelectedTask(null) }}
        />
      )}
    </div>
  )
}

// ── STYLES ──
const board = {
  container: { display: 'flex', gap: '12px', overflowX: 'auto', paddingBottom: '20px', minHeight: 'calc(100vh - 200px)' },
  column: { minWidth: '280px', maxWidth: '280px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', padding: '12px', display: 'flex', flexDirection: 'column' },
  columnHeader: { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', padding: '4px 0' },
  statusDot: { width: '8px', height: '8px', borderRadius: '50%', flexShrink: 0 },
  columnName: { fontSize: '13px', fontWeight: '600', color: 'var(--white)', flex: 1 },
  columnCount: { fontSize: '12px', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.06)', padding: '2px 8px', borderRadius: '10px' },
  cardList: { display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 },
  card: { padding: '12px 14px', background: 'var(--dark-card)', border: '1px solid var(--dark-border)', borderRadius: '8px', cursor: 'pointer', transition: 'border-color 0.15s' },
  cardTitle: { fontSize: '13px', fontWeight: '500', color: 'var(--white)', marginBottom: '8px', lineHeight: '1.4' },
  cardMeta: { display: 'flex', gap: '4px', flexWrap: 'wrap', marginBottom: '6px' },
  tag: { padding: '2px 6px', background: 'rgba(255,255,255,0.06)', borderRadius: '4px', fontSize: '11px', color: 'var(--text-muted)', textTransform: 'capitalize' },
  cardFooter: { display: 'flex', alignItems: 'center', gap: '6px' },
  assigneeBadge: { width: '20px', height: '20px', borderRadius: '50%', background: 'var(--green)', color: 'var(--black)', fontSize: '10px', fontWeight: '700', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  dueDate: { fontSize: '11px', color: 'var(--text-muted)' },
  addTaskBtn: { padding: '8px', background: 'transparent', border: '1px dashed var(--dark-border)', borderRadius: '8px', color: 'var(--text-muted)', fontSize: '12px', cursor: 'pointer', marginTop: '6px', textAlign: 'center' },
  newTaskForm: { padding: '10px', background: 'var(--dark-card)', border: '1px solid var(--dark-border)', borderRadius: '8px', marginTop: '6px', display: 'flex', flexDirection: 'column', gap: '8px' },
  newTaskInput: { padding: '8px 10px', background: 'var(--dark)', border: '1px solid var(--dark-border)', borderRadius: '6px', color: 'var(--white)', fontSize: '13px', outline: 'none' },
  newTaskBtn: { padding: '6px 14px', background: 'var(--green)', color: 'var(--black)', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: '600', cursor: 'pointer' },
  newTaskCancel: { padding: '6px 14px', background: 'transparent', border: '1px solid var(--dark-border)', borderRadius: '6px', color: 'var(--text-muted)', fontSize: '12px', cursor: 'pointer' },
}

const modal = {
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: '40px', zIndex: 1000, overflowY: 'auto' },
  container: { width: '100%', maxWidth: '1000px', background: 'var(--dark-card)', border: '1px solid var(--dark-border)', borderRadius: '16px', margin: '0 20px 40px', overflow: 'hidden' },
  header: { display: 'flex', alignItems: 'center', gap: '12px', padding: '20px 24px', borderBottom: '1px solid var(--dark-border)' },
  titleInput: { flex: 1, background: 'transparent', border: 'none', color: 'var(--white)', fontSize: '18px', fontWeight: '600', outline: 'none' },
  closeBtn: { width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(255,255,255,0.06)', border: 'none', color: 'var(--text-muted)', fontSize: '16px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  body: { display: 'flex', minHeight: '500px' },
  main: { flex: 1, padding: '24px', overflowY: 'auto', maxHeight: '70vh' },
  sidebar: { width: '320px', padding: '24px', borderLeft: '1px solid var(--dark-border)', overflowY: 'auto', maxHeight: '70vh', display: 'flex', flexDirection: 'column', gap: '12px' },
  section: { marginBottom: '24px' },
  label: { fontSize: '11px', fontWeight: '600', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px', display: 'block' },
  input: { width: '100%', padding: '8px 10px', background: 'var(--dark)', border: '1px solid var(--dark-border)', borderRadius: '6px', color: 'var(--white)', fontSize: '13px', outline: 'none' },
  textarea: { width: '100%', padding: '10px 12px', background: 'var(--dark)', border: '1px solid var(--dark-border)', borderRadius: '8px', color: 'var(--white)', fontSize: '13px', outline: 'none', resize: 'vertical', fontFamily: 'inherit' },
  field: { display: 'flex', flexDirection: 'column', gap: '4px' },
  progressTrack: { height: '4px', background: 'var(--dark-border)', borderRadius: '2px', overflow: 'hidden', marginBottom: '10px' },
  progressFill: { height: '100%', background: 'var(--green)', borderRadius: '2px', transition: 'width 0.3s' },
  subtaskList: { display: 'flex', flexDirection: 'column', gap: '2px' },
  subtaskItem: { display: 'flex', alignItems: 'center', gap: '10px', padding: '6px 8px', borderRadius: '6px', cursor: 'pointer' },
  checkbox: { width: '18px', height: '18px', borderRadius: '4px', border: '2px solid', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  comment: { padding: '10px 12px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', marginBottom: '6px' },
  commentBtn: { padding: '8px 16px', background: 'var(--green)', color: 'var(--black)', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: '600', cursor: 'pointer', flexShrink: 0 },
  saveBtn: { flex: 1, padding: '10px', background: 'var(--green)', color: 'var(--black)', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' },
  deleteBtn: { padding: '10px 16px', background: 'rgba(255,80,80,0.1)', border: '1px solid rgba(255,80,80,0.2)', borderRadius: '8px', color: '#ff5050', fontSize: '13px', cursor: 'pointer' },
}
