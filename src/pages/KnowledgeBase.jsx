import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';

const GREEN = 'var(--green)';
const CARD = 'var(--dark-card)';
const CARD_LIGHT = 'var(--dark-light)';
const BORDER = 'var(--dark-border)';
const WHITE = 'var(--white)';

const BRANCH_COLORS = { youtube: '#FF0000', 'short-form': '#8B5CF6', 'ads-creative': '#F59E0B', production: '#3B82F6' };
const BRANCH_LABELS = { youtube: 'YouTube', 'short-form': 'Short Form', 'ads-creative': 'Ads/Creative', production: 'Production' };

const CATEGORIES = ['Getting Started', 'Daily Workflow', 'Pipeline & Tasks', 'Content Calendar', 'SOB Campaigns', 'Analytics & Reporting', 'Tools & Integrations', 'Department Standards', 'Role-Specific'];
const CATEGORY_ICONS = { 'Getting Started': '🚀', 'Daily Workflow': '📋', 'Pipeline & Tasks': '🔄', 'Content Calendar': '📅', 'SOB Campaigns': '📣', 'Analytics & Reporting': '📊', 'Tools & Integrations': '🔧', 'Department Standards': '📏', 'Role-Specific': '👤' };

export default function KnowledgeBase() {
  const { isAdmin } = useAuth();
  const [articles, setArticles] = useState([]);
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('all');
  const [branchFilter, setBranchFilter] = useState('all');
  const [selectedArticle, setSelectedArticle] = useState(null);
  const [editing, setEditing] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, []);

  async function load() {
    const { data } = await supabase.from('knowledge_base').select('*').eq('is_published', true).order('category').order('sort_order');
    if (data) {
      setArticles(data);
      const params = new URLSearchParams(window.location.search);
      const articleId = params.get('article');
      if (articleId) { const found = data.find(a => a.id === articleId); if (found) setSelectedArticle(found); }
    }
    setLoading(false);
  }

  const filtered = useMemo(() => {
    let f = articles;
    if (catFilter !== 'all') f = f.filter(a => a.category === catFilter);
    if (branchFilter !== 'all') f = f.filter(a => !a.branch_slug || a.branch_slug === branchFilter);
    if (search.trim()) {
      const s = search.toLowerCase();
      f = f.filter(a => a.title.toLowerCase().includes(s) || (a.content || '').toLowerCase().includes(s) || a.category.toLowerCase().includes(s));
    }
    return f;
  }, [articles, catFilter, branchFilter, search]);

  const grouped = useMemo(() => {
    const m = {};
    filtered.forEach(a => { if (!m[a.category]) m[a.category] = []; m[a.category].push(a); });
    return m;
  }, [filtered]);

  async function saveArticle(article) {
    if (article.id) {
      await supabase.from('knowledge_base').update({ ...article, updated_at: new Date().toISOString() }).eq('id', article.id);
    } else {
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from('knowledge_base').insert({ ...article, created_by: user?.id });
    }
    setEditing(null);
    load();
  }

  async function deleteArticle(id) {
    if (!confirm('Delete this article?')) return;
    await supabase.from('knowledge_base').delete().eq('id', id);
    setSelectedArticle(null);
    load();
  }

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Loading...</div>;

  // Article viewer
  if (selectedArticle) {
    const a = selectedArticle;
    return (
      <div style={{ maxWidth: 800, margin: '0 auto', fontFamily: 'Outfit, Arial, sans-serif' }}>
        <button onClick={() => setSelectedArticle(null)} style={s.backBtn}>&larr; Back to Knowledge Base</button>
        <div style={{ ...s.card, marginTop: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: 11, color: 'var(--text-muted)', background: CARD_LIGHT, padding: '2px 8px', borderRadius: 4 }}>{a.category}</span>
            {a.branch_slug && <span style={{ fontSize: 11, color: BRANCH_COLORS[a.branch_slug], fontWeight: 600 }}>{BRANCH_LABELS[a.branch_slug]}</span>}
            {a.role && <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>-- {a.role}</span>}
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: WHITE, margin: '8px 0 16px' }}>{a.title}</h1>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>{a.content}</div>
          {isAdmin && (
            <div style={{ display: 'flex', gap: 8, marginTop: 20, paddingTop: 16, borderTop: '1px solid ' + BORDER }}>
              <button onClick={() => { setSelectedArticle(null); setEditing(a); }} style={s.editBtn}>Edit</button>
              <button onClick={() => deleteArticle(a.id)} style={s.deleteBtn}>Delete</button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Article editor
  if (editing) {
    return <ArticleEditor article={editing} onSave={saveArticle} onCancel={() => setEditing(null)} />;
  }

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', fontFamily: 'Outfit, Arial, sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: WHITE, margin: '0 0 4px' }}>Knowledge Base</h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>{articles.length} guides available</p>
        </div>
        {isAdmin && <button onClick={() => setEditing({ title: '', category: 'Getting Started', content: '', branch_slug: '', role: '', sort_order: 0 })} style={s.addBtn}>+ New Guide</button>}
      </div>

      {/* Search and filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search guides..." style={s.searchInput} />
        <select value={catFilter} onChange={e => setCatFilter(e.target.value)} style={s.select}>
          <option value="all">All Categories</option>
          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={branchFilter} onChange={e => setBranchFilter(e.target.value)} style={s.select}>
          <option value="all">All Branches</option>
          {Object.entries(BRANCH_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>

      {/* Articles by category */}
      {Object.keys(grouped).length === 0 && (
        <div style={{ ...s.card, textAlign: 'center', padding: 40 }}>
          <p style={{ color: 'var(--text-muted)', fontSize: 14, margin: '0 0 12px' }}>{search ? 'No guides match your search.' : 'No guides yet.'}</p>
          {isAdmin && <p style={{ color: 'var(--text-muted)', fontSize: 12 }}>Click "+ New Guide" to create the first one.</p>}
        </div>
      )}

      {Object.entries(grouped).map(([category, items]) => (
        <div key={category} style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <span style={{ fontSize: 16 }}>{CATEGORY_ICONS[category] || '📄'}</span>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: WHITE, margin: 0 }}>{category}</h2>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>({items.length})</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 10 }}>
            {items.map(a => (
              <div key={a.id} onClick={() => setSelectedArticle(a)} style={s.articleCard}>
                <h3 style={{ fontSize: 14, fontWeight: 600, color: WHITE, margin: '0 0 6px', lineHeight: 1.3 }}>{a.title}</h3>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                  {a.content?.slice(0, 120)}...
                </p>
                <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                  {a.branch_slug && <span style={{ fontSize: 10, color: BRANCH_COLORS[a.branch_slug], fontWeight: 600 }}>{BRANCH_LABELS[a.branch_slug]}</span>}
                  {a.role && <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{a.role}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function ArticleEditor({ article, onSave, onCancel }) {
  const [form, setForm] = useState(article);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!form.title.trim() || !form.content.trim()) return;
    setSaving(true);
    await onSave(form);
    setSaving(false);
  }

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', fontFamily: 'Outfit, Arial, sans-serif' }}>
      <button onClick={onCancel} style={s.backBtn}>&larr; Back</button>
      <div style={{ ...s.card, marginTop: 12 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--white)', margin: '0 0 16px' }}>{form.id ? 'Edit Guide' : 'New Guide'}</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label style={s.label}>Title</label>
            <input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} style={s.input} placeholder="e.g. How to Use the Content Calendar" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
            <div>
              <label style={s.label}>Category</label>
              <select value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))} style={s.input}>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label style={s.label}>Branch (optional)</label>
              <select value={form.branch_slug || ''} onChange={e => setForm(p => ({ ...p, branch_slug: e.target.value || null }))} style={s.input}>
                <option value="">All branches</option>
                {Object.entries(BRANCH_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label style={s.label}>Role (optional)</label>
              <input value={form.role || ''} onChange={e => setForm(p => ({ ...p, role: e.target.value }))} style={s.input} placeholder="e.g. Editor, Lead" />
            </div>
          </div>
          <div>
            <label style={s.label}>Content</label>
            <textarea value={form.content} onChange={e => setForm(p => ({ ...p, content: e.target.value }))} rows={20} style={{ ...s.input, resize: 'vertical', lineHeight: 1.7 }} placeholder="Write the guide content here. Use plain text with clear headers and steps." />
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={handleSave} disabled={saving || !form.title.trim() || !form.content.trim()} style={{ ...s.saveBtn, opacity: saving ? 0.5 : 1 }}>{saving ? 'Saving...' : 'Save Guide'}</button>
            <button onClick={onCancel} style={s.cancelBtn}>Cancel</button>
          </div>
        </div>
      </div>
    </div>
  );
}

