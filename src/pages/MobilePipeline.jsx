import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';

const GREEN = '#37CA37';
const PEACH = '#F4AB9C';
const BG = '#0C0C0C';
const CARD = '#141414';
const CARD_LIGHT = '#1A1A1A';
const BORDER = '#2A2A2A';
const WHITE = '#FFFFFF';

const PRIORITY_COLORS = { urgent: '#EF4444', high: '#F59E0B', medium: '#3B82F6', low: '#6B7280' };

const SUBTASK_COLORS = {
  youtube:{1:'#6B7280',2:'#F59E0B',3:'#F59E0B',4:'#F59E0B',5:'#F59E0B',6:'#F59E0B',7:'#3B82F6',8:'#3B82F6',9:'#EC4899',10:'#EC4899',11:'#8B5CF6',12:'#EC4899',13:'#F97316',14:'#F97316',15:'#10B981',16:'#37CA37'},
  'short-form':{1:'#F59E0B',2:'#3B82F6',3:'#3B82F6',4:'#8B5CF6',5:'#8B5CF6',6:'#EC4899',7:'#10B981',8:'#10B981',9:'#10B981',10:'#37CA37',11:'#37CA37'},
  'ads-creative':{1:'#F59E0B',2:'#F59E0B',3:'#3B82F6',4:'#8B5CF6',5:'#EC4899',6:'#EC4899',7:'#10B981',8:'#37CA37',9:'#6B7280'},
  production:{1:'#F59E0B',2:'#3B82F6',3:'#8B5CF6',4:'#EC4899',5:'#10B981',6:'#6B7280'},
};

function parseLocal(s){const[y,m,d]=s.split('-');return new Date(y,m-1,d);}
function dueInfo(due){
  if(!due)return null;
  const today=new Date();today.setHours(0,0,0,0);
  const d=parseLocal(due);d.setHours(0,0,0,0);
  const diff=Math.round((d-today)/86400000);
  if(diff<0)return{text:`${Math.abs(diff)}d overdue`,color:'#EF4444',urgent:true};
  if(diff===0)return{text:'Today',color:'#F59E0B',urgent:true};
  if(diff===1)return{text:'Tomorrow',color:'#F59E0B',urgent:false};
  if(diff<=7)return{text:`${diff}d`,color:'#3B82F6',urgent:false};
  return{text:d.toLocaleDateString('en-US',{month:'short',day:'numeric'}),color:'#6B7280',urgent:false};
}

