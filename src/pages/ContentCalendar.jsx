import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'

// ── CONSTANTS ──
const BRANCH_COLORS = {
  youtube: { bg: '#378ADD', light: 'rgba(55,138,221,0.12)', border: 'rgba(55,138,221,0.3)', label: 'YouTube' },
  'short-form': { bg: '#7F77DD', light: 'rgba(127,119,221,0.12)', border: 'rgba(127,119,221,0.3)', label: 'Short Form' },
  'ads-creative': { bg: '#D85A30', light: 'rgba(216,90,48,0.12)', border: 'rgba(216,90,48,0.3)', label: 'Ads' },
  production: { bg: '#D4537E', light: 'rgba(212,83,126,0.12)', border: 'rgba(212,83,126,0.3)', label: 'Production' },
}

const PILLAR_COLORS = {
  transformation: '#10B981', educational: '#3B82F6', experiment: '#F59E0B', 'grocery-meal': '#F97316',
  'docu-series': '#8B5CF6', cooking: '#F97316', education: '#3B82F6', lifestyle: '#EC4899',
  'trending-reactive': '#EF4444', vsl: '#EF4444', 'ugc-style': '#F59E0B', testimonial: '#10B981',
  'direct-response': '#3B82F6', 'brand-awareness': '#8B5CF6',
}

