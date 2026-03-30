import MobileCalendar from "./MobileCalendar"
import { useState, useEffect, useMemo, useRef } from 'react';
import { supabase } from '../lib/supabase';

const GREEN = '#37CA37';
const PEACH = '#F4AB9C';
const BG = 'var(--dark)';
const CARD = 'var(--dark-card)';
const CARD_LIGHT = 'var(--dark-light)';
const BORDER = 'var(--dark-border)';
const WHITE = 'var(--white)';

const BRANCH_COLORS = { youtube: '#FF0000', 'short-form': '#8B5CF6', 'ads-creative': '#F59E0B', production: '#3B82F6' };
const BRANCH_LABELS = { youtube: 'YouTube', 'short-form': 'Short Form', 'ads-creative': 'Ads/Creative', production: 'Production' };
const PRIORITY_COLORS = { urgent: '#EF4444', high: '#F59E0B', medium: '#3B82F6', low: '#6B7280' };

const CONTENT_TYPE_COLORS = {
  story: '#E040FB',
  reel: '#8B5CF6',
  tiktok: '#00F2EA',
  yt_short: '#FF0000',
  post: '#3B82F6',
};

const CONTENT_TYPE_LABELS = {
  story: 'Story',
  reel: 'Reel',
  tiktok: 'TikTok',
  yt_short: 'YT Short',
  post: 'Post',
};

const STATUS_COLORS = {
  'idea bank':'#6B7280','backlog':'#6B7280','brief':'#6B7280','requested':'#6B7280',
  'in production':'#F59E0B','script/talking points':'#F59E0B','script':'#F59E0B','scheduled':'#F59E0B',
  'filming':'#3B82F6','in progress':'#3B82F6',
  'editing':'#8B5CF6','rough cut':'#8B5CF6','final cut':'#8B5CF6',
  'qc review':'#EC4899','review':'#EC4899','revisions':'#F97316',
  'thumbnail ready':'#F97316','ready to post':'#10B981','approved':'#10B981','complete':'#10B981','publishing queue':'#10B981',
  'published':'#37CA37','posted/archive':'#37CA37','live':'#37CA37','archived':'#374151',
};
function getStatusColor(n){return n?STATUS_COLORS[n.toLowerCase()]||'#6B7280':'#6B7280';}

const SUBTASK_COLORS = {
  youtube:{1:'#6B7280',2:'#F59E0B',3:'#F59E0B',4:'#F59E0B',5:'#F59E0B',6:'#F59E0B',7:'#3B82F6',8:'#3B82F6',9:'#EC4899',10:'#EC4899',11:'#8B5CF6',12:'#EC4899',13:'#F97316',14:'#F97316',15:'#10B981',16:'#37CA37'},
  'short-form':{1:'#F59E0B',2:'#3B82F6',3:'#3B82F6',4:'#8B5CF6',5:'#8B5CF6',6:'#EC4899',7:'#10B981',8:'#10B981',9:'#10B981',10:'#37CA37',11:'#37CA37'},
  'ads-creative':{1:'#F59E0B',2:'#F59E0B',3:'#3B82F6',4:'#8B5CF6',5:'#EC4899',6:'#EC4899',7:'#10B981',8:'#37CA37',9:'#6B7280'},
  production:{1:'#F59E0B',2:'#3B82F6',3:'#8B5CF6',4:'#EC4899',5:'#10B981',6:'#6B7280'},
};

