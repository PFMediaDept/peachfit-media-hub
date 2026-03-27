import { useState, useEffect } from 'react'
import { useParams, Outlet, NavLink } from 'react-router-dom'
import { useAuth } from '../lib/AuthContext'
import { supabase } from '../lib/supabase'

export default function Branch() {
  const { slug } = useParams()
  const { branches } = useAuth()
  const branch = branches.find(b => b.slug === slug)

  if (!branch) {
    return (
      <div style={{ color: 'var(--text-muted)', padding: '40px' }}>
        You don't have access to this branch.
      </div>
    )
  }

  const color = {
    youtube: '#FF0000',
    'short-form': '#8B5CF6',
    'ads-creative': '#F59E0B',
    production: '#3B82F6',
  }[branch.slug] || 'var(--green)'

  return (
    <div>
      <div style={styles.header}>
        <div style={{ ...styles.indicator, background: color }} />
        <h1 style={styles.title}>{branch.name}</h1>
      </div>
      <Outlet context={{ branch, color }} />
    </div>
  )
}

export function BranchOverview() {
  const { slug } = useParams()

  return (
    <div style={styles.overviewGrid}>
      <NavLink to={`/branch/${slug}/pipeline`} style={styles.card}>
        <div style={styles.cardTitle}>Pipeline</div>
        <div style={styles.cardDesc}>View your content pipeline and active tasks</div>
      </NavLink>
      <NavLink to={`/branch/${slug}/sops`} style={styles.card}>
        <div style={styles.cardTitle}>SOPs & training</div>
        <div style={styles.cardDesc}>Standard operating procedures and Loom walkthroughs</div>
      </NavLink>
      <NavLink to={`/branch/${slug}/onboarding`} style={styles.card}>
        <div style={styles.cardTitle}>Onboarding</div>
        <div style={styles.cardDesc}>Your onboarding checklist and progress</div>
      </NavLink>
    </div>
  )
}

export function BranchPipeline() {
  const { slug } = useParams()
  const [embedUrl, setEmbedUrl] = useState(null)

  useEffect(() => {
    fetchEmbed()
  }, [slug])

  async function fetchEmbed() {
    try {
      const { data } = await supabase
        .from('branch_settings')
        .select('clickup_embed_url')
        .eq('branch_slug', slug)
        .single()
      setEmbedUrl(data?.clickup_embed_url || null)
    } catch (err) {
      console.error(err)
    }
  }

  if (!embedUrl) {
    return (
      <div style={styles.emptyState}>
        Pipeline embed not configured yet. Admin can add the ClickUp embed URL in settings.
      </div>
    )
  }

  return (
    <div style={styles.embedContainer}>
      <iframe
        src={embedUrl}
        style={styles.iframe}
        title="Content Pipeline"
        allow="clipboard-write"
      />
    </div>
  )
}

