import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';

/* ── brand tokens ── */
const GREEN = '#37CA37';
const PEACH = '#F4AB9C';
const BG = '#0C0C0C';
const CARD = '#141414';
const CARD_LIGHT = '#1A1A1A';
const BORDER = '#2A2A2A';
const WHITE = '#FFFFFF';

const BRANCH_COLORS = { youtube: '#FF0000', 'short-form': '#8B5CF6', 'ads-creative': '#F59E0B', production: '#3B82F6' };
const BRANCH_LABELS = { youtube: 'YouTube', 'short-form': 'Short Form', 'ads-creative': 'Ads/Creative', production: 'Production' };
const PRIORITY_COLORS = { urgent: '#EF4444', high: '#F59E0B', medium: '#3B82F6', low: '#6B7280' };

const STATUS_COLORS = {
  'idea bank': '#6B7280', 'backlog': '#6B7280', 'brief': '#6B7280', 'requested': '#6B7280',
  'in production': '#F59E0B', 'script/talking points': '#F59E0B', 'script': '#F59E0B', 'scheduled': '#F59E0B',
  'filming': '#3B82F6', 'in progress': '#3B82F6',
  'editing': '#8B5CF6', 'rough cut': '#8B5CF6', 'final cut': '#8B5CF6',
  'qc review': '#EC4899', 'review': '#EC4899',
  'revisions': '#F97316',
  'thumbnail ready': '#F97316', 'ready to post': '#10B981', 'approved': '#10B981', 'complete': '#10B981',
  'publishing queue': '#10B981',
  'published': '#37CA37', 'posted/archive': '#37CA37', 'live': '#37CA37',
  'archived': '#374151',
};

function getStatusColor(statusName) {
  if (!statusName) return '#6B7280';
  const key = statusName.toLowerCase();
  return STATUS_COLORS[key] || '#6B7280';
}

const SUBTASK_COLORS = {
  youtube: { 1:'#6B7280',2:'#F59E0B',3:'#F59E0B',4:'#F59E0B',5:'#F59E0B',6:'#F59E0B',7:'#3B82F6',8:'#3B82F6',9:'#EC4899',10:'#EC4899',11:'#8B5CF6',12:'#EC4899',13:'#F97316',14:'#F97316',15:'#10B981',16:'#37CA37' },
  'short-form': { 1:'#F59E0B',2:'#3B82F6',3:'#3B82F6',4:'#8B5CF6',5:'#8B5CF6',6:'#EC4899',7:'#10B981',8:'#10B981',9:'#10B981',10:'#37CA37',11:'#37CA37' },
  'ads-creative': { 1:'#F59E0B',2:'#F59E0B',3:'#3B82F6',4:'#8B5CF6',5:'#EC4899',6:'#EC4899',7:'#10B981',8:'#37CA37',9:'#6B7280' },
  production: { 1:'#F59E0B',2:'#3B82F6',3:'#8B5CF6',4:'#EC4899',5:'#10B981',6:'#6B7280' },
};

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

const fmt = (d) => d.toISOString().split('T')[0];
const sameDay = (a, b) => fmt(a) === fmt(b);
const parseLocal = (s) => { const [y,m,d] = s.split('-'); return new Date(y, m-1, d); };

function dueColor(due) {
  if (!due) return '#6B7280';
  const today = new Date(); today.setHours(0,0,0,0);
  const d = parseLocal(due); d.setHours(0,0,0,0);
  const diff = (d - today) / 86400000;
  if (diff < 0) return '#EF4444';
  if (diff <= 2) return '#F59E0B';
  return '#6B7280';
}

/* ══════════════════════════════════════════════════════════
   QUICK ADD MODAL
   ══════════════════════════════════════════════════════════ */
