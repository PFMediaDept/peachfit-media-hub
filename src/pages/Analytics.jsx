import React from "react";
import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';

const GREEN = 'var(--green)';
const CARD = 'var(--dark-card)';
const CARD_LIGHT = 'var(--dark-light)';
const BORDER = 'var(--dark-border)';
const WHITE = 'var(--white)';

export default function Analytics() {
  const [videos, setVideos] = useState([]);
  const [channel, setChannel] = useState(null);
  const [channelHistory, setChannelHistory] = useState([]);
  const [view, setView] = useState('videos');
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [sortBy, setSortBy] = useState('publish_date');
  const [sortDir, setSortDir] = useState('desc');

  useEffect(() => { load(); }, []);

  async function load() {
    const [vRes, cRes, chRes] = await Promise.all([
      supabase.from('video_analytics').select('*').order('publish_date', { ascending: false }),
      supabase.from('channel_analytics').select('*').order('snapshot_date', { ascending: false }).limit(1),
      supabase.from('channel_analytics').select('*').order('snapshot_date', { ascending: false }).limit(12),
    ]);
    if (vRes.data) setVideos(vRes.data);
    if (cRes.data?.[0]) setChannel(cRes.data[0]);
    if (chRes.data) setChannelHistory(chRes.data);
  }

  // Sorting
  const sorted = useMemo(() => {
    return [...videos].sort((a, b) => {
      let av = a[sortBy], bv = b[sortBy];
      if (av == null) return 1; if (bv == null) return -1;
      if (typeof av === 'string') return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
      return sortDir === 'asc' ? av - bv : bv - av;
    });
  }, [videos, sortBy, sortDir]);

  // Averages
  const avgs = useMemo(() => {
    const v = videos.filter(x => x.ctr_current != null);
    if (v.length === 0) return { ctr: 0, avd: 0, retention: 0, views: 0 };
    return {
      ctr: (v.reduce((s, x) => s + (x.ctr_current || 0), 0) / v.length).toFixed(1),
      avd: (v.reduce((s, x) => s + (x.avd_current || 0), 0) / v.length).toFixed(0),
      retention: (v.reduce((s, x) => s + (x.retention_current || 0), 0) / v.length).toFixed(1),
      views: Math.round(v.reduce((s, x) => s + (x.views_current || 0), 0) / v.length),
    };
  }, [videos]);

  function toggleSort(col) {
    if (sortBy === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortBy(col); setSortDir('desc'); }
  }

  function SortIcon({ col }) {
    if (sortBy !== col) return <span style={{ color: 'var(--text-muted)', fontSize: 10 }}>↕</span>;
    return <span style={{ color: '#37CA37', fontSize: 10 }}>{sortDir === 'asc' ? '↑' : '↓'}</span>;
  }

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', fontFamily: 'Outfit, Arial, sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: WHITE, margin: '0 0 4px' }}>Analytics</h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>{videos.length} videos tracked</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <div style={s.toggleGroup}>
            <button onClick={() => setView('videos')} style={{ ...s.toggleBtn, ...(view === 'videos' ? s.toggleActive : {}) }}>Videos</button>
            <button onClick={() => setView('channel')} style={{ ...s.toggleBtn, ...(view === 'channel' ? s.toggleActive : {}) }}>Channel</button>
          </div>
          <button onClick={() => setShowAdd(true)} style={s.addBtn}>+ Add Video</button>
        </div>
      </div>

      {/* Channel overview cards (always visible) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10, marginBottom: 24 }}>
        <MetricCard label="Avg CTR" value={avgs.ctr + '%'} color={parseFloat(avgs.ctr) >= 5 ? '#10B981' : parseFloat(avgs.ctr) >= 3 ? '#F59E0B' : '#EF4444'} />
        <MetricCard label="Avg AVD" value={avgs.avd + 's'} color={WHITE} />
        <MetricCard label="Avg Retention" value={avgs.retention + '%'} color={parseFloat(avgs.retention) >= 40 ? '#10B981' : parseFloat(avgs.retention) >= 25 ? '#F59E0B' : '#EF4444'} />
        <MetricCard label="Avg Views" value={formatNum(avgs.views)} color={WHITE} />
        {channel && <>
          <MetricCard label="Subscribers" value={formatNum(channel.subscribers)} color={WHITE} />
          <MetricCard label="Views (28d)" value={formatNum(channel.views_last_28d)} color={WHITE} />
          <MetricCard label="Watch Hours (28d)" value={formatNum(Math.round(channel.watch_hours_last_28d || 0))} color={WHITE} />
          <MetricCard label="New Subs (28d)" value={formatNum(channel.new_subscribers_last_28d)} color='#37CA37' />
        </>}
      </div>

      {/* Videos view */}
      {view === 'videos' && (
        <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, overflow: 'hidden' }}>
          {/* Table header */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 0.7fr 0.7fr 0.7fr 0.7fr 0.8fr 0.7fr', padding: '12px 16px', borderBottom: `1px solid ${BORDER}`, gap: 8 }}>
            {[
              ['video_title', 'Video'],
              ['publish_date', 'Published'],
              ['views_current', 'Views'],
              ['ctr_current', 'CTR'],
              ['avd_current', 'AVD'],
              ['retention_current', 'Retention'],
              ['revenue_attributed', 'Revenue'],
            ].map(([col, label]) => (
              <button key={col} onClick={() => toggleSort(col)} style={s.thBtn}>
                <span>{label}</span> <SortIcon col={col} />
              </button>
            ))}
          </div>

          {/* Rows */}
          {sorted.length === 0 && (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: 14 }}>
              No videos tracked yet. Click "+ Add Video" to start.
            </div>
          )}
          {sorted.map(v => (
            <div key={v.id} onClick={() => setEditingId(editingId === v.id ? null : v.id)} style={{
              display: 'grid', gridTemplateColumns: '2fr 0.7fr 0.7fr 0.7fr 0.7fr 0.8fr 0.7fr',
              padding: '12px 16px', borderBottom: `1px solid ${BORDER}22`, gap: 8,
              cursor: 'pointer', transition: 'background 0.15s',
              background: editingId === v.id ? 'var(--dark-light)' : 'transparent',
            }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: WHITE, lineHeight: 1.3 }}>{v.video_title}</div>
                <div style={{ display: 'flex', gap: 6, marginTop: 3 }}>
                  {v.content_pillar && <span style={{ fontSize: 10, color: 'var(--text-muted)', background: 'var(--dark-light)', padding: '1px 6px', borderRadius: 3 }}>{v.content_pillar}</span>}
                  {v.content_tier && <span style={{ fontSize: 10, color: 'var(--text-muted)', background: 'var(--dark-light)', padding: '1px 6px', borderRadius: 3 }}>{v.content_tier}</span>}
                </div>
              </div>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{v.publish_date ? new Date(v.publish_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '--'}</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: WHITE }}>{v.views_current != null ? formatNum(v.views_current) : '--'}</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: ctrColor(v.ctr_current) }}>{v.ctr_current != null ? v.ctr_current + '%' : '--'}</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: WHITE }}>{v.avd_current != null ? formatDuration(v.avd_current) : '--'}</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: retColor(v.retention_current) }}>{v.retention_current != null ? v.retention_current + '%' : '--'}</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: v.revenue_attributed > 0 ? '#37CA37' : 'var(--text-muted)' }}>{v.revenue_attributed != null ? '$' + formatNum(v.revenue_attributed) : '--'}</span>
            </div>
          ))}
          {sorted.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 0.7fr 0.7fr 0.7fr 0.7fr 0.8fr 0.7fr', padding: '12px 16px', borderTop: `1px solid ${BORDER}`, gap: 8, background: 'var(--dark-light)' }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)' }}>AVERAGES</span>
              <span></span>
              <span style={{ fontSize: 12, fontWeight: 700, color: WHITE }}>{formatNum(avgs.views)}</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: ctrColor(parseFloat(avgs.ctr)) }}>{avgs.ctr}%</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: WHITE }}>{avgs.avd}s</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: retColor(parseFloat(avgs.retention)) }}>{avgs.retention}%</span>
              <span></span>
            </div>
          )}
        </div>
      )}

      {/* Expanded video edit */}
      {editingId && (
        <VideoEditor
          video={videos.find(v => v.id === editingId)}
          onClose={() => setEditingId(null)}
          onSave={() => { setEditingId(null); load(); }}
        />
      )}

      {/* Channel view */}
      {view === 'channel' && (
        <div>
          <div style={{ ...s.card, marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: WHITE, margin: 0 }}>Channel Snapshots</h2>
              <ChannelAddBtn onSave={load} />
            </div>
            {channelHistory.length === 0 && <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>No snapshots yet. Add one to start tracking.</div>}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 0.8fr 0.8fr 0.8fr 0.8fr 0.8fr', gap: 8 }}>
              {channelHistory.length > 0 && <>
                <span style={s.th}>Date</span><span style={s.th}>Subs</span><span style={s.th}>Views (28d)</span>
                <span style={s.th}>Watch Hrs</span><span style={s.th}>Avg CTR</span><span style={s.th}>New Subs</span>
              </>}
              {channelHistory.map(c => (
                <React.Fragment key={c.id}>
                  <span style={s.td}>{new Date(c.snapshot_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                  <span style={s.td}>{formatNum(c.subscribers)}</span>
                  <span style={s.td}>{formatNum(c.views_last_28d)}</span>
                  <span style={s.td}>{formatNum(Math.round(c.watch_hours_last_28d || 0))}</span>
                  <span style={{ ...s.td, color: ctrColor(c.avg_ctr) }}>{c.avg_ctr != null ? c.avg_ctr + '%' : '--'}</span>
                  <span style={{ ...s.td, color: '#37CA37' }}>{formatNum(c.new_subscribers_last_28d)}</span>
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Add video modal */}
      {showAdd && <AddVideoModal onClose={() => setShowAdd(false)} onSave={() => { setShowAdd(false); load(); }} />}
    </div>
  );
}

/* ── Video Editor (expanded row) ── */
function VideoEditor({ video, onClose, onSave }) {
  const [form, setForm] = useState(video);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    const { id, created_at, ...updates } = form;
    await supabase.from('video_analytics').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', id);
    setSaving(false);
    onSave();
  }

  function F({ label, field, type = 'text', suffix = '' }) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <label style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 600 }}>{label}</label>
        <input type={type} value={form[field] ?? ''} onChange={e => setForm(p => ({ ...p, [field]: type === 'number' ? (e.target.value ? parseFloat(e.target.value) : null) : e.target.value }))} style={s.input} />
      </div>
    );
  }

  return (
    <div style={{ ...s.card, marginTop: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--white)', margin: 0 }}>Edit: {form.video_title}</h3>
        <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', fontSize: 18, cursor: 'pointer' }}>&times;</button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 16 }}>
        <div style={{ gridColumn: 'span 2' }}><F label="Video Title" field="video_title" /></div>
        <F label="YouTube ID" field="youtube_video_id" />
        <F label="Publish Date" field="publish_date" type="date" />
      </div>
      <h4 style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '0 0 8px', fontWeight: 700 }}>DAY 1 METRICS</h4>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 16 }}>
        <F label="Views" field="views_day1" type="number" /><F label="CTR %" field="ctr_day1" type="number" />
        <F label="AVD (sec)" field="avd_day1" type="number" /><F label="Retention %" field="retention_day1" type="number" />
      </div>
      <h4 style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '0 0 8px', fontWeight: 700 }}>DAY 7 METRICS</h4>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 16 }}>
        <F label="Views" field="views_day7" type="number" /><F label="CTR %" field="ctr_day7" type="number" />
        <F label="AVD (sec)" field="avd_day7" type="number" /><F label="Retention %" field="retention_day7" type="number" />
      </div>
      <h4 style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '0 0 8px', fontWeight: 700 }}>DAY 30 METRICS</h4>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 16 }}>
        <F label="Views" field="views_day30" type="number" /><F label="CTR %" field="ctr_day30" type="number" />
        <F label="AVD (sec)" field="avd_day30" type="number" /><F label="Retention %" field="retention_day30" type="number" />
      </div>
      <h4 style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '0 0 8px', fontWeight: 700 }}>CURRENT / LATEST</h4>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 16 }}>
        <F label="Views" field="views_current" type="number" /><F label="CTR %" field="ctr_current" type="number" />
        <F label="AVD (sec)" field="avd_current" type="number" /><F label="Retention %" field="retention_current" type="number" />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 16 }}>
        <F label="Likes" field="likes" type="number" /><F label="Comments" field="comments_count" type="number" />
        <F label="Shares" field="shares" type="number" /><F label="Revenue $" field="revenue_attributed" type="number" />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 16 }}>
        <F label="Content Pillar" field="content_pillar" /><F label="Content Tier" field="content_tier" />
        <F label="Duration (sec)" field="video_duration" type="number" />
      </div>
      <div style={{ marginBottom: 16 }}>
        <label style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 600, display: 'block', marginBottom: 4 }}>Notes</label>
        <textarea value={form.notes || ''} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} rows={2} style={{ ...s.input, resize: 'vertical', width: '100%', boxSizing: 'border-box' }} />
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={handleSave} disabled={saving} style={s.saveBtn}>{saving ? 'Saving...' : 'Save Changes'}</button>
        <button onClick={onClose} style={s.cancelBtn}>Cancel</button>
      </div>
    </div>
  );
}

