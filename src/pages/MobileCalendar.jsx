import { useState, useEffect, useMemo } from 'react';
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

const CONTENT_TYPE_COLORS = { story: '#E040FB', reel: '#8B5CF6', tiktok: '#00F2EA', yt_short: '#FF0000', post: '#3B82F6' };
const CONTENT_TYPE_LABELS = { story: 'Story', reel: 'Reel', tiktok: 'TikTok', yt_short: 'YT Short', post: 'Post' };

const STATUS_COLORS = {
  'idea bank':'#6B7280','backlog':'#6B7280','brief':'#6B7280','requested':'#6B7280',
  'in production':'#F59E0B','script/talking points':'#F59E0B','script':'#F59E0B','scheduled':'#F59E0B',
  'filming':'#3B82F6','in progress':'#3B82F6','editing':'#8B5CF6','rough cut':'#8B5CF6','final cut':'#8B5CF6',
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

function parseLocal(s){const[y,m,d]=s.split('-');return new Date(y,m-1,d);}
const fmt=(d)=>d.toISOString().split('T')[0];

function dueInfo(due){
  if(!due)return null;
  const today=new Date();today.setHours(0,0,0,0);
  const d=parseLocal(due);d.setHours(0,0,0,0);
  const diff=Math.round((d-today)/86400000);
  if(diff<0)return{text:`${Math.abs(diff)}d overdue`,color:'#EF4444'};
  if(diff===0)return{text:'Today',color:'#F59E0B'};
  if(diff===1)return{text:'Tomorrow',color:'#F59E0B'};
  if(diff<=7)return{text:`in ${diff}d`,color:'#3B82F6'};
  return null;
}

/* ── Bottom Sheet Detail (read-only friendly) ── */
function TaskSheet({task,onClose,members,statuses,branchSlug,onUpdate}){
  const[localTask,setLocalTask]=useState(task);
  const[subtasks,setSubtasks]=useState([]);
  const[tab,setTab]=useState('details');

  useEffect(()=>{setLocalTask(task);loadSubs();},[task.id]);
  async function loadSubs(){
    const{data}=await supabase.from('pipeline_subtasks').select('*, assignee:profiles!pipeline_subtasks_assignee_id_fkey(id,full_name)').eq('task_id',task.id).order('sort_order');
    if(data)setSubtasks(data);
  }
  async function updateField(f,v){
    const u={...localTask,[f]:v};setLocalTask(u);
    await supabase.from('pipeline_tasks').update({[f]:v}).eq('id',task.id);
    if(onUpdate)onUpdate(u);
  }
  async function toggleSub(st){
    await supabase.from('pipeline_subtasks').update({completed:!st.completed,completed_at:!st.completed?new Date().toISOString():null}).eq('id',st.id);
    loadSubs();
  }
  const done=subtasks.filter(s=>s.completed).length;
  const total=subtasks.length;
  const pct=total>0?Math.round((done/total)*100):0;
  const statusObj=statuses.find(s=>s.id===localTask.status_id);
  const statusColor=getStatusColor(statusObj?.name);

  return(
    <>
      <div style={sh.overlay} onClick={onClose}/>
      <div style={sh.sheet}>
        <div style={sh.handleBar}><div style={sh.handle}/></div>
        <div style={{padding:'0 20px 8px'}}>
          <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:6}}>
            <div style={{width:10,height:10,borderRadius:'50%',background:BRANCH_COLORS[task.branch_slug]||'#6B7280',flexShrink:0}}/>
            <span style={{fontSize:11,color:BRANCH_COLORS[task.branch_slug]||'#6B7280',fontWeight:600}}>{BRANCH_LABELS[task.branch_slug]||task.branch_slug}</span>
            {localTask.content_type&&<span style={{fontSize:10,fontWeight:700,color:CONTENT_TYPE_COLORS[localTask.content_type]||'#9CA3AF',background:(CONTENT_TYPE_COLORS[localTask.content_type]||'#6B7280')+'22',padding:'2px 6px',borderRadius:4}}>{CONTENT_TYPE_LABELS[localTask.content_type]||localTask.content_type}</span>}
          </div>
          <h2 style={{fontSize:20,fontWeight:700,color:WHITE,margin:'0 0 8px',lineHeight:1.3}}>{localTask.title}</h2>
          <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
            <select value={localTask.status_id||''} onChange={e=>updateField('status_id',e.target.value)} style={{...sh.select,color:statusColor,borderColor:statusColor}}>
              {statuses.filter(s=>s.branch_slug===task.branch_slug).map(s=><option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <select value={localTask.priority||''} onChange={e=>updateField('priority',e.target.value||null)} style={{...sh.select,color:PRIORITY_COLORS[localTask.priority]||'#6B7280'}}>
              <option value="">No priority</option><option value="urgent">Urgent</option><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option>
            </select>
          </div>
        </div>

        <div style={sh.tabBar}>
          {[['details','Details'],['subtasks',`Subtasks (${done}/${total})`]].map(([k,l])=>(
            <button key={k} onClick={()=>setTab(k)} style={{...sh.tab,...(tab===k?sh.tabActive:{})}}>{l}</button>
          ))}
        </div>

        <div style={{padding:'16px 20px',overflowY:'auto',maxHeight:'50vh'}}>
          {tab==='details'&&(
            <div>
              {localTask.description&&<p style={{fontSize:14,color:'var(--text-light, #D1D5DB)',margin:'0 0 16px',lineHeight:1.5}}>{localTask.description}</p>}
              <div style={sh.fieldGroup}>
                {localTask.due_date&&<div style={sh.row}><span style={sh.label}>Due</span><span style={{fontSize:13,color:dueInfo(localTask.due_date)?.color||'#9CA3AF',fontWeight:600}}>{parseLocal(localTask.due_date).toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'})}</span></div>}
                {localTask.publish_date&&<div style={sh.row}><span style={sh.label}>Publish</span><span style={{fontSize:13,color:WHITE}}>{parseLocal(localTask.publish_date).toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'})}</span></div>}
                {localTask.editor_assigned&&<div style={sh.row}><span style={sh.label}>Editor</span><span style={{fontSize:13,color:WHITE}}>{localTask.editor_assigned}</span></div>}
                {(localTask.talent||[]).length>0&&<div style={sh.row}><span style={sh.label}>Talent</span><span style={{fontSize:13,color:WHITE}}>{localTask.talent.join(', ')}</span></div>}
                {localTask.content_pillar&&<div style={sh.row}><span style={sh.label}>Pillar</span><span style={{fontSize:13,color:WHITE}}>{localTask.content_pillar}</span></div>}
                {localTask.thumbnail_status&&<div style={sh.row}><span style={sh.label}>Thumbnail</span><span style={{fontSize:13,color:WHITE}}>{localTask.thumbnail_status}</span></div>}
                {localTask.is_sob&&<div style={sh.row}><span style={sh.label}>SOB</span><span style={{fontSize:13,color:PEACH,fontWeight:600}}>School of Bots</span></div>}
              </div>
              {(localTask.script_link||localTask.drive_folder_link||localTask.video_link)&&(
                <div style={{display:'flex',gap:8,flexWrap:'wrap',marginTop:16}}>
                  {localTask.script_link&&<a href={localTask.script_link} target="_blank" rel="noopener" style={sh.linkBtn}>📄 Script</a>}
                  {localTask.drive_folder_link&&<a href={localTask.drive_folder_link} target="_blank" rel="noopener" style={sh.linkBtn}>📁 Drive</a>}
                  {localTask.video_link&&<a href={localTask.video_link} target="_blank" rel="noopener" style={sh.linkBtn}>🎬 Video</a>}
                </div>
              )}
            </div>
          )}
          {tab==='subtasks'&&(
            <div>
              <div style={{marginBottom:14}}>
                <div style={{height:6,background:BORDER,borderRadius:3}}><div style={{height:'100%',width:`${pct}%`,background:GREEN,borderRadius:3,transition:'width 0.3s'}}/></div>
              </div>
              {subtasks.map(st=>{
                const stColor=(st.color&&st.color!=='#6B7280')?st.color:SUBTASK_COLORS[task.branch_slug]?.[st.sort_order]||'#6B7280';
                return(
                  <div key={st.id} onClick={()=>toggleSub(st)} style={{display:'flex',alignItems:'center',gap:12,padding:'12px 0',borderBottom:`1px solid ${BORDER}22`,cursor:'pointer',borderLeft:`3px solid ${stColor}`,paddingLeft:12}}>
                    <div style={{width:22,height:22,borderRadius:6,border:`2px solid ${st.completed?GREEN:'#6B7280'}`,background:st.completed?GREEN:'transparent',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                      {st.completed&&<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>}
                    </div>
                    <span style={{fontSize:14,color:st.completed?'#6B7280':WHITE,textDecoration:st.completed?'line-through':'none',flex:1}}>{st.title}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

/* ══════════════════════════════════════════════════════════
   MOBILE CALENDAR
   ══════════════════════════════════════════════════════════ */
export default function MobileCalendar({tasks,statuses,members}){
  const[view,setView]=useState('timeline');
  const[branchFilter,setBranchFilter]=useState('all');
  const[selectedTask,setSelectedTask]=useState(null);
  const[curMonth,setCurMonth]=useState(new Date());

  const today=new Date();today.setHours(0,0,0,0);
  const todayStr=fmt(today);

  // Filter tasks
  const filtered=useMemo(()=>{
    let t=tasks;
    if(branchFilter!=='all')t=t.filter(x=>x.branch_slug===branchFilter);
    return t;
  },[tasks,branchFilter]);

  // Timeline: group by date, sorted, starting from today
  const timeline=useMemo(()=>{
    const scheduled=filtered.filter(t=>t.publish_date||t.due_date);
    const byDate={};
    scheduled.forEach(t=>{
      const d=t.publish_date||t.due_date;
      if(!byDate[d])byDate[d]=[];
      byDate[d].push(t);
    });
    return Object.entries(byDate).sort(([a],[b])=>a.localeCompare(b));
  },[filtered]);

  // Mini month for compact view
  const year=curMonth.getFullYear();const month=curMonth.getMonth();
  const monthDays=useMemo(()=>{
    const f=new Date(year,month,1);const l=new Date(year,month+1,0);
    const days=[];
    for(let i=f.getDay()-1;i>=0;i--)days.push({date:new Date(year,month,-i),inMonth:false});
    for(let i=1;i<=l.getDate();i++)days.push({date:new Date(year,month,i),inMonth:true});
    const rem=42-days.length;
    for(let i=1;i<=rem;i++)days.push({date:new Date(year,month+1,i),inMonth:false});
    return days;
  },[year,month]);

  const taskDates=useMemo(()=>{
    const set=new Set();
    filtered.forEach(t=>{if(t.publish_date)set.add(t.publish_date);if(t.due_date)set.add(t.due_date);});
    return set;
  },[filtered]);

  function dayLabel(dateStr){
    const d=parseLocal(dateStr);d.setHours(0,0,0,0);
    const diff=Math.round((d-today)/86400000);
    if(diff===0)return'Today';
    if(diff===1)return'Tomorrow';
    if(diff===-1)return'Yesterday';
    return d.toLocaleDateString('en-US',{weekday:'long',month:'short',day:'numeric'});
  }

  function isToday(dateStr){return dateStr===todayStr;}
  function isPast(dateStr){return dateStr<todayStr;}

  function handleTaskUpdate(updated){
    setSelectedTask(prev=>prev&&prev.id===updated.id?{...prev,...updated}:prev);
  }

  const MONTHS=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  return(
    <div style={{padding:'0 0 16px'}}>
      {/* View toggle + filters */}
      <div style={{display:'flex',gap:8,marginBottom:12,flexWrap:'wrap',alignItems:'center'}}>
        <div style={cs.toggleGroup}>
          <button onClick={()=>setView('timeline')} style={{...cs.toggleBtn,...(view==='timeline'?cs.toggleActive:{})}}>Timeline</button>
          <button onClick={()=>setView('month')} style={{...cs.toggleBtn,...(view==='month'?cs.toggleActive:{})}}>Month</button>
        </div>
        <div style={{display:'flex',gap:4,overflowX:'auto',flexShrink:0}}>
          <button onClick={()=>setBranchFilter('all')} style={{...cs.filterBtn,...(branchFilter==='all'?{background:'#374151',color:WHITE}:{})}}>All</button>
          {Object.entries(BRANCH_LABELS).map(([slug,label])=>(
            <button key={slug} onClick={()=>setBranchFilter(slug)} style={{...cs.filterBtn,...(branchFilter===slug?{background:BRANCH_COLORS[slug]+'33',color:BRANCH_COLORS[slug],borderColor:BRANCH_COLORS[slug]}:{})}}>{label.split(' ')[0]}</button>
          ))}
        </div>
      </div>

      {/* Timeline view */}
      {view==='timeline'&&(
        <div>
          {timeline.length===0&&(
            <div style={{padding:40,textAlign:'center',color:'var(--text-muted)',fontSize:14,background:CARD,borderRadius:12,border:`1px solid ${BORDER}`}}>No scheduled content</div>
          )}
          {timeline.map(([dateStr,dayTasks])=>(
            <div key={dateStr} style={{marginBottom:16}}>
              {/* Date header */}
              <div style={{
                display:'flex',alignItems:'center',gap:8,marginBottom:8,
                position:'sticky',top:52,zIndex:10,background:BG,padding:'6px 0',
              }}>
                <div style={{
                  width:40,height:40,borderRadius:10,
                  background:isToday(dateStr)?GREEN+'22':CARD,
                  border:`1px solid ${isToday(dateStr)?GREEN:BORDER}`,
                  display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',flexShrink:0,
                }}>
                  <span style={{fontSize:8,fontWeight:700,color:isToday(dateStr)?GREEN:'#6B7280',textTransform:'uppercase',lineHeight:1}}>
                    {parseLocal(dateStr).toLocaleDateString('en-US',{weekday:'short'})}
                  </span>
                  <span style={{fontSize:16,fontWeight:700,color:isToday(dateStr)?GREEN:WHITE,lineHeight:1}}>
                    {parseLocal(dateStr).getDate()}
                  </span>
                </div>
                <div>
                  <span style={{fontSize:14,fontWeight:600,color:isToday(dateStr)?GREEN:WHITE}}>{dayLabel(dateStr)}</span>
                  <span style={{fontSize:11,color:'var(--text-muted)',marginLeft:8}}>{dayTasks.length} item{dayTasks.length!==1?'s':''}</span>
                </div>
                {isPast(dateStr)&&!isToday(dateStr)&&<span style={{fontSize:10,color:'#EF4444',fontWeight:600,marginLeft:'auto'}}>Past</span>}
              </div>

              {/* Tasks for this date */}
              {dayTasks.map(t=>{
                const statusColor=getStatusColor(t.status?.name);
                const isStory=t.content_type==='story';
                const ctColor=CONTENT_TYPE_COLORS[t.content_type];
                return(
                  <div key={t.id} onClick={()=>setSelectedTask(t)} style={{
                    padding:14,background:CARD,border:`1px solid ${BORDER}`,
                    borderLeft:`3px solid ${isStory?'#E040FB':statusColor}`,
                    borderRadius:10,marginBottom:6,cursor:'pointer',
                    opacity:isPast(dateStr)&&!isToday(dateStr)?0.5:1,
                  }}>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:8}}>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:4}}>
                          <div style={{width:8,height:8,borderRadius:'50%',background:BRANCH_COLORS[t.branch_slug]||'#6B7280',flexShrink:0}}/>
                          <span style={{fontSize:15,fontWeight:600,color:WHITE,lineHeight:1.3}}>{t.title}</span>
                        </div>
                        <div style={{display:'flex',gap:6,flexWrap:'wrap',alignItems:'center'}}>
                          <span style={{fontSize:11,color:statusColor,fontWeight:500}}>{t.status?.name||'No status'}</span>
                          {t.content_type&&<span style={{fontSize:9,fontWeight:700,color:ctColor||'#9CA3AF',background:(ctColor||'#6B7280')+'22',padding:'1px 5px',borderRadius:3}}>{CONTENT_TYPE_LABELS[t.content_type]||t.content_type}</span>}
                          {t.priority&&<span style={{fontSize:10,fontWeight:600,color:PRIORITY_COLORS[t.priority]}}>{t.priority}</span>}
                          {t.is_sob&&<span style={{fontSize:9,fontWeight:700,color:PEACH,background:PEACH+'22',padding:'1px 5px',borderRadius:3}}>SOB</span>}
                        </div>
                      </div>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" style={{flexShrink:0,marginTop:4}}><polyline points="9 18 15 12 9 6"/></svg>
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}

      {/* Compact month view */}
      {view==='month'&&(
        <div>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12}}>
            <button onClick={()=>setCurMonth(new Date(year,month-1,1))} style={cs.navBtn}>&larr;</button>
            <span style={{fontSize:16,fontWeight:700,color:WHITE}}>{MONTHS[month]} {year}</span>
            <button onClick={()=>setCurMonth(new Date(year,month+1,1))} style={cs.navBtn}>&rarr;</button>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:2}}>
            {['S','M','T','W','T','F','S'].map((d,i)=>(
              <div key={i} style={{textAlign:'center',fontSize:11,fontWeight:600,color:'var(--text-muted)',padding:4}}>{d}</div>
            ))}
            {monthDays.map(({date,inMonth},i)=>{
              const ds=fmt(date);
              const hasTask=taskDates.has(ds);
              const isTd=ds===todayStr;
              return(
                <div key={i} style={{
                  textAlign:'center',padding:8,borderRadius:8,
                  background:isTd?GREEN+'22':'transparent',
                  opacity:inMonth?1:0.25,cursor:hasTask?'pointer':'default',
                }}>
                  <span style={{fontSize:14,fontWeight:isTd?700:400,color:isTd?GREEN:WHITE,display:'block'}}>{date.getDate()}</span>
                  {hasTask&&<div style={{width:5,height:5,borderRadius:'50%',background:GREEN,margin:'2px auto 0'}}/>}
                </div>
              );
            })}
          </div>
          {/* Tasks for current month below the grid */}
          <div style={{marginTop:16}}>
            <h3 style={{fontSize:13,fontWeight:700,color:'var(--text-secondary)',marginBottom:8,textTransform:'uppercase',letterSpacing:'0.05em'}}>This Month</h3>
            {timeline.filter(([d])=>{const dt=parseLocal(d);return dt.getMonth()===month&&dt.getFullYear()===year;}).map(([dateStr,dayTasks])=>(
              <div key={dateStr}>
                <div style={{fontSize:12,fontWeight:600,color:'var(--text-muted)',padding:'8px 0 4px'}}>{dayLabel(dateStr)}</div>
                {dayTasks.map(t=>{
                  const sc=getStatusColor(t.status?.name);
                  return(
                    <div key={t.id} onClick={()=>setSelectedTask(t)} style={{display:'flex',alignItems:'center',gap:10,padding:'10px 0',borderBottom:`1px solid ${BORDER}22`,cursor:'pointer'}}>
                      <div style={{width:8,height:8,borderRadius:'50%',background:BRANCH_COLORS[t.branch_slug]||'#6B7280',flexShrink:0}}/>
                      <div style={{flex:1,minWidth:0}}>
                        <span style={{fontSize:14,fontWeight:500,color:WHITE}}>{t.title}</span>
                        <span style={{fontSize:11,color:sc,marginLeft:8}}>{t.status?.name}</span>
                      </div>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Task detail bottom sheet */}
      {selectedTask&&<TaskSheet task={selectedTask} onClose={()=>setSelectedTask(null)} members={members} statuses={statuses} branchSlug={selectedTask.branch_slug} onUpdate={handleTaskUpdate}/>}
    </div>
  );
}

const sh={
  overlay:{position:'fixed',inset:0,background:'rgba(0,0,0,0.6)',zIndex:1000},
  sheet:{position:'fixed',bottom:0,left:0,right:0,background:BG,borderTopLeftRadius:16,borderTopRightRadius:16,border:`1px solid ${BORDER}`,borderBottom:'none',maxHeight:'85vh',overflowY:'auto',zIndex:1001,paddingBottom:'env(safe-area-inset-bottom,20px)'},
  handleBar:{display:'flex',justifyContent:'center',padding:'10px 0 6px'},
  handle:{width:36,height:4,borderRadius:2,background:'#6B7280'},
  select:{background:CARD_LIGHT,border:`1px solid ${BORDER}`,borderRadius:8,color:WHITE,padding:'8px 10px',fontSize:13,outline:'none',flex:1},
  tabBar:{display:'flex',borderBottom:`1px solid ${BORDER}`,padding:'0 20px'},
  tab:{background:'transparent',border:'none',borderBottom:'2px solid transparent',color:'var(--text-muted)',padding:'10px 14px',fontSize:13,fontWeight:500,cursor:'pointer',whiteSpace:'nowrap'},
  tabActive:{color:GREEN,borderBottomColor:GREEN},
  fieldGroup:{},
  row:{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'10px 0',borderBottom:`1px solid ${BORDER}22`},
  label:{fontSize:13,color:'var(--text-secondary)',minWidth:80},
  linkBtn:{display:'inline-flex',alignItems:'center',gap:4,background:CARD_LIGHT,border:`1px solid ${BORDER}`,borderRadius:8,color:GREEN,padding:'10px 14px',fontSize:13,fontWeight:600,textDecoration:'none'},
};
const cs={
  toggleGroup:{display:'flex',background:CARD_LIGHT,borderRadius:8,border:`1px solid ${BORDER}`,overflow:'hidden'},
  toggleBtn:{background:'transparent',border:'none',color:'var(--text-muted)',padding:'8px 16px',fontSize:13,fontWeight:600,cursor:'pointer'},
  toggleActive:{background:GREEN+'22',color:GREEN},
  filterBtn:{background:'transparent',border:`1px solid ${BORDER}`,borderRadius:8,color:'var(--text-muted)',padding:'6px 10px',cursor:'pointer',fontSize:11,fontWeight:600,whiteSpace:'nowrap'},
  navBtn:{background:CARD_LIGHT,border:`1px solid ${BORDER}`,borderRadius:8,color:WHITE,padding:'6px 14px',cursor:'pointer',fontSize:16},
};
