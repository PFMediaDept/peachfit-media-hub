import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';
import { useNavigate } from 'react-router-dom';

const GREEN = '#37CA37';
const CARD = 'var(--dark-card)';
const CARD_LIGHT = 'var(--dark-light)';
const BORDER = 'var(--dark-border)';
const WHITE = 'var(--white)';

const BRANCH_COLORS = { youtube: '#FF0000', 'short-form': '#8B5CF6', 'ads-creative': '#F59E0B', production: '#3B82F6' };
const BRANCH_LABELS = { youtube: 'YouTube', 'short-form': 'Short Form', 'ads-creative': 'Ads/Creative', production: 'Production' };

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

  const myPaths = useMemo(() => {
    const mySlugs = branches.map(b => b.slug);
    return paths.filter(p => !p.branch_slug || mySlugs.includes(p.branch_slug));
  }, [paths, branches]);

  function getPathSteps(pathId) { return steps.filter(s => s.path_id === pathId); }
  function isStepComplete(stepId) { return progress.some(p => p.step_id === stepId && p.completed); }

  function isStepUnlocked(pathId, stepIndex) {
    if (stepIndex === 0) return true;
    const pathSteps = getPathSteps(pathId);
    const prevStep = pathSteps[stepIndex - 1];
    return prevStep ? isStepComplete(prevStep.id) : true;
  }

  function getPathProgress(pathId) {
    const ps = getPathSteps(pathId);
    if (ps.length === 0) return 0;
    return Math.round((ps.filter(s => isStepComplete(s.id)).length / ps.length) * 100);
  }

  function getNextStep(pathId) {
    const ps = getPathSteps(pathId);
    for (let i = 0; i < ps.length; i++) {
      if (!isStepComplete(ps[i].id)) return i;
    }
    return ps.length;
  }

  async function toggleStep(stepId, pathId, stepIndex) {
    if (!isStepUnlocked(pathId, stepIndex)) return;
    const existing = progress.find(p => p.step_id === stepId);
    if (existing) {
      if (existing.completed) {
        // Don't allow uncompleting if a later step is already complete
        const pathSteps = getPathSteps(pathId);
        for (let i = stepIndex + 1; i < pathSteps.length; i++) {
          if (isStepComplete(pathSteps[i].id)) return;
        }
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
    await supabase.from('training_steps').insert({ path_id: pathId, title: 'New Step', description: '', step_type: 'task', sort_order: pathSteps.length });
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

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Loading training...</div>;

  // ══════════════════════════════════════
  // PATH DETAIL VIEW
  // ══════════════════════════════════════
  if (selectedPath) {
    const path = paths.find(p => p.id === selectedPath);
    if (!path) { setSelectedPath(null); return null; }
    const pathSteps = getPathSteps(path.id);
    const pct = getPathProgress(path.id);
    const done = pathSteps.filter(s => isStepComplete(s.id)).length;
    const nextIdx = getNextStep(path.id);
    const isComplete = pct === 100;

    return (
      <div style={{ maxWidth: 700, margin: '0 auto', fontFamily: 'Outfit, Arial, sans-serif' }}>
        <button onClick={() => setSelectedPath(null)} style={s.backBtn}>&larr; Back to Training Center</button>

        {/* Path header */}
        <div style={{ ...s.card, marginTop: 12, marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            {path.branch_slug && <div style={{ width: 10, height: 10, borderRadius: '50%', background: BRANCH_COLORS[path.branch_slug] }} />}
            {path.branch_slug && <span style={{ fontSize: 12, color: BRANCH_COLORS[path.branch_slug], fontWeight: 700 }}>{BRANCH_LABELS[path.branch_slug]}</span>}
            {path.role && <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{path.role}</span>}
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: WHITE, margin: '4px 0 8px' }}>{path.name}</h1>
          {path.description && <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '0 0 16px', lineHeight: 1.6 }}>{path.description}</p>}

          {/* Progress */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ flex: 1, height: 10, background: 'var(--dark-border)', borderRadius: 5, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${pct}%`, background: isComplete ? GREEN : '#F59E0B', borderRadius: 5, transition: 'width 0.4s ease' }} />
            </div>
            <span style={{ fontSize: 14, fontWeight: 700, color: isComplete ? GREEN : WHITE, minWidth: 50, textAlign: 'right' }}>{pct}%</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{done} of {pathSteps.length} steps completed</span>
            {isComplete && <span style={{ fontSize: 12, fontWeight: 700, color: GREEN }}>Training Complete</span>}
          </div>
        </div>

        {/* Steps */}
        <div style={{ position: 'relative' }}>
          {/* Vertical connector line */}
          <div style={{ position: 'absolute', left: 19, top: 0, bottom: 0, width: 2, background: 'var(--dark-border)', zIndex: 0 }} />

          {pathSteps.map((step, i) => {
            const done = isStepComplete(step.id);
            const unlocked = isStepUnlocked(path.id, i);
            const isCurrent = i === nextIdx && !isComplete;

            return (
              <div key={step.id} style={{ position: 'relative', zIndex: 1, marginBottom: 4 }}>
                <div style={{
                  display: 'flex', gap: 14, padding: '14px 16px', marginLeft: 0,
                  background: isCurrent ? 'var(--dark-card)' : 'transparent',
                  border: isCurrent ? '1px solid ' + GREEN + '44' : '1px solid transparent',
                  borderRadius: 10,
                  opacity: unlocked ? 1 : 0.4,
                  transition: 'all 0.2s',
                }}>
                  {/* Step indicator */}
                  <div onClick={() => unlocked && toggleStep(step.id, path.id, i)} style={{
                    width: 38, height: 38, borderRadius: '50%', flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: unlocked ? 'pointer' : 'default',
                    background: done ? GREEN : isCurrent ? 'var(--dark-card)' : 'var(--dark-light)',
                    border: done ? `2px solid ${GREEN}` : isCurrent ? `2px solid ${GREEN}` : '2px solid var(--dark-border)',
                    transition: 'all 0.2s',
                  }}>
                    {done ? (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                    ) : unlocked ? (
                      <span style={{ fontSize: 14, fontWeight: 700, color: isCurrent ? GREEN : 'var(--text-muted)' }}>{i + 1}</span>
                    ) : (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
                    )}
                  </div>

                  {/* Step content */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                      <span style={{
                        fontSize: 15, fontWeight: 600, lineHeight: 1.3,
                        color: done ? 'var(--text-muted)' : unlocked ? WHITE : 'var(--text-muted)',
                        textDecoration: done ? 'line-through' : 'none',
                      }}>{step.title}</span>
                      {isCurrent && <span style={{ fontSize: 9, fontWeight: 700, color: GREEN, background: GREEN + '15', padding: '2px 8px', borderRadius: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Current</span>}
                    </div>

                    {step.description && unlocked && (
                      <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '4px 0 0', lineHeight: 1.5 }}>{step.description}</p>
                    )}

                    {!unlocked && (
                      <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '4px 0 0', fontStyle: 'italic' }}>Complete step {i} to unlock</p>
                    )}

                    {/* Action buttons */}
                    {unlocked && !done && (
                      <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                        {step.kb_article && (
                          <button onClick={() => navigate('/knowledge-base?article=' + step.kb_article.id)} style={s.actionBtn}>
                            <span style={{ fontSize: 12 }}>📖</span> Read: {step.kb_article.title}
                          </button>
                        )}
                        {step.action_url && !step.kb_article && (
                          <button onClick={() => navigate(step.action_url)} style={{ ...s.actionBtn, background: 'rgba(59,130,246,0.1)', borderColor: 'rgba(59,130,246,0.3)', color: '#3B82F6' }}>
                            <span style={{ fontSize: 12 }}>🔗</span> Go to page
                          </button>
                        )}
                        <button onClick={() => toggleStep(step.id, path.id, i)} style={s.completeBtn}>
                          Mark Complete
                        </button>
                      </div>
                    )}

                    {/* Completed state */}
                    {done && step.kb_article && (
                      <button onClick={() => navigate('/knowledge-base?article=' + step.kb_article.id)} style={{ ...s.actionBtn, opacity: 0.6, marginTop: 6 }}>
                        <span style={{ fontSize: 12 }}>📖</span> Review again
                      </button>
                    )}
                  </div>
                </div>

                {/* Admin edit controls */}
                {isAdmin && (
                  <div style={{ display: 'flex', gap: 4, marginLeft: 52, paddingBottom: 4 }}>
                    <input value={step.title} onChange={e => updateStep(step.id, { title: e.target.value })} style={{ ...s.miniInput, flex: 1 }} placeholder="Step title" />
                    <select value={step.step_type} onChange={e => updateStep(step.id, { step_type: e.target.value })} style={{ ...s.miniInput, width: 80 }}>
                      <option value="task">Task</option><option value="read">Read</option><option value="navigate">Navigate</option>
                    </select>
                    <input value={step.action_url || ''} onChange={e => updateStep(step.id, { action_url: e.target.value || null })} style={{ ...s.miniInput, width: 120 }} placeholder="URL" />
                    <button onClick={() => deleteStep(step.id)} style={{ background: 'transparent', border: 'none', color: '#EF4444', fontSize: 12, cursor: 'pointer', padding: '2px 6px' }}>&#10005;</button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {isAdmin && (
          <div style={{ display: 'flex', gap: 8, marginTop: 16, marginLeft: 52 }}>
            <button onClick={() => addStep(path.id)} style={s.addStepBtn}>+ Add Step</button>
            <button onClick={() => deletePath(path.id)} style={{ ...s.addStepBtn, color: '#EF4444', borderColor: '#EF444444' }}>Delete Path</button>
          </div>
        )}
      </div>
    );
  }

  // ══════════════════════════════════════
  // PATH LIST VIEW
  // ══════════════════════════════════════
  return (
    <div style={{ maxWidth: 800, margin: '0 auto', fontFamily: 'Outfit, Arial, sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: WHITE, margin: '0 0 4px' }}>Training Center</h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>Complete each path in order to get fully operational</p>
        </div>
        {isAdmin && <button onClick={() => setEditingPath({ name: '', branch_slug: '', role: '', description: '', sort_order: 0 })} style={s.addBtn}>+ New Path</button>}
      </div>

      {editingPath && <PathEditor path={editingPath} onSave={savePath} onCancel={() => setEditingPath(null)} />}

      {myPaths.length === 0 && (
        <div style={{ ...s.card, textAlign: 'center', padding: 40 }}>
          <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>No training paths available for your branches yet.</p>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {myPaths.map((path, pathIdx) => {
          const pct = getPathProgress(path.id);
          const pathSteps = getPathSteps(path.id);
          const done = pathSteps.filter(s => isStepComplete(s.id)).length;
          const isComplete = pct === 100;
          const nextStep = pathSteps[getNextStep(path.id)];

          // Check if previous path is complete (for path-level locking)
          const prevPath = pathIdx > 0 ? myPaths[pathIdx - 1] : null;
          const prevPathComplete = prevPath ? getPathProgress(prevPath.id) === 100 : true;
          // General Onboarding (sort_order 0) is always unlocked. Others require General Onboarding complete.
          const pathUnlocked = path.sort_order === 0 || (myPaths[0] && getPathProgress(myPaths[0].id) === 100);

          return (
            <div
              key={path.id}
              onClick={() => pathUnlocked && setSelectedPath(path.id)}
              style={{
                ...s.pathCard,
                borderLeft: `4px solid ${isComplete ? GREEN : pathUnlocked ? BRANCH_COLORS[path.branch_slug] || '#6B7280' : 'var(--dark-border)'}`,
                opacity: pathUnlocked ? 1 : 0.45,
                cursor: pathUnlocked ? 'pointer' : 'default',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
                {/* Path icon */}
                <div style={{
                  width: 48, height: 48, borderRadius: 12, flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: isComplete ? GREEN + '15' : 'var(--dark-light)',
                  border: `1px solid ${isComplete ? GREEN + '33' : 'var(--dark-border)'}`,
                }}>
                  {isComplete ? (
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={GREEN} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                  ) : pathUnlocked ? (
                    <span style={{ fontSize: 20, fontWeight: 700, color: BRANCH_COLORS[path.branch_slug] || 'var(--text-muted)' }}>{pathIdx + 1}</span>
                  ) : (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
                  )}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                    {path.branch_slug && <span style={{ fontSize: 10, fontWeight: 700, color: BRANCH_COLORS[path.branch_slug] }}>{BRANCH_LABELS[path.branch_slug]}</span>}
                    {path.role && <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{path.role}</span>}
                  </div>

                  <h3 style={{ fontSize: 16, fontWeight: 700, color: WHITE, margin: '0 0 4px' }}>{path.name}</h3>
                  {path.description && <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '0 0 10px', lineHeight: 1.4 }}>{path.description}</p>}

                  {/* Progress bar */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                    <div style={{ flex: 1, height: 6, background: 'var(--dark-border)', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: isComplete ? GREEN : '#F59E0B', borderRadius: 3, transition: 'width 0.3s' }} />
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 700, color: isComplete ? GREEN : 'var(--text-muted)', minWidth: 60, textAlign: 'right' }}>{done}/{pathSteps.length}</span>
                  </div>

                  {/* Next step preview */}
                  {!isComplete && pathUnlocked && nextStep && (
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                      <span style={{ color: GREEN, fontWeight: 600 }}>Next:</span> {nextStep.title}
                    </div>
                  )}
                  {isComplete && <span style={{ fontSize: 12, fontWeight: 700, color: GREEN }}>Complete</span>}
                  {!pathUnlocked && <span style={{ fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic' }}>Complete General Onboarding to unlock</span>}
                </div>

                {/* Arrow */}
                {pathUnlocked && (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, alignSelf: 'center' }}><polyline points="9 18 15 12 9 6"/></svg>
                )}
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
    setSaving(true); await onSave(form); setSaving(false);
  }

  return (
    <div style={{ background: CARD, border: '1px solid ' + BORDER, borderRadius: 12, padding: 20, marginBottom: 20 }}>
      <h3 style={{ fontSize: 16, fontWeight: 700, color: WHITE, margin: '0 0 16px' }}>{form.id ? 'Edit Path' : 'New Training Path'}</h3>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
        <div><label style={s.label}>Path Name</label><input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} style={s.input} placeholder="e.g. YouTube Editor Onboarding" /></div>
        <div><label style={s.label}>Branch</label><select value={form.branch_slug || ''} onChange={e => setForm(p => ({ ...p, branch_slug: e.target.value || null }))} style={s.input}><option value="">General (all)</option>{Object.entries(BRANCH_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
      </div>
      <div style={{ marginBottom: 12 }}><label style={s.label}>Description</label><textarea value={form.description || ''} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} rows={3} style={{ ...s.input, resize: 'vertical' }} /></div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={handleSave} disabled={saving || !form.name.trim()} style={{ ...s.saveBtn, opacity: saving ? 0.5 : 1 }}>{saving ? 'Saving...' : 'Save Path'}</button>
        <button onClick={onCancel} style={s.cancelBtn}>Cancel</button>
      </div>
    </div>
  );
}

const BORDER_VAL = 'var(--dark-border)';
const s = {
  card: { background: CARD, border: '1px solid ' + BORDER_VAL, borderRadius: 12, padding: 24 },
  pathCard: { background: CARD, border: '1px solid ' + BORDER_VAL, borderRadius: 12, padding: 20, transition: 'border-color 0.15s, opacity 0.2s' },
  backBtn: { background: 'transparent', border: 'none', color: 'var(--text-muted)', fontSize: 13, cursor: 'pointer', padding: '4px 0', display: 'flex', alignItems: 'center', gap: 4 },
  actionBtn: { display: 'inline-flex', alignItems: 'center', gap: 6, background: GREEN + '10', border: '1px solid ' + GREEN + '33', borderRadius: 8, color: GREEN, padding: '6px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer' },
  completeBtn: { background: GREEN, border: 'none', borderRadius: 8, color: '#000', padding: '6px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer' },
  addBtn: { background: GREEN, border: 'none', borderRadius: 8, color: '#000', padding: '8px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer' },
  addStepBtn: { background: 'transparent', border: '1px solid ' + BORDER_VAL, borderRadius: 8, color: 'var(--text-secondary)', padding: '8px 16px', fontSize: 12, fontWeight: 600, cursor: 'pointer' },
  label: { fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 },
  input: { width: '100%', boxSizing: 'border-box', background: CARD_LIGHT, border: '1px solid ' + BORDER_VAL, borderRadius: 6, color: WHITE, padding: '8px 10px', fontSize: 13, outline: 'none', fontFamily: 'Outfit, Arial, sans-serif' },
  miniInput: { background: CARD_LIGHT, border: '1px solid ' + BORDER_VAL, borderRadius: 4, color: WHITE, padding: '3px 6px', fontSize: 10, outline: 'none', fontFamily: 'Outfit, Arial, sans-serif' },
  saveBtn: { background: GREEN, border: 'none', borderRadius: 8, color: '#000', padding: '10px 20px', fontSize: 13, fontWeight: 700, cursor: 'pointer' },
  cancelBtn: { background: 'transparent', border: '1px solid ' + BORDER_VAL, borderRadius: 8, color: 'var(--text-muted)', padding: '10px 20px', fontSize: 13, cursor: 'pointer' },
};
