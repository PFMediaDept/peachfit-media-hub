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
const PRIORITY_COLORS = { urgent: '#EF4444', high: '#F59E0B', medium: '#3B82F6', low: '#6B7280' };

function parseLocal(s){const[y,m,d]=s.split('-');return new Date(y,m-1,d);}
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

// Capacity config: max active tasks per role before flagged
const CAPACITY_LIMITS = {
  default: 5,
  editor: 3,
  lead: 8,
};

function getCapacityLimit(title) {
  const t = (title || '').toLowerCase();
  if (t.includes('editor')) return CAPACITY_LIMITS.editor;
  if (t.includes('lead') || t.includes('director') || t.includes('head')) return CAPACITY_LIMITS.lead;
  return CAPACITY_LIMITS.default;
}

export default function Operations() {
  const { isAdmin } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [statuses, setStatuses] = useState([]);
  const [members, setMembers] = useState([]);
  const [subtasks, setSubtasks] = useState([]);
  const [expandedMember, setExpandedMember] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, []);

  async function load() {
    const [tRes, sRes, mRes, stRes] = await Promise.all([
      supabase.from('pipeline_tasks').select('*, status:pipeline_statuses(name, branch_slug, sort_order, color)'),
      supabase.from('pipeline_statuses').select('*').order('sort_order'),
      supabase.from('profiles').select('id, full_name, title, avatar_url, email, slack_user_id'),
      supabase.from('pipeline_subtasks').select('task_id, title, completed, assignee_id, sort_order'),
    ]);
    if (tRes.data) setTasks(tRes.data);
    if (sRes.data) setStatuses(sRes.data);
    if (mRes.data) setMembers(mRes.data);
    if (stRes.data) setSubtasks(stRes.data);
    setLoading(false);
  }

  const archived = useMemo(() => statuses.filter(s => /published|posted|archived/i.test(s.name)).map(s => s.id), [statuses]);

  // Per-member workload
  const teamWorkload = useMemo(() => {
    return members.map(m => {
      const myTasks = tasks.filter(t => t.assignee_id === m.id && !archived.includes(t.status_id));
      const myEditorTasks = tasks.filter(t => t.editor_assigned_id === m.id && !archived.includes(t.status_id));
      const mySubs = subtasks.filter(s => s.assignee_id === m.id);
      const openSubs = mySubs.filter(s => !s.completed);
      const doneSubs = mySubs.filter(s => s.completed);
      const today = new Date(); today.setHours(0, 0, 0, 0);
      const overdue = myTasks.filter(t => t.due_date && parseLocal(t.due_date) < today);
      const dueThisWeek = myTasks.filter(t => {
        if (!t.due_date) return false;
        const d = parseLocal(t.due_date); d.setHours(0, 0, 0, 0);
        const diff = (d - today) / 86400000;
        return diff >= 0 && diff <= 7;
      });

      const cap = getCapacityLimit(m.title);
      const load = myTasks.length + myEditorTasks.length;
      const loadPct = Math.min(Math.round((load / cap) * 100), 150);

      return {
        ...m,
        tasks: myTasks,
        editorTasks: myEditorTasks,
        allActiveTasks: [...new Map([...myTasks, ...myEditorTasks].map(t => [t.id, t])).values()],
        subtasksTotal: mySubs.length,
        subtasksDone: doneSubs.length,
        subtasksOpen: openSubs.length,
        subPct: mySubs.length > 0 ? Math.round((doneSubs.length / mySubs.length) * 100) : 0,
        overdue: overdue.length,
        overdueList: overdue,
        dueThisWeek: dueThisWeek.length,
        capacityLimit: cap,
        loadCount: load,
        loadPct,
        status: loadPct >= 100 ? 'overloaded' : loadPct >= 80 ? 'high' : loadPct >= 50 ? 'normal' : 'light',
      };
    }).filter(m => m.loadCount > 0 || m.subtasksTotal > 0).sort((a, b) => b.loadPct - a.loadPct);
  }, [tasks, members, subtasks, archived]);

  // Department summary
  const deptSummary = useMemo(() => {
    const active = tasks.filter(t => !archived.includes(t.status_id));
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const overdue = active.filter(t => t.due_date && parseLocal(t.due_date) < today);
    const unassigned = active.filter(t => !t.assignee_id);
    const overloaded = teamWorkload.filter(w => w.status === 'overloaded').length;
    const highLoad = teamWorkload.filter(w => w.status === 'high').length;
    const allSubs = subtasks.length;
    const doneSubs = subtasks.filter(s => s.completed).length;

    return { active: active.length, overdue: overdue.length, unassigned: unassigned.length, overloaded, highLoad, subtotalSubs: allSubs, subsDone: doneSubs };
  }, [tasks, subtasks, archived, teamWorkload]);

  // Bottlenecks: statuses with the most tasks stuck
  const bottlenecks = useMemo(() => {
    const active = tasks.filter(t => !archived.includes(t.status_id));
    const byStatus = {};
    active.forEach(t => {
      const name = t.status?.name || 'Unknown';
      const branch = t.status?.branch_slug || 'unknown';
      const key = `${branch}:${name}`;
      if (!byStatus[key]) byStatus[key] = { name, branch, count: 0, tasks: [] };
      byStatus[key].count++;
      byStatus[key].tasks.push(t);
    });
    return Object.values(byStatus).filter(b => b.count >= 2).sort((a, b) => b.count - a.count).slice(0, 6);
  }, [tasks, archived]);

  function loadColor(pct) {
    if (pct >= 100) return '#EF4444';
    if (pct >= 80) return '#F59E0B';
    if (pct >= 50) return '#37CA37';
    return 'var(--text-muted)';
  }

  function statusLabel(s) {
    if (s === 'overloaded') return 'OVERLOADED';
    if (s === 'high') return 'HIGH LOAD';
    if (s === 'normal') return 'NORMAL';
    return 'LIGHT';
  }

  if (!isAdmin) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Admin access required.</div>;
  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Loading operations data...</div>;

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', fontFamily: 'Outfit, Arial, sans-serif' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: WHITE, margin: '0 0 4px' }}>Operations Center</h1>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>Live department overview -- who's doing what right now</p>
      </div>

      {/* Department health cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10, marginBottom: 24 }}>
        <HealthCard label="Active Tasks" value={deptSummary.active} color={WHITE} />
        <HealthCard label="Overdue" value={deptSummary.overdue} color={deptSummary.overdue > 0 ? '#EF4444' : 'var(--text-muted)'} alert={deptSummary.overdue > 0} />
        <HealthCard label="Unassigned" value={deptSummary.unassigned} color={deptSummary.unassigned > 0 ? '#F59E0B' : 'var(--text-muted)'} alert={deptSummary.unassigned > 2} />
        <HealthCard label="Overloaded" value={deptSummary.overloaded} color={deptSummary.overloaded > 0 ? '#EF4444' : 'var(--text-muted)'} alert={deptSummary.overloaded > 0} />
        <HealthCard label="High Load" value={deptSummary.highLoad} color={deptSummary.highLoad > 0 ? '#F59E0B' : 'var(--text-muted)'} />
        <HealthCard label="Subtask Progress" value={`${deptSummary.subsDone}/${deptSummary.subtotalSubs}`} color='#37CA37' />
      </div>

      {/* Bottlenecks */}
      {bottlenecks.length > 0 && (
        <div style={{ ...st.card, marginBottom: 16 }}>
          <h2 style={st.cardTitle}>Pipeline Bottlenecks</h2>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '0 0 12px' }}>Stages with 2+ tasks queued</p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {bottlenecks.map((b, i) => (
              <div key={i} style={{ background: CARD_LIGHT, border: `1px solid ${BORDER}`, borderRadius: 8, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: BRANCH_COLORS[b.branch] || '#6B7280' }} />
                <span style={{ fontSize: 12, color: WHITE, fontWeight: 600 }}>{b.name}</span>
                <span style={{ fontSize: 11, color: '#EF4444', fontWeight: 700, background: '#EF444415', padding: '2px 6px', borderRadius: 4 }}>{b.count} tasks</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Team workload */}
      <div style={{ ...st.card, marginBottom: 16 }}>
        <h2 style={st.cardTitle}>Team Workload</h2>
        <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '0 0 16px' }}>
          Capacity based on role -- editors: {CAPACITY_LIMITS.editor} tasks, leads: {CAPACITY_LIMITS.lead} tasks, others: {CAPACITY_LIMITS.default} tasks.
          <span style={{ color: '#F59E0B', fontWeight: 600 }}> 80%+ = high load.</span>
          <span style={{ color: '#EF4444', fontWeight: 600 }}> 100%+ = overloaded.</span>
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {teamWorkload.map(w => (
            <div key={w.id}>
              <div
                onClick={() => setExpandedMember(expandedMember === w.id ? null : w.id)}
                style={{
                  ...st.memberCard,
                  borderLeft: `3px solid ${loadColor(w.loadPct)}`,
                  cursor: 'pointer',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 }}>
                  {w.avatar_url ? (
                    <img src={w.avatar_url} alt="" style={{ width: 36, height: 36, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }} />
                  ) : (
                    <div style={{ width: 36, height: 36, borderRadius: 8, background: CARD_LIGHT, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontWeight: 700, fontSize: 14, flexShrink: 0 }}>
                      {w.full_name?.charAt(0) || 'U'}
                    </div>
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 14, fontWeight: 600, color: WHITE }}>{w.full_name}</span>
                      <span style={{
                        fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em',
                        color: loadColor(w.loadPct),
                        background: loadColor(w.loadPct) + '15',
                        padding: '2px 6px', borderRadius: 4,
                      }}>{statusLabel(w.status)}</span>
                    </div>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{w.title || 'Team Member'}</span>
                  </div>
                </div>

                {/* Capacity bar */}
                <div style={{ width: 200, flexShrink: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{w.loadCount}/{w.capacityLimit} tasks</span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: loadColor(w.loadPct) }}>{w.loadPct}%</span>
                  </div>
                  <div style={{ height: 6, background: 'var(--dark-border)', borderRadius: 3 }}>
                    <div style={{ height: '100%', width: `${Math.min(w.loadPct, 100)}%`, background: loadColor(w.loadPct), borderRadius: 3, transition: 'width 0.3s' }} />
                  </div>
                </div>

                {/* Quick stats */}
                <div style={{ display: 'flex', gap: 12, flexShrink: 0 }}>
                  {w.overdue > 0 && <span style={{ fontSize: 11, fontWeight: 700, color: '#EF4444' }}>{w.overdue} overdue</span>}
                  {w.dueThisWeek > 0 && <span style={{ fontSize: 11, fontWeight: 600, color: '#F59E0B' }}>{w.dueThisWeek} due this week</span>}
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Subtasks: {w.subtasksDone}/{w.subtasksTotal}</span>
                </div>

                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" style={{ transform: expandedMember === w.id ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s', flexShrink: 0 }}>
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </div>

              {/* Expanded: show all their tasks */}
              {expandedMember === w.id && (
                <div style={{ padding: '8px 0 8px 52px' }}>
                  {w.allActiveTasks.length === 0 && <div style={{ fontSize: 13, color: 'var(--text-muted)', padding: 12 }}>No active tasks</div>}
                  {w.allActiveTasks.map(t => {
                    const due = dueInfo(t.due_date);
                    const taskSubs = subtasks.filter(s => s.task_id === t.id);
                    const taskSubsDone = taskSubs.filter(s => s.completed).length;
                    return (
                      <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderBottom: `1px solid var(--dark-border)22`, fontSize: 13 }}>
                        <div style={{ width: 6, height: 6, borderRadius: '50%', background: BRANCH_COLORS[t.branch_slug] || '#6B7280', flexShrink: 0 }} />
                        <span style={{ flex: 1, color: WHITE, fontWeight: 500 }}>{t.title}</span>
                        <span style={{ fontSize: 11, color: t.status?.color || 'var(--text-muted)', fontWeight: 500 }}>{t.status?.name}</span>
                        {t.priority && <span style={{ fontSize: 10, color: PRIORITY_COLORS[t.priority], fontWeight: 600 }}>{t.priority}</span>}
                        {due && <span style={{ fontSize: 10, fontWeight: 700, color: due.color }}>{due.text}</span>}
                        {taskSubs.length > 0 && <span style={{ fontSize: 10, color: taskSubsDone === taskSubs.length ? '#37CA37' : 'var(--text-muted)' }}>✓ {taskSubsDone}/{taskSubs.length}</span>}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))}

          {teamWorkload.length === 0 && <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>No active assignments.</div>}
        </div>
      </div>

      {/* Unassigned tasks */}
      {(() => {
        const unassigned = tasks.filter(t => !t.assignee_id && !archived.includes(t.status_id));
        if (unassigned.length === 0) return null;
        return (
          <div style={{ ...st.card, marginBottom: 16 }}>
            <h2 style={st.cardTitle}>Unassigned Tasks <span style={{ fontSize: 12, color: '#F59E0B', fontWeight: 600 }}>({unassigned.length})</span></h2>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '0 0 12px' }}>These tasks need an owner.</p>
            {unassigned.map(t => (
              <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: `1px solid var(--dark-border)22`, fontSize: 13 }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: BRANCH_COLORS[t.branch_slug] || '#6B7280', flexShrink: 0 }} />
                <span style={{ flex: 1, color: WHITE }}>{t.title}</span>
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{t.status?.name}</span>
                <span style={{ fontSize: 11, color: BRANCH_COLORS[t.branch_slug] || 'var(--text-muted)' }}>{BRANCH_LABELS[t.branch_slug]}</span>
              </div>
            ))}
          </div>
        );
      })()}
    </div>
  );
}

function HealthCard({ label, value, color, alert }) {
  return (
    <div style={{
      background: CARD, border: `1px solid ${alert ? color + '44' : BORDER}`, borderRadius: 10, padding: '12px 16px',
      ...(alert ? { boxShadow: `0 0 12px ${color}22` } : {}),
    }}>
      <span style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600, display: 'block', marginBottom: 4 }}>{label}</span>
      <span style={{ fontSize: 22, fontWeight: 700, color }}>{value}</span>
    </div>
  );
}

const st = {
  card: { background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 20 },
  cardTitle: { fontSize: 16, fontWeight: 700, color: WHITE, margin: '0 0 4px' },
  memberCard: {
    display: 'flex', alignItems: 'center', gap: 16, padding: '14px 16px',
    background: CARD, border: `1px solid ${BORDER}`, borderRadius: 10,
    transition: 'border-color 0.15s',
  },
};
