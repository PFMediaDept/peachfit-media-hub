import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export function TeamDirectory() {
  const [members, setMembers] = useState([])

  useEffect(() => {
    supabase.from('profiles').select('*, user_branches(branches(name))').order('full_name')
      .then(({ data }) => setMembers(data || []))
  }, [])

  return (
    <div>
      <h1 style={h1}>Team directory</h1>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {members.map(m => (
          <div key={m.id} style={card}>
            {m.avatar_url ? <img src={m.avatar_url} alt="" style={{...avatar, objectFit: "cover"}} /> : <div style={avatar}>{m.full_name?.charAt(0) || "U"}</div>}
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '14px', fontWeight: '500', color: 'var(--white)' }}>
                {m.full_name}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                {m.title || 'Team Member'} -- {m.email}
              </div>
            </div>
            <div style={{ display: 'flex', gap: '4px' }}>
              {m.user_branches?.map((ub, i) => (
                <span key={i} style={badge}>{ub.branches?.name}</span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export function DeptStandards() {
  const [standards, setStandards] = useState([])

  useEffect(() => {
    supabase.from('standards').select('*').order('sort_order')
      .then(({ data }) => setStandards(data || []))
  }, [])

  return (
    <div>
      <h1 style={h1}>Department standards</h1>
      {standards.length === 0 ? (
        <div style={empty}>Standards will be added by admin.</div>
      ) : (
        standards.map(s => (
          <div key={s.id} style={{ ...card, flexDirection: 'column', gap: '6px', marginBottom: '8px' }}>
            <div style={{ fontSize: '15px', fontWeight: '500', color: 'var(--white)' }}>{s.title}</div>
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>{s.body}</div>
          </div>
        ))
      )}
    </div>
  )
}

export function BrandAssets() {
  const [assets, setAssets] = useState([])

  useEffect(() => {
    supabase.from('brand_assets').select('*').order('category').order('title')
      .then(({ data }) => setAssets(data || []))
  }, [])

  const grouped = assets.reduce((acc, a) => {
    const cat = a.category || 'General'
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(a)
    return acc
  }, {})

  return (
    <div>
      <h1 style={h1}>Brand assets</h1>
      {Object.keys(grouped).length === 0 ? (
        <div style={empty}>Brand assets will be added by admin.</div>
      ) : (
        Object.entries(grouped).map(([cat, items]) => (
          <div key={cat} style={{ marginBottom: '24px' }}>
            <h3 style={catLabel}>{cat}</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '8px' }}>
              {items.map(a => (
                <a key={a.id} href={a.url} target="_blank" rel="noopener noreferrer" style={{ ...card, textDecoration: 'none' }}>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: '500', color: 'var(--white)' }}>{a.title}</div>
                    {a.description && <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>{a.description}</div>}
                  </div>
                </a>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  )
}

export function QuickLinks() {
  const [links, setLinks] = useState([])

  useEffect(() => {
    supabase.from('quick_links').select('*').order('category').order('title')
      .then(({ data }) => setLinks(data || []))
  }, [])

  const grouped = links.reduce((acc, l) => {
    const cat = l.category || 'General'
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(l)
    return acc
  }, {})

  return (
    <div>
      <h1 style={h1}>Quick links</h1>
      {Object.keys(grouped).length === 0 ? (
        <div style={empty}>Quick links will be added by admin.</div>
      ) : (
        Object.entries(grouped).map(([cat, items]) => (
          <div key={cat} style={{ marginBottom: '24px' }}>
            <h3 style={catLabel}>{cat}</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {items.map(l => (
                <a key={l.id} href={l.url} target="_blank" rel="noopener noreferrer" style={{ ...card, textDecoration: 'none' }}>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: '500', color: 'var(--green)' }}>{l.title}</div>
                    {l.description && <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>{l.description}</div>}
                  </div>
                </a>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  )
}

const h1 = { fontSize: '24px', fontWeight: '600', color: 'var(--white)', marginBottom: '24px' }
const card = { display: 'flex', alignItems: 'center', gap: '14px', padding: '14px 18px', background: 'var(--dark-card)', border: '1px solid var(--dark-border)', borderRadius: '10px' }
const avatar = { width: '36px', height: '36px', borderRadius: '8px', background: 'rgba(255,255,255,0.06)', color: 'var(--text-secondary)', fontSize: '14px', fontWeight: '600', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }
const badge = { padding: '2px 8px', background: 'rgba(255,255,255,0.04)', borderRadius: '4px', fontSize: '11px', color: 'var(--text-muted)' }
const empty = { padding: '24px', background: 'var(--dark-card)', border: '1px solid var(--dark-border)', borderRadius: '12px', color: 'var(--text-muted)', fontSize: '14px' }
const catLabel = { fontSize: '13px', fontWeight: '600', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px' }
