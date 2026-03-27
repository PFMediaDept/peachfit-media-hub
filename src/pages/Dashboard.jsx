import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../lib/AuthContext'
import { supabase } from '../lib/supabase'

const GREEN = '#37CA37';
const PEACH = '#F4AB9C';
const CARD = 'var(--dark-card)';
const CARD_LIGHT = 'var(--dark-light)';
const BORDER = 'var(--dark-border)';
const WHITE = 'var(--white)';

const BRANCH_COLORS = { youtube: '#FF0000', 'short-form': '#8B5CF6', 'ads-creative': '#F59E0B', production: '#3B82F6' };
const BRANCH_LABELS = { youtube: 'YouTube', 'short-form': 'Short Form', 'ads-creative': 'Ads/Creative', production: 'Production' };
const PRIORITY_COLORS = { urgent: '#EF4444', high: '#F59E0B', medium: '#3B82F6', low: '#6B7280' };

function parseLocal(s){const[y,m,d]=s.split('-');return new Date(y,m-1,d);}
function dueLabel(due){
  if(!due)return null;
  const today=new Date();today.setHours(0,0,0,0);
  const d=parseLocal(due);d.setHours(0,0,0,0);
  const diff=Math.round((d-today)/86400000);
  if(diff<0)return{text:`${Math.abs(diff)}d overdue`,color:'#EF4444'};
  if(diff===0)return{text:'Today',color:'#F59E0B'};
  if(diff===1)return{text:'Tomorrow',color:'#F59E0B'};
  if(diff<=7)return{text:`in ${diff}d`,color:'#3B82F6'};
  return{text:d.toLocaleDateString('en-US',{month:'short',day:'numeric'}),color:'var(--text-muted)'};
}