const STATUS_COLORS = {
  'Idea Bank': '#6B7280', 'In Production': '#F59E0B', 'Rough Cut': '#3B82F6', 'Final Cut': '#8B5CF6',
  'QC Review': '#EC4899', 'Revisions': '#EF4444', 'Thumbnail Ready': '#F97316', 'Publishing Queue': '#10B981',
  'Published': '#37CA37', 'Posted / Archive': '#6366F1', 'Archived': '#9CA3AF',
  'Backlog': '#6B7280', 'Script/Talking Points': '#F59E0B', 'Filming': '#3B82F6', 'Editing': '#8B5CF6',
  'Ready to Post': '#10B981', 'Scheduled': '#37CA37',
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

function formatDate(d) {
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0')
}

function getWeekStart(date) {
  const d = new Date(date)
  d.setDate(d.getDate() - d.getDay())
  d.setHours(0, 0, 0, 0)
  return d
}

function addDays(date, n) {
  const d = new Date(date)
  d.setDate(d.getDate() + n)
  return d
}

// ── BACKLOG METER ──
function BacklogMeter({ tasks }) {
  const now = new Date()
  now.setHours(0, 0, 0, 0)

  const ytTasks = tasks.filter(t => t.branch_slug === 'youtube' && t.publish_date)
  const sfTasks = tasks.filter(t => t.branch_slug === 'short-form' && t.publish_date)

  const ytFuture = ytTasks.filter(t => new Date(t.publish_date + 'T00:00:00') >= now).sort((a, b) => new Date(a.publish_date) - new Date(b.publish_date))
  const sfFuture = sfTasks.filter(t => new Date(t.publish_date + 'T00:00:00') >= now).sort((a, b) => new Date(a.publish_date) - new Date(b.publish_date))

  const ytLastDate = ytFuture.length > 0 ? new Date(ytFuture[ytFuture.length - 1].publish_date + 'T00:00:00') : null
  const sfLastDate = sfFuture.length > 0 ? new Date(sfFuture[sfFuture.length - 1].publish_date + 'T00:00:00') : null

  const ytWeeks = ytLastDate ? Math.ceil((ytLastDate - now) / (7 * 24 * 60 * 60 * 1000)) : 0
  const sfWeeks = sfLastDate ? Math.ceil((sfLastDate - now) / (7 * 24 * 60 * 60 * 1000)) : 0

  const ytColor = ytWeeks >= 5 ? '#37CA37' : ytWeeks >= 3 ? '#F59E0B' : '#EF4444'
  const sfColor = sfWeeks >= 5 ? '#37CA37' : sfWeeks >= 3 ? '#F59E0B' : '#EF4444'

  return (
    <div style={s.backlogRow}>
      <div style={s.backlogCard}>
        <div style={s.backlogHeader}>
          <div style={{ ...s.backlogDot, background: BRANCH_COLORS.youtube.bg }} />
          <span style={s.backlogTitle}>YouTube Backlog</span>
        </div>
        <div style={{ ...s.backlogNumber, color: ytColor }}>{ytWeeks} week{ytWeeks !== 1 ? 's' : ''}</div>
        <div style={s.backlogSub}>{ytFuture.length} video{ytFuture.length !== 1 ? 's' : ''} scheduled</div>
        <div style={s.backlogBar}>
          <div style={{ ...s.backlogFill, width: Math.min(100, (ytWeeks / 10) * 100) + '%', background: ytColor }} />
        </div>
        <div style={s.backlogTarget}>Target: 5-10 weeks</div>
      </div>
      <div style={s.backlogCard}>
        <div style={s.backlogHeader}>
          <div style={{ ...s.backlogDot, background: BRANCH_COLORS['short-form'].bg }} />
          <span style={s.backlogTitle}>Short Form Backlog</span>
        </div>
        <div style={{ ...s.backlogNumber, color: sfColor }}>{sfWeeks} week{sfWeeks !== 1 ? 's' : ''}</div>
        <div style={s.backlogSub}>{sfFuture.length} post{sfFuture.length !== 1 ? 's' : ''} scheduled</div>
        <div style={s.backlogBar}>
          <div style={{ ...s.backlogFill, width: Math.min(100, (sfWeeks / 10) * 100) + '%', background: sfColor }} />
        </div>
        <div style={s.backlogTarget}>Target: 5-10 weeks</div>
      </div>
    </div>
  )
}

// ── CALENDAR EVENT PILL ──
function EventPill({ task, statuses }) {
  const branch = BRANCH_COLORS[task.branch_slug] || BRANCH_COLORS.youtube
  const statusName = statuses.find(st => st.id === task.status_id)?.name || ''
  const statusColor = STATUS_COLORS[statusName] || '#6B7280'
  const pillarColor = PILLAR_COLORS[task.content_pillar] || null
  const talent = (task.talent || []).join(', ')
  const platforms = (task.platform || []).map(p => p === 'Instagram Reels' ? 'IG' : p === 'TikTok' ? 'TT' : p === 'YouTube Shorts' ? 'YTS' : p).join(' ')
  const isYT = task.branch_slug === 'youtube'
  const isSF = task.branch_slug === 'short-form'

  return (
    <div style={{ ...s.eventPill, background: branch.light, borderLeft: '3px solid ' + branch.bg }} title={`${task.title}\nStatus: ${statusName}\nTalent: ${talent || 'TBD'}`}>
      <div style={s.eventTop}>
        <span style={{ ...s.eventBranch, color: branch.bg }}>{branch.label}</span>
        <span style={{ ...s.eventStatus, background: statusColor + '20', color: statusColor }}>{statusName}</span>
      </div>
      <div style={s.eventTitle}>{task.title}</div>
      <div style={s.eventMeta}>
        {talent && <span style={s.eventTalent}>{talent}</span>}
        {isSF && platforms && <span style={s.eventPlatforms}>{platforms}</span>}
        {task.content_pillar && <span style={{ ...s.eventPillar, color: pillarColor || 'var(--text-muted)' }}>{task.content_pillar}</span>}
      </div>
    </div>
  )
}

// ── MONTH VIEW ──
function MonthView({ year, month, tasksByDate, statuses }) {
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const startOffset = firstDay.getDay()
  const daysInMonth = lastDay.getDate()
  const today = formatDate(new Date())

  const weeks = []
  let currentWeek = new Array(startOffset).fill(null)

  for (let day = 1; day <= daysInMonth; day++) {
    currentWeek.push(day)
    if (currentWeek.length === 7) {
      weeks.push(currentWeek)
      currentWeek = []
    }
  }
  if (currentWeek.length > 0) {
    while (currentWeek.length < 7) currentWeek.push(null)
    weeks.push(currentWeek)
  }

  return (
    <div style={s.monthGrid}>
      <div style={s.monthHeaderRow}>
        {DAYS.map(d => <div key={d} style={s.monthDayHeader}>{d}</div>)}
      </div>
      {weeks.map((week, wi) => (
        <div key={wi} style={s.monthWeekRow}>
          {week.map((day, di) => {
            const dateStr = day ? formatDate(new Date(year, month, day)) : null
            const isToday = dateStr === today
            const events = dateStr ? (tasksByDate[dateStr] || []) : []
            return (
              <div key={di} style={{ ...s.monthCell, ...(isToday ? s.monthCellToday : {}), ...(day ? {} : { opacity: 0.3 }) }}>
                {day && <div style={{ ...s.monthCellDay, ...(isToday ? { color: 'var(--green)', fontWeight: '700' } : {}) }}>{day}</div>}
                <div style={s.monthCellEvents}>
                  {events.slice(0, 3).map(t => (
                    <EventPill key={t.id} task={t} statuses={statuses} />
                  ))}
                  {events.length > 3 && <div style={s.eventMore}>+{events.length - 3} more</div>}
                </div>
              </div>
            )
          })}
        </div>
      ))}
    </div>
  )
}

// ── WEEK VIEW ──
function WeekView({ weekStart, tasksByDate, statuses }) {
  const today = formatDate(new Date())
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

  return (
    <div style={s.weekGrid}>
      {days.map(day => {
        const dateStr = formatDate(day)
        const isToday = dateStr === today
        const events = tasksByDate[dateStr] || []
        const dayLabel = day.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
        return (
          <div key={dateStr} style={{ ...s.weekColumn, ...(isToday ? s.weekColumnToday : {}) }}>
            <div style={{ ...s.weekDayHeader, ...(isToday ? { color: 'var(--green)', fontWeight: '700' } : {}) }}>
              {dayLabel}
            </div>
            <div style={s.weekEvents}>
              {events.map(t => <EventPill key={t.id} task={t} statuses={statuses} />)}
              {events.length === 0 && <div style={s.weekEmpty}>No content</div>}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── MAIN CALENDAR ──
export default function ContentCalendar() {
  const [tasks, setTasks] = useState([])
  const [statuses, setStatuses] = useState([])
  const [view, setView] = useState('month')
  const [currentDate, setCurrentDate] = useState(new Date())
  const [branchFilter, setBranchFilter] = useState('all')
  const [loading, setLoading] = useState(true)

  useEffect(() => { fetchData() }, [])

  async function fetchData() {
    setLoading(true)
    const [tasksRes, statusRes] = await Promise.all([
      supabase.from('pipeline_tasks').select('*').not('publish_date', 'is', null).order('publish_date'),
      supabase.from('pipeline_statuses').select('*'),
    ])
    setTasks(tasksRes.data || [])
    setStatuses(statusRes.data || [])
    setLoading(false)
  }

  const filtered = branchFilter === 'all' ? tasks : tasks.filter(t => t.branch_slug === branchFilter)

  const tasksByDate = useMemo(() => {
    const map = {}
    filtered.forEach(t => {
      if (!t.publish_date) return
      if (!map[t.publish_date]) map[t.publish_date] = []
      map[t.publish_date].push(t)
    })
    return map
  }, [filtered])

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()
  const weekStart = getWeekStart(currentDate)

  function prevPeriod() {
    if (view === 'month') setCurrentDate(new Date(year, month - 1, 1))
    else setCurrentDate(addDays(weekStart, -7))
  }
  function nextPeriod() {
    if (view === 'month') setCurrentDate(new Date(year, month + 1, 1))
    else setCurrentDate(addDays(weekStart, 7))
  }
  function goToday() { setCurrentDate(new Date()) }

  const periodLabel = view === 'month'
    ? `${MONTHS[month]} ${year}`
    : `Week of ${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} -- ${addDays(weekStart, 6).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`

  if (loading) return <div style={{ color: 'var(--text-muted)', padding: '40px' }}>Loading calendar...</div>

  return (
    <div>
      <div style={s.headerRow}>
        <div>
          <h1 style={s.pageTitle}>Content Calendar</h1>
          <p style={s.pageDesc}>Publishing schedule across all branches -- see your backlog depth at a glance</p>
        </div>
      </div>

      {/* Backlog meters */}
      <BacklogMeter tasks={tasks} />

      {/* Toolbar */}
      <div style={s.toolbar}>
        <div style={s.toolbarLeft}>
          <button onClick={prevPeriod} style={s.navBtn}>◀</button>
          <button onClick={goToday} style={s.todayBtn}>Today</button>
          <button onClick={nextPeriod} style={s.navBtn}>▶</button>
          <span style={s.periodLabel}>{periodLabel}</span>
        </div>
        <div style={s.toolbarRight}>
          <div style={s.filterGroup}>
            {['all', 'youtube', 'short-form', 'ads-creative', 'production'].map(f => (
              <button key={f} onClick={() => setBranchFilter(f)} style={{ ...s.filterBtn, ...(branchFilter === f ? s.filterBtnActive : {}), ...(f !== 'all' && branchFilter === f ? { background: BRANCH_COLORS[f]?.light, color: BRANCH_COLORS[f]?.bg, borderColor: BRANCH_COLORS[f]?.border } : {}) }}>
                {f === 'all' ? 'All' : BRANCH_COLORS[f]?.label || f}
              </button>
            ))}
          </div>
          <div style={s.viewToggle}>
            <button onClick={() => setView('month')} style={{ ...s.viewBtn, ...(view === 'month' ? s.viewBtnActive : {}) }}>Month</button>
            <button onClick={() => setView('week')} style={{ ...s.viewBtn, ...(view === 'week' ? s.viewBtnActive : {}) }}>Week</button>
          </div>
        </div>
      </div>

      {/* Calendar */}
      {view === 'month'
        ? <MonthView year={year} month={month} tasksByDate={tasksByDate} statuses={statuses} />
        : <WeekView weekStart={weekStart} tasksByDate={tasksByDate} statuses={statuses} />
      }
    </div>
  )
}

// ── STYLES ──
const s = {
  headerRow: { marginBottom: '24px' },
  pageTitle: { fontSize: '24px', fontWeight: '700', color: 'var(--white)', marginBottom: '4px' },
  pageDesc: { fontSize: '13px', color: 'var(--text-muted)' },

  // Backlog meters
  backlogRow: { display: 'flex', gap: '16px', marginBottom: '24px' },
  backlogCard: { flex: 1, padding: '20px', background: 'var(--dark-card)', border: '1px solid var(--dark-border)', borderRadius: '12px' },
  backlogHeader: { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' },
  backlogDot: { width: '10px', height: '10px', borderRadius: '50%' },
  backlogTitle: { fontSize: '13px', fontWeight: '600', color: 'var(--text-secondary)' },
  backlogNumber: { fontSize: '32px', fontWeight: '700', lineHeight: '1.1', marginBottom: '2px' },
  backlogSub: { fontSize: '12px', color: 'var(--text-muted)', marginBottom: '10px' },
  backlogBar: { height: '6px', background: 'var(--dark-border)', borderRadius: '3px', overflow: 'hidden', marginBottom: '6px' },
  backlogFill: { height: '100%', borderRadius: '3px', transition: 'width 0.3s' },
  backlogTarget: { fontSize: '11px', color: 'var(--text-muted)' },

  // Toolbar
  toolbar: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' },
  toolbarLeft: { display: 'flex', alignItems: 'center', gap: '8px' },
  toolbarRight: { display: 'flex', alignItems: 'center', gap: '12px' },
  navBtn: { width: '32px', height: '32px', borderRadius: '8px', background: 'var(--dark-card)', border: '1px solid var(--dark-border)', color: 'var(--text-secondary)', fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  todayBtn: { padding: '6px 14px', borderRadius: '8px', background: 'var(--dark-card)', border: '1px solid var(--dark-border)', color: 'var(--text-secondary)', fontSize: '12px', fontWeight: '500', cursor: 'pointer' },
  periodLabel: { fontSize: '16px', fontWeight: '600', color: 'var(--white)', marginLeft: '8px' },
  filterGroup: { display: 'flex', gap: '4px' },
  filterBtn: { padding: '5px 12px', borderRadius: '6px', background: 'transparent', border: '1px solid var(--dark-border)', color: 'var(--text-muted)', fontSize: '12px', fontWeight: '500', cursor: 'pointer' },
  filterBtnActive: { background: 'rgba(255,255,255,0.06)', color: 'var(--white)', borderColor: 'rgba(255,255,255,0.15)' },
  viewToggle: { display: 'flex', background: 'var(--dark-card)', borderRadius: '8px', border: '1px solid var(--dark-border)', overflow: 'hidden' },
  viewBtn: { padding: '6px 14px', background: 'transparent', border: 'none', color: 'var(--text-muted)', fontSize: '12px', fontWeight: '500', cursor: 'pointer' },
  viewBtnActive: { background: 'rgba(255,255,255,0.08)', color: 'var(--white)' },

  // Month view
  monthGrid: { background: 'var(--dark-card)', border: '1px solid var(--dark-border)', borderRadius: '12px', overflow: 'hidden' },
  monthHeaderRow: { display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: '1px solid var(--dark-border)' },
  monthDayHeader: { padding: '10px', fontSize: '11px', fontWeight: '600', color: 'var(--text-muted)', textTransform: 'uppercase', textAlign: 'center', letterSpacing: '0.5px' },
  monthWeekRow: { display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: '1px solid var(--dark-border)' },
  monthCell: { minHeight: '120px', padding: '6px', borderRight: '1px solid var(--dark-border)', display: 'flex', flexDirection: 'column' },
  monthCellToday: { background: 'rgba(55,202,55,0.04)' },
  monthCellDay: { fontSize: '12px', fontWeight: '500', color: 'var(--text-secondary)', marginBottom: '4px', textAlign: 'right', padding: '2px 4px' },
  monthCellEvents: { display: 'flex', flexDirection: 'column', gap: '3px', flex: 1, overflow: 'hidden' },
  eventMore: { fontSize: '10px', color: 'var(--text-muted)', textAlign: 'center', padding: '2px' },

  // Week view
  weekGrid: { display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '8px', minHeight: 'calc(100vh - 400px)' },
  weekColumn: { background: 'var(--dark-card)', border: '1px solid var(--dark-border)', borderRadius: '10px', padding: '10px', display: 'flex', flexDirection: 'column' },
  weekColumnToday: { borderColor: 'rgba(55,202,55,0.3)', background: 'rgba(55,202,55,0.03)' },
  weekDayHeader: { fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '10px', textAlign: 'center', padding: '4px 0', borderBottom: '1px solid var(--dark-border)' },
  weekEvents: { display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 },
  weekEmpty: { fontSize: '11px', color: 'var(--text-muted)', textAlign: 'center', padding: '16px 0', opacity: 0.5 },

  // Event pill
  eventPill: { padding: '6px 8px', borderRadius: '6px', cursor: 'default', overflow: 'hidden' },
  eventTop: { display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '2px' },
  eventBranch: { fontSize: '9px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.3px' },
  eventStatus: { fontSize: '9px', fontWeight: '600', padding: '1px 5px', borderRadius: '3px', marginLeft: 'auto' },
  eventTitle: { fontSize: '11px', fontWeight: '600', color: 'var(--white)', lineHeight: '1.3', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  eventMeta: { display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '2px' },
  eventTalent: { fontSize: '9px', color: 'var(--text-muted)' },
  eventPlatforms: { fontSize: '9px', color: 'var(--peach)', fontWeight: '600' },
  eventPillar: { fontSize: '9px', fontWeight: '500' },
}
