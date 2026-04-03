import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const GREEN = 'var(--green)';
const CARD = 'var(--dark-card)';
const CARD_LIGHT = 'var(--dark-light)';
const BORDER = 'var(--dark-border)';
const WHITE = 'var(--white)';

const BRANCH_COLORS = { youtube: '#FF0000', 'short-form': '#8B5CF6', 'ads-creative': '#F59E0B', production: '#3B82F6' };

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [allBranches, setAllBranches] = useState([]);
  const [showInvite, setShowInvite] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [inviteForm, setInviteForm] = useState({ email: '', full_name: '', title: '', role: 'member', branch_ids: [], slack_user_id: '' });
  const [inviteLoading, setInviteLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => { fetchUsers(); fetchBranches(); }, []);

  async function fetchUsers() {
    const { data } = await supabase.from('profiles').select('*, user_branches(branch_id, branches(id, name, slug))').order('full_name');
    setUsers(data || []);
  }

  async function fetchBranches() {
    const { data } = await supabase.from('branches').select('*').order('name');
    setAllBranches(data || []);
  }

  async function handleInvite(e) {
    e.preventDefault();
    setInviteLoading(true);
    setMessage('');
    try {
      const { data, error } = await supabase.auth.admin.inviteUserByEmail(inviteForm.email, { data: { full_name: inviteForm.full_name } });
      if (error) {
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email: inviteForm.email,
          password: crypto.randomUUID().slice(0, 16),
          options: { data: { full_name: inviteForm.full_name } },
        });
        if (signUpError) throw signUpError;
        const userId = signUpData.user?.id;
        if (userId) {
          await supabase.from('profiles').upsert({ id: userId, email: inviteForm.email, full_name: inviteForm.full_name, title: inviteForm.title, role: inviteForm.role, slack_user_id: inviteForm.slack_user_id || null });
          if (inviteForm.branch_ids.length > 0) {
            await supabase.from('user_branches').insert(inviteForm.branch_ids.map(bid => ({ user_id: userId, branch_id: bid })));
          }
        }
      }
      setMessage('Invite sent successfully.');
      setShowInvite(false);
      setInviteForm({ email: '', full_name: '', title: '', role: 'member', branch_ids: [], slack_user_id: '' });
      fetchUsers();
    } catch (err) {
      setMessage('Error: ' + err.message);
    } finally {
      setInviteLoading(false);
    }
  }

  async function updateRole(userId, newRole) {
    await supabase.from('profiles').update({ role: newRole }).eq('id', userId);
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
    setMessage(`Role updated to ${newRole}.`);
    setTimeout(() => setMessage(''), 2000);
  }

  async function updateTitle(userId, newTitle) {
    await supabase.from('profiles').update({ title: newTitle }).eq('id', userId);
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, title: newTitle } : u));
  }

  async function toggleUserBranch(userId, branchId, currentBranches) {
    const has = currentBranches.some(ub => ub.branch_id === branchId);
    if (has) {
      await supabase.from('user_branches').delete().eq('user_id', userId).eq('branch_id', branchId);
    } else {
      await supabase.from('user_branches').insert({ user_id: userId, branch_id: branchId });
    }
    fetchUsers();
  }

  function toggleInviteBranch(branchId) {
    setInviteForm(prev => ({
      ...prev,
      branch_ids: prev.branch_ids.includes(branchId)
        ? prev.branch_ids.filter(id => id !== branchId)
        : [...prev.branch_ids, branchId],
    }));
  }

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      <div style={s.header}>
        <div>
          <h1 style={s.title}>User Management</h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>{users.length} team member{users.length !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={() => setShowInvite(!showInvite)} style={s.addBtn}>+ Invite User</button>
      </div>

      {message && <div style={s.message}>{message}</div>}

      {/* Invite form */}
      {showInvite && (
        <form onSubmit={handleInvite} style={s.inviteCard}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: WHITE, margin: '0 0 16px' }}>New Team Member</h3>
          <div style={s.formGrid}>
            <div style={s.field}>
              <label style={s.label}>Full Name</label>
              <input type="text" value={inviteForm.full_name} onChange={e => setInviteForm(p => ({ ...p, full_name: e.target.value }))} required style={s.input} placeholder="First Last" />
            </div>
            <div style={s.field}>
              <label style={s.label}>Email</label>
              <input type="email" value={inviteForm.email} onChange={e => setInviteForm(p => ({ ...p, email: e.target.value }))} required style={s.input} placeholder="name@peachfitwellness.com" />
            </div>
            <div style={s.field}>
              <label style={s.label}>Title</label>
              <input type="text" value={inviteForm.title} onChange={e => setInviteForm(p => ({ ...p, title: e.target.value }))} style={s.input} placeholder="e.g. Long Form Editor" />
            </div>
            <div style={s.field}>
              <label style={s.label}>Role</label>
              <select value={inviteForm.role} onChange={e => setInviteForm(p => ({ ...p, role: e.target.value }))} style={s.input}>
                <option value="member">Member</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          </div>
          <div style={{ ...s.field, marginTop: 12 }}>
            <label style={s.label}>Branches</label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 6 }}>
              {allBranches.map(b => {
                const active = inviteForm.branch_ids.includes(b.id);
                return (
                  <button key={b.id} type="button" onClick={() => toggleInviteBranch(b.id)} style={{
                    ...s.branchBtn,
                    background: active ? (BRANCH_COLORS[b.slug] || '#37CA37') + '22' : 'transparent',
                    color: active ? BRANCH_COLORS[b.slug] || '#37CA37' : 'var(--text-muted)',
                    borderColor: active ? BRANCH_COLORS[b.slug] || '#37CA37' : BORDER,
                  }}>{b.name}</button>
                );
              })}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
            <button type="submit" disabled={inviteLoading} style={s.submitBtn}>{inviteLoading ? 'Sending...' : 'Send Invite'}</button>
            <button type="button" onClick={() => setShowInvite(false)} style={s.cancelBtn}>Cancel</button>
          </div>
        </form>
      )}

      {/* User list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {users.map(u => {
          const isEditing = editingUser === u.id;
          const userBranches = u.user_branches || [];
          return (
            <div key={u.id} style={s.userCard}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, flex: 1, minWidth: 0 }}>
                {/* Avatar */}
                {u.avatar_url ? (
                  <img src={u.avatar_url} alt="" style={s.avatar} />
                ) : (
                  <div style={s.avatarPlaceholder}>{u.full_name?.charAt(0) || 'U'}</div>
                )}

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 14, fontWeight: 600, color: WHITE }}>{u.full_name || 'Unnamed'}</span>
                    <span style={{
                      fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em',
                      color: u.role === 'admin' ? '#37CA37' : 'var(--text-muted)',
                      background: u.role === 'admin' ? 'rgba(55,202,55,0.12)' : 'rgba(255,255,255,0.04)',
                      padding: '2px 8px', borderRadius: 4,
                    }}>{u.role}</span>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                    {u.title || 'No title'} -- {u.email}
                  </div>
                  {/* Branch badges */}
                  <div style={{ display: 'flex', gap: 4, marginTop: 6, flexWrap: 'wrap' }}>
                    {userBranches.map(ub => (
                      <span key={ub.branch_id} style={{
                        fontSize: 10, fontWeight: 600,
                        color: BRANCH_COLORS[ub.branches?.slug] || '#37CA37',
                        background: (BRANCH_COLORS[ub.branches?.slug] || '#37CA37') + '15',
                        border: `1px solid ${(BRANCH_COLORS[ub.branches?.slug] || '#37CA37')}33`,
                        padding: '2px 8px', borderRadius: 4,
                      }}>{ub.branches?.name}</span>
                    ))}
                    {userBranches.length === 0 && <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>No branches</span>}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>
                <button onClick={() => setEditingUser(isEditing ? null : u.id)} style={s.editBtn}>
                  {isEditing ? 'Close' : 'Edit'}
                </button>
              </div>

              {/* Expanded edit panel */}
              {isEditing && (
                <div style={s.editPanel}>
                  {/* Role toggle */}
                  <div style={s.editRow}>
                    <span style={s.editLabel}>Role</span>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button onClick={() => updateRole(u.id, 'member')} style={{ ...s.roleBtn, ...(u.role === 'member' ? s.roleBtnActive : {}) }}>Member</button>
                      <button onClick={() => updateRole(u.id, 'admin')} style={{ ...s.roleBtn, ...(u.role === 'admin' ? { ...s.roleBtnActive, background: 'rgba(55,202,55,0.15)', color: '#37CA37', borderColor: '#37CA37' } : {}) }}>Admin</button>
                    </div>
                  </div>

                  {/* Title edit */}
                  <div style={s.editRow}>
                    <span style={s.editLabel}>Title</span>
                    <input
                      defaultValue={u.title || ''}
                      onBlur={e => updateTitle(u.id, e.target.value)}
                      placeholder="e.g. YouTube Lead"
                      style={s.editInput}
                    />
                  </div>

                  {/* Branch assignment */}
                  <div style={s.editRow}>
                    <span style={s.editLabel}>Branches</span>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {allBranches.map(b => {
                        const has = userBranches.some(ub => ub.branch_id === b.id);
                        return (
                          <button key={b.id} onClick={() => toggleUserBranch(u.id, b.id, userBranches)} style={{
                            ...s.branchBtn,
                            background: has ? (BRANCH_COLORS[b.slug] || '#37CA37') + '22' : 'transparent',
                            color: has ? BRANCH_COLORS[b.slug] || '#37CA37' : 'var(--text-muted)',
                            borderColor: has ? BRANCH_COLORS[b.slug] || '#37CA37' : BORDER,
                          }}>{b.name}</button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Slack ID */}
                  <div style={s.editRow}>
                    <span style={s.editLabel}>Slack ID</span>
                    <input
                      defaultValue={u.slack_user_id || ''}
                      onBlur={async e => {
                        await supabase.from('profiles').update({ slack_user_id: e.target.value || null }).eq('id', u.id);
                        fetchUsers();
                      }}
                      placeholder="UXXXXXXXXXX"
                      style={s.editInput}
                    />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

const s = {
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 },
  title: { fontSize: 24, fontWeight: 700, color: WHITE, margin: '0 0 2px' },
  addBtn: { padding: '10px 20px', background: '#37CA37', color: '#000', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer' },
  message: { padding: '10px 14px', background: 'rgba(55,202,55,0.1)', border: '1px solid rgba(55,202,55,0.2)', borderRadius: 8, color: '#37CA37', fontSize: 13, marginBottom: 16 },
  inviteCard: { background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 24, marginBottom: 20 },
  formGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 },
  field: { display: 'flex', flexDirection: 'column', gap: 4 },
  label: { fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' },
  input: { background: CARD_LIGHT, border: `1px solid ${BORDER}`, borderRadius: 6, color: WHITE, padding: '8px 12px', fontSize: 13, outline: 'none', fontFamily: 'Outfit, Arial, sans-serif' },
  submitBtn: { background: '#37CA37', border: 'none', borderRadius: 8, color: '#000', padding: '10px 20px', fontSize: 13, fontWeight: 700, cursor: 'pointer' },
  cancelBtn: { background: 'transparent', border: `1px solid ${BORDER}`, borderRadius: 8, color: 'var(--text-muted)', padding: '10px 20px', fontSize: 13, cursor: 'pointer' },
  branchBtn: { border: `1px solid ${BORDER}`, borderRadius: 6, padding: '4px 12px', fontSize: 11, fontWeight: 600, cursor: 'pointer', background: 'transparent' },
  userCard: {
    background: CARD, border: `1px solid ${BORDER}`, borderRadius: 10,
    padding: 16, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12,
    transition: 'border-color 0.15s',
  },
  avatar: { width: 44, height: 44, borderRadius: 10, objectFit: 'cover', flexShrink: 0 },
  avatarPlaceholder: {
    width: 44, height: 44, borderRadius: 10, background: CARD_LIGHT,
    color: 'var(--text-muted)', fontSize: 16, fontWeight: 700,
    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  editBtn: {
    background: 'transparent', border: `1px solid ${BORDER}`, borderRadius: 6,
    color: 'var(--text-secondary)', padding: '6px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer',
  },
  editPanel: {
    width: '100%', marginTop: 12, paddingTop: 12, borderTop: `1px solid ${BORDER}`,
    display: 'flex', flexDirection: 'column', gap: 12,
  },
  editRow: { display: 'flex', alignItems: 'center', gap: 12 },
  editLabel: { fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', minWidth: 80 },
  editInput: {
    flex: 1, background: CARD_LIGHT, border: `1px solid ${BORDER}`, borderRadius: 6,
    color: WHITE, padding: '6px 10px', fontSize: 12, outline: 'none', fontFamily: 'Outfit, Arial, sans-serif',
  },
  roleBtn: {
    background: 'transparent', border: `1px solid ${BORDER}`, borderRadius: 6,
    color: 'var(--text-muted)', padding: '6px 14px', fontSize: 11, fontWeight: 600, cursor: 'pointer',
  },
  roleBtnActive: {
    background: 'rgba(255,255,255,0.06)', color: WHITE, borderColor: 'rgba(255,255,255,0.15)',
  },
};