/* ── Bottom Sheet Task Detail ── */
function BottomSheet({task,onClose,members,statuses,branchSlug,onUpdate}){
  const[localTask,setLocalTask]=useState(task);
  const[subtasks,setSubtasks]=useState([]);
  const[tab,setTab]=useState('details');
  const[comments,setComments]=useState([]);
  const[newComment,setNewComment]=useState('');
  const sheetRef=useRef(null);

  useEffect(()=>{setLocalTask(task);loadSubtasks();loadComments();},[task.id]);

  async function loadSubtasks(){
    const{data}=await supabase.from('pipeline_subtasks').select('*, assignee:profiles!pipeline_subtasks_assignee_id_fkey(id,full_name)').eq('task_id',task.id).order('sort_order');
    if(data)setSubtasks(data);
  }
  async function loadComments(){
    const{data}=await supabase.from('pipeline_comments').select('*, author:profiles!pipeline_comments_user_id_fkey(full_name)').eq('task_id',task.id).order('created_at',{ascending:false});
    if(data)setComments(data);
  }
  async function updateField(f,v){
    const u={...localTask,[f]:v};setLocalTask(u);
    await supabase.from('pipeline_tasks').update({[f]:v}).eq('id',task.id);
    if(onUpdate)onUpdate(u);
  }
  async function toggleSubtask(st){
    await supabase.from('pipeline_subtasks').update({completed:!st.completed,completed_at:!st.completed?new Date().toISOString():null}).eq('id',st.id);
    loadSubtasks();
  }
  async function addComment(){
    if(!newComment.trim())return;
    const{data:{user}}=await supabase.auth.getUser();
    await supabase.from('pipeline_comments').insert({task_id:task.id,user_id:user.id,content:newComment.trim()});
    setNewComment('');loadComments();
  }

  const completed=subtasks.filter(s=>s.completed).length;
  const total=subtasks.length;
  const pct=total>0?Math.round((completed/total)*100):0;
  const due=dueInfo(localTask.due_date);
  const statusObj=statuses.find(s=>s.id===localTask.status_id);

  return(
    <>
      <div style={bs.overlay} onClick={onClose}/>
      <div ref={sheetRef} style={bs.sheet}>
        {/* Handle bar */}
        <div style={bs.handleBar}><div style={bs.handle}/></div>

        {/* Title + status */}
        <div style={bs.titleRow}>
          <h2 style={bs.title}>{localTask.title}</h2>
          {due&&<span style={{fontSize:12,fontWeight:700,color:due.color,background:due.color+'18',padding:'3px 8px',borderRadius:6,flexShrink:0}}>{due.text}</span>}
        </div>

        {/* Quick status bar */}
        <div style={bs.statusBar}>
          <select value={localTask.status_id||''} onChange={e=>updateField('status_id',e.target.value)} style={{...bs.statusSelect,color:statusObj?.color||WHITE,borderColor:statusObj?.color||BORDER}}>
            {statuses.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <select value={localTask.priority||''} onChange={e=>updateField('priority',e.target.value||null)} style={{...bs.statusSelect,color:PRIORITY_COLORS[localTask.priority]||'#6B7280',borderColor:PRIORITY_COLORS[localTask.priority]||BORDER}}>
            <option value="">No priority</option>
            <option value="urgent">Urgent</option><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option>
          </select>
          <select value={localTask.assignee_id||''} onChange={e=>updateField('assignee_id',e.target.value||null)} style={bs.statusSelect}>
            <option value="">Unassigned</option>{members.map(m=><option key={m.id} value={m.id}>{m.full_name}</option>)}
          </select>
        </div>

        {/* Tab bar */}
        <div style={bs.tabBar}>
          {[['details','Details'],['subtasks',`Subtasks (${completed}/${total})`],['activity',`Activity (${comments.length})`]].map(([key,label])=>(
            <button key={key} onClick={()=>setTab(key)} style={{...bs.tab,...(tab===key?bs.tabActive:{})}}>{label}</button>
          ))}
        </div>

        {/* Tab content */}
        <div style={bs.tabContent}>
          {tab==='details'&&(
            <div>
              {/* Dates */}
              <div style={bs.fieldGroup}>
                <div style={bs.fieldRow}><span style={bs.fieldLabel}>Due Date</span>
                  <input type="date" value={localTask.due_date||''} onChange={e=>updateField('due_date',e.target.value||null)} style={bs.fieldInput}/></div>
                <div style={bs.fieldRow}><span style={bs.fieldLabel}>Publish</span>
                  <input type="date" value={localTask.publish_date||''} onChange={e=>updateField('publish_date',e.target.value||null)} style={bs.fieldInput}/></div>
              </div>

              {/* Description */}
              <div style={bs.fieldGroup}>
                <span style={bs.fieldLabel}>Description</span>
                <textarea value={localTask.description||''} onChange={e=>setLocalTask({...localTask,description:e.target.value})} onBlur={e=>updateField('description',e.target.value)} placeholder="Add notes..." style={bs.textarea} rows={3}/>
              </div>

              {/* Fields */}
              <div style={bs.fieldGroup}>
                {localTask.content_pillar&&<div style={bs.fieldRow}><span style={bs.fieldLabel}>Pillar</span><span style={bs.fieldValue}>{localTask.content_pillar}</span></div>}
                {localTask.editor_assigned&&<div style={bs.fieldRow}><span style={bs.fieldLabel}>Editor</span><span style={bs.fieldValue}>{localTask.editor_assigned}</span></div>}
                {(localTask.talent||[]).length>0&&<div style={bs.fieldRow}><span style={bs.fieldLabel}>Talent</span><span style={bs.fieldValue}>{localTask.talent.join(', ')}</span></div>}
                {localTask.content_tier&&<div style={bs.fieldRow}><span style={bs.fieldLabel}>Tier</span><span style={bs.fieldValue}>{localTask.content_tier}</span></div>}
                {localTask.thumbnail_status&&<div style={bs.fieldRow}><span style={bs.fieldLabel}>Thumbnail</span><span style={bs.fieldValue}>{localTask.thumbnail_status}</span></div>}
              </div>

              {/* Links */}
              {(localTask.script_link||localTask.drive_folder_link||localTask.video_link)&&(
                <div style={{display:'flex',gap:8,flexWrap:'wrap',marginTop:12}}>
                  {localTask.script_link&&<a href={localTask.script_link} target="_blank" rel="noopener" style={bs.linkBtn}>📄 Script</a>}
                  {localTask.drive_folder_link&&<a href={localTask.drive_folder_link} target="_blank" rel="noopener" style={bs.linkBtn}>📁 Drive</a>}
                  {localTask.video_link&&<a href={localTask.video_link} target="_blank" rel="noopener" style={bs.linkBtn}>🎬 Video</a>}
                </div>
              )}
            </div>
          )}

          {tab==='subtasks'&&(
            <div>
              {/* Progress */}
              <div style={{marginBottom:16}}>
                <div style={{display:'flex',justifyContent:'space-between',marginBottom:6}}>
                  <span style={{fontSize:13,color:'#9CA3AF'}}>{completed} of {total} complete</span>
                  <span style={{fontSize:13,fontWeight:700,color:pct===100?GREEN:WHITE}}>{pct}%</span>
                </div>
                <div style={{height:6,background:BORDER,borderRadius:3}}>
                  <div style={{height:'100%',width:`${pct}%`,background:GREEN,borderRadius:3,transition:'width 0.3s'}}/>
                </div>
              </div>

              {/* Subtask list */}
              {subtasks.map(st=>{
                const stColor=(st.color&&st.color!=='#6B7280')?st.color:SUBTASK_COLORS[branchSlug]?.[st.sort_order]||'#6B7280';
                return(
                  <div key={st.id} onClick={()=>toggleSubtask(st)} style={{...bs.subtaskItem,borderLeftColor:stColor,opacity:st.completed?0.5:1}}>
                    <div style={{...bs.checkbox,background:st.completed?GREEN:'transparent',borderColor:st.completed?GREEN:'#6B7280'}}>
                      {st.completed&&<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>}
                    </div>
                    <div style={{flex:1,minWidth:0}}>
                      <span style={{fontSize:14,color:st.completed?'#6B7280':WHITE,textDecoration:st.completed?'line-through':'none',display:'block'}}>{st.title}</span>
                      {st.assignee?.full_name&&<span style={{fontSize:11,color:'#6B7280'}}>{st.assignee.full_name}</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {tab==='activity'&&(
            <div>
              <div style={{display:'flex',gap:8,marginBottom:16}}>
                <input value={newComment} onChange={e=>setNewComment(e.target.value)} onKeyDown={e=>e.key==='Enter'&&addComment()} placeholder="Add comment..." style={bs.commentInput}/>
                <button onClick={addComment} style={bs.commentBtn}>Post</button>
              </div>
              {comments.length===0&&<div style={{textAlign:'center',color:'#6B7280',fontSize:13,padding:20}}>No activity yet</div>}
              {comments.map(c=>(
                <div key={c.id} style={bs.commentItem}>
                  <div style={{display:'flex',justifyContent:'space-between',marginBottom:2}}>
                    <span style={{fontSize:12,fontWeight:600,color:GREEN}}>{c.author?.full_name||'Unknown'}</span>
                    <span style={{fontSize:10,color:'#6B7280'}}>{new Date(c.created_at).toLocaleString()}</span>
                  </div>
                  <p style={{fontSize:13,color:'#D1D5DB',margin:0,lineHeight:1.4}}>{c.content}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

/* ── Mobile Pipeline ── */
export default function MobilePipeline({statuses,tasks,members,branchSlug,subtaskCounts,onUpdate,onCreateTask}){
  const[activeStatus,setActiveStatus]=useState(null);
  const[selectedTask,setSelectedTask]=useState(null);
  const[searchQuery,setSearchQuery]=useState('');
  const[showSearch,setShowSearch]=useState(false);
  const[showAdd,setShowAdd]=useState(false);
  const[newTitle,setNewTitle]=useState('');
  const tabsRef=useRef(null);

  useEffect(()=>{if(statuses.length>0&&!activeStatus)setActiveStatus(statuses[0].id);},[statuses]);

  const filtered=searchQuery.trim()?tasks.filter(t=>t.title.toLowerCase().includes(searchQuery.toLowerCase())||(t.editor_assigned||'').toLowerCase().includes(searchQuery.toLowerCase())):tasks;
  const activeTasks=filtered.filter(t=>t.status_id===activeStatus);
  const activeStatusObj=statuses.find(s=>s.id===activeStatus);

  async function handleCreate(){
    if(!newTitle.trim()||!activeStatus)return;
    const{data:{user}}=await supabase.auth.getUser();
    await supabase.from('pipeline_tasks').insert({title:newTitle.trim(),branch_slug:branchSlug,status_id:activeStatus,created_by:user?.id});
    setNewTitle('');setShowAdd(false);
    if(onCreateTask)onCreateTask();
  }

  function handleTaskUpdate(updated){
    if(onUpdate)onUpdate(updated);
    setSelectedTask(prev=>prev&&prev.id===updated.id?{...prev,...updated}:prev);
  }

  return(
    <div style={mp.container}>
      {/* Top bar */}
      <div style={mp.topBar}>
        <div style={{display:'flex',alignItems:'center',gap:8,flex:1}}>
          {showSearch?(
            <input value={searchQuery} onChange={e=>setSearchQuery(e.target.value)} placeholder="Search..." autoFocus onBlur={()=>{if(!searchQuery)setShowSearch(false);}} style={mp.searchInput}/>
          ):(
            <div style={{display:'flex',alignItems:'center',gap:8,flex:1}}>
              <span style={{fontSize:14,fontWeight:700,color:WHITE}}>{filtered.length} tasks</span>
            </div>
          )}
        </div>
        <div style={{display:'flex',gap:8}}>
          <button onClick={()=>setShowSearch(!showSearch)} style={mp.iconBtn}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={showSearch?GREEN:'#9CA3AF'} strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          </button>
          <button onClick={()=>setShowAdd(true)} style={mp.addBtn}>+ New</button>
        </div>
      </div>

      {/* Status tabs -- horizontal scroll */}
      <div ref={tabsRef} style={mp.tabScroll}>
        {statuses.map(s=>{
          const count=filtered.filter(t=>t.status_id===s.id).length;
          const isActive=activeStatus===s.id;
          return(
            <button key={s.id} onClick={()=>setActiveStatus(s.id)} style={{...mp.statusTab,...(isActive?{background:s.color+'22',color:s.color,borderColor:s.color}:{})}}>
              <div style={{width:6,height:6,borderRadius:'50%',background:isActive?s.color:'#6B7280',flexShrink:0}}/>
              <span>{s.name}</span>
              {count>0&&<span style={{...mp.tabCount,...(isActive?{background:s.color+'33',color:s.color}:{})}}>{count}</span>}
            </button>
          );
        })}
      </div>

      {/* Task list */}
      <div style={mp.taskList}>
        {activeTasks.length===0&&(
          <div style={mp.empty}>
            <span style={{fontSize:14,color:'#6B7280'}}>No tasks in {activeStatusObj?.name||'this status'}</span>
          </div>
        )}
        {activeTasks.map(task=>{
          const due=dueInfo(task.due_date);
          const assignee=members.find(m=>m.id===task.assignee_id);
          const stCount=subtaskCounts[task.id];
          return(
            <div key={task.id} onClick={()=>setSelectedTask(task)} style={mp.taskCard}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:8}}>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:15,fontWeight:600,color:WHITE,marginBottom:4,lineHeight:1.3}}>{task.title}</div>
                  <div style={{display:'flex',gap:6,flexWrap:'wrap',alignItems:'center'}}>
                    {task.priority&&<span style={{fontSize:11,fontWeight:600,color:PRIORITY_COLORS[task.priority]}}>{task.priority}</span>}
                    {task.content_pillar&&<span style={{fontSize:11,color:'#6B7280'}}>{task.content_pillar}</span>}
                    {task.is_sob&&<span style={{fontSize:10,fontWeight:700,color:PEACH,background:PEACH+'22',padding:'1px 5px',borderRadius:3}}>SOB</span>}
                  </div>
                </div>
                {due&&<span style={{fontSize:11,fontWeight:700,color:due.color,background:due.color+'15',padding:'3px 8px',borderRadius:6,flexShrink:0,whiteSpace:'nowrap'}}>{due.text}</span>}
              </div>

              {/* Bottom row */}
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginTop:10,paddingTop:8,borderTop:`1px solid ${BORDER}`}}>
                <div style={{display:'flex',gap:8,alignItems:'center'}}>
                  {assignee&&<span style={{fontSize:11,color:'#9CA3AF'}}>{assignee.full_name}</span>}
                  {task.editor_assigned&&<span style={{fontSize:11,color:'#6B7280'}}>Ed: {task.editor_assigned}</span>}
                </div>
                <div style={{display:'flex',gap:6,alignItems:'center'}}>
                  {task.publish_date&&<span style={{fontSize:10,color:'#6B7280'}}>{parseLocal(task.publish_date).toLocaleDateString('en-US',{month:'short',day:'numeric'})}</span>}
                  {stCount&&stCount.total>0&&(
                    <span style={{fontSize:11,color:stCount.done===stCount.total?GREEN:'#6B7280',fontWeight:600}}>✓ {stCount.done}/{stCount.total}</span>
                  )}
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick add overlay */}
      {showAdd&&(
        <>
          <div style={bs.overlay} onClick={()=>setShowAdd(false)}/>
          <div style={{...bs.sheet,maxHeight:'30vh'}}>
            <div style={bs.handleBar}><div style={bs.handle}/></div>
            <div style={{padding:'0 20px 20px'}}>
              <h3 style={{fontSize:14,fontWeight:700,color:WHITE,margin:'0 0 4px'}}>New Task</h3>
              <p style={{fontSize:12,color:'#6B7280',margin:'0 0 12px'}}>Adding to: {activeStatusObj?.name}</p>
              <input value={newTitle} onChange={e=>setNewTitle(e.target.value)} onKeyDown={e=>e.key==='Enter'&&handleCreate()} placeholder="Task title..." autoFocus style={{width:'100%',background:CARD_LIGHT,border:`1px solid ${BORDER}`,borderRadius:8,color:WHITE,padding:'12px 14px',fontSize:15,outline:'none',fontFamily:'Outfit,Arial,sans-serif',boxSizing:'border-box',marginBottom:12}}/>
              <button onClick={handleCreate} disabled={!newTitle.trim()} style={{width:'100%',background:GREEN,border:'none',borderRadius:8,color:'#000',padding:'12px',fontSize:14,fontWeight:700,cursor:'pointer',opacity:newTitle.trim()?1:0.4}}>Create Task</button>
            </div>
          </div>
        </>
      )}

      {/* Bottom sheet task detail */}
      {selectedTask&&<BottomSheet task={selectedTask} onClose={()=>setSelectedTask(null)} members={members} statuses={statuses} branchSlug={branchSlug} onUpdate={handleTaskUpdate}/>}
    </div>
  );
}

/* ── Bottom sheet styles ── */
const bs={
  overlay:{position:'fixed',inset:0,background:'rgba(0,0,0,0.6)',zIndex:1000},
  sheet:{position:'fixed',bottom:0,left:0,right:0,background:BG,borderTopLeftRadius:16,borderTopRightRadius:16,border:`1px solid ${BORDER}`,borderBottom:'none',maxHeight:'85vh',overflowY:'auto',zIndex:1001,paddingBottom:'env(safe-area-inset-bottom,20px)'},
  handleBar:{display:'flex',justifyContent:'center',padding:'10px 0 6px'},
  handle:{width:36,height:4,borderRadius:2,background:'#6B7280'},
  titleRow:{display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:12,padding:'4px 20px 12px'},
  title:{fontSize:18,fontWeight:700,color:WHITE,margin:0,lineHeight:1.3,flex:1},
  statusBar:{display:'flex',gap:8,padding:'0 20px 12px',flexWrap:'wrap'},
  statusSelect:{background:CARD_LIGHT,border:`1px solid ${BORDER}`,borderRadius:8,color:WHITE,padding:'8px 10px',fontSize:13,outline:'none',flex:1,minWidth:0},
  tabBar:{display:'flex',borderBottom:`1px solid ${BORDER}`,padding:'0 20px',gap:0},
  tab:{background:'transparent',border:'none',borderBottom:'2px solid transparent',color:'#6B7280',padding:'10px 14px',fontSize:13,fontWeight:500,cursor:'pointer',whiteSpace:'nowrap'},
  tabActive:{color:GREEN,borderBottomColor:GREEN},
  tabContent:{padding:'16px 20px'},
  fieldGroup:{marginBottom:16},
  fieldRow:{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'10px 0',borderBottom:`1px solid ${BORDER}22`},
  fieldLabel:{fontSize:13,color:'#9CA3AF',minWidth:80},
  fieldValue:{fontSize:13,color:WHITE,fontWeight:500},
  fieldInput:{background:CARD_LIGHT,border:`1px solid ${BORDER}`,borderRadius:6,color:WHITE,padding:'8px 10px',fontSize:13,outline:'none',textAlign:'right'},
  textarea:{width:'100%',background:CARD_LIGHT,border:`1px solid ${BORDER}`,borderRadius:8,color:WHITE,padding:'10px 12px',fontSize:13,outline:'none',resize:'none',fontFamily:'Outfit,Arial,sans-serif',marginTop:6,boxSizing:'border-box'},
  linkBtn:{display:'inline-flex',alignItems:'center',gap:4,background:CARD_LIGHT,border:`1px solid ${BORDER}`,borderRadius:8,color:GREEN,padding:'10px 14px',fontSize:13,fontWeight:600,textDecoration:'none'},
  subtaskItem:{display:'flex',alignItems:'flex-start',gap:12,padding:'12px 0',borderBottom:`1px solid ${BORDER}22`,borderLeft:'3px solid',paddingLeft:12,marginLeft:-4,cursor:'pointer'},
  checkbox:{width:22,height:22,borderRadius:6,border:'2px solid',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,marginTop:1},
  commentInput:{flex:1,background:CARD_LIGHT,border:`1px solid ${BORDER}`,borderRadius:8,color:WHITE,padding:'10px 12px',fontSize:13,outline:'none',fontFamily:'Outfit,Arial,sans-serif'},
  commentBtn:{background:GREEN,border:'none',borderRadius:8,color:'#000',padding:'10px 16px',fontSize:13,fontWeight:600,cursor:'pointer'},
  commentItem:{padding:'10px 0',borderBottom:`1px solid ${BORDER}22`},
};

/* ── Mobile pipeline styles ── */
const mp={
  container:{display:'flex',flexDirection:'column',height:'100%',minHeight:'calc(100vh - 120px)'},
  topBar:{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'12px 0',gap:8},
  searchInput:{flex:1,background:CARD_LIGHT,border:`1px solid ${BORDER}`,borderRadius:8,color:WHITE,padding:'10px 12px',fontSize:14,outline:'none',fontFamily:'Outfit,Arial,sans-serif'},
  iconBtn:{background:'transparent',border:`1px solid ${BORDER}`,borderRadius:8,padding:8,display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer'},
  addBtn:{background:GREEN,border:'none',borderRadius:8,color:'#000',padding:'8px 14px',fontSize:13,fontWeight:700,cursor:'pointer',whiteSpace:'nowrap'},
  tabScroll:{display:'flex',gap:6,overflowX:'auto',paddingBottom:12,WebkitOverflowScrolling:'touch',msOverflowStyle:'none',scrollbarWidth:'none'},
  statusTab:{display:'flex',alignItems:'center',gap:6,background:'transparent',border:`1px solid ${BORDER}`,borderRadius:20,color:'#9CA3AF',padding:'7px 14px',fontSize:12,fontWeight:600,cursor:'pointer',whiteSpace:'nowrap',flexShrink:0,transition:'all 0.15s'},
  tabCount:{fontSize:10,fontWeight:700,background:'rgba(255,255,255,0.08)',padding:'1px 6px',borderRadius:8},
  taskList:{flex:1,overflowY:'auto'},
  taskCard:{padding:16,background:CARD,border:`1px solid ${BORDER}`,borderRadius:12,marginBottom:8,cursor:'pointer',transition:'border-color 0.15s'},
  empty:{display:'flex',alignItems:'center',justifyContent:'center',padding:40,background:CARD,borderRadius:12,border:`1px solid ${BORDER}`},
};