const MONTHS=['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAYS=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const fmt=(d)=>d.toISOString().split('T')[0];
const sameDay=(a,b)=>fmt(a)===fmt(b);
const parseLocal=(s)=>{const[y,m,d]=s.split('-');return new Date(y,m-1,d);};
function dueColor(due){if(!due)return'#6B7280';const today=new Date();today.setHours(0,0,0,0);const d=parseLocal(due);d.setHours(0,0,0,0);const diff=(d-today)/86400000;if(diff<0)return'#EF4444';if(diff<=2)return'#F59E0B';return'#6B7280';}

/* ── Quick Add Modal ── */
function QuickAddModal({date,statuses,onClose,onCreated}){
  const[title,setTitle]=useState('');const[branch,setBranch]=useState('youtube');
  const[contentType,setContentType]=useState('');const[saving,setSaving]=useState(false);
  const ref=useRef(null);useEffect(()=>{ref.current?.focus();},[]);
  async function handleCreate(){
    if(!title.trim()||saving)return;setSaving(true);
    const firstStatus=statuses.find(s=>s.branch_slug===branch&&s.sort_order===1);
    const{data:{user}}=await supabase.auth.getUser();
    await supabase.from('pipeline_tasks').insert({title:title.trim(),branch_slug:branch,status_id:firstStatus?.id,publish_date:fmt(date),content_type:contentType||null,created_by:user?.id});
    setSaving(false);onCreated();onClose();
  }
  return(
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center'}} onClick={onClose}>
      <div style={{background:BG,border:`1px solid ${BORDER}`,borderRadius:12,padding:20,width:380,boxShadow:'0 16px 48px rgba(0,0,0,0.5)'}} onClick={e=>e.stopPropagation()}>
        <h3 style={{fontSize:14,fontWeight:700,color:WHITE,margin:'0 0 4px'}}>Quick Add</h3>
        <p style={{fontSize:12,color:'var(--text-muted)',margin:'0 0 16px'}}>{date.toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric'})}</p>
        <input ref={ref} value={title} onChange={e=>setTitle(e.target.value)} onKeyDown={e=>e.key==='Enter'&&handleCreate()} placeholder="Task title..." style={{width:'100%',background:CARD_LIGHT,border:`1px solid ${BORDER}`,borderRadius:6,color:WHITE,padding:'10px 12px',fontSize:13,outline:'none',marginBottom:12,fontFamily:'Outfit,Arial,sans-serif',boxSizing:'border-box'}}/>
        <div style={{display:'flex',gap:6,marginBottom:12,flexWrap:'wrap'}}>
          {Object.entries(BRANCH_LABELS).map(([slug,label])=>(
            <button key={slug} onClick={()=>setBranch(slug)} style={{background:branch===slug?BRANCH_COLORS[slug]+'33':'transparent',border:`1px solid ${branch===slug?BRANCH_COLORS[slug]:BORDER}`,color:branch===slug?BRANCH_COLORS[slug]:'#9CA3AF',borderRadius:6,padding:'4px 10px',fontSize:11,fontWeight:500,cursor:'pointer'}}>{label}</button>
          ))}
        </div>
        {branch==='short-form'&&(
          <div style={{marginBottom:12}}>
            <span style={{fontSize:11,color:'var(--text-muted)',marginBottom:4,display:'block'}}>Content Type</span>
            <div style={{display:'flex',gap:4,flexWrap:'wrap'}}>
              {Object.entries(CONTENT_TYPE_LABELS).map(([key,label])=>(
                <button key={key} onClick={()=>setContentType(contentType===key?'':key)} style={{background:contentType===key?(CONTENT_TYPE_COLORS[key]||'#6B7280')+'33':'transparent',border:`1px solid ${contentType===key?CONTENT_TYPE_COLORS[key]||'#6B7280':BORDER}`,color:contentType===key?CONTENT_TYPE_COLORS[key]||WHITE:'#6B7280',borderRadius:4,padding:'3px 8px',fontSize:10,fontWeight:600,cursor:'pointer'}}>{label}</button>
              ))}
            </div>
          </div>
        )}
        <div style={{display:'flex',gap:8,justifyContent:'flex-end'}}>
          <button onClick={onClose} style={{background:'transparent',border:`1px solid ${BORDER}`,borderRadius:6,color:'var(--text-secondary)',padding:'6px 14px',fontSize:12,cursor:'pointer'}}>Cancel</button>
          <button onClick={handleCreate} disabled={!title.trim()||saving} style={{background:GREEN,border:'none',borderRadius:6,color:'#000',padding:'6px 14px',fontSize:12,fontWeight:600,cursor:'pointer',opacity:!title.trim()||saving?0.5:1}}>{saving?'Creating...':'Create'}</button>
        </div>
      </div>
    </div>
  );
}

/* ── Share Link Modal ── */
const PERM_LEVELS=[{value:'view',label:'View only',desc:'Can see the calendar but not change anything',icon:'👁️'},{value:'comment',label:'Can comment',desc:'Can see and leave notes but not move tasks',icon:'💬'},{value:'edit',label:'Can edit',desc:'Can move tasks, change dates, update status',icon:'✏️'},{value:'full',label:'Full access',desc:'Can add, edit, and delete tasks',icon:'🔓'}];
function ShareModal({onClose}){
  const[shares,setShares]=useState([]);const[creating,setCreating]=useState(false);const[copied,setCopied]=useState(null);const[newPerm,setNewPerm]=useState('view');const[newLabel,setNewLabel]=useState('');
  useEffect(()=>{loadShares();},[]);
  async function loadShares(){const{data}=await supabase.from('calendar_shares').select('*').eq('is_active',true).order('created_at',{ascending:false});if(data)setShares(data);}
  async function createShare(){
    setCreating(true);const{data:{user}}=await supabase.auth.getUser();
    await supabase.from('calendar_shares').insert({label:newLabel.trim()||'Shared Calendar',permission:newPerm,created_by:user?.id});
    setCreating(false);setNewLabel('');setNewPerm('view');loadShares();
  }
  async function updatePerm(id,perm){await supabase.from('calendar_shares').update({permission:perm}).eq('id',id);loadShares();}
  async function deactivate(id){await supabase.from('calendar_shares').update({is_active:false}).eq('id',id);loadShares();}
  function copyLink(token){const base=window.location.origin.replace(/-[a-z0-9]+-pfmediadepts-projects/,'');const url=base+'/calendar/public/'+token;navigator.clipboard.writeText(url);setCopied(token);setTimeout(()=>setCopied(null),2000);}
  const permColor={view:'#6B7280',comment:'#3B82F6',edit:'#F59E0B',full:'#37CA37'};
  return(
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center'}} onClick={onClose}>
      <div style={{background:BG,border:'1px solid '+BORDER,borderRadius:12,padding:24,width:500,boxShadow:'0 16px 48px rgba(0,0,0,0.5)',maxHeight:'80vh',overflowY:'auto'}} onClick={e=>e.stopPropagation()}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
          <h3 style={{fontSize:16,fontWeight:700,color:WHITE,margin:0}}>Share Calendar</h3>
          <button onClick={onClose} style={{background:'transparent',border:'none',color:'var(--text-secondary)',fontSize:18,cursor:'pointer'}}>&times;</button>
        </div>
        <div style={{background:CARD_LIGHT,border:'1px solid '+BORDER,borderRadius:8,padding:16,marginBottom:20}}>
          <div style={{fontSize:12,fontWeight:600,color:'var(--text-secondary)',marginBottom:8}}>Create new share link</div>
          <input value={newLabel} onChange={e=>setNewLabel(e.target.value)} placeholder="Label (e.g. Jacob, SOB Team, Aaron)" style={{width:'100%',boxSizing:'border-box',background:BG,border:'1px solid '+BORDER,borderRadius:6,color:WHITE,padding:'8px 10px',fontSize:12,outline:'none',marginBottom:10,fontFamily:'Outfit,Arial,sans-serif'}}/>
          <div style={{fontSize:11,fontWeight:600,color:'var(--text-muted)',marginBottom:6}}>ACCESS LEVEL</div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:6,marginBottom:12}}>
            {PERM_LEVELS.map(p=>(
              <button key={p.value} onClick={()=>setNewPerm(p.value)} style={{display:'flex',alignItems:'flex-start',gap:8,padding:'8px 10px',background:newPerm===p.value?permColor[p.value]+'15':'transparent',border:'1px solid '+(newPerm===p.value?permColor[p.value]:BORDER),borderRadius:6,cursor:'pointer',textAlign:'left'}}>
                <span style={{fontSize:14}}>{p.icon}</span>
                <div><div style={{fontSize:11,fontWeight:600,color:newPerm===p.value?permColor[p.value]:WHITE}}>{p.label}</div>
                <div style={{fontSize:10,color:'var(--text-muted)',lineHeight:1.3}}>{p.desc}</div></div>
              </button>
            ))}
          </div>
          <button onClick={createShare} disabled={creating} style={{background:GREEN,border:'none',borderRadius:6,color:'#000',padding:'10px 16px',fontSize:12,fontWeight:700,cursor:'pointer',opacity:creating?0.5:1,width:'100%'}}>
            {creating?'Creating...':'Generate Share Link'}
          </button>
        </div>
        <div style={{fontSize:12,fontWeight:600,color:'var(--text-secondary)',marginBottom:10}}>Active links ({shares.length})</div>
        {shares.length===0&&<div style={{padding:16,textAlign:'center',color:'var(--text-muted)',fontSize:12}}>No active share links</div>}
        {shares.map(s=>(
          <div key={s.id} style={{padding:'12px 0',borderBottom:'1px solid '+BORDER+'22'}}>
            <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:6}}>
              <span style={{fontSize:13,fontWeight:600,color:WHITE}}>{s.label||'Shared Calendar'}</span>
              <span style={{fontSize:10,fontWeight:600,color:permColor[s.permission||'view'],background:(permColor[s.permission||'view'])+'15',padding:'2px 6px',borderRadius:4}}>
                {(PERM_LEVELS.find(p=>p.value===(s.permission||'view'))||{}).label||'View only'}
              </span>
              <span style={{fontSize:10,color:'var(--text-muted)',marginLeft:'auto'}}>{new Date(s.created_at).toLocaleDateString()}</span>
            </div>
            <div style={{display:'flex',alignItems:'center',gap:6}}>
              <div style={{flex:1,fontSize:10,color:'var(--text-muted)',fontFamily:'monospace',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',maxWidth:'100%'}}>
                {window.location.origin.replace(/-[a-z0-9]+-pfmediadepts-projects/,'')}/calendar/public/{s.token}
              </div>
              <select value={s.permission||'view'} onChange={e=>updatePerm(s.id,e.target.value)} style={{background:CARD_LIGHT,border:'1px solid '+BORDER,borderRadius:4,color:WHITE,padding:'3px 6px',fontSize:10,outline:'none',cursor:'pointer'}}>
                {PERM_LEVELS.map(p=><option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
              <button onClick={()=>copyLink(s.token)} style={{background:copied===s.token?GREEN+'33':'transparent',border:'1px solid '+(copied===s.token?GREEN:BORDER),borderRadius:4,color:copied===s.token?GREEN:'#9CA3AF',padding:'3px 8px',fontSize:10,fontWeight:600,cursor:'pointer'}}>
                {copied===s.token?'Copied':'Copy'}
              </button>
              <button onClick={()=>deactivate(s.id)} style={{background:'transparent',border:'1px solid '+BORDER,borderRadius:4,color:'#EF4444',padding:'3px 8px',fontSize:10,cursor:'pointer'}}>Revoke</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Task Detail Modal ── */
function TaskDetailModal({task,onClose,members,statuses,onUpdate,readOnly=false}){
  const[subtasks,setSubtasks]=useState([]);const[comments,setComments]=useState([]);const[attachments,setAttachments]=useState([]);const[uploading,setUploading]=useState(false);
  const[newComment,setNewComment]=useState('');const[localTask,setLocalTask]=useState(task);
  const branchSlug=task.branch_slug;
  useEffect(()=>{setLocalTask(task);loadSubtasks();loadComments();loadAttachments();},[task.id]);
  async function loadSubtasks(){const{data}=await supabase.from('pipeline_subtasks').select('*, assignee:profiles!pipeline_subtasks_assignee_id_fkey(id,full_name)').eq('task_id',task.id).order('sort_order');if(data)setSubtasks(data);}
  async function loadComments(){const{data}=await supabase.from('pipeline_comments').select('*, author:profiles!pipeline_comments_user_id_fkey(full_name)').eq('task_id',task.id).order('created_at',{ascending:false});if(data)setComments(data);}
  async function updateField(f,v){if(readOnly)return;const u={...localTask,[f]:v};setLocalTask(u);await supabase.from('pipeline_tasks').update({[f]:v}).eq('id',task.id);if(onUpdate)onUpdate(u);}
  async function toggleSubtask(st){if(readOnly)return;await supabase.from('pipeline_subtasks').update({completed:!st.completed,completed_at:!st.completed?new Date().toISOString():null}).eq('id',st.id);loadSubtasks();}
  async function updateSubtaskAssignee(sid,uid){if(readOnly)return;await supabase.from('pipeline_subtasks').update({assignee_id:uid||null}).eq('id',sid);loadSubtasks();}
  async function addComment(){if(readOnly||!newComment.trim())return;const{data:{user}}=await supabase.auth.getUser();await supabase.from('pipeline_comments').insert({task_id:task.id,user_id:user.id,content:newComment.trim()});setNewComment('');loadComments();}
  async function loadAttachments(){const{data}=await supabase.from('task_attachments').select('*, uploader:profiles!task_attachments_uploaded_by_fkey(full_name)').eq('task_id',task.id).order('created_at',{ascending:false});if(data)setAttachments(data);}
  async function handleFileUpload(e){const file=e.target.files?.[0];if(!file||readOnly)return;if(file.size>10*1024*1024){alert('File must be under 10MB');return;}setUploading(true);const path=task.id+'/'+Date.now()+'-'+file.name;const{error:upErr}=await supabase.storage.from('attachments').upload(path,file);if(upErr){console.error(upErr);setUploading(false);return;}const{data:{publicUrl}}=supabase.storage.from('attachments').getPublicUrl(path);const{data:{user}}=await supabase.auth.getUser();await supabase.from('task_attachments').insert({task_id:task.id,file_name:file.name,file_url:publicUrl,file_size:file.size,file_type:file.type,uploaded_by:user?.id});setUploading(false);loadAttachments();}
  async function deleteAttachment(att){if(readOnly)return;const path=att.file_url.split('/attachments/')[1];if(path)await supabase.storage.from('attachments').remove([path]);await supabase.from('task_attachments').delete().eq('id',att.id);loadAttachments();}
  const completed=subtasks.filter(s=>s.completed).length;const total=subtasks.length;const pct=total>0?Math.round((completed/total)*100):0;
  const statusColor=getStatusColor(localTask.status?.name||statuses?.find(s=>s.id===localTask.status_id)?.name);
  const contentTypeColor=CONTENT_TYPE_COLORS[localTask.content_type]||null;

  return(
    <div style={ms.overlay} onClick={onClose}>
      <div style={ms.content} onClick={e=>e.stopPropagation()}>
        <div style={ms.header}>
          <div style={{display:'flex',alignItems:'center',gap:8,flex:1,minWidth:0}}>
            <div style={{width:10,height:10,borderRadius:'50%',background:BRANCH_COLORS[branchSlug]||GREEN,flexShrink:0}}/>
            <h2 style={ms.title}>{localTask.title}</h2>
            {localTask.content_type&&<span style={{fontSize:9,fontWeight:700,color:contentTypeColor||'#9CA3AF',background:(contentTypeColor||'#6B7280')+'22',padding:'2px 6px',borderRadius:4,flexShrink:0}}>{CONTENT_TYPE_LABELS[localTask.content_type]||localTask.content_type}</span>}
            {readOnly&&<span style={{fontSize:9,fontWeight:700,color:'var(--text-muted)',background:'#6B728022',padding:'2px 6px',borderRadius:4,flexShrink:0}}>READ ONLY</span>}
          </div>
          <button onClick={onClose} style={ms.closeBtn}>&times;</button>
        </div>
        <div style={ms.topBar}>
          <div style={ms.topBarItem}><span style={ms.topBarLabel}>Status</span>
            {readOnly?<span style={{fontSize:12,color:statusColor,fontWeight:600}}>{localTask.status?.name||'--'}</span>:
            <select value={localTask.status_id||''} onChange={e=>updateField('status_id',e.target.value)} style={ms.topBarSelect}>
              {(statuses||[]).filter(s=>s.branch_slug===branchSlug).map(s=><option key={s.id} value={s.id}>{s.name}</option>)}
            </select>}</div>
          <div style={ms.topBarItem}><span style={ms.topBarLabel}>Priority</span>
            {readOnly?<span style={{fontSize:12,color:PRIORITY_COLORS[localTask.priority]||'#6B7280',fontWeight:500}}>{localTask.priority||'--'}</span>:
            <select value={localTask.priority||''} onChange={e=>updateField('priority',e.target.value||null)} style={{...ms.topBarSelect,color:PRIORITY_COLORS[localTask.priority]||WHITE}}>
              <option value="">None</option><option value="urgent">Urgent</option><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option>
            </select>}</div>
          <div style={ms.topBarItem}><span style={ms.topBarLabel}>Due Date</span>
            <span style={{fontSize:12,color:dueColor(localTask.due_date)}}>{localTask.due_date||'--'}</span></div>
          <div style={ms.topBarItem}><span style={ms.topBarLabel}>Publish</span>
            <span style={{fontSize:12,color:WHITE}}>{localTask.publish_date||'--'}</span></div>
          {localTask.content_type&&<div style={ms.topBarItem}><span style={ms.topBarLabel}>Type</span>
            <span style={{fontSize:12,color:contentTypeColor||'#9CA3AF',fontWeight:600}}>{CONTENT_TYPE_LABELS[localTask.content_type]||localTask.content_type}</span></div>}
        </div>
        <div style={ms.body}>
          <div style={ms.left}>
            {localTask.description&&<div style={ms.section}><h3 style={ms.sectionTitle}>Description</h3><p style={{fontSize:13,color:'var(--text-light, #D1D5DB)',margin:0,lineHeight:1.5}}>{localTask.description}</p></div>}
            {total>0&&<div style={ms.section}>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:8}}><h3 style={ms.sectionTitle}>Subtasks</h3><span style={{fontSize:12,color:'var(--text-secondary)'}}>{completed}/{total} ({pct}%)</span></div>
              <div style={{height:4,background:BORDER,borderRadius:2,marginBottom:12}}><div style={{height:'100%',width:`${pct}%`,background:GREEN,borderRadius:2,transition:'width 0.3s'}}/></div>
              {subtasks.map(st=>{const stColor=(st.color&&st.color!=='#6B7280')?st.color:SUBTASK_COLORS[branchSlug]?.[st.sort_order]||'#6B7280';
                return(<div key={st.id} style={ms.subtaskRow}><div style={{...ms.subtaskDot,background:stColor,opacity:st.completed?0.4:1}}/>
                  {!readOnly&&<input type="checkbox" checked={st.completed} onChange={()=>toggleSubtask(st)} style={{accentColor:GREEN,cursor:'pointer'}}/>}
                  <span style={{flex:1,fontSize:13,color:st.completed?'#6B7280':WHITE,textDecoration:st.completed?'line-through':'none'}}>{st.title}</span>
                  {st.assignee?.full_name&&<span style={{fontSize:10,color:'var(--text-muted)'}}>{st.assignee.full_name}</span>}
                </div>);})}
            </div>}
            {comments.length>0&&<div style={ms.section}><h3 style={ms.sectionTitle}>Activity</h3>
              {comments.map(c=>(<div key={c.id} style={ms.commentItem}><span style={{fontWeight:600,color:GREEN,fontSize:12}}>{c.author?.full_name||'Unknown'}</span>
                <span style={{fontSize:11,color:'var(--text-muted)',marginLeft:8}}>{new Date(c.created_at).toLocaleString()}</span>
                <p style={{margin:'4px 0 0',fontSize:13,color:'var(--text-light, #D1D5DB)'}}>{c.content}</p></div>))}</div>}
            {/* Attachments */}
            <div style={ms.section}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
                <h3 style={ms.sectionTitle}>Attachments</h3>
                <span style={{fontSize:11,color:"var(--text-muted)"}}>{attachments.length} file{attachments.length!==1?"s":""}</span>
              </div>
              {!readOnly&&<label style={{display:"inline-flex",alignItems:"center",gap:6,background:CARD_LIGHT,border:"1px solid var(--dark-border)",borderRadius:6,padding:"6px 12px",fontSize:12,color:WHITE,cursor:"pointer",marginBottom:10}}>
                {uploading?"Uploading...":"Attach file"}
                <input type="file" onChange={handleFileUpload} style={{display:"none"}} disabled={uploading}/>
              </label>}
              {attachments.map(att=>(
                <div key={att.id} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 0",borderBottom:"1px solid var(--dark-border)"}}>
                  <span style={{fontSize:14}}>{att.file_type?.startsWith("image")?"🖼️":att.file_type?.includes("pdf")?"📄":"📎"}</span>
                  <div style={{flex:1,minWidth:0}}>
                    <a href={att.file_url} target="_blank" rel="noopener" style={{fontSize:13,color:WHITE,fontWeight:500,textDecoration:"none"}}>{att.file_name}</a>
                    <div style={{fontSize:10,color:"var(--text-muted)"}}>{att.uploader?.full_name||"Unknown"} -- {att.file_size?Math.round(att.file_size/1024)+"KB":""}</div>
                  </div>
                  {!readOnly&&<button onClick={()=>deleteAttachment(att)} style={{background:"transparent",border:"none",color:"#EF4444",fontSize:12,cursor:"pointer",padding:4}}>✕</button>}
                </div>
              ))}
              {attachments.length===0&&<div style={{fontSize:12,color:"var(--text-muted)",padding:8}}>No files attached</div>}
            </div>
          </div>
          <div style={ms.right}>
            <div style={ms.section}><h3 style={ms.sectionTitle}>Details</h3>
              {localTask.content_pillar&&<FR label="Pillar"><span style={{fontSize:12,color:WHITE}}>{localTask.content_pillar}</span></FR>}
              {localTask.editor_assigned&&<FR label="Editor"><span style={{fontSize:12,color:WHITE}}>{localTask.editor_assigned}</span></FR>}
              {localTask.talent?.length>0&&<FR label="Talent"><span style={{fontSize:12,color:WHITE}}>{localTask.talent.join(', ')}</span></FR>}
              {localTask.content_tier&&<FR label="Tier"><span style={{fontSize:12,color:WHITE}}>{localTask.content_tier}</span></FR>}
              {localTask.thumbnail_status&&<FR label="Thumbnail"><span style={{fontSize:12,color:WHITE}}>{localTask.thumbnail_status}</span></FR>}
              {localTask.is_sob&&<FR label="SOB"><span style={{fontSize:12,color:PEACH,fontWeight:600}}>School of Bots</span></FR>}
            </div>
            {(localTask.script_link||localTask.drive_folder_link||localTask.video_link)&&<div style={ms.section}><h3 style={ms.sectionTitle}>Links</h3>
              <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
                {localTask.script_link&&<a href={localTask.script_link} target="_blank" rel="noopener" style={ms.linkPill}>Script ↗</a>}
                {localTask.drive_folder_link&&<a href={localTask.drive_folder_link} target="_blank" rel="noopener" style={ms.linkPill}>Drive ↗</a>}
                {localTask.video_link&&<a href={localTask.video_link} target="_blank" rel="noopener" style={ms.linkPill}>Video ↗</a>}
              </div></div>}
          </div>
        </div>
      </div>
    </div>
  );
}
function FR({label,children}){return(<div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'6px 0',borderBottom:`1px solid ${BORDER}`}}><span style={{fontSize:12,color:'var(--text-secondary)',minWidth:80}}>{label}</span><div style={{flex:1,maxWidth:180}}>{children}</div></div>);}

/* ══════════════════════════════════════════════════════════
   CONTENT CALENDAR (MAIN -- AUTHENTICATED)
   ══════════════════════════════════════════════════════════ */
export default function ContentCalendar(){
  const[tasks,setTasks]=useState([]);const[statuses,setStatuses]=useState([]);const[members,setMembers]=useState([]);
  const[curDate,setCurDate]=useState(new Date());const[viewMode,setViewMode]=useState('month');
  const[branchFilter,setBranchFilter]=useState('all');const[contentTypeFilter,setContentTypeFilter]=useState('all');
  const[selectedTask,setSelectedTask]=useState(null);const[permission,setPermission]=useState('view');const[quickAddDate,setQuickAddDate]=useState(null);
  const[dragTask,setDragTask]=useState(null);const[dragOver,setDragOver]=useState(null);
  const[sidebarOpen,setSidebarOpen]=useState(false);const[shareModal,setShareModal]=useState(false);

  useEffect(()=>{load();},[]);
  async function load(){
    const[tRes,sRes,mRes]=await Promise.all([supabase.from('pipeline_tasks').select('*, status:pipeline_statuses(name,branch_slug)'),supabase.from('pipeline_statuses').select('*').order('sort_order'),supabase.from('profiles').select('id,full_name')]);
    if(tRes.data)setTasks(tRes.data);if(sRes.data)setStatuses(sRes.data);if(mRes.data)setMembers(mRes.data);
  }

  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)
  useEffect(() => { const h = () => setIsMobile(window.innerWidth < 768); window.addEventListener("resize", h); return () => window.removeEventListener("resize", h); }, [])
  if (isMobile) return <MobileCalendar tasks={tasks} statuses={statuses} members={members} />


  const backlogDepth=useMemo(()=>{const now=new Date();const calc=(slug)=>{const pub=statuses.filter(s=>s.branch_slug===slug&&/published|posted|archived/i.test(s.name)).map(s=>s.id);const up=tasks.filter(t=>t.branch_slug===slug&&!pub.includes(t.status_id)&&t.publish_date&&parseLocal(t.publish_date)>=now);return slug==='youtube'?Math.round(up.length/2):Math.round(up.length/7);};return{youtube:calc('youtube'),shortForm:calc('short-form')};},[tasks,statuses]);
  function backlogColor(w){if(w<3)return'#EF4444';if(w<=5)return'#F59E0B';return'#10B981';}

  const year=curDate.getFullYear();const month=curDate.getMonth();
  const monthDays=useMemo(()=>{const f=new Date(year,month,1);const l=new Date(year,month+1,0);const days=[];for(let i=f.getDay()-1;i>=0;i--)days.push({date:new Date(year,month,-i),inMonth:false});for(let i=1;i<=l.getDate();i++)days.push({date:new Date(year,month,i),inMonth:true});const rem=42-days.length;for(let i=1;i<=rem;i++)days.push({date:new Date(year,month+1,i),inMonth:false});return days;},[year,month]);
  const weekDays=useMemo(()=>{const s=new Date(curDate);s.setDate(s.getDate()-s.getDay());return Array.from({length:7},(_,i)=>{const d=new Date(s);d.setDate(d.getDate()+i);return{date:d,inMonth:true};});},[curDate]);
  const displayDays=viewMode==='month'?monthDays:weekDays;

  const tasksByDate=useMemo(()=>{const map={};tasks.forEach(t=>{const ds=t.publish_date||t.due_date;if(!ds)return;if(branchFilter!=='all'&&t.branch_slug!==branchFilter)return;if(contentTypeFilter!=='all'&&t.content_type!==contentTypeFilter)return;if(!map[ds])map[ds]=[];map[ds].push(t);});return map;},[tasks,branchFilter,contentTypeFilter]);

  const unscheduledTasks=useMemo(()=>tasks.filter(t=>{if(t.publish_date)return false;if(branchFilter!=='all'&&t.branch_slug!==branchFilter)return false;if(contentTypeFilter!=='all'&&t.content_type!==contentTypeFilter)return false;const arch=statuses.filter(s=>/published|posted|archived/i.test(s.name)).map(s=>s.id);return!arch.includes(t.status_id);}),[tasks,branchFilter,contentTypeFilter,statuses]);

  function nav(dir){const d=new Date(curDate);if(viewMode==='month')d.setMonth(d.getMonth()+dir);else d.setDate(d.getDate()+dir*7);setCurDate(d);}
  function handleTaskUpdate(u){setTasks(p=>p.map(t=>t.id===u.id?{...t,...u}:t));setSelectedTask(p=>p&&p.id===u.id?{...p,...u}:p);}
  async function handleDrop(ds){if(!dragTask)return;setDragOver(null);await supabase.from('pipeline_tasks').update({publish_date:ds}).eq('id',dragTask.id);setTasks(p=>p.map(t=>t.id===dragTask.id?{...t,publish_date:ds}:t));setDragTask(null);}

  const today=new Date();

  return(
    <div style={{display:'flex',gap:0,maxWidth:1400,margin:'0 auto'}}>
      <div style={{flex:1,padding:'24px 24px 24px 32px'}}>
        {/* Header */}
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:24}}>
          <div><h1 style={{fontSize:24,fontWeight:700,color:WHITE,fontFamily:'Outfit,Arial,sans-serif',margin:'0 0 4px'}}>Content Calendar</h1>
            <p style={{fontSize:12,color:'var(--text-muted)',margin:0}}>Click empty day to add -- drag to reschedule</p></div>
          <div style={{display:'flex',gap:8,alignItems:'center'}}>
            <div style={cs.backlogMeter}><span style={{fontSize:11,color:'var(--text-secondary)'}}>YT</span><span style={{fontSize:14,fontWeight:700,color:backlogColor(backlogDepth.youtube)}}>{backlogDepth.youtube}w</span></div>
            <div style={cs.backlogMeter}><span style={{fontSize:11,color:'var(--text-secondary)'}}>SF</span><span style={{fontSize:14,fontWeight:700,color:backlogColor(backlogDepth.shortForm)}}>{backlogDepth.shortForm}w</span></div>
            <button onClick={()=>setSidebarOpen(!sidebarOpen)} style={{...cs.navBtn,color:sidebarOpen?GREEN:'#9CA3AF',fontSize:12}}>{sidebarOpen?'Hide':'Backlog'} ({unscheduledTasks.length})</button>
            <button onClick={()=>setShareModal(true)} style={{...cs.navBtn,color:'var(--text-secondary)',fontSize:12}}>Share</button>
          </div>
        </div>

        {/* Controls */}
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16,flexWrap:'wrap',gap:12}}>
          <div style={{display:'flex',alignItems:'center',gap:8}}>
            <button onClick={()=>nav(-1)} style={cs.navBtn}>&larr;</button>
            <h2 style={{fontSize:18,fontWeight:600,color:WHITE,minWidth:200,textAlign:'center'}}>{viewMode==='month'?`${MONTHS[month]} ${year}`:`Week of ${weekDays[0].date.toLocaleDateString('en-US',{month:'short',day:'numeric'})}`}</h2>
            <button onClick={()=>nav(1)} style={cs.navBtn}>&rarr;</button>
            <button onClick={()=>setCurDate(new Date())} style={cs.todayBtn}>Today</button>
          </div>
          <div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap'}}>
            <div style={cs.toggleGroup}>
              <button onClick={()=>setViewMode('month')} style={{...cs.toggleBtn,...(viewMode==='month'?cs.toggleActive:{})}}>Month</button>
              <button onClick={()=>setViewMode('week')} style={{...cs.toggleBtn,...(viewMode==='week'?cs.toggleActive:{})}}>Week</button>
            </div>
            <div style={{display:'flex',gap:4}}>
              <button onClick={()=>setBranchFilter('all')} style={{...cs.filterBtn,...(branchFilter==='all'?{background:'#374151',color:WHITE}:{})}}>All</button>
              {Object.entries(BRANCH_LABELS).map(([slug,label])=>(
                <button key={slug} onClick={()=>setBranchFilter(slug)} style={{...cs.filterBtn,...(branchFilter===slug?{background:BRANCH_COLORS[slug]+'33',color:BRANCH_COLORS[slug],borderColor:BRANCH_COLORS[slug]}:{})}}>{label}</button>
              ))}
            </div>
            {/* Content type filter */}
            <div style={{display:'flex',gap:4}}>
              <button onClick={()=>setContentTypeFilter('all')} style={{...cs.filterBtn,fontSize:10,...(contentTypeFilter==='all'?{background:'#374151',color:WHITE}:{})}}>All Types</button>
              <button onClick={()=>setContentTypeFilter('story')} style={{...cs.filterBtn,fontSize:10,...(contentTypeFilter==='story'?{background:'#E040FB33',color:'#E040FB',borderColor:'#E040FB'}:{})}}>Stories</button>
              <button onClick={()=>setContentTypeFilter('reel')} style={{...cs.filterBtn,fontSize:10,...(contentTypeFilter==='reel'?{background:'#8B5CF633',color:'#8B5CF6',borderColor:'#8B5CF6'}:{})}}>Reels</button>
              <button onClick={()=>setContentTypeFilter('tiktok')} style={{...cs.filterBtn,fontSize:10,...(contentTypeFilter==='tiktok'?{background:'#00F2EA33',color:'#00F2EA',borderColor:'#00F2EA'}:{})}}>TikTok</button>
            </div>
          </div>
        </div>

        {/* Status legend */}
        <div style={{display:'flex',gap:12,marginBottom:12,flexWrap:'wrap'}}>
          {[['Idea/Backlog','#6B7280'],['Production','#F59E0B'],['Filming','#3B82F6'],['Editing','#8B5CF6'],['QC','#EC4899'],['Ready','#10B981'],['Published','#37CA37'],['Story','#E040FB']].map(([l,c])=>(
            <div key={l} style={{display:'flex',alignItems:'center',gap:4}}><div style={{width:8,height:8,borderRadius:'50%',background:c}}/><span style={{fontSize:10,color:'var(--text-muted)'}}>{l}</span></div>
          ))}
        </div>

        {/* Calendar grid */}
        <div style={{maxWidth:'100%',overflow:'hidden',background:CARD,borderRadius:12,border:`1px solid ${BORDER}`,overflow:'hidden'}}>
          <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',borderBottom:`1px solid ${BORDER}`,overflow:'hidden'}}>
            {DAYS.map(d=>(<div key={d} style={{padding:'10px 8px',fontSize:12,fontWeight:600,color:'var(--text-secondary)',textAlign:'center'}}>{d}</div>))}
          </div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',overflow:'hidden'}}>
            {displayDays.map(({date,inMonth},i)=>{
              const dateStr=fmt(date);const dayTasks=tasksByDate[dateStr]||[];const isToday=sameDay(date,today);const isDragOver=dragOver===dateStr;
              return(
                <div key={i} onClick={()=>{if(dayTasks.length===0)setQuickAddDate(date);}}
                  onDragOver={e=>{e.preventDefault();setDragOver(dateStr);}} onDragLeave={()=>setDragOver(null)} onDrop={e=>{e.preventDefault();handleDrop(dateStr);}}
                  style={{minHeight:viewMode==='month'?100:300,padding:6,minWidth:0,overflow:'hidden',borderRight:(i+1)%7!==0?`1px solid ${BORDER}`:'none',borderBottom:`1px solid ${BORDER}`,background:isDragOver?GREEN+'15':isToday?GREEN+'0D':'transparent',opacity:inMonth?1:0.35,cursor:dayTasks.length===0?'pointer':'default',transition:'background 0.15s'}}>
                  <div style={{fontSize:12,fontWeight:isToday?700:400,color:isToday?GREEN:'#9CA3AF',marginBottom:4,textAlign:'right',paddingRight:4}}>{date.getDate()}</div>
                  <div style={{display:'flex',flexDirection:'column',gap:2}}>
                    {dayTasks.slice(0,viewMode==='month'?4:20).map(t=>{
                      const isStory=t.content_type==='story';
                      const pillColor=isStory?'#E040FB':getStatusColor(t.status?.name);
                      return(
                        <div key={t.id} draggable onDragStart={()=>setDragTask(t)} onDragEnd={()=>{setDragTask(null);setDragOver(null);}}
                          onClick={e=>{e.stopPropagation();setSelectedTask(t);}}
                          style={{...cs.eventPill,background:pillColor+'18',borderLeft:`3px solid ${pillColor}`,opacity:dragTask?.id===t.id?0.4:1,cursor:'grab'}}>
                          <span style={{fontSize:11,fontWeight:500,color:WHITE,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',maxWidth:'100%',flex:1}}>{t.title}</span>
                          <div style={{display:'flex',gap:3,alignItems:'center',flexShrink:0}}>
                            {isStory&&<span style={{fontSize:8,background:'#E040FB33',color:'#E040FB',padding:'0px 3px',borderRadius:2,fontWeight:700}}>IG</span>}
                            <div style={{width:6,height:6,borderRadius:'50%',background:BRANCH_COLORS[t.branch_slug]||'#6B7280'}}/>
                            {t.is_sob&&<span style={{fontSize:8,background:PEACH+'33',color:PEACH,padding:'0px 3px',borderRadius:2,fontWeight:700}}>SOB</span>}
                          </div>
                        </div>
                      );
                    })}
                    {dayTasks.length>(viewMode==='month'?4:20)&&<span style={{fontSize:10,color:'var(--text-muted)',paddingLeft:6}}>+{dayTasks.length-(viewMode==='month'?4:20)} more</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Unscheduled sidebar */}
      {sidebarOpen&&(
        <div style={{width:260,padding:'24px 16px',marginTop:60,borderLeft:`1px solid ${BORDER}`,overflowY:'auto',maxHeight:'calc(100vh - 40px)',position:'sticky',top:0}}>
          <h3 style={{fontSize:13,fontWeight:700,color:WHITE,margin:'0 0 4px'}}>Unscheduled</h3>
          <p style={{fontSize:11,color:'var(--text-muted)',margin:'0 0 12px'}}>Drag onto calendar to schedule</p>
          {unscheduledTasks.length===0&&<div style={{padding:16,textAlign:'center',color:'var(--text-muted)',fontSize:12,background:CARD,borderRadius:8,border:`1px solid ${BORDER}`}}>All tasks scheduled</div>}
          {unscheduledTasks.map(t=>{const sc=getStatusColor(t.status?.name);const isStory=t.content_type==='story';
            return(<div key={t.id} draggable onDragStart={()=>setDragTask(t)} onDragEnd={()=>{setDragTask(null);setDragOver(null);}} onClick={()=>setSelectedTask(t)}
              style={{padding:'8px 10px',marginBottom:6,background:CARD,border:`1px solid ${BORDER}`,borderLeft:`3px solid ${isStory?'#E040FB':sc}`,borderRadius:6,cursor:'grab'}}>
              <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:4}}>
                <div style={{width:8,height:8,borderRadius:'50%',background:BRANCH_COLORS[t.branch_slug]||'#6B7280'}}/>
                <span style={{fontSize:12,fontWeight:600,color:WHITE,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{t.title}</span>
                {isStory&&<span style={{fontSize:8,background:'#E040FB33',color:'#E040FB',padding:'0px 3px',borderRadius:2,fontWeight:700,flexShrink:0}}>IG</span>}
              </div>
              <div style={{display:'flex',gap:6,alignItems:'center'}}>
                <span style={{fontSize:10,color:sc}}>{t.status?.name||'No status'}</span>
                {t.priority&&<span style={{fontSize:9,color:PRIORITY_COLORS[t.priority],fontWeight:600}}>{t.priority}</span>}
              </div>
            </div>);
          })}
        </div>
      )}

      {selectedTask&&<TaskDetailModal task={selectedTask} onClose={()=>setSelectedTask(null)} members={members} statuses={statuses} onUpdate={handleTaskUpdate}/>}
      {quickAddDate&&<QuickAddModal date={quickAddDate} statuses={statuses} onClose={()=>setQuickAddDate(null)} onCreated={load}/>}
      {shareModal&&<ShareModal onClose={()=>setShareModal(false)}/>}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   PUBLIC CALENDAR (READ-ONLY, NO AUTH)
   ══════════════════════════════════════════════════════════ */
export function PublicCalendar(){
  const[tasks,setTasks]=useState([]);const[loading,setLoading]=useState(true);const[error,setError]=useState(null);
  const[curDate,setCurDate]=useState(new Date());const[viewMode,setViewMode]=useState('month');
  const[branchFilter,setBranchFilter]=useState('all');const[selectedTask,setSelectedTask]=useState(null);const[permission,setPermission]=useState('view');

  useEffect(()=>{loadPublic();},[]);

  async function loadPublic(){
    const path=window.location.pathname;const token=path.split('/').pop();
    if(!token){setError('No share token');setLoading(false);return;}
    const{data,error:err}=await supabase.rpc('public_calendar_data',{share_token:token});
    if(err){setError('Invalid or expired link');setLoading(false);return;}
    if(data?.error){setError(data.error);setLoading(false);return;}
    setTasks((data||[]).map(t=>({...t,status:{name:t.status_name}})));
    const token2=path.split('/').pop();const{data:shareData}=await supabase.from('calendar_shares').select('permission').eq('token',token2).eq('is_active',true).single();if(shareData)setPermission(shareData.permission||'view');
    setLoading(false);
  }

  const year=curDate.getFullYear();const month=curDate.getMonth();
  const monthDays=useMemo(()=>{const f=new Date(year,month,1);const l=new Date(year,month+1,0);const days=[];for(let i=f.getDay()-1;i>=0;i--)days.push({date:new Date(year,month,-i),inMonth:false});for(let i=1;i<=l.getDate();i++)days.push({date:new Date(year,month,i),inMonth:true});const rem=42-days.length;for(let i=1;i<=rem;i++)days.push({date:new Date(year,month+1,i),inMonth:false});return days;},[year,month]);
  const weekDays=useMemo(()=>{const s=new Date(curDate);s.setDate(s.getDate()-s.getDay());return Array.from({length:7},(_,i)=>{const d=new Date(s);d.setDate(d.getDate()+i);return{date:d,inMonth:true};});},[curDate]);
  const displayDays=viewMode==='month'?monthDays:weekDays;

  const tasksByDate=useMemo(()=>{const map={};tasks.forEach(t=>{const ds=t.publish_date||t.due_date;if(!ds)return;if(branchFilter!=='all'&&t.branch_slug!==branchFilter)return;if(!map[ds])map[ds]=[];map[ds].push(t);});return map;},[tasks,branchFilter]);

  function nav(dir){const d=new Date(curDate);if(viewMode==='month')d.setMonth(d.getMonth()+dir);else d.setDate(d.getDate()+dir*7);setCurDate(d);}
  const today=new Date();

  if(loading)return<div style={{padding:60,textAlign:'center',color:'var(--text-muted)',fontFamily:'Outfit,Arial,sans-serif'}}>Loading calendar...</div>;
  if(error)return<div style={{padding:60,textAlign:'center',fontFamily:'Outfit,Arial,sans-serif'}}><h2 style={{color:'#EF4444',fontSize:18}}>Access Denied</h2><p style={{color:'var(--text-muted)'}}>{error}</p></div>;

  return(
    <div style={{padding:'24px 32px',maxWidth:1200,margin:'0 auto',fontFamily:'Outfit,Arial,sans-serif'}}>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:24}}>
        <div><div style={{display:'flex',alignItems:'center',gap:8,marginBottom:4}}>
          <img src="/logo.avif" alt="PeachFit" style={{width:40,height:40,borderRadius:8,objectFit:'contain'}}/>
          <h1 style={{fontSize:22,fontWeight:700,color:WHITE,margin:0}}>PeachFit Content Calendar</h1></div>
          <p style={{fontSize:12,color:'var(--text-muted)',margin:0}}>{permission==='full'?'Full access':permission==='edit'?'Editor access':permission==='comment'?'Can comment':'Read-only view'}</p></div>
      </div>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16,flexWrap:'wrap',gap:12}}>
        <div style={{display:'flex',alignItems:'center',gap:8}}>
          <button onClick={()=>nav(-1)} style={cs.navBtn}>&larr;</button>
          <h2 style={{fontSize:18,fontWeight:600,color:WHITE,minWidth:200,textAlign:'center'}}>{viewMode==='month'?`${MONTHS[month]} ${year}`:`Week of ${weekDays[0].date.toLocaleDateString('en-US',{month:'short',day:'numeric'})}`}</h2>
          <button onClick={()=>nav(1)} style={cs.navBtn}>&rarr;</button>
          <button onClick={()=>setCurDate(new Date())} style={cs.todayBtn}>Today</button>
        </div>
        <div style={{display:'flex',gap:8,alignItems:'center'}}>
          <div style={cs.toggleGroup}>
            <button onClick={()=>setViewMode('month')} style={{...cs.toggleBtn,...(viewMode==='month'?cs.toggleActive:{})}}>Month</button>
            <button onClick={()=>setViewMode('week')} style={{...cs.toggleBtn,...(viewMode==='week'?cs.toggleActive:{})}}>Week</button>
          </div>
          <div style={{display:'flex',gap:4}}>
            <button onClick={()=>setBranchFilter('all')} style={{...cs.filterBtn,...(branchFilter==='all'?{background:'#374151',color:WHITE}:{})}}>All</button>
            {Object.entries(BRANCH_LABELS).map(([slug,label])=>(
              <button key={slug} onClick={()=>setBranchFilter(slug)} style={{...cs.filterBtn,...(branchFilter===slug?{background:BRANCH_COLORS[slug]+'33',color:BRANCH_COLORS[slug],borderColor:BRANCH_COLORS[slug]}:{})}}>{label}</button>
            ))}
          </div>
        </div>
      </div>
      <div style={{display:'flex',gap:12,marginBottom:12,flexWrap:'wrap'}}>
        {[['Idea/Backlog','#6B7280'],['Production','#F59E0B'],['Filming','#3B82F6'],['Editing','#8B5CF6'],['QC','#EC4899'],['Ready','#10B981'],['Published','#37CA37'],['Story','#E040FB']].map(([l,c])=>(
          <div key={l} style={{display:'flex',alignItems:'center',gap:4}}><div style={{width:8,height:8,borderRadius:'50%',background:c}}/><span style={{fontSize:10,color:'var(--text-muted)'}}>{l}</span></div>
        ))}
      </div>
      <div style={{background:CARD,borderRadius:12,border:`1px solid ${BORDER}`,overflow:'hidden'}}>
        <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',borderBottom:`1px solid ${BORDER}`}}>
          {DAYS.map(d=>(<div key={d} style={{padding:'10px 8px',fontSize:12,fontWeight:600,color:'var(--text-secondary)',textAlign:'center'}}>{d}</div>))}
        </div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)'}}>
          {displayDays.map(({date,inMonth},i)=>{const dateStr=fmt(date);const dayTasks=tasksByDate[dateStr]||[];const isToday=sameDay(date,today);
            return(<div key={i} style={{minHeight:viewMode==='month'?100:300,padding:6,minWidth:0,overflow:'hidden',borderRight:(i+1)%7!==0?`1px solid ${BORDER}`:'none',borderBottom:`1px solid ${BORDER}`,background:isToday?GREEN+'0D':'transparent',opacity:inMonth?1:0.35}}>
              <div style={{fontSize:12,fontWeight:isToday?700:400,color:isToday?GREEN:'#9CA3AF',marginBottom:4,textAlign:'right',paddingRight:4}}>{date.getDate()}</div>
              <div style={{display:'flex',flexDirection:'column',gap:2}}>
                {dayTasks.slice(0,viewMode==='month'?4:20).map(t=>{const isStory=t.content_type==='story';const pillColor=isStory?'#E040FB':getStatusColor(t.status?.name);
                  return(<div key={t.id} onClick={()=>setSelectedTask(t)} style={{...cs.eventPill,background:pillColor+'18',borderLeft:`3px solid ${pillColor}`,cursor:'pointer'}}>
                    <span style={{fontSize:11,fontWeight:500,color:WHITE,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',flex:1}}>{t.title}</span>
                    <div style={{display:'flex',gap:3,alignItems:'center',flexShrink:0}}>
                      {isStory&&<span style={{fontSize:8,background:'#E040FB33',color:'#E040FB',padding:'0px 3px',borderRadius:2,fontWeight:700}}>IG</span>}
                      <div style={{width:6,height:6,borderRadius:'50%',background:BRANCH_COLORS[t.branch_slug]||'#6B7280'}}/>
                    </div></div>);
                })}
                {dayTasks.length>(viewMode==='month'?4:20)&&<span style={{fontSize:10,color:'var(--text-muted)',paddingLeft:6}}>+{dayTasks.length-(viewMode==='month'?4:20)} more</span>}
              </div></div>);
          })}
        </div>
      </div>
      {selectedTask&&<TaskDetailModal task={selectedTask} onClose={()=>setSelectedTask(null)} members={[]} statuses={[]} readOnly={true}/>}
    </div>
  );
}

/* ── styles ── */
const ms={overlay:{position:'fixed',inset:0,background:'rgba(0,0,0,0.7)',zIndex:1000,display:'flex',alignItems:'flex-start',justifyContent:'center',paddingTop:40,overflowY:'auto'},content:{background:BG,border:`1px solid ${BORDER}`,borderRadius:12,width:'90%',maxWidth:960,maxHeight:'calc(100vh - 80px)',overflowY:'auto',boxShadow:'0 24px 48px rgba(0,0,0,0.5)'},header:{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'16px 20px',borderBottom:`1px solid ${BORDER}`},title:{fontSize:18,fontWeight:700,color:WHITE,margin:0,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'},closeBtn:{background:'transparent',border:'none',color:'var(--text-secondary)',fontSize:24,cursor:'pointer',padding:'4px 8px',lineHeight:1},topBar:{display:'flex',gap:12,padding:'12px 20px',borderBottom:`1px solid ${BORDER}`,flexWrap:'wrap',background:CARD},topBarItem:{display:'flex',flexDirection:'column',gap:4,minWidth:120},topBarLabel:{fontSize:10,fontWeight:600,color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'0.05em'},topBarSelect:{background:CARD_LIGHT,border:`1px solid ${BORDER}`,borderRadius:4,color:WHITE,padding:'4px 8px',fontSize:12,outline:'none'},body:{display:'flex',gap:0,minHeight:400},left:{flex:1,padding:20,borderRight:`1px solid ${BORDER}`,overflowY:'auto',maxHeight:'calc(100vh - 240px)'},right:{width:300,padding:20,overflowY:'auto',maxHeight:'calc(100vh - 240px)'},section:{marginBottom:20},sectionTitle:{fontSize:13,fontWeight:600,color:'var(--text-secondary)',margin:'0 0 8px',textTransform:'uppercase',letterSpacing:'0.05em'},textarea:{width:'100%',background:CARD_LIGHT,border:`1px solid ${BORDER}`,borderRadius:6,color:WHITE,padding:10,fontSize:13,outline:'none',resize:'vertical',fontFamily:'Outfit,Arial,sans-serif'},subtaskRow:{display:'flex',alignItems:'center',gap:8,padding:'5px 0',borderBottom:`1px solid ${BORDER}22`},subtaskDot:{width:8,height:8,borderRadius:'50%',flexShrink:0},subtaskAssignee:{width:'auto',minWidth:'100px',padding:'2px 4px',background:CARD_LIGHT,border:`1px solid ${BORDER}`,borderRadius:4,color:'var(--text-secondary)',fontSize:11,outline:'none',cursor:'pointer',flexShrink:0},commentInput:{flex:1,background:CARD_LIGHT,border:`1px solid ${BORDER}`,borderRadius:6,color:WHITE,padding:'8px 10px',fontSize:13,outline:'none',fontFamily:'Outfit,Arial,sans-serif'},commentBtn:{background:GREEN,border:'none',borderRadius:6,color:'#000',padding:'8px 16px',fontSize:12,fontWeight:600,cursor:'pointer'},commentItem:{padding:'8px 0',borderBottom:`1px solid ${BORDER}22`},fieldSelect:{width:'100%',background:CARD_LIGHT,border:`1px solid ${BORDER}`,borderRadius:4,color:WHITE,padding:'4px 6px',fontSize:12,outline:'none'},fieldInput:{width:'100%',background:CARD_LIGHT,border:`1px solid ${BORDER}`,borderRadius:4,color:WHITE,padding:'4px 6px',fontSize:12,outline:'none',fontFamily:'Outfit,Arial,sans-serif'},linkPill:{display:'inline-block',background:GREEN+'15',color:GREEN,border:`1px solid ${GREEN}33`,borderRadius:4,padding:'3px 8px',fontSize:11,fontWeight:600,textDecoration:'none',cursor:'pointer'}};
const cs={navBtn:{background:CARD_LIGHT,border:`1px solid ${BORDER}`,borderRadius:6,color:WHITE,padding:'6px 12px',cursor:'pointer',fontSize:14},todayBtn:{background:'transparent',border:`1px solid ${BORDER}`,borderRadius:6,color:GREEN,padding:'6px 14px',cursor:'pointer',fontSize:12,fontWeight:600},toggleGroup:{display:'flex',background:CARD_LIGHT,borderRadius:6,border:`1px solid ${BORDER}`,overflow:'hidden'},toggleBtn:{background:'transparent',border:'none',color:'var(--text-secondary)',padding:'6px 14px',cursor:'pointer',fontSize:12,fontWeight:500},toggleActive:{background:GREEN+'22',color:GREEN},filterBtn:{background:'transparent',border:`1px solid ${BORDER}`,borderRadius:6,color:'var(--text-secondary)',padding:'4px 10px',cursor:'pointer',fontSize:11,fontWeight:500},backlogMeter:{display:'flex',flexDirection:'column',alignItems:'center',background:CARD,border:`1px solid ${BORDER}`,borderRadius:8,padding:'6px 14px',minWidth:60},eventPill:{display:'flex',alignItems:'center',justifyContent:'space-between',gap:4,padding:'3px 6px',borderRadius:4,textAlign:'left',border:'none',width:'100%',transition:'opacity 0.15s'}};