const s = {
  card: { background: CARD, border: '1px solid ' + BORDER, borderRadius: 12, padding: 20 },
  addBtn: { background: '#37CA37', border: 'none', borderRadius: 8, color: '#000', padding: '8px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer' },
  backBtn: { background: 'transparent', border: 'none', color: 'var(--text-muted)', fontSize: 13, cursor: 'pointer', padding: '4px 0', display: 'flex', alignItems: 'center', gap: 4 },
  searchInput: { flex: 1, minWidth: 200, background: CARD_LIGHT, border: '1px solid ' + BORDER, borderRadius: 8, color: WHITE, padding: '8px 14px', fontSize: 13, outline: 'none', fontFamily: 'Outfit, Arial, sans-serif' },
  select: { background: CARD_LIGHT, border: '1px solid ' + BORDER, borderRadius: 8, color: WHITE, padding: '8px 12px', fontSize: 12, outline: 'none', fontFamily: 'Outfit, Arial, sans-serif' },
  articleCard: { background: CARD, border: '1px solid ' + BORDER, borderRadius: 10, padding: 16, cursor: 'pointer', transition: 'border-color 0.15s' },
  label: { fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 },
  input: { width: '100%', boxSizing: 'border-box', background: CARD_LIGHT, border: '1px solid ' + BORDER, borderRadius: 6, color: WHITE, padding: '8px 10px', fontSize: 13, outline: 'none', fontFamily: 'Outfit, Arial, sans-serif' },
  saveBtn: { background: '#37CA37', border: 'none', borderRadius: 8, color: '#000', padding: '10px 20px', fontSize: 13, fontWeight: 700, cursor: 'pointer' },
  cancelBtn: { background: 'transparent', border: '1px solid ' + BORDER, borderRadius: 8, color: 'var(--text-muted)', padding: '10px 20px', fontSize: 13, cursor: 'pointer' },
  editBtn: { background: CARD_LIGHT, border: '1px solid ' + BORDER, borderRadius: 6, color: 'var(--text-secondary)', padding: '6px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer' },
  deleteBtn: { background: 'transparent', border: '1px solid #EF444444', borderRadius: 6, color: '#EF4444', padding: '6px 14px', fontSize: 12, cursor: 'pointer' },
};
