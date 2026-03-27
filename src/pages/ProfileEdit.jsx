import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';

const GREEN = '#37CA37';
const BG = '#0C0C0C';
const CARD = '#141414';
const CARD_LIGHT = '#1A1A1A';
const BORDER = '#2A2A2A';
const WHITE = '#FFFFFF';

export default function ProfileEdit() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [branches, setBranches] = useState([]);
  const fileRef = useRef(null);

  useEffect(() => { load(); }, []);

  async function load() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: p } = await supabase
      .from('profiles')
      .select('*, user_branches(branches(id, name))')
      .eq('id', user.id)
      .single();

    if (p) {
      setProfile(p);
      setBranches((p.user_branches || []).map(ub => ub.branches?.name).filter(Boolean));
    }
    setLoading(false);
  }

  async function handleSave() {
    if (!profile || saving) return;
    setSaving(true);
    const { id, user_branches, ...updates } = profile;
    // Only send editable fields
    const { error } = await supabase.from('profiles').update({
      full_name: updates.full_name,
      title: updates.title,
      phone: updates.phone,
      bio: updates.bio,
      location: updates.location,
      slack_handle: updates.slack_handle,
    }).eq('id', id);

    setSaving(false);
    if (!error) {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  }

  async function handleAvatarUpload(e) {
    const file = e.target.files?.[0];
    if (!file || !profile) return;

    // Validate
    if (!file.type.startsWith('image/')) return;
    if (file.size > 2 * 1024 * 1024) { alert('Image must be under 2MB'); return; }

    setUploading(true);
    const ext = file.name.split('.').pop();
    const path = `${profile.id}/avatar.${ext}`;

    // Upload to Supabase Storage
    const { error: upErr } = await supabase.storage
      .from('avatars')
      .upload(path, file, { upsert: true });

    if (upErr) {
      console.error('Upload error:', upErr);
      setUploading(false);
      return;
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('avatars')
      .getPublicUrl(path);

    // Update profile
    await supabase.from('profiles').update({ avatar_url: publicUrl }).eq('id', profile.id);
    setProfile({ ...profile, avatar_url: publicUrl + '?t=' + Date.now() });
    setUploading(false);
  }

  function updateField(field, value) {
    setProfile(prev => ({ ...prev, [field]: value }));
  }

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#6B7280' }}>Loading profile...</div>;
  if (!profile) return <div style={{ padding: 40, textAlign: 'center', color: '#6B7280' }}>Profile not found</div>;

  const initials = (profile.full_name || 'U').split(' ').map(n => n.charAt(0)).join('').toUpperCase().slice(0, 2);

  return (
    <div style={{ maxWidth: 640, margin: '0 auto', padding: '24px 0', fontFamily: 'Outfit, Arial, sans-serif' }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, color: WHITE, margin: '0 0 4px' }}>Edit Profile</h1>
      <p style={{ fontSize: 14, color: '#6B7280', margin: '0 0 28px' }}>Update your personal information</p>

      {/* Avatar section */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 32 }}>
        <div style={styles.avatarWrapper}>
          {profile.avatar_url ? (
            <img src={profile.avatar_url} alt="Avatar" style={styles.avatarImg} />
          ) : (
            <div style={styles.avatarPlaceholder}>{initials}</div>
          )}
          {uploading && <div style={styles.avatarOverlay}>...</div>}
        </div>
        <div>
          <button onClick={() => fileRef.current?.click()} style={styles.uploadBtn}>
            {uploading ? 'Uploading...' : 'Change Photo'}
          </button>
          <input ref={fileRef} type="file" accept="image/*" onChange={handleAvatarUpload} style={{ display: 'none' }} />
          <p style={{ fontSize: 11, color: '#6B7280', margin: '6px 0 0' }}>JPG, PNG under 2MB</p>
        </div>
      </div>

      {/* Form */}
      <div style={styles.card}>
        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>Personal Info</h3>
          <Field label="Full Name" value={profile.full_name || ''} onChange={v => updateField('full_name', v)} placeholder="Your full name" />
          <Field label="Title" value={profile.title || ''} onChange={v => updateField('title', v)} placeholder="e.g. Media Director" />
          <Field label="Email" value={profile.email || ''} disabled={true} note="Managed by your account" />
          <Field label="Phone" value={profile.phone || ''} onChange={v => updateField('phone', v)} placeholder="+1 (555) 000-0000" />
          <Field label="Location" value={profile.location || ''} onChange={v => updateField('location', v)} placeholder="e.g. Grass Valley, CA" />
        </div>

        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>Work</h3>
          <Field label="Slack Handle" value={profile.slack_handle || ''} onChange={v => updateField('slack_handle', v)} placeholder="@your-handle" />
          <div style={styles.fieldRow}>
            <span style={styles.fieldLabel}>Role</span>
            <span style={{ fontSize: 13, color: profile.role === 'admin' ? GREEN : WHITE, fontWeight: 600, textTransform: 'capitalize' }}>
              {profile.role || 'member'}
            </span>
          </div>
          <div style={styles.fieldRow}>
            <span style={styles.fieldLabel}>Branches</span>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {branches.length > 0 ? branches.map(b => (
                <span key={b} style={styles.branchPill}>{b}</span>
              )) : <span style={{ fontSize: 12, color: '#6B7280' }}>None assigned</span>}
            </div>
          </div>
        </div>

        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>Bio</h3>
          <textarea
            value={profile.bio || ''}
            onChange={e => updateField('bio', e.target.value)}
            placeholder="Tell the team a bit about yourself..."
            style={styles.textarea}
            rows={4}
          />
        </div>
      </div>

      {/* Save button */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 20 }}>
        {saved && <span style={{ fontSize: 13, color: GREEN, fontWeight: 600, alignSelf: 'center' }}>Saved</span>}
        <button onClick={handleSave} disabled={saving} style={styles.saveBtn}>
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, placeholder, disabled, note }) {
  return (
    <div style={styles.fieldRow}>
      <span style={styles.fieldLabel}>{label}</span>
      <div style={{ flex: 1, maxWidth: 320 }}>
        <input
          value={value}
          onChange={onChange ? e => onChange(e.target.value) : undefined}
          placeholder={placeholder}
          disabled={disabled}
          style={{
            ...styles.fieldInput,
            opacity: disabled ? 0.5 : 1,
            cursor: disabled ? 'not-allowed' : 'text',
          }}
        />
        {note && <span style={{ fontSize: 10, color: '#6B7280', display: 'block', marginTop: 2 }}>{note}</span>}
      </div>
    </div>
  );
}

