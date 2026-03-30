import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';
import { useNavigate } from 'react-router-dom';

const GREEN = 'var(--green)';
const CARD = 'var(--dark-card)';
const CARD_LIGHT = 'var(--dark-light)';
const BORDER = 'var(--dark-border)';
const WHITE = 'var(--white)';

const BRANCH_COLORS = { youtube: '#FF0000', 'short-form': '#8B5CF6', 'ads-creative': '#F59E0B', production: '#3B82F6' };
const BRANCH_LABELS = { youtube: 'YouTube', 'short-form': 'Short Form', 'ads-creative': 'Ads/Creative', production: 'Production' };

const STEP_ICONS = { task: '☐', read: '📖', watch: '🎬', navigate: '🔗', quiz: '✏️' };

export default function TrainingCenter() {
  const { profile, isAdmin, branches } = useAuth();
  const navigate = useNavigate();
  const [paths, setPaths] = useState([]);
  const [steps, setSteps] = useState([]);
  const [progress, setProgress] = useState([]);
  const [selectedPath, setSelectedPath] = useState(null);
  const [editingPath, setEditingPath] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, [profile]);

  async function load() {
    const [pRes, sRes, prRes] = await Promise.all([
      supabase.from('training_paths').select('*').eq('is_active', true).order('sort_order'),
      supabase.from('training_steps').select('*, kb_article:knowledge_base(id, title)').order('sort_order'),
      supabase.from('training_progress').select('*').eq('user_id', profile?.id || ''),
    ]);
    if (pRes.data) setPaths(pRes.data);
    if (sRes.data) setSteps(sRes.data);
    if (prRes.data) setProgress(prRes.data);
    setLoading(false);
  }

  // Filter paths to user's branches
  const myPaths = useMemo(() => {
    const mySlugs = branches.map(b => b.slug);
    return paths.filter(p => !p.branch_slug || mySlugs.includes(p.branch_slug));
  }, [paths, branches]);

  function getPathSteps(pathId) { return steps.filter(s => s.path_id === pathId); }

  function isStepComplete(stepId) { return progress.some(p => p.step_id === stepId && p.completed); }

  function getPathProgress(pathId) {
    const ps = getPathSteps(pathId);
    if (ps.length === 0) return 0;
    const done = ps.filter(s => isStepComplete(s.id)).length;
    return Math.round((done / ps.length) * 100);
  }

  async function toggleStep(stepId) {
    const existing = progress.find(p => p.step_id === stepId);
    if (existing) {
      if (existing.completed) {
        await supabase.from('training_progress').update({ completed: false, completed_at: null }).eq('id', existing.id);
      } else {
        await supabase.from('training_progress').update({ completed: true, completed_at: new Date().toISOString() }).eq('id', existing.id);
      }
    } else {
      await supabase.from('training_progress').insert({ user_id: profile.id, step_id: stepId, completed: true, completed_at: new Date().toISOString() });
    }
    load();
  }

  async function savePath(path) {
    if (path.id) {
      await supabase.from('training_paths').update(path).eq('id', path.id);
    } else {
      await supabase.from('training_paths').insert(path);
    }
    setEditingPath(null);
    load();
  }

  async function addStep(pathId) {
    const pathSteps = getPathSteps(pathId);
    await supabase.from('training_steps').insert({
      path_id: pathId,
      title: 'New Step',
      description: '',
      step_type: 'task',
      sort_order: pathSteps.length,
    });
    load();
  }

  async function updateStep(stepId, updates) {
    await supabase.from('training_steps').update(updates).eq('id', stepId);
    load();
  }

  async function deleteStep(stepId) {
    await supabase.from('training_steps').delete().eq('id', stepId);
    load();
  }

  async function deletePath(pathId) {
    if (!confirm('Delete this training path and all its steps?')) return;
    await supabase.from('training_paths').delete().eq('id', pathId);
    setSelectedPath(null);
    load();
  }

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Loading...</div>;

  // Path detail view
  if (selectedPath) {
    const path = paths.find(p => p.id === selectedPath);
    if (!path) { setSelectedPath(null); return null; }
    const pathSteps = getPathSteps(path.id);
    const pct = getPathProgress(path.id);
    const done = pathSteps.filter(s => isStepComplete(s.id)).length;

    return (
      <div style={{ maxWidth: 700, margin: '0 auto', fontFamily: 'Outfit, Arial, sans-serif' }}>
        <button onClick={() => setSelectedPath(null)} style={s.backBtn}>&larr; Back to Training</button>

        <div style={{ ...s.card, marginTop: 12, marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            {path.branch_slug && <span style={{ fontSize: 11, color: BRANCH_COLORS[path.branch_slug], fontWeight: 600 }}>{BRANCH_LABELS[path.branch_slug]}</span>}
            {path.role && <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{path.role}</span>}
          </div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: WHITE, margin: '4px 0 8px' }}>{path.name}</h1>
          {path.description && <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '0 0 12px' }}>{path.description}</p>}

          {/* Progress bar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
            <div style={{ flex: 1, height: 8, background: BORDER, borderRadius: 4 }}>
              <div style={{ height: '100%', width: `${pct}%`, background: pct === 100 ? '#37CA37' : '#F59E0B', borderRadius: 4, transition: 'width 0.3s' }} />
            </div>
            <span style={{ fontSize: 13, fontWeight: 700, color: pct === 100 ? '#37CA37' : WHITE }}>{done}/{pathSteps.length}</span>
          </div>
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{pct}% complete{pct === 100 ? ' -- Training complete!' : ''}</span>
        </div>

        {/* Steps */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {pathSteps.map((step, i) => {
            const done = isStepComplete(step.id);
            return (
              <div key={step.id} style={{ ...s.stepCard, borderLeft: `3px solid ${done ? '#37CA37' : BORDER}`, opacity: done ? 0.75 : 1 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  <button onClick={() => toggleStep(step.id)} style={s.checkbox}>
                    {done ? <span style={{ color: '#37CA37', fontSize: 16 }}>&#10003;</span> : <span style={{ color: 'var(--text-muted)', fontSize: 14 }}>{i + 1}</span>}
                  </button>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 14, fontWeight: 600, color: done ? 'var(--text-muted)' : WHITE, textDecoration: done ? 'line-through' : 'none' }}>{step.title}</span>
                      <span style={{ fontSize: 12 }}>{STEP_ICONS[step.step_type] || ''}</span>
                    </div>
                    {step.description && <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '4px 0 0', lineHeight: 1.5 }}>{step.description}</p>}
                    {step.kb_article && (
                      <button onClick={() => navigate('/knowledge-base?article=' + step.kb_article.id)} style={{ background: 'rgba(55,202,55,0.1)', border: '1px solid rgba(55,202,55,0.2)', borderRadius: 4, color: '#37CA37', padding: '3px 8px', fontSize: 11, fontWeight: 600, cursor: 'pointer', marginTop: 6 }}>
                        Read: {step.kb_article.title} &rarr;
                      </button>
                    )}
                    {step.action_url && (
                      <button onClick={() => navigate(step.action_url)} style={{ background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: 4, color: '#3B82F6', padding: '3px 8px', fontSize: 11, fontWeight: 600, cursor: 'pointer', marginTop: 6 }}>
                        Go to page &rarr;
                      </button>
                    )}
                  </div>
                </div>
                {isAdmin && (
                  <div style={{ display: 'flex', gap: 4, marginTop: 8, paddingTop: 8, borderTop: '1px solid ' + BORDER + '22' }}>
                    <input value={step.title} onChange={e => updateStep(step.id, { title: e.target.value })} style={{ ...s.miniInput, flex: 1 }} />
                    <select value={step.step_type} onChange={e => updateStep(step.id, { step_type: e.target.value })} style={s.miniInput}>
                      <option value="task">Task</option>
                      <option value="read">Read</option>
                      <option value="watch">Watch</option>
                      <option value="navigate">Navigate</option>
                    </select>
                    <button onClick={() => deleteStep(step.id)} style={{ background: 'transparent', border: 'none', color: '#EF4444', fontSize: 12, cursor: 'pointer' }}>&#10005;</button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {isAdmin && (
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <button onClick={() => addStep(path.id)} style={s.addStepBtn}>+ Add Step</button>
            <button onClick={() => deletePath(path.id)} style={{ ...s.addStepBtn, background: 'transparent', border: '1px solid #EF444444', color: '#EF4444' }}>Delete Path</button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', fontFamily: 'Outfit, Arial, sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: WHITE, margin: '0 0 4px' }}>Training Center</h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>Complete your training paths to get up to speed</p>
        </div>
        {isAdmin && <button onClick={() => setEditingPath({ name: '', branch_slug: '', role: '', description: '', sort_order: 0 })} style={s.addBtn}>+ New Path</button>}
      </div>

      {/* Path editor modal */}
      {editingPath && (
        <PathEditor path={editingPath} onSave={savePath} onCancel={() => setEditingPath(null)} />
      )}

      {/* Path cards */}
      {myPaths.length === 0 && (
        <div style={{ ...s.card, textAlign: 'center', padding: 40 }}>
          <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>No training paths available for your branches yet.</p>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
        {myPaths.map(path => {
          const pct = getPathProgress(path.id);
          const pathSteps = getPathSteps(path.id);
          const done = pathSteps.filter(s => isStepComplete(s.id)).length;
          return (
            <div key={path.id} onClick={() => setSelectedPath(path.id)} style={{ ...s.pathCard, borderLeft: `3px solid ${pct === 100 ? '#37CA37' : BRANCH_COLORS[path.branch_slug] || '#6B7280'}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                {path.branch_slug && <span style={{ fontSize: 10, color: BRANCH_COLORS[path.branch_slug], fontWeight: 700 }}>{BRANCH_LABELS[path.branch_slug]}</span>}
                {path.role && <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{path.role}</span>}
                {pct === 100 && <span style={{ fontSize: 10, color: '#37CA37', fontWeight: 700, marginLeft: 'auto' }}>COMPLETE</span>}
              </div>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: WHITE, margin: '0 0 6px' }}>{path.name}</h3>
              {path.description && <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '0 0 10px', lineHeight: 1.4 }}>{path.description}</p>}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ flex: 1, height: 5, background: BORDER, borderRadius: 3 }}>
                  <div style={{ height: '100%', width: `${pct}%`, background: pct === 100 ? '#37CA37' : '#F59E0B', borderRadius: 3 }} />
                </div>
                <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>{done}/{pathSteps.length}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PathEditor({ path, onSave, onCancel }) {
  const [form, setForm] = useState(path);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!form.name.trim()) return;
    setSaving(true);
    await onSave(form);
    setSaving(false);
  }

  return (
    <div style={{ background: 'var(--dark-card)', border: '1px solid var(--dark-border)', borderRadius: 12, padding: 20, marginBottom: 20 }}>
      <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--white)', margin: '0 0 16px' }}>{form.id ? 'Edit Path' : 'New Training Path'}</h3>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
        <div>
          <label style={s.label}>Path Name</label>
          <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} style={s.input} placeholder="e.g. YouTube Editor Onboarding" />
        </div>
        <div>
          <label style={s.label}>Branch</label>
          <select value={form.branch_slug || ''} onChange={e => setForm(p => ({ ...p, branch_slug: e.target.value || null }))} style={s.input}>
            <option value="">General (all branches)</option>
            {Object.entries(BRANCH_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
      </div>
      <div style={{ marginBottom: 12 }}>
        <label style={s.label}>Description</label>
        <textarea value={form.description || ''} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} rows={3} style={{ ...s.input, resize: 'vertical' }} placeholder="What does this training path cover?" />
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={handleSave} disabled={saving || !form.name.trim()} style={{ ...s.saveBtn, opacity: saving ? 0.5 : 1 }}>{saving ? 'Saving...' : 'Save Path'}</button>
        <button onClick={onCancel} style={s.cancelBtn}>Cancel</button>
      </div>
    </div>
  );
}

const s = {
  card: { background: CARD, border: '1px solid ' + BORDER, borderRadius: 12, padding: 20 },
  pathCard: { background: CARD, border: '1px solid ' + BORDER, borderRadius: 10, padding: 16, cursor: 'pointer', transition: 'border-color 0.15s' },
  stepCard: { background: CARD, border: '1px solid ' + BORDER, borderRadius: 8, padding: 14 },
  addBtn: { background: '#37CA37', border: 'none', borderRadius: 8, color: '#000', padding: '8px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer' },
  addStepBtn: { background: CARD_LIGHT, border: '1px solid ' + BORDER, borderRadius: 8, color: 'var(--text-secondary)', padding: '8px 16px', fontSize: 12, fontWeight: 600, cursor: 'pointer' },
  backBtn: { background: 'transparent', border: 'none', color: 'var(--text-muted)', fontSize: 13, cursor: 'pointer', padding: '4px 0' },
  checkbox: { width: 28, height: 28, borderRadius: 8, border: '1px solid ' + BORDER, background: CARD_LIGHT, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 },
  label: { fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 },
  input: { width: '100%', boxSizing: 'border-box', background: CARD_LIGHT, border: '1px solid ' + BORDER, borderRadius: 6, color: WHITE, padding: '8px 10px', fontSize: 13, outline: 'none', fontFamily: 'Outfit, Arial, sans-serif' },
  miniInput: { background: CARD_LIGHT, border: '1px solid ' + BORDER, borderRadius: 4, color: WHITE, padding: '3px 6px', fontSize: 10, outline: 'none', fontFamily: 'Outfit, Arial, sans-serif' },
  saveBtn: { background: '#37CA37', border: 'none', borderRadius: 8, color: '#000', padding: '10px 20px', fontSize: 13, fontWeight: 700, cursor: 'pointer' },
  cancelBtn: { background: 'transparent', border: '1px solid ' + BORDER, borderRadius: 8, color: 'var(--text-muted)', padding: '10px 20px', fontSize: 13, cursor: 'pointer' },
};