function QuickAddModal({ date, statuses, onClose, onCreated }) {
  const [title, setTitle] = useState('');
  const [branch, setBranch] = useState('youtube');
  const [saving, setSaving] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  async function handleCreate() {
    if (!title.trim() || saving) return;
    setSaving(true);
    const firstStatus = statuses.find(s => s.branch_slug === branch && s.sort_order === 1);
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from('pipeline_tasks').insert({
      title: title.trim(),
      branch_slug: branch,
      status_id: firstStatus?.id,
      publish_date: fmt(date),
      created_by: user?.id,
    });
    setSaving(false);
    onCreated();
    onClose();
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={onClose}>
      <div style={{ background: BG, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 20, width: 360, boxShadow: '0 16px 48px rgba(0,0,0,0.5)' }} onClick={e => e.stopPropagation()}>
        <h3 style={{ fontSize: 14, fontWeight: 700, color: WHITE, margin: '0 0 4px' }}>Quick Add</h3>
        <p style={{ fontSize: 12, color: '#6B7280', margin: '0 0 16px' }}>
          {date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
        </p>
        <input
          ref={inputRef}
          value={title}
          onChange={e => setTitle(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleCreate()}
          placeholder="Task title..."
          style={{ width: '100%', background: CARD_LIGHT, border: `1px solid ${BORDER}`, borderRadius: 6, color: WHITE, padding: '10px 12px', fontSize: 13, outline: 'none', marginBottom: 12, fontFamily: 'Outfit, Arial, sans-serif', boxSizing: 'border-box' }}
        />
        <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
          {Object.entries(BRANCH_LABELS).map(([slug, label]) => (
            <button
              key={slug}
              onClick={() => setBranch(slug)}
              style={{
                background: branch === slug ? BRANCH_COLORS[slug] + '33' : 'transparent',
                border: `1px solid ${branch === slug ? BRANCH_COLORS[slug] : BORDER}`,
                color: branch === slug ? BRANCH_COLORS[slug] : '#9CA3AF',
                borderRadius: 6, padding: '4px 10px', fontSize: 11, fontWeight: 500, cursor: 'pointer',
              }}
            >{label}</button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ background: 'transparent', border: `1px solid ${BORDER}`, borderRadius: 6, color: '#9CA3AF', padding: '6px 14px', fontSize: 12, cursor: 'pointer' }}>Cancel</button>
          <button onClick={handleCreate} disabled={!title.trim() || saving} style={{ background: GREEN, border: 'none', borderRadius: 6, color: '#000', padding: '6px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer', opacity: !title.trim() || saving ? 0.5 : 1 }}>
            {saving ? 'Creating...' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   TASK DETAIL MODAL
   ══════════════════════════════════════════════════════════ */
function TaskDetailModal({ task, onClose, members, statuses, onUpdate }) {
  const [subtasks, setSubtasks] = useState([]);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [localTask, setLocalTask] = useState(task);
  const branchSlug = task.branch_slug;

  useEffect(() => { setLocalTask(task); loadSubtasks(); loadComments(); }, [task.id]);

  async function loadSubtasks() {
    const { data } = await supabase.from('pipeline_subtasks').select('*, assignee:profiles!pipeline_subtasks_assignee_id_fkey(id, full_name)').eq('task_id', task.id).order('sort_order');
    if (data) setSubtasks(data);
  }
  async function loadComments() {
    const { data } = await supabase.from('pipeline_comments').select('*, author:profiles!pipeline_comments_user_id_fkey(full_name)').eq('task_id', task.id).order('created_at', { ascending: false });
    if (data) setComments(data);
  }
  async function updateField(field, value) {
    const updated = { ...localTask, [field]: value };
    setLocalTask(updated);
    await supabase.from('pipeline_tasks').update({ [field]: value }).eq('id', task.id);
    if (onUpdate) onUpdate(updated);
  }
  async function toggleSubtask(st) {
    await supabase.from('pipeline_subtasks').update({ completed: !st.completed, completed_at: !st.completed ? new Date().toISOString() : null }).eq('id', st.id);
    loadSubtasks();
  }
  async function updateSubtaskAssignee(stId, uid) {
    await supabase.from('pipeline_subtasks').update({ assignee_id: uid || null }).eq('id', stId);
    loadSubtasks();
  }
  async function addComment() {
    if (!newComment.trim()) return;
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from('pipeline_comments').insert({ task_id: task.id, user_id: user.id, content: newComment.trim() });
    setNewComment('');
    loadComments();
  }

  const completed = subtasks.filter(s => s.completed).length;
  const total = subtasks.length;
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <div style={ms.overlay} onClick={onClose}>
      <div style={ms.content} onClick={e => e.stopPropagation()}>
        <div style={ms.header}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: BRANCH_COLORS[branchSlug] || GREEN, flexShrink: 0 }} />
            <h2 style={ms.title}>{localTask.title}</h2>
          </div>
          <button onClick={onClose} style={ms.closeBtn}>&times;</button>
        </div>
        <div style={ms.topBar}>
          <div style={ms.topBarItem}><span style={ms.topBarLabel}>Status</span>
            <select value={localTask.status_id||''} onChange={e=>updateField('status_id',e.target.value)} style={ms.topBarSelect}>
              {statuses.filter(s=>s.branch_slug===branchSlug).map(s=><option key={s.id} value={s.id}>{s.name}</option>)}
            </select></div>
          <div style={ms.topBarItem}><span style={ms.topBarLabel}>Assignee</span>
            <select value={localTask.assignee_id||''} onChange={e=>updateField('assignee_id',e.target.value||null)} style={ms.topBarSelect}>
              <option value="">Unassigned</option>{members.map(m=><option key={m.id} value={m.id}>{m.full_name}</option>)}
            </select></div>
          <div style={ms.topBarItem}><span style={ms.topBarLabel}>Priority</span>
            <select value={localTask.priority||''} onChange={e=>updateField('priority',e.target.value||null)} style={{...ms.topBarSelect,color:PRIORITY_COLORS[localTask.priority]||WHITE}}>
              <option value="">None</option><option value="urgent">Urgent</option><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option>
            </select></div>
          <div style={ms.topBarItem}><span style={ms.topBarLabel}>Due Date</span>
            <input type="date" value={localTask.due_date||''} onChange={e=>updateField('due_date',e.target.value||null)} style={{...ms.topBarSelect,color:dueColor(localTask.due_date)}} /></div>
          <div style={ms.topBarItem}><span style={ms.topBarLabel}>Publish</span>
            <input type="date" value={localTask.publish_date||''} onChange={e=>updateField('publish_date',e.target.value||null)} style={ms.topBarSelect} /></div>
        </div>
        <div style={ms.body}>
          <div style={ms.left}>
            <div style={ms.section}><h3 style={ms.sectionTitle}>Description</h3>
              <textarea value={localTask.description||''} onChange={e=>setLocalTask({...localTask,description:e.target.value})} onBlur={e=>updateField('description',e.target.value)} placeholder="Add a description..." style={ms.textarea} rows={3} /></div>
            <div style={ms.section}>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:8}}>
                <h3 style={ms.sectionTitle}>Subtasks</h3><span style={{fontSize:12,color:'#9CA3AF'}}>{completed}/{total} ({pct}%)</span></div>
              <div style={{height:4,background:BORDER,borderRadius:2,marginBottom:12}}><div style={{height:'100%',width:`${pct}%`,background:GREEN,borderRadius:2,transition:'width 0.3s'}}/></div>
              {subtasks.map(st=>{
                const stColor=(st.color&&st.color!=='#6B7280')?st.color:SUBTASK_COLORS[branchSlug]?.[st.sort_order]||'#6B7280';
                return(<div key={st.id} style={ms.subtaskRow}>
                  <div style={{...ms.subtaskDot,background:stColor,opacity:st.completed?0.4:1}}/>
                  <input type="checkbox" checked={st.completed} onChange={()=>toggleSubtask(st)} style={{accentColor:GREEN,cursor:'pointer'}}/>
                  <span style={{flex:1,fontSize:13,color:st.completed?'#6B7280':WHITE,textDecoration:st.completed?'line-through':'none'}}>{st.title}</span>
                  <select value={st.assignee_id||st.assignee?.id||''} onChange={e=>updateSubtaskAssignee(st.id,e.target.value)} style={ms.subtaskAssignee}>
                    <option value="">--</option>{members.map(m=><option key={m.id} value={m.id}>{m.full_name}</option>)}
                  </select></div>);})}
            </div>
            <div style={ms.section}><h3 style={ms.sectionTitle}>Activity</h3>
              <div style={{display:'flex',gap:8,marginBottom:12}}>
                <input value={newComment} onChange={e=>setNewComment(e.target.value)} onKeyDown={e=>e.key==='Enter'&&addComment()} placeholder="Add a comment..." style={ms.commentInput}/>
                <button onClick={addComment} style={ms.commentBtn}>Post</button></div>
              {comments.map(c=>(<div key={c.id} style={ms.commentItem}>
                <span style={{fontWeight:600,color:GREEN,fontSize:12}}>{c.author?.full_name||'Unknown'}</span>
                <span style={{fontSize:11,color:'#6B7280',marginLeft:8}}>{new Date(c.created_at).toLocaleString()}</span>
                <p style={{margin:'4px 0 0',fontSize:13,color:'#D1D5DB'}}>{c.content}</p></div>))}</div>
          </div>
          <div style={ms.right}>
            <div style={ms.section}><h3 style={ms.sectionTitle}>{BRANCH_LABELS[branchSlug]} Fields</h3>
              <FR label="Content Pillar"><select value={localTask.content_pillar||''} onChange={e=>updateField('content_pillar',e.target.value||null)} style={ms.fieldSelect}>
                <option value="">None</option><option value="transformation">Transformation</option><option value="education">Education</option><option value="grocery">Grocery Haul</option><option value="challenge">Challenge</option><option value="experiment">Experiment</option></select></FR>
              {(branchSlug==='youtube'||branchSlug==='short-form')&&<FR label="Talent"><input value={(localTask.talent||[]).join(', ')} onChange={e=>updateField('talent',e.target.value?e.target.value.split(',').map(t=>t.trim()):[])} placeholder="Jacob, Ryan Snow" style={ms.fieldInput}/></FR>}
              <FR label="Editor"><input value={localTask.editor_assigned||''} onChange={e=>updateField('editor_assigned',e.target.value||null)} placeholder="Editor name" style={ms.fieldInput}/></FR>
              {branchSlug==='youtube'&&<><FR label="Tier"><select value={localTask.content_tier||''} onChange={e=>updateField('content_tier',e.target.value||null)} style={ms.fieldSelect}><option value="">None</option><option value="flagship">Flagship</option><option value="standard">Standard</option><option value="quick-turn">Quick Turn</option></select></FR>
              <FR label="Thumbnail"><select value={localTask.thumbnail_status||''} onChange={e=>updateField('thumbnail_status',e.target.value||null)} style={ms.fieldSelect}><option value="">None</option><option value="not-started">Not Started</option><option value="in-progress">In Progress</option><option value="ready">Ready</option><option value="approved">Approved</option></select></FR>
              <FR label="QC Score"><input type="number" min={0} max={100} value={localTask.qc_score||''} onChange={e=>updateField('qc_score',e.target.value?parseInt(e.target.value):null)} placeholder="0-100" style={ms.fieldInput}/></FR></>}
              {branchSlug==='short-form'&&<><FR label="Platform"><input value={(localTask.platform||[]).join(', ')} onChange={e=>updateField('platform',e.target.value?e.target.value.split(',').map(t=>t.trim()):[])} placeholder="IG, TikTok, YT Shorts" style={ms.fieldInput}/></FR>
              <FR label="SOB"><label style={{display:'flex',alignItems:'center',gap:6,cursor:'pointer'}}><input type="checkbox" checked={localTask.is_sob||false} onChange={e=>updateField('is_sob',e.target.checked)} style={{accentColor:PEACH}}/><span style={{fontSize:12,color:'#9CA3AF'}}>School of Bots</span></label></FR></>}
              {branchSlug==='ads-creative'&&<FR label="First Pass"><label style={{display:'flex',alignItems:'center',gap:6,cursor:'pointer'}}><input type="checkbox" checked={localTask.first_pass||false} onChange={e=>updateField('first_pass',e.target.checked)} style={{accentColor:GREEN}}/><span style={{fontSize:12,color:'#9CA3AF'}}>Complete</span></label></FR>}
            </div>
            <div style={ms.section}><h3 style={ms.sectionTitle}>Links</h3>
              <FR label="Script"><input value={localTask.script_link||''} onChange={e=>updateField('script_link',e.target.value||null)} placeholder="Google Doc URL" style={ms.fieldInput}/></FR>
              <FR label="Drive"><input value={localTask.drive_folder_link||''} onChange={e=>updateField('drive_folder_link',e.target.value||null)} placeholder="Drive folder URL" style={ms.fieldInput}/></FR>
              <FR label="Video"><input value={localTask.video_link||''} onChange={e=>updateField('video_link',e.target.value||null)} placeholder="YouTube URL" style={ms.fieldInput}/></FR>
              <div style={{display:'flex',gap:6,marginTop:8,flexWrap:'wrap'}}>
                {localTask.script_link&&<a href={localTask.script_link} target="_blank" rel="noopener" style={ms.linkPill}>Script ↗</a>}
                {localTask.drive_folder_link&&<a href={localTask.drive_folder_link} target="_blank" rel="noopener" style={ms.linkPill}>Drive ↗</a>}
                {localTask.video_link&&<a href={localTask.video_link} target="_blank" rel="noopener" style={ms.linkPill}>Video ↗</a>}
              </div></div>
          </div>
        </div>
      </div>
    </div>
  );
}

function FR({label,children}){return(<div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'6px 0',borderBottom:`1px solid ${BORDER}`}}><span style={{fontSize:12,color:'#9CA3AF',minWidth:80}}>{label}</span><div style={{flex:1,maxWidth:180}}>{children}</div></div>);}