/* ── Add Video Modal ── */
function AddVideoModal({ onClose, onSave }) {
  const [title, setTitle] = useState('');
  const [pubDate, setPubDate] = useState('');
  const [ytId, setYtId] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleAdd() {
    if (!title.trim()) return;
    setSaving(true);
    await supabase.from('video_analytics').insert({
      video_title: title.trim(),
      publish_date: pubDate || null,
      youtube_video_id: ytId || null,
    });
    setSaving(false);
    onSave();
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={onClose}>
      <div style={{ background: 'var(--dark)', border: `1px solid ${BORDER}`, borderRadius: 12, padding: 24, width: 400, boxShadow: '0 16px 48px rgba(0,0,0,0.5)' }} onClick={e => e.stopPropagation()}>
        <h3 style={{ fontSize: 16, fontWeight: 700, color: WHITE, margin: '0 0 16px' }}>Add Video</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600, display: 'block', marginBottom: 4 }}>Video Title</label>
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Weight Loss Haul" style={s.input} autoFocus />
          </div>
          <div>
            <label style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600, display: 'block', marginBottom: 4 }}>Publish Date</label>
            <input type="date" value={pubDate} onChange={e => setPubDate(e.target.value)} style={s.input} />
          </div>
          <div>
            <label style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600, display: 'block', marginBottom: 4 }}>YouTube Video ID (optional)</label>
            <input value={ytId} onChange={e => setYtId(e.target.value)} placeholder="dQw4w9WgXcQ" style={s.input} />
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
          <button onClick={handleAdd} disabled={!title.trim() || saving} style={{ ...s.saveBtn, opacity: !title.trim() || saving ? 0.5 : 1 }}>{saving ? 'Adding...' : 'Add Video'}</button>
          <button onClick={onClose} style={s.cancelBtn}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