export default function Dashboard() {
  const { profile, branches } = useAuth()
  const [announcements, setAnnouncements] = useState([])
  const [campaigns, setCampaigns] = useState([])
  const [myTasks, setMyTasks] = useState([])
  const [allTasks, setAllTasks] = useState([])
  const [notifications, setNotifications] = useState([])
  const [statuses, setStatuses] = useState([])

  useEffect(() => { load(); }, [profile])

  async function load() {
    const [campRes, aRes, nRes, sRes, tRes] = await Promise.all([
      supabase.from('active_campaigns').select('*').eq('is_active', true).order('launch_date', { ascending: false }),
      supabase.from('announcements').select('*').order('created_at', { ascending: false }).limit(3),
      supabase.from('notifications').select('*').eq('user_id', profile?.id || '').eq('read', false).order('created_at', { ascending: false }).limit(5),
      supabase.from('pipeline_statuses').select('*').order('sort_order'),
      supabase.from('pipeline_tasks').select('*, status:pipeline_statuses(name, branch_slug)').order('due_date', { ascending: true, nullsFirst: false }),
    ]);
    if (campRes.data) setCampaigns(campRes.data);
    if (aRes.data) setAnnouncements(aRes.data);
    if (nRes.data) setNotifications(nRes.data);
    if (sRes.data) setStatuses(sRes.data);
    if (tRes.data) {
      setAllTasks(tRes.data);
      if (profile?.id) setMyTasks(tRes.data.filter(t => t.assignee_id === profile.id));
    }
  }

  // Stats
  const stats = useMemo(() => {
    const today = new Date(); today.setHours(0,0,0,0);
    const archived = statuses.filter(s => /published|posted|archived/i.test(s.name)).map(s => s.id);
    const active = allTasks.filter(t => !archived.includes(t.status_id));
    const overdue = active.filter(t => { if (!t.due_date) return false; const d = parseLocal(t.due_date); d.setHours(0,0,0,0); return d < today; });
    const dueThisWeek = active.filter(t => { if (!t.due_date) return false; const d = parseLocal(t.due_date); d.setHours(0,0,0,0); const diff = (d - today) / 86400000; return diff >= 0 && diff <= 7; });
    const myOverdue = myTasks.filter(t => { if (!t.due_date) return false; const d = parseLocal(t.due_date); d.setHours(0,0,0,0); return d < today && !archived.includes(t.status_id); });

    // Backlog depth
    const now = new Date();
    const ytUp = allTasks.filter(t => t.branch_slug === 'youtube' && !archived.includes(t.status_id) && t.publish_date && parseLocal(t.publish_date) >= now);
    const sfUp = allTasks.filter(t => t.branch_slug === 'short-form' && !archived.includes(t.status_id) && t.publish_date && parseLocal(t.publish_date) >= now);

    return {
      totalActive: active.length,
      overdue: overdue.length,
      dueThisWeek: dueThisWeek.length,
      myTasks: myTasks.filter(t => !archived.includes(t.status_id)).length,
      myOverdue: myOverdue.length,
      unreadNotifs: notifications.length,
      ytBacklog: Math.round(ytUp.length / 2),
      sfBacklog: Math.round(sfUp.length / 7),
    };
  }, [allTasks, myTasks, statuses, notifications]);

  // Upcoming deadlines (next 7 days, not archived)
  const upcoming = useMemo(() => {
    const today = new Date(); today.setHours(0,0,0,0);
    const archived = statuses.filter(s => /published|posted|archived/i.test(s.name)).map(s => s.id);
    return allTasks
      .filter(t => t.due_date && !archived.includes(t.status_id))
      .filter(t => { const d = parseLocal(t.due_date); d.setHours(0,0,0,0); const diff = (d - today) / 86400000; return diff >= -3 && diff <= 7; })
      .sort((a, b) => a.due_date.localeCompare(b.due_date))
      .slice(0, 8);
  }, [allTasks, statuses]);

  // Pipeline health per branch
  const pipelineHealth = useMemo(() => {
    const archived = statuses.filter(s => /published|posted|archived/i.test(s.name)).map(s => s.id);
    const result = {};
    Object.keys(BRANCH_LABELS).forEach(slug => {
      const branchTasks = allTasks.filter(t => t.branch_slug === slug && !archived.includes(t.status_id));
      const branchStatuses = statuses.filter(s => s.branch_slug === slug && !archived.includes(s.id));
      const byStatus = {};
      branchStatuses.forEach(s => { byStatus[s.name] = branchTasks.filter(t => t.status_id === s.id).length; });
      result[slug] = { total: branchTasks.length, byStatus };
    });
    return result;
  }, [allTasks, statuses]);

  function backlogColor(w) { if (w < 3) return '#EF4444'; if (w <= 5) return '#F59E0B'; return '#10B981'; }

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  }

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: WHITE, margin: '0 0 4px', fontFamily: 'Outfit, Arial, sans-serif' }}>
          {greeting()}, {profile?.full_name?.split(' ')[0] || 'team member'}
        </h1>
        <p style={{ fontSize: 14, color: 'var(--text-muted)', margin: 0 }}>Here's what's happening in the media department.</p>
      </div>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10, marginBottom: 24 }}>
        <StatCard label="My Tasks" value={stats.myTasks} color={WHITE} link="/my-tasks" />
        <StatCard label="My Overdue" value={stats.myOverdue} color={stats.myOverdue > 0 ? '#EF4444' : '#6B7280'} link="/my-tasks" />
        <StatCard label="All Active" value={stats.totalActive} color={WHITE} />
        <StatCard label="Due This Week" value={stats.dueThisWeek} color={stats.dueThisWeek > 0 ? '#F59E0B' : '#6B7280'} />
        <StatCard label="All Overdue" value={stats.overdue} color={stats.overdue > 0 ? '#EF4444' : '#6B7280'} />
        <StatCard label="YT Backlog" value={`${stats.ytBacklog}w`} color={backlogColor(stats.ytBacklog)} />
        <StatCard label="SF Backlog" value={`${stats.sfBacklog}w`} color={backlogColor(stats.sfBacklog)} />
        <StatCard label="Unread" value={stats.unreadNotifs} color={stats.unreadNotifs > 0 ? GREEN : '#6B7280'} />
      </div>

      {/* Two column layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
        {/* Upcoming deadlines */}
        <div style={s.card}>
          <div style={s.cardHeader}>
            <h2 style={s.cardTitle}>Upcoming Deadlines</h2>
            <Link to="/calendar" style={s.cardLink}>Calendar →</Link>
          </div>
          {upcoming.length === 0 ? (
            <div style={s.empty}>No upcoming deadlines</div>
          ) : (
            upcoming.map(t => {
              const due = dueLabel(t.due_date);
              return (
                <Link key={t.id} to="/my-tasks" style={s.deadlineRow}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: BRANCH_COLORS[t.branch_slug] || '#6B7280', flexShrink: 0 }} />
                  <span style={{ flex: 1, fontSize: 13, color: WHITE, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.title}</span>
                  {due && <span style={{ fontSize: 11, fontWeight: 600, color: due.color, flexShrink: 0 }}>{due.text}</span>}
                </Link>
              );
            })
          )}
        </div>

        {/* Recent notifications */}
        <div style={s.card}>
          <div style={s.cardHeader}>
            <h2 style={s.cardTitle}>Recent Activity</h2>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{stats.unreadNotifs} unread</span>
          </div>
          {notifications.length === 0 ? (
            <div style={s.empty}>All caught up</div>
          ) : (
            notifications.map(n => (
              <div key={n.id} style={s.activityRow}>
                <span style={{ fontSize: 14, flexShrink: 0 }}>
                  {n.type === 'task_assigned' ? '📋' : n.type === 'subtask_assigned' ? '☑️' : n.type === 'editor_assigned' ? '🎬' : n.type === 'comment' ? '💬' : '🔔'}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: WHITE }}>{n.title}</span>
                  <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '2px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n.body}</p>
                </div>
                <span style={{ fontSize: 10, color: 'var(--text-muted)', flexShrink: 0 }}>{timeAgo(n.created_at)}</span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Pipeline health */}
      <div style={{ ...s.card, marginBottom: 24 }}>
        <div style={s.cardHeader}>
          <h2 style={s.cardTitle}>Pipeline Health</h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 }}>
          {Object.entries(pipelineHealth).map(([slug, data]) => (
            <Link key={slug} to={`/branch/${slug}/pipeline`} style={s.pipelineCard}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: BRANCH_COLORS[slug] }} />
                <span style={{ fontSize: 13, fontWeight: 700, color: BRANCH_COLORS[slug] }}>{BRANCH_LABELS[slug]}</span>
                <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 'auto' }}>{data.total} active</span>
              </div>
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                {Object.entries(data.byStatus).filter(([,c]) => c > 0).map(([name, count]) => (
                  <span key={name} style={{ fontSize: 10, color: 'var(--text-secondary)', background: 'var(--dark-light)', padding: '2px 6px', borderRadius: 4 }}>
                    {name}: {count}
                  </span>
                ))}
                {data.total === 0 && <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>No active tasks</span>}
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Branch cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10, marginBottom: 24 }}>
        {branches.map(branch => (
          <Link key={branch.id} to={`/branch/${branch.slug}`} style={s.branchCard}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: BRANCH_COLORS[branch.slug] || GREEN }} />
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: WHITE }}>{branch.name}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>View pipeline & SOPs</div>
            </div>
          </Link>
        ))}
      </div>

      {/* Active Campaigns */}
      {campaigns.length > 0 && (
        <div style={{ ...s.card, marginBottom: 16, borderLeft: '3px solid #F59E0B' }}>
          <div style={s.cardHeader}>
            <h2 style={s.cardTitle}>Active Campaigns (SOB)</h2>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{campaigns.length} active</span>
          </div>
          {campaigns.map(c => (
            <div key={c.id} style={{ padding: '10px 0', borderBottom: '1px solid var(--dark-border)22' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 4 }}>
                <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--white)' }}>{c.name}</span>
                <span style={{ fontSize: 10, fontWeight: 700, color: c.campaign_type === 'lead_magnet' ? '#F59E0B' : '#37CA37', background: c.campaign_type === 'lead_magnet' ? '#F59E0B15' : '#37CA3715', padding: '2px 6px', borderRadius: 4 }}>
                  {c.campaign_type === 'lead_magnet' ? 'Lead Magnet' : 'DM Funnel'}
                </span>
              </div>
              {c.cta_posts && (
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 2 }}>
                  <span style={{ fontWeight: 600 }}>Posts/Lives:</span> {c.cta_posts}
                </div>
              )}
              {c.cta_stories && (
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 2 }}>
                  <span style={{ fontWeight: 600 }}>Stories:</span> {c.cta_stories}
                </div>
              )}
              {c.pinned_comment && (
                <div style={{ fontSize: 11, color: '#F59E0B', background: '#F59E0B10', padding: '4px 8px', borderRadius: 4, marginTop: 4 }}>
                  Pinned comment: {c.pinned_comment}
                </div>
              )}
              {c.notes && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>{c.notes}</div>}
            </div>
          ))}
        </div>
      )}

      {/* Announcements */}
      <div style={{ ...s.card, marginBottom: 24 }}>
        <div style={s.cardHeader}>
          <h2 style={s.cardTitle}>Announcements</h2>
        </div>
        {announcements.length === 0 ? (
          <div style={s.empty}>No announcements yet.</div>
        ) : (
          announcements.map(a => (
            <div key={a.id} style={s.announcementRow}>
              <span style={{ fontSize: 11, color: 'var(--text-muted)', minWidth: 60, flexShrink: 0 }}>
                {new Date(a.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </span>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: WHITE }}>{a.title}</div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>{a.body}</div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Quick access */}
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 15, fontWeight: 700, color: WHITE, margin: '0 0 12px' }}>Quick access</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10 }}>
          {[
            ['/standards', 'Dept standards', 'Comms rules, SLAs'],
            ['/assets', 'Brand assets', 'Logos, colors, templates'],
            ['/team', 'Team directory', 'Roles, contacts'],
            ['/links', 'Quick links', 'Drive, Slack, tools'],
          ].map(([to, label, desc]) => (
            <Link key={to} to={to} style={s.quickCard}>
              <div style={{ fontSize: 13, fontWeight: 600, color: WHITE }}>{label}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{desc}</div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, color, link }) {
  const inner = (
    <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 10, padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 4 }}>
      <span style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>{label}</span>
      <span style={{ fontSize: 22, fontWeight: 700, color }}>{value}</span>
    </div>
  );
  if (link) return <Link to={link} style={{ textDecoration: 'none' }}>{inner}</Link>;
  return inner;
}