export function BranchSOPs() {
  const { slug } = useParams()
  const [sops, setSops] = useState([])
  const [filter, setFilter] = useState('')

  useEffect(() => {
    fetchSOPs()
  }, [slug])

  async function fetchSOPs() {
    try {
      const { data } = await supabase
        .from('sops')
        .select('*')
        .contains('branch_slugs', [slug])
        .order('category')
        .order('title')
      setSops(data || [])
    } catch (err) {
      console.error(err)
    }
  }

  const filtered = sops.filter(s =>
    s.title.toLowerCase().includes(filter.toLowerCase()) ||
    s.category.toLowerCase().includes(filter.toLowerCase())
  )

  const grouped = filtered.reduce((acc, sop) => {
    const cat = sop.category || 'General'
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(sop)
    return acc
  }, {})

  return (
    <div>
      <input
        type="text"
        placeholder="Search SOPs..."
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        style={styles.search}
      />

      {Object.keys(grouped).length === 0 ? (
        <div style={styles.emptyState}>No SOPs found for this branch yet.</div>
      ) : (
        Object.entries(grouped).map(([category, items]) => (
          <div key={category} style={{ marginBottom: '24px' }}>
            <h3 style={styles.categoryTitle}>{category}</h3>
            <div style={styles.sopList}>
              {items.map((sop) => (
                <div key={sop.id} style={styles.sopCard}>
                  <div style={styles.sopTitle}>{sop.title}</div>
                  {sop.description && (
                    <div style={styles.sopDesc}>{sop.description}</div>
                  )}
                  {sop.loom_url && (
                    <div style={{marginTop:12,borderRadius:8,overflow:'hidden',border:'1px solid var(--dark-border)'}}>
                      <iframe
                        src={sop.loom_url.replace('/share/', '/embed/')}
                        frameBorder="0"
                        allowFullScreen
                        style={{width:'100%',height:280,display:'block'}}
                      />
                    </div>
                  )}
                  <div style={styles.sopLinks}>
                    {sop.doc_url && (
                      <a href={sop.doc_url} target="_blank" rel="noopener noreferrer" style={styles.sopLink}>
                        Google Doc
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  )
}

export function BranchOnboarding() {
  const { slug } = useParams()
  const { user } = useAuth()
  const [tasks, setTasks] = useState([])

  useEffect(() => {
    fetchOnboarding()
  }, [slug])

  async function fetchOnboarding() {
    try {
      const { data } = await supabase
        .from('onboarding_tasks')
        .select('*, onboarding_progress(completed)')
        .eq('branch_slug', slug)
        .order('sort_order')
      setTasks(data || [])
    } catch (err) {
      console.error(err)
    }
  }

  async function toggleTask(taskId, completed) {
    try {
      if (completed) {
        await supabase
          .from('onboarding_progress')
          .delete()
          .eq('task_id', taskId)
          .eq('user_id', user.id)
      } else {
        await supabase
          .from('onboarding_progress')
          .insert({ task_id: taskId, user_id: user.id, completed: true })
      }
      fetchOnboarding()
    } catch (err) {
      console.error(err)
    }
  }

  const completedCount = tasks.filter(t =>
    t.onboarding_progress?.some(p => p.completed)
  ).length

  return (
    <div>
      <div style={styles.progressBar}>
        <div style={styles.progressLabel}>
          {completedCount} of {tasks.length} completed
        </div>
        <div style={styles.progressTrack}>
          <div style={{
            ...styles.progressFill,
            width: tasks.length > 0
              ? `${(completedCount / tasks.length) * 100}%`
              : '0%',
          }} />
        </div>
      </div>

      {tasks.length === 0 ? (
        <div style={styles.emptyState}>No onboarding tasks set up for this branch yet.</div>
      ) : (
        <div style={styles.taskList}>
          {tasks.map((task) => {
            const done = task.onboarding_progress?.some(p => p.completed)
            return (
              <div
                key={task.id}
                style={{
                  ...styles.taskCard,
                  opacity: done ? 0.6 : 1,
                }}
                onClick={() => toggleTask(task.id, done)}
              >
                <div style={{
                  ...styles.checkbox,
                  background: done ? 'var(--green)' : 'transparent',
                  borderColor: done ? 'var(--green)' : 'var(--dark-border)',
                }}>
                  {done && (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--black)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </div>
                <div>
                  <div style={{
                    ...styles.taskTitle,
                    textDecoration: done ? 'line-through' : 'none',
                  }}>{task.title}</div>
                  {task.description && (
                    <div style={styles.taskDesc}>{task.description}</div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

const styles = {
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '28px',
  },
  indicator: {
    width: '10px',
    height: '10px',
    borderRadius: '50%',
  },
  title: {
    fontSize: '24px',
    fontWeight: '600',
    color: 'var(--white)',
  },
  overviewGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
    gap: '12px',
  },
  card: {
    padding: '24px',
    background: 'var(--dark-card)',
    border: '1px solid var(--dark-border)',
    borderRadius: '12px',
    textDecoration: 'none',
  },
  cardTitle: {
    fontSize: '15px',
    fontWeight: '500',
    color: 'var(--white)',
    marginBottom: '6px',
  },
  cardDesc: {
    fontSize: '13px',
    color: 'var(--text-muted)',
    lineHeight: '1.4',
  },
  embedContainer: {
    borderRadius: '12px',
    overflow: 'hidden',
    border: '1px solid var(--dark-border)',
    height: 'calc(100vh - 180px)',
  },
  iframe: {
    width: '100%',
    height: '100%',
    border: 'none',
  },
  search: {
    width: '100%',
    maxWidth: '400px',
    padding: '10px 14px',
    background: 'var(--dark-card)',
    border: '1px solid var(--dark-border)',
    borderRadius: '10px',
    color: 'var(--white)',
    fontSize: '14px',
    outline: 'none',
    marginBottom: '24px',
  },
  categoryTitle: {
    fontSize: '13px',
    fontWeight: '600',
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    marginBottom: '10px',
  },
  sopList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  sopCard: {
    padding: '16px 20px',
    background: 'var(--dark-card)',
    border: '1px solid var(--dark-border)',
    borderRadius: '10px',
  },
  sopTitle: {
    fontSize: '14px',
    fontWeight: '500',
    color: 'var(--white)',
    marginBottom: '4px',
  },
  sopDesc: {
    fontSize: '13px',
    color: 'var(--text-secondary)',
    marginBottom: '8px',
  },
  sopLinks: {
    display: 'flex',
    gap: '12px',
  },
  sopLink: {
    fontSize: '12px',
    fontWeight: '500',
    color: 'var(--green)',
    textDecoration: 'none',
  },
  emptyState: {
    padding: '24px',
    background: 'var(--dark-card)',
    border: '1px solid var(--dark-border)',
    borderRadius: '12px',
    color: 'var(--text-muted)',
    fontSize: '14px',
  },
  progressBar: {
    marginBottom: '24px',
  },
  progressLabel: {
    fontSize: '13px',
    color: 'var(--text-secondary)',
    marginBottom: '8px',
  },
  progressTrack: {
    height: '6px',
    background: 'var(--dark-border)',
    borderRadius: '3px',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    background: 'var(--green)',
    borderRadius: '3px',
    transition: 'width 0.3s ease',
  },
  taskList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  taskCard: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '14px',
    padding: '14px 18px',
    background: 'var(--dark-card)',
    border: '1px solid var(--dark-border)',
    borderRadius: '10px',
    cursor: 'pointer',
    transition: 'opacity 0.15s',
  },
  checkbox: {
    width: '22px',
    height: '22px',
    borderRadius: '6px',
    border: '2px solid',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginTop: '1px',
  },
  taskTitle: {
    fontSize: '14px',
    fontWeight: '500',
    color: 'var(--white)',
  },
  taskDesc: {
    fontSize: '12px',
    color: 'var(--text-muted)',
    marginTop: '2px',
  },
}