/* ── Channel Add Button ── */
function ChannelAddBtn({ onSave }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ subscribers: '', total_views: '', views_last_28d: '', watch_hours_last_28d: '', avg_ctr: '', avg_avd: '', new_subscribers_last_28d: '' });
  const [saving, setSaving] = useState(false);

  async function handleAdd() {
    setSaving(true);
    const data = {};
    Object.entries(form).forEach(([k, v]) => { if (v !== '') data[k] = parseFloat(v); });
    await supabase.from('channel_analytics').insert(data);
    setSaving(false);
    setOpen(false);
    setForm({ subscribers: '', total_views: '', views_last_28d: '', watch_hours_last_28d: '', avg_ctr: '', avg_avd: '', new_subscribers_last_28d: '' });
    onSave();
  }

  if (!open) return <button onClick={() => setOpen(true)} style={s.addBtn}>+ Snapshot</button>;

  return (
    <div style={{ background: 'var(--dark-light)', border: `1px solid ${BORDER}`, borderRadius: 8, padding: 16, marginTop: 12 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 12 }}>
        {[['Subscribers', 'subscribers'], ['Total Views', 'total_views'], ['Views (28d)', 'views_last_28d'], ['Watch Hrs (28d)', 'watch_hours_last_28d'], ['Avg CTR %', 'avg_ctr'], ['Avg AVD (sec)', 'avg_avd'], ['New Subs (28d)', 'new_subscribers_last_28d']].map(([label, key]) => (
          <div key={key}>
            <label style={{ fontSize: 10, color: 'var(--text-secondary)', fontWeight: 600, display: 'block', marginBottom: 3 }}>{label}</label>
            <input type="number" value={form[key]} onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))} style={s.input} />
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={handleAdd} disabled={saving} style={s.saveBtn}>{saving ? 'Saving...' : 'Save Snapshot'}</button>
        <button onClick={() => setOpen(false)} style={s.cancelBtn}>Cancel</button>
      </div>
    </div>
  );
}