function timeAgo(ts) {
  const diff = (Date.now() - new Date(ts).getTime()) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return Math.floor(diff / 60) + 'm';
  if (diff < 86400) return Math.floor(diff / 3600) + 'h';
  return Math.floor(diff / 86400) + 'd';
}

const s = {
  card: { background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 16, overflow: 'hidden' },
  cardHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, paddingBottom: 8, borderBottom: `1px solid ${BORDER}` },
  cardTitle: { fontSize: 14, fontWeight: 700, color: WHITE, margin: 0 },
  cardLink: { fontSize: 12, color: GREEN, textDecoration: 'none', fontWeight: 600 },
  empty: { padding: 20, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 },
  deadlineRow: { display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: `1px solid ${BORDER}11`, textDecoration: 'none', cursor: 'pointer' },
  activityRow: { display: 'flex', alignItems: 'flex-start', gap: 10, padding: '8px 0', borderBottom: `1px solid ${BORDER}11` },
  pipelineCard: { background: CARD_LIGHT, border: `1px solid ${BORDER}`, borderRadius: 10, padding: 14, textDecoration: 'none', transition: 'border-color 0.15s' },
  branchCard: { display: 'flex', alignItems: 'center', gap: 12, padding: 16, background: CARD, border: `1px solid ${BORDER}`, borderRadius: 10, textDecoration: 'none', transition: 'border-color 0.15s' },
  announcementRow: { display: 'flex', gap: 12, padding: '10px 0', borderBottom: `1px solid ${BORDER}11` },
  quickCard: { padding: 14, background: CARD, border: `1px solid ${BORDER}`, borderRadius: 10, textDecoration: 'none', transition: 'border-color 0.15s' },
};
