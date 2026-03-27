import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';

const GREEN = 'var(--green)';
const CARD = 'var(--dark-card)';
const CARD_LIGHT = 'var(--dark-light)';
const BORDER = 'var(--dark-border)';
const WHITE = 'var(--white)';

const BRANCH_COLORS = { youtube: '#FF0000', 'short-form': '#8B5CF6', 'ads-creative': '#F59E0B', production: '#3B82F6' };
const BRANCH_LABELS = { youtube: 'YouTube', 'short-form': 'Short Form', 'ads-creative': 'Ads/Creative', production: 'Production' };

function parseLocal(s){const[y,m,d]=s.split('-');return new Date(y,m-1,d);}
const fmt=(d)=>d.toISOString().split('T')[0];

function getWeekRange(offset=0){
  const now=new Date();
  const start=new Date(now);start.setDate(now.getDate()-now.getDay()-7*offset+1);start.setHours(0,0,0,0);
  const end=new Date(start);end.setDate(start.getDate()+6);end.setHours(23,59,59,999);
  return{start,end,startStr:fmt(start),endStr:fmt(end)};
}

export default function Reports(){
  const{isAdmin}=useAuth();
  const[tasks,setTasks]=useState([]);
  const[statuses,setStatuses]=useState([]);
  const[members,setMembers]=useState([]);
  const[subtasks,setSubtasks]=useState([]);
  const[analytics,setAnalytics]=useState([]);
  const[weekOffset,setWeekOffset]=useState(0);
  const[loading,setLoading]=useState(true);

  const week=useMemo(()=>getWeekRange(weekOffset),[weekOffset]);

  useEffect(()=>{load();},[]);

  async function load(){
    const[tRes,sRes,mRes,stRes,aRes]=await Promise.all([
      supabase.from('pipeline_tasks').select('*, status:pipeline_statuses(name,branch_slug,sort_order)'),
      supabase.from('pipeline_statuses').select('*').order('sort_order'),
      supabase.from('profiles').select('id,full_name,title'),
      supabase.from('pipeline_subtasks').select('task_id,completed,assignee_id'),
      supabase.from('video_analytics').select('*').order('publish_date',{ascending:false}).limit(20),
    ]);
    if(tRes.data)setTasks(tRes.data);
    if(sRes.data)setStatuses(sRes.data);
    if(mRes.data)setMembers(mRes.data);
    if(stRes.data)setSubtasks(stRes.data);
    if(aRes.data)setAnalytics(aRes.data);
    setLoading(false);
  }

  // Derived data
  const archived=useMemo(()=>statuses.filter(s=>/published|posted|archived/i.test(s.name)).map(s=>s.id),[statuses]);
  const published=useMemo(()=>statuses.filter(s=>/published|posted/i.test(s.name)).map(s=>s.id),[statuses]);

  // Content output this week
  const weekOutput=useMemo(()=>{
    return tasks.filter(t=>published.includes(t.status_id)&&t.publish_date&&t.publish_date>=week.startStr&&t.publish_date<=week.endStr);
  },[tasks,published,week]);

  const outputByBranch=useMemo(()=>{
    const m={};
    weekOutput.forEach(t=>{const b=t.branch_slug||'unknown';if(!m[b])m[b]=[];m[b].push(t);});
    return m;
  },[weekOutput]);

  // Pipeline status
  const pipelineStatus=useMemo(()=>{
    const result={};
    Object.keys(BRANCH_LABELS).forEach(slug=>{
      const branchTasks=tasks.filter(t=>t.branch_slug===slug&&!archived.includes(t.status_id));
      const branchStatuses=statuses.filter(s=>s.branch_slug===slug&&!archived.includes(s.id));
      const byStatus={};
      branchStatuses.forEach(s=>{const count=branchTasks.filter(t=>t.status_id===s.id).length;if(count>0)byStatus[s.name]=count;});
      result[slug]={total:branchTasks.length,byStatus};
    });
    return result;
  },[tasks,statuses,archived]);

  // Team workload
  const workload=useMemo(()=>{
    const result={};
    members.forEach(m=>{
      const myTasks=tasks.filter(t=>t.assignee_id===m.id&&!archived.includes(t.status_id));
      const mySubs=subtasks.filter(s=>s.assignee_id===m.id);
      const completedSubs=mySubs.filter(s=>s.completed).length;
      result[m.id]={
        name:m.full_name||'Unknown',
        title:m.title||'',
        tasks:myTasks.length,
        subtasksTotal:mySubs.length,
        subtasksDone:completedSubs,
        pct:mySubs.length>0?Math.round((completedSubs/mySubs.length)*100):0,
      };
    });
    return Object.values(result).filter(w=>w.tasks>0||w.subtasksTotal>0).sort((a,b)=>b.tasks-a.tasks);
  },[tasks,members,subtasks,archived]);

  // Deadlines hit/missed
  const deadlines=useMemo(()=>{
    const today=new Date();today.setHours(0,0,0,0);
    const active=tasks.filter(t=>!archived.includes(t.status_id)&&t.due_date);
    const overdue=active.filter(t=>{const d=parseLocal(t.due_date);d.setHours(0,0,0,0);return d<today;});
    const onTime=active.filter(t=>{const d=parseLocal(t.due_date);d.setHours(0,0,0,0);return d>=today;});
    const completed=tasks.filter(t=>published.includes(t.status_id)&&t.due_date&&t.publish_date);
    let hitsCount=0;
    completed.forEach(t=>{if(t.publish_date<=t.due_date)hitsCount++;});
    return{
      totalWithDeadline:active.length,
      overdue:overdue.length,
      onTime:onTime.length,
      overdueList:overdue.sort((a,b)=>a.due_date.localeCompare(b.due_date)).slice(0,10),
      deliveryRate:completed.length>0?Math.round((hitsCount/completed.length)*100):0,
    };
  },[tasks,archived,published]);

  // Backlog depth
  const backlog=useMemo(()=>{
    const now=new Date();
    const calc=(slug,divisor)=>{
      const up=tasks.filter(t=>t.branch_slug===slug&&!archived.includes(t.status_id)&&t.publish_date&&parseLocal(t.publish_date)>=now);
      return Math.round(up.length/divisor);
    };
    return{youtube:calc('youtube',2),shortForm:calc('short-form',7)};
  },[tasks,archived]);

  function backlogColor(w){if(w<3)return'#EF4444';if(w<=5)return'#F59E0B';return'#10B981';}

  // Recent analytics
  const recentAnalytics=useMemo(()=>analytics.slice(0,5),[analytics]);

  function handlePrint(){window.print();}

  if(!isAdmin)return<div style={{padding:40,textAlign:'center',color:'var(--text-muted)'}}>Admin access required.</div>;
  if(loading)return<div style={{padding:40,textAlign:'center',color:'var(--text-muted)'}}>Loading report data...</div>;

  const weekLabel=`${new Date(week.startStr+'T00:00:00').toLocaleDateString('en-US',{month:'short',day:'numeric'})} -- ${new Date(week.endStr+'T00:00:00').toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})}`;

  return(
    <div style={{maxWidth:1000,margin:'0 auto',fontFamily:'Outfit, Arial, sans-serif'}} id="report-content">
      {/* Header */}
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:24,flexWrap:'wrap',gap:12}}>
        <div>
          <h1 style={{fontSize:24,fontWeight:700,color:WHITE,margin:'0 0 4px'}}>Weekly Report</h1>
          <p style={{fontSize:13,color:'var(--text-muted)',margin:0}}>Auto-generated from pipeline data</p>
        </div>
        <div style={{display:'flex',gap:8,alignItems:'center'}}>
          <button onClick={()=>setWeekOffset(w=>w+1)} style={st.navBtn}>&larr;</button>
          <span style={{fontSize:14,fontWeight:600,color:WHITE,minWidth:200,textAlign:'center'}}>{weekLabel}</span>
          <button onClick={()=>setWeekOffset(w=>Math.max(0,w-1))} style={{...st.navBtn,opacity:weekOffset===0?0.3:1}} disabled={weekOffset===0}>&rarr;</button>
          <button onClick={handlePrint} style={st.printBtn}>Print / PDF</button>
        </div>
      </div>

      {/* Section 1: Content Output */}
      <Section title="Content Output" subtitle={`${weekOutput.length} pieces published this week`}>
        {weekOutput.length===0?(
          <div style={st.empty}>No content published this week.</div>
        ):(
          Object.entries(outputByBranch).map(([slug,items])=>(
            <div key={slug} style={{marginBottom:12}}>
              <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:6}}>
                <div style={{width:8,height:8,borderRadius:'50%',background:BRANCH_COLORS[slug]||'#6B7280'}}/>
                <span style={{fontSize:13,fontWeight:700,color:BRANCH_COLORS[slug]||WHITE}}>{BRANCH_LABELS[slug]||slug}</span>
                <span style={{fontSize:12,color:'var(--text-muted)'}}>({items.length})</span>
              </div>
              {items.map(t=>(
                <div key={t.id} style={{padding:'6px 0 6px 20px',fontSize:13,color:WHITE,borderBottom:'1px solid var(--dark-border)22'}}>
                  {t.title} <span style={{color:'var(--text-muted)',fontSize:11}}>-- {t.publish_date}</span>
                </div>
              ))}
            </div>
          ))
        )}
      </Section>

      {/* Section 2: Pipeline Status */}
      <Section title="Pipeline Status" subtitle="Active tasks by stage">
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit, minmax(220px, 1fr))',gap:12}}>
          {Object.entries(pipelineStatus).map(([slug,data])=>(
            <div key={slug} style={{background:CARD_LIGHT,border:`1px solid ${BORDER}`,borderRadius:8,padding:14}}>
              <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:8}}>
                <div style={{width:8,height:8,borderRadius:'50%',background:BRANCH_COLORS[slug]}}/>
                <span style={{fontSize:13,fontWeight:700,color:BRANCH_COLORS[slug]}}>{BRANCH_LABELS[slug]}</span>
                <span style={{fontSize:12,color:'var(--text-muted)',marginLeft:'auto'}}>{data.total} active</span>
              </div>
              {Object.entries(data.byStatus).map(([name,count])=>(
                <div key={name} style={{display:'flex',justifyContent:'space-between',padding:'3px 0',fontSize:12}}>
                  <span style={{color:'var(--text-secondary)'}}>{name}</span>
                  <span style={{color:WHITE,fontWeight:600}}>{count}</span>
                </div>
              ))}
              {data.total===0&&<span style={{fontSize:12,color:'var(--text-muted)'}}>No active tasks</span>}
            </div>
          ))}
        </div>
      </Section>

      {/* Section 3: Team Workload */}
      <Section title="Team Workload" subtitle="Tasks and subtask completion per person">
        {workload.length===0?(
          <div style={st.empty}>No assigned tasks.</div>
        ):(
          <div style={{display:'grid',gridTemplateColumns:'2fr 0.5fr 1fr 0.5fr',gap:'0',border:`1px solid ${BORDER}`,borderRadius:8,overflow:'hidden'}}>
            <div style={st.th}>Team Member</div><div style={st.th}>Tasks</div><div style={st.th}>Subtasks</div><div style={st.th}>Done %</div>
            {workload.map(w=>(
              <React.Fragment key={w.name}>
                <div style={st.td}><span style={{fontWeight:600,color:WHITE}}>{w.name}</span><br/><span style={{fontSize:11,color:'var(--text-muted)'}}>{w.title}</span></div>
                <div style={st.td}>{w.tasks}</div>
                <div style={st.td}>
                  <div style={{display:'flex',alignItems:'center',gap:8}}>
                    <div style={{flex:1,height:6,background:'var(--dark-border)',borderRadius:3}}>
                      <div style={{height:'100%',width:`${w.pct}%`,background:w.pct===100?'#37CA37':w.pct>=50?'#F59E0B':'#EF4444',borderRadius:3}}/>
                    </div>
                    <span style={{fontSize:11,color:'var(--text-muted)'}}>{w.subtasksDone}/{w.subtasksTotal}</span>
                  </div>
                </div>
                <div style={{...st.td,fontWeight:700,color:w.pct===100?'#37CA37':w.pct>=50?'#F59E0B':'#EF4444'}}>{w.pct}%</div>
              </React.Fragment>
            ))}
          </div>
        )}
      </Section>

      {/* Section 4: Deadline Performance */}
      <Section title="Deadline Performance" subtitle={`${deadlines.deliveryRate}% on-time delivery rate`}>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit, minmax(120px, 1fr))',gap:10,marginBottom:16}}>
          <MiniCard label="With Deadlines" value={deadlines.totalWithDeadline} color={WHITE}/>
          <MiniCard label="On Time" value={deadlines.onTime} color='#10B981'/>
          <MiniCard label="Overdue" value={deadlines.overdue} color={deadlines.overdue>0?'#EF4444':'var(--text-muted)'}/>
          <MiniCard label="Delivery Rate" value={deadlines.deliveryRate+'%'} color={deadlines.deliveryRate>=80?'#10B981':deadlines.deliveryRate>=60?'#F59E0B':'#EF4444'}/>
        </div>
        {deadlines.overdueList.length>0&&(
          <div>
            <h4 style={{fontSize:12,fontWeight:700,color:'#EF4444',margin:'0 0 8px'}}>OVERDUE TASKS</h4>
            {deadlines.overdueList.map(t=>{
              const days=Math.round((new Date()-parseLocal(t.due_date))/86400000);
              return(
                <div key={t.id} style={{display:'flex',justifyContent:'space-between',padding:'6px 0',borderBottom:'1px solid var(--dark-border)22',fontSize:13}}>
                  <div style={{display:'flex',alignItems:'center',gap:8}}>
                    <div style={{width:6,height:6,borderRadius:'50%',background:BRANCH_COLORS[t.branch_slug]||'#6B7280'}}/>
                    <span style={{color:WHITE}}>{t.title}</span>
                  </div>
                  <span style={{color:'#EF4444',fontWeight:600,fontSize:12}}>{days}d overdue</span>
                </div>
              );
            })}
          </div>
        )}
      </Section>

      {/* Section 5: Backlog Depth */}
      <Section title="Backlog Depth" subtitle="Weeks of content scheduled ahead">
        <div style={{display:'flex',gap:16}}>
          <div style={{flex:1,textAlign:'center',padding:20,background:CARD_LIGHT,borderRadius:10,border:`1px solid ${BORDER}`}}>
            <div style={{fontSize:11,color:'var(--text-muted)',textTransform:'uppercase',fontWeight:600,marginBottom:4}}>YouTube</div>
            <div style={{fontSize:36,fontWeight:700,color:backlogColor(backlog.youtube)}}>{backlog.youtube}w</div>
            <div style={{fontSize:11,color:'var(--text-muted)',marginTop:4}}>{backlog.youtube<3?'Critical -- need more content':backlog.youtube<=5?'Acceptable':'Healthy'}</div>
          </div>
          <div style={{flex:1,textAlign:'center',padding:20,background:CARD_LIGHT,borderRadius:10,border:`1px solid ${BORDER}`}}>
            <div style={{fontSize:11,color:'var(--text-muted)',textTransform:'uppercase',fontWeight:600,marginBottom:4}}>Short Form</div>
            <div style={{fontSize:36,fontWeight:700,color:backlogColor(backlog.shortForm)}}>{backlog.shortForm}w</div>
            <div style={{fontSize:11,color:'var(--text-muted)',marginTop:4}}>{backlog.shortForm<3?'Critical -- need more content':backlog.shortForm<=5?'Acceptable':'Healthy'}</div>
          </div>
        </div>
      </Section>

      {/* Section 6: Analytics Summary */}
      <Section title="Analytics Summary" subtitle="Recent video performance">
        {recentAnalytics.length===0?(
          <div style={st.empty}>No analytics data yet.</div>
        ):(
          <div style={{border:`1px solid ${BORDER}`,borderRadius:8,overflow:'hidden'}}>
            <div style={{display:'grid',gridTemplateColumns:'2fr 0.7fr 0.7fr 0.7fr 0.7fr',gap:8,padding:'10px 14px',borderBottom:`1px solid ${BORDER}`}}>
              <span style={st.th2}>Video</span><span style={st.th2}>Views</span><span style={st.th2}>CTR</span><span style={st.th2}>AVD</span><span style={st.th2}>Retention</span>
            </div>
            {recentAnalytics.map(v=>(
              <div key={v.id} style={{display:'grid',gridTemplateColumns:'2fr 0.7fr 0.7fr 0.7fr 0.7fr',gap:8,padding:'10px 14px',borderBottom:'1px solid var(--dark-border)22'}}>
                <span style={{fontSize:13,color:WHITE,fontWeight:500}}>{v.video_title}</span>
                <span style={{fontSize:13,color:WHITE}}>{v.views_current!=null?formatNum(v.views_current):'--'}</span>
                <span style={{fontSize:13,color:ctrColor(v.ctr_current)}}>{v.ctr_current!=null?v.ctr_current+'%':'--'}</span>
                <span style={{fontSize:13,color:WHITE}}>{v.avd_current!=null?Math.round(v.avd_current)+'s':'--'}</span>
                <span style={{fontSize:13,color:retColor(v.retention_current)}}>{v.retention_current!=null?v.retention_current+'%':'--'}</span>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* Print styles */}
      <style>{`
        @media print {
          body { background: white !important; color: black !important; }
          [data-theme] body { filter: none !important; }
          nav, .mobile-topbar, button, .sidebar-desktop, aside { display: none !important; }
          main { margin-left: 0 !important; padding: 20px !important; }
          #report-content { max-width: 100% !important; }
          #report-content * { color: #111 !important; border-color: #ddd !important; background: white !important; }
          #report-content h1, #report-content h2, #report-content h3, #report-content h4 { color: #111 !important; }
          .no-print { display: none !important; }
        }
      `}</style>
    </div>
  );
}

function Section({title,subtitle,children}){
  return(
    <div style={{background:CARD,border:`1px solid ${BORDER}`,borderRadius:12,padding:20,marginBottom:16}}>
      <div style={{marginBottom:14,paddingBottom:10,borderBottom:`1px solid ${BORDER}`}}>
        <h2 style={{fontSize:16,fontWeight:700,color:WHITE,margin:'0 0 2px'}}>{title}</h2>
        {subtitle&&<p style={{fontSize:12,color:'var(--text-muted)',margin:0}}>{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

function MiniCard({label,value,color}){
  return(
    <div style={{background:CARD_LIGHT,border:`1px solid ${BORDER}`,borderRadius:8,padding:'10px 14px',textAlign:'center'}}>
      <div style={{fontSize:10,color:'var(--text-muted)',textTransform:'uppercase',fontWeight:600,marginBottom:4}}>{label}</div>
      <div style={{fontSize:20,fontWeight:700,color}}>{value}</div>
    </div>
  );
}

function formatNum(n){if(n==null)return'--';if(n>=1000000)return(n/1000000).toFixed(1)+'M';if(n>=1000)return(n/1000).toFixed(1)+'K';return n.toString();}
function ctrColor(v){if(v==null)return'var(--text-muted)';if(v>=8)return'#10B981';if(v>=5)return'#37CA37';if(v>=3)return'#F59E0B';return'#EF4444';}
function retColor(v){if(v==null)return'var(--text-muted)';if(v>=50)return'#10B981';if(v>=35)return'#37CA37';if(v>=25)return'#F59E0B';return'#EF4444';}

const st={
  navBtn:{background:CARD_LIGHT,border:`1px solid ${BORDER}`,borderRadius:6,color:WHITE,padding:'6px 12px',cursor:'pointer',fontSize:14},
  printBtn:{background:'#37CA37',border:'none',borderRadius:8,color:'#000',padding:'8px 16px',fontSize:13,fontWeight:700,cursor:'pointer'},
  empty:{padding:20,textAlign:'center',color:'var(--text-muted)',fontSize:13},
  th:{fontSize:11,fontWeight:700,color:'var(--text-secondary)',textTransform:'uppercase',padding:'10px 14px',background:CARD_LIGHT,borderBottom:`1px solid ${BORDER}`},
  td:{fontSize:13,color:WHITE,padding:'10px 14px',borderBottom:`1px solid var(--dark-border)22`},
  th2:{fontSize:11,fontWeight:700,color:'var(--text-secondary)',textTransform:'uppercase'},
};