const styles = {
  avatarWrapper: {
    width: 80, height: 80, borderRadius: 16, overflow: 'hidden',
    border: `2px solid ${BORDER}`, position: 'relative', flexShrink: 0,
  },
  avatarImg: { width: '100%', height: '100%', objectFit: 'cover' },
  avatarPlaceholder: {
    width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: CARD_LIGHT, color: '#6B7280', fontSize: 24, fontWeight: 700,
  },
  avatarOverlay: {
    position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    color: WHITE, fontSize: 14,
  },
  uploadBtn: {
    background: CARD_LIGHT, border: `1px solid ${BORDER}`, borderRadius: 8,
    color: WHITE, padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
  },
  card: {
    background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12,
    padding: 24, overflow: 'hidden',
  },
  section: { marginBottom: 24 },
  sectionTitle: {
    fontSize: 13, fontWeight: 600, color: '#6B7280', margin: '0 0 12px',
    textTransform: 'uppercase', letterSpacing: '0.05em',
    paddingBottom: 8, borderBottom: `1px solid ${BORDER}`,
  },
  fieldRow: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '12px 0', borderBottom: `1px solid ${BORDER}22`, gap: 16,
  },
  fieldLabel: { fontSize: 13, color: '#9CA3AF', minWidth: 100, flexShrink: 0 },
  fieldInput: {
    width: '100%', background: CARD_LIGHT, border: `1px solid ${BORDER}`, borderRadius: 6,
    color: WHITE, padding: '8px 12px', fontSize: 13, outline: 'none',
    fontFamily: 'Outfit, Arial, sans-serif', boxSizing: 'border-box',
  },
  textarea: {
    width: '100%', background: CARD_LIGHT, border: `1px solid ${BORDER}`, borderRadius: 8,
    color: WHITE, padding: '10px 12px', fontSize: 13, outline: 'none', resize: 'vertical',
    fontFamily: 'Outfit, Arial, sans-serif', boxSizing: 'border-box',
  },
  branchPill: {
    fontSize: 11, fontWeight: 600, color: GREEN, background: GREEN + '15',
    border: `1px solid ${GREEN}33`, borderRadius: 6, padding: '3px 8px',
  },
  saveBtn: {
    background: GREEN, border: 'none', borderRadius: 8, color: '#000',
    padding: '10px 24px', fontSize: 14, fontWeight: 700, cursor: 'pointer',
  },
};