/* ══════════════════════════════════════════════════════════
   CONTENT CALENDAR
   ══════════════════════════════════════════════════════════ */
export default function ContentCalendar() {
  const [tasks, setTasks] = useState([]);
  const [statuses, setStatuses] = useState([]);
  const [members, setMembers] = useState([]);
  const [curDate, setCurDate] = useState(new Date());
  const [viewMode, setViewMode] = useState('month');
  const [branchFilter, setBranchFilter] = useState('all');
  const [selectedTask, setSelectedTask] = useState(null);
  const [quickAddDate, setQuickAddDate] = useState(null);
  const [dragTask, setDragTask] = useState(null);
  const [dragOver, setDragOver] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    const [tRes, sRes, mRes] = await Promise.all([
      supabase.from('pipeline_tasks').select('*, status:pipeline_statuses(name, branch_slug)'),
      supabase.from('pipeline_statuses').select('*').order('sort_order'),
      supabase.from('profiles').select('id, full_name'),
    ]);
    if (tRes.data) setTasks(tRes.data);
    if (sRes.data) setStatuses(sRes.data);
    if (mRes.data) setMembers(mRes.data);
  }

  /* Backlog depth */
  const backlogDepth = useMemo(() => {
    const now = new Date();
    const calc = (slug) => {
      const published = statuses.filter(s => s.branch_slug === slug && /published|posted|archived/i.test(s.name)).map(s => s.id);
      const upcoming = tasks.filter(t => t.branch_slug === slug && !published.includes(t.status_id) && t.publish_date && parseLocal(t.publish_date) >= now);
      return slug === 'youtube' ? Math.round(upcoming.length / 2) : Math.round(upcoming.length / 7);
    };
    return { youtube: calc('youtube'), shortForm: calc('short-form') };
  }, [tasks, statuses]);

  function backlogColor(w) { if (w < 3) return '#EF4444'; if (w <= 5) return '#F59E0B'; return '#10B981'; }

  const year = curDate.getFullYear();
  const month = curDate.getMonth();

  const monthDays = useMemo(() => {
    const first = new Date(year, month, 1);
    const last = new Date(year, month + 1, 0);
    const days = [];
    for (let i = first.getDay() - 1; i >= 0; i--) days.push({ date: new Date(year, month, -i), inMonth: false });
    for (let i = 1; i <= last.getDate(); i++) days.push({ date: new Date(year, month, i), inMonth: true });
    const rem = 42 - days.length;
    for (let i = 1; i <= rem; i++) days.push({ date: new Date(year, month + 1, i), inMonth: false });
    return days;
  }, [year, month]);

  const weekDays = useMemo(() => {
    const start = new Date(curDate);
    start.setDate(start.getDate() - start.getDay());
    return Array.from({ length: 7 }, (_, i) => { const d = new Date(start); d.setDate(d.getDate() + i); return { date: d, inMonth: true }; });
  }, [curDate]);

  const displayDays = viewMode === 'month' ? monthDays : weekDays;

  const tasksByDate = useMemo(() => {
    const map = {};
    tasks.forEach(t => {
      const dateStr = t.publish_date || t.due_date;
      if (!dateStr) return;
      if (branchFilter !== 'all' && t.branch_slug !== branchFilter) return;
      if (!map[dateStr]) map[dateStr] = [];
      map[dateStr].push(t);
    });
    return map;
  }, [tasks, branchFilter]);

  /* Unscheduled tasks (no publish_date) */
  const unscheduledTasks = useMemo(() => {
    return tasks.filter(t => {
      if (t.publish_date) return false;
      if (branchFilter !== 'all' && t.branch_slug !== branchFilter) return false;
      const archived = statuses.filter(s => /published|posted|archived/i.test(s.name)).map(s => s.id);
      return !archived.includes(t.status_id);
    });
  }, [tasks, branchFilter, statuses]);

  function nav(dir) {
    const d = new Date(curDate);
    if (viewMode === 'month') d.setMonth(d.getMonth() + dir);
    else d.setDate(d.getDate() + dir * 7);
    setCurDate(d);
  }

  function handleTaskUpdate(updated) {
    setTasks(prev => prev.map(t => t.id === updated.id ? { ...t, ...updated } : t));
    setSelectedTask(prev => prev && prev.id === updated.id ? { ...prev, ...updated } : prev);
  }

  /* Drag and drop */
  async function handleDrop(dateStr) {
    if (!dragTask) return;
    setDragOver(null);
    await supabase.from('pipeline_tasks').update({ publish_date: dateStr }).eq('id', dragTask.id);
    setTasks(prev => prev.map(t => t.id === dragTask.id ? { ...t, publish_date: dateStr } : t));
    setDragTask(null);
  }

  function handleDayClick(date, hasEvents) {
    if (!hasEvents) setQuickAddDate(date);
  }

  const today = new Date();

  return (
    <div style={{ display: 'flex', gap: 0, maxWidth: 1400, margin: '0 auto' }}>
      {/* Main calendar */}
      <div style={{ flex: 1, padding: '24px 24px 24px 32px' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 700, color: WHITE, fontFamily: 'Outfit, Arial, sans-serif', margin: '0 0 4px' }}>Content Calendar</h1>
            <p style={{ fontSize: 12, color: '#6B7280', margin: 0 }}>Click empty day to add -- drag to reschedule</p>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <div style={cs.backlogMeter}><span style={{fontSize:11,color:'#9CA3AF'}}>YT</span><span style={{fontSize:14,fontWeight:700,color:backlogColor(backlogDepth.youtube)}}>{backlogDepth.youtube}w</span></div>
            <div style={cs.backlogMeter}><span style={{fontSize:11,color:'#9CA3AF'}}>SF</span><span style={{fontSize:14,fontWeight:700,color:backlogColor(backlogDepth.shortForm)}}>{backlogDepth.shortForm}w</span></div>
            <button onClick={() => setSidebarOpen(!sidebarOpen)} style={{ ...cs.navBtn, color: sidebarOpen ? GREEN : '#9CA3AF', fontSize: 12 }}>
              {sidebarOpen ? 'Hide' : 'Backlog'} ({unscheduledTasks.length})
            </button>
          </div>
        </div>

        {/* Controls */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button onClick={() => nav(-1)} style={cs.navBtn}>&larr;</button>
            <h2 style={{ fontSize: 18, fontWeight: 600, color: WHITE, minWidth: 200, textAlign: 'center' }}>
              {viewMode === 'month' ? `${MONTHS[month]} ${year}` : `Week of ${weekDays[0].date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`}
            </h2>
            <button onClick={() => nav(1)} style={cs.navBtn}>&rarr;</button>
            <button onClick={() => setCurDate(new Date())} style={cs.todayBtn}>Today</button>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <div style={cs.toggleGroup}>
              <button onClick={() => setViewMode('month')} style={{ ...cs.toggleBtn, ...(viewMode === 'month' ? cs.toggleActive : {}) }}>Month</button>
              <button onClick={() => setViewMode('week')} style={{ ...cs.toggleBtn, ...(viewMode === 'week' ? cs.toggleActive : {}) }}>Week</button>
            </div>
            <div style={{ display: 'flex', gap: 4 }}>
              <button onClick={() => setBranchFilter('all')} style={{ ...cs.filterBtn, ...(branchFilter === 'all' ? { background: '#374151', color: WHITE } : {}) }}>All</button>
              {Object.entries(BRANCH_LABELS).map(([slug, label]) => (
                <button key={slug} onClick={() => setBranchFilter(slug)} style={{ ...cs.filterBtn, ...(branchFilter === slug ? { background: BRANCH_COLORS[slug] + '33', color: BRANCH_COLORS[slug], borderColor: BRANCH_COLORS[slug] } : {}) }}>{label}</button>
              ))}
            </div>
          </div>
        </div>

        {/* Status legend */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 12, flexWrap: 'wrap' }}>
          {[['Idea/Backlog','#6B7280'],['In Production','#F59E0B'],['Filming','#3B82F6'],['Editing','#8B5CF6'],['QC Review','#EC4899'],['Revisions','#F97316'],['Ready','#10B981'],['Published','#37CA37']].map(([label,color])=>(
            <div key={label} style={{display:'flex',alignItems:'center',gap:4}}>
              <div style={{width:8,height:8,borderRadius:'50%',background:color}}/>
              <span style={{fontSize:10,color:'#6B7280'}}>{label}</span>
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div style={{ background: CARD, borderRadius: 12, border: `1px solid ${BORDER}`, overflow: 'hidden' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: `1px solid ${BORDER}` }}>
            {DAYS.map(d => (<div key={d} style={{ padding: '10px 8px', fontSize: 12, fontWeight: 600, color: '#9CA3AF', textAlign: 'center' }}>{d}</div>))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
            {displayDays.map(({ date, inMonth }, i) => {
              const dateStr = fmt(date);
              const dayTasks = tasksByDate[dateStr] || [];
              const isToday = sameDay(date, today);
              const isDragOver = dragOver === dateStr;
              return (
                <div
                  key={i}
                  onClick={() => handleDayClick(date, dayTasks.length > 0)}
                  onDragOver={e => { e.preventDefault(); setDragOver(dateStr); }}
                  onDragLeave={() => setDragOver(null)}
                  onDrop={e => { e.preventDefault(); handleDrop(dateStr); }}
                  style={{
                    minHeight: viewMode === 'month' ? 100 : 300,
                    padding: 6,
                    borderRight: (i + 1) % 7 !== 0 ? `1px solid ${BORDER}` : 'none',
                    borderBottom: `1px solid ${BORDER}`,
                    background: isDragOver ? GREEN + '15' : isToday ? GREEN + '0D' : 'transparent',
                    opacity: inMonth ? 1 : 0.35,
                    cursor: dayTasks.length === 0 ? 'pointer' : 'default',
                    transition: 'background 0.15s',
                  }}
                >
                  <div style={{ fontSize: 12, fontWeight: isToday ? 700 : 400, color: isToday ? GREEN : '#9CA3AF', marginBottom: 4, textAlign: 'right', paddingRight: 4 }}>
                    {date.getDate()}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {dayTasks.slice(0, viewMode === 'month' ? 4 : 20).map(t => {
                      const statusColor = getStatusColor(t.status?.name);
                      return (
                        <div
                          key={t.id}
                          draggable
                          onDragStart={() => setDragTask(t)}
                          onDragEnd={() => { setDragTask(null); setDragOver(null); }}
                          onClick={e => { e.stopPropagation(); setSelectedTask(t); }}
                          style={{
                            ...cs.eventPill,
                            background: statusColor + '18',
                            borderLeft: `3px solid ${statusColor}`,
                            opacity: dragTask?.id === t.id ? 0.4 : 1,
                            cursor: 'grab',
                          }}
                        >
                          <span style={{ fontSize: 11, fontWeight: 500, color: WHITE, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                            {t.title}
                          </span>
                          <div style={{ display: 'flex', gap: 3, alignItems: 'center', flexShrink: 0 }}>
                            <div style={{ width: 6, height: 6, borderRadius: '50%', background: BRANCH_COLORS[t.branch_slug] || '#6B7280' }} />
                            {t.is_sob && <span style={{ fontSize: 8, background: PEACH + '33', color: PEACH, padding: '0px 3px', borderRadius: 2, fontWeight: 700 }}>SOB</span>}
                          </div>
                        </div>
                      );
                    })}
                    {dayTasks.length > (viewMode === 'month' ? 4 : 20) && (
                      <span style={{ fontSize: 10, color: '#6B7280', paddingLeft: 6 }}>+{dayTasks.length - (viewMode === 'month' ? 4 : 20)} more</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Unscheduled sidebar */}
      {sidebarOpen && (
        <div style={{
          width: 260, padding: '24px 16px', marginTop: 60, borderLeft: `1px solid ${BORDER}`,
          overflowY: 'auto', maxHeight: 'calc(100vh - 40px)', position: 'sticky', top: 0,
        }}>
          <h3 style={{ fontSize: 13, fontWeight: 700, color: WHITE, margin: '0 0 4px' }}>Unscheduled</h3>
          <p style={{ fontSize: 11, color: '#6B7280', margin: '0 0 12px' }}>Drag onto calendar to schedule</p>
          {unscheduledTasks.length === 0 && (
            <div style={{ padding: 16, textAlign: 'center', color: '#6B7280', fontSize: 12, background: CARD, borderRadius: 8, border: `1px solid ${BORDER}` }}>
              All tasks scheduled
            </div>
          )}
          {unscheduledTasks.map(t => {
            const statusColor = getStatusColor(t.status?.name);
            return (
              <div
                key={t.id}
                draggable
                onDragStart={() => setDragTask(t)}
                onDragEnd={() => { setDragTask(null); setDragOver(null); }}
                onClick={() => setSelectedTask(t)}
                style={{
                  padding: '8px 10px', marginBottom: 6, background: CARD,
                  border: `1px solid ${BORDER}`, borderLeft: `3px solid ${statusColor}`,
                  borderRadius: 6, cursor: 'grab', transition: 'border-color 0.15s',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: BRANCH_COLORS[t.branch_slug] || '#6B7280' }} />
                  <span style={{ fontSize: 12, fontWeight: 600, color: WHITE, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.title}</span>
                </div>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <span style={{ fontSize: 10, color: statusColor }}>{t.status?.name || 'No status'}</span>
                  {t.priority && <span style={{ fontSize: 9, color: PRIORITY_COLORS[t.priority], fontWeight: 600 }}>{t.priority}</span>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modals */}
      {selectedTask && <TaskDetailModal task={selectedTask} onClose={() => setSelectedTask(null)} members={members} statuses={statuses} onUpdate={handleTaskUpdate} />}
      {quickAddDate && <QuickAddModal date={quickAddDate} statuses={statuses} onClose={() => setQuickAddDate(null)} onCreated={load} />}
    </div>
  );
}

/* ── modal styles ── */
const ms = {
  overlay:{position:'fixed',inset:0,background:'rgba(0,0,0,0.7)',zIndex:1000,display:'flex',alignItems:'flex-start',justifyContent:'center',paddingTop:40,overflowY:'auto'},
  content:{background:BG,border:`1px solid ${BORDER}`,borderRadius:12,width:'90%',maxWidth:960,maxHeight:'calc(100vh - 80px)',overflowY:'auto',boxShadow:'0 24px 48px rgba(0,0,0,0.5)'},
  header:{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'16px 20px',borderBottom:`1px solid ${BORDER}`},
  title:{fontSize:18,fontWeight:700,color:WHITE,margin:0,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'},
  closeBtn:{background:'transparent',border:'none',color:'#9CA3AF',fontSize:24,cursor:'pointer',padding:'4px 8px',lineHeight:1},
  topBar:{display:'flex',gap:12,padding:'12px 20px',borderBottom:`1px solid ${BORDER}`,flexWrap:'wrap',background:CARD},
  topBarItem:{display:'flex',flexDirection:'column',gap:4,minWidth:120},
  topBarLabel:{fontSize:10,fontWeight:600,color:'#6B7280',textTransform:'uppercase',letterSpacing:'0.05em'},
  topBarSelect:{background:CARD_LIGHT,border:`1px solid ${BORDER}`,borderRadius:4,color:WHITE,padding:'4px 8px',fontSize:12,outline:'none'},
  body:{display:'flex',gap:0,minHeight:400},
  left:{flex:1,padding:20,borderRight:`1px solid ${BORDER}`,overflowY:'auto',maxHeight:'calc(100vh - 240px)'},
  right:{width:300,padding:20,overflowY:'auto',maxHeight:'calc(100vh - 240px)'},
  section:{marginBottom:20},
  sectionTitle:{fontSize:13,fontWeight:600,color:'#9CA3AF',margin:'0 0 8px',textTransform:'uppercase',letterSpacing:'0.05em'},
  textarea:{width:'100%',background:CARD_LIGHT,border:`1px solid ${BORDER}`,borderRadius:6,color:WHITE,padding:10,fontSize:13,outline:'none',resize:'vertical',fontFamily:'Outfit, Arial, sans-serif'},
  subtaskRow:{display:'flex',alignItems:'center',gap:8,padding:'5px 0',borderBottom:`1px solid ${BORDER}22`},
  subtaskDot:{width:8,height:8,borderRadius:'50%',flexShrink:0},
  subtaskAssignee:{width:'auto',minWidth:'100px',padding:'2px 4px',background:CARD_LIGHT,border:`1px solid ${BORDER}`,borderRadius:4,color:'#9CA3AF',fontSize:11,outline:'none',cursor:'pointer',flexShrink:0},
  commentInput:{flex:1,background:CARD_LIGHT,border:`1px solid ${BORDER}`,borderRadius:6,color:WHITE,padding:'8px 10px',fontSize:13,outline:'none',fontFamily:'Outfit, Arial, sans-serif'},
  commentBtn:{background:GREEN,border:'none',borderRadius:6,color:'#000',padding:'8px 16px',fontSize:12,fontWeight:600,cursor:'pointer'},
  commentItem:{padding:'8px 0',borderBottom:`1px solid ${BORDER}22`},
  fieldSelect:{width:'100%',background:CARD_LIGHT,border:`1px solid ${BORDER}`,borderRadius:4,color:WHITE,padding:'4px 6px',fontSize:12,outline:'none'},
  fieldInput:{width:'100%',background:CARD_LIGHT,border:`1px solid ${BORDER}`,borderRadius:4,color:WHITE,padding:'4px 6px',fontSize:12,outline:'none',fontFamily:'Outfit, Arial, sans-serif'},
  linkPill:{display:'inline-block',background:GREEN+'15',color:GREEN,border:`1px solid ${GREEN}33`,borderRadius:4,padding:'3px 8px',fontSize:11,fontWeight:600,textDecoration:'none',cursor:'pointer'},
};

/* ── calendar styles ── */
const cs = {
  navBtn:{background:CARD_LIGHT,border:`1px solid ${BORDER}`,borderRadius:6,color:WHITE,padding:'6px 12px',cursor:'pointer',fontSize:14},
  todayBtn:{background:'transparent',border:`1px solid ${BORDER}`,borderRadius:6,color:GREEN,padding:'6px 14px',cursor:'pointer',fontSize:12,fontWeight:600},
  toggleGroup:{display:'flex',background:CARD_LIGHT,borderRadius:6,border:`1px solid ${BORDER}`,overflow:'hidden'},
  toggleBtn:{background:'transparent',border:'none',color:'#9CA3AF',padding:'6px 14px',cursor:'pointer',fontSize:12,fontWeight:500},
  toggleActive:{background:GREEN+'22',color:GREEN},
  filterBtn:{background:'transparent',border:`1px solid ${BORDER}`,borderRadius:6,color:'#9CA3AF',padding:'4px 10px',cursor:'pointer',fontSize:11,fontWeight:500},
  backlogMeter:{display:'flex',flexDirection:'column',alignItems:'center',background:CARD,border:`1px solid ${BORDER}`,borderRadius:8,padding:'6px 14px',minWidth:60},
  eventPill:{display:'flex',alignItems:'center',justifyContent:'space-between',gap:4,padding:'3px 6px',borderRadius:4,textAlign:'left',border:'none',width:'100%',transition:'opacity 0.15s'},
};
