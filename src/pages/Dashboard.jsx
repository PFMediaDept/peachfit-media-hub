import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../lib/AuthContext'
import { supabase } from '../lib/supabase'

export default function Dashboard() {
  const { profile, branches } = useAuth()
  const [announcements, setAnnouncements] = useState([])

  useEffect(() => {
    fetchAnnouncements()
  }, [])

  async function fetchAnnouncements() {
    try {
      const { data } = await supabase
        .from('announcements')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5)
      setAnnouncements(data || [])
    } catch (err) {
      console.error(err)
    }
  }

  const greeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good morning'
    if (hour < 17) return 'Good afternoon'
    return 'Good evening'
  }

  return (
    <div>
      <div style={styles.header}>
        <h1 style={styles.title}>
          {greeting()}, {profile?.full_name?.split(' ')[0] || 'team member'}
        </h1>
        <p style={styles.subtitle}>
          Here's what's happening in the media department.
        </p>
      </div>

      <div style={styles.grid}>
        {branches.map((branch) => (
          <Link
            key={branch.id}
            to={`/branch/${branch.slug}`}
            style={styles.branchCard}
          >
            <div style={{
              ...styles.branchDot,
              background: {
                youtube: '#378ADD',
                'short-form': '#7F77DD',
                'ads-creative': '#D85A30',
                production: '#D4537E',
              }[branch.slug] || 'var(--green)',
            }} />
            <div>
              <div style={styles.branchName}>{branch.name}</div>
              <div style={styles.branchLink}>View pipeline & SOPs</div>
            </div>
          </Link>
        ))}
      </div>

      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>Announcements</h2>
        {announcements.length === 0 ? (
          <div style={styles.empty}>No announcements yet.</div>
        ) : (
          <div style={styles.announcementList}>
            {announcements.map((a) => (
              <div key={a.id} style={styles.announcement}>
                <div style={styles.announcementDate}>
                  {new Date(a.created_at).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                  })}
                </div>
                <div>
                  <div style={styles.announcementTitle}>{a.title}</div>
                  <div style={styles.announcementBody}>{a.body}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={styles.quickActions}>
        <h2 style={styles.sectionTitle}>Quick access</h2>
        <div style={styles.actionGrid}>
          <Link to="/standards" style={styles.actionCard}>
            <div style={styles.actionLabel}>Department standards</div>
            <div style={styles.actionDesc}>Comms rules, SLAs, culture</div>
          </Link>
          <Link to="/assets" style={styles.actionCard}>
            <div style={styles.actionLabel}>Brand assets</div>
            <div style={styles.actionDesc}>Logos, colors, templates</div>
          </Link>
          <Link to="/team" style={styles.actionCard}>
            <div style={styles.actionLabel}>Team directory</div>
            <div style={styles.actionDesc}>Roles, contacts, owners</div>
          </Link>
          <Link to="/links" style={styles.actionCard}>
            <div style={styles.actionLabel}>Quick links</div>
            <div style={styles.actionDesc}>Drive, Slack, tools</div>
          </Link>
        </div>
      </div>
    </div>
  )
}

const styles = {
  header: {
    marginBottom: '32px',
  },
  title: {
    fontSize: '28px',
    fontWeight: '600',
    color: 'var(--white)',
    marginBottom: '4px',
  },
  subtitle: {
    fontSize: '15px',
    color: 'var(--text-secondary)',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
    gap: '12px',
    marginBottom: '40px',
  },
  branchCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
    padding: '18px 20px',
    background: 'var(--dark-card)',
    border: '1px solid var(--dark-border)',
    borderRadius: '12px',
    textDecoration: 'none',
    transition: 'border-color 0.15s',
  },
  branchDot: {
    width: '10px',
    height: '10px',
    borderRadius: '50%',
    flexShrink: 0,
  },
  branchName: {
    fontSize: '15px',
    fontWeight: '500',
    color: 'var(--white)',
  },
  branchLink: {
    fontSize: '12px',
    color: 'var(--text-muted)',
    marginTop: '2px',
  },
  section: {
    marginBottom: '40px',
  },
  sectionTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: 'var(--white)',
    marginBottom: '16px',
  },
  empty: {
    padding: '20px',
    background: 'var(--dark-card)',
    border: '1px solid var(--dark-border)',
    borderRadius: '12px',
    color: 'var(--text-muted)',
    fontSize: '14px',
  },
  announcementList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  announcement: {
    display: 'flex',
    gap: '16px',
    padding: '16px 20px',
    background: 'var(--dark-card)',
    border: '1px solid var(--dark-border)',
    borderRadius: '12px',
  },
  announcementDate: {
    fontSize: '12px',
    color: 'var(--text-muted)',
    minWidth: '50px',
    paddingTop: '2px',
  },
  announcementTitle: {
    fontSize: '14px',
    fontWeight: '500',
    color: 'var(--white)',
    marginBottom: '4px',
  },
  announcementBody: {
    fontSize: '13px',
    color: 'var(--text-secondary)',
    lineHeight: '1.5',
  },
  quickActions: {
    marginBottom: '40px',
  },
  actionGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
    gap: '12px',
  },
  actionCard: {
    padding: '18px 20px',
    background: 'var(--dark-card)',
    border: '1px solid var(--dark-border)',
    borderRadius: '12px',
    textDecoration: 'none',
    transition: 'border-color 0.15s',
  },
  actionLabel: {
    fontSize: '14px',
    fontWeight: '500',
    color: 'var(--white)',
    marginBottom: '4px',
  },
  actionDesc: {
    fontSize: '12px',
    color: 'var(--text-muted)',
  },
}