/* ── Metric Card ── */
function MetricCard({ label, value, color }) {
  return (
    <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 10, padding: '12px 16px' }}>
      <span style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600, display: 'block', marginBottom: 4 }}>{label}</span>
      <span style={{ fontSize: 22, fontWeight: 700, color }}>{value}</span>
    </div>
  );
}

/* ── Helpers ── */
function formatNum(n) { if (n == null) return '--'; if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M'; if (n >= 1000) return (n / 1000).toFixed(1) + 'K'; return n.toString(); }
function formatDuration(sec) { if (sec == null) return '--'; const m = Math.floor(sec / 60); const s2 = Math.round(sec % 60); return m + ':' + String(s2).padStart(2, '0'); }
function ctrColor(v) { if (v == null) return 'var(--text-muted)'; if (v >= 8) return '#10B981'; if (v >= 5) return '#37CA37'; if (v >= 3) return '#F59E0B'; return '#EF4444'; }
function retColor(v) { if (v == null) return 'var(--text-muted)'; if (v >= 50) return '#10B981'; if (v >= 35) return '#37CA37'; if (v >= 25) return '#F59E0B'; return '#EF4444'; }

/* ── Styles ── */
const s = {
  toggleGroup: { display: 'flex', background: CARD_LIGHT, borderRadius: 8, border: `1px solid ${BORDER}`, overflow: 'hidden' },
  toggleBtn: { background: 'transparent', border: 'none', color: 'var(--text-muted)', padding: '8px 16px', cursor: 'pointer', fontSize: 13, fontWeight: 600 },
  toggleActive: { background: 'rgba(55,202,55,0.15)', color: '#37CA37' },
  addBtn: { background: '#37CA37', border: 'none', borderRadius: 8, color: '#000', padding: '8px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer' },
  card: { background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 20 },
  input: { background: CARD_LIGHT, border: `1px solid ${BORDER}`, borderRadius: 6, color: WHITE, padding: '7px 10px', fontSize: 12, outline: 'none', fontFamily: 'Outfit, Arial, sans-serif', width: '100%', boxSizing: 'border-box' },
  thBtn: { background: 'transparent', border: 'none', color: 'var(--text-secondary)', fontSize: 11, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, textTransform: 'uppercase', letterSpacing: '0.03em' },
  th: { fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', padding: '8px 0' },
  td: { fontSize: 13, color: WHITE, padding: '8px 0' },
  saveBtn: { background: '#37CA37', border: 'none', borderRadius: 8, color: '#000', padding: '10px 20px', fontSize: 13, fontWeight: 700, cursor: 'pointer' },
  cancelBtn: { background: 'transparent', border: `1px solid ${BORDER}`, borderRadius: 8, color: 'var(--text-muted)', padding: '10px 20px', fontSize: 13, cursor: 'pointer' },
};
