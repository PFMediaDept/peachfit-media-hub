import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';
import { useSearchParams } from 'react-router-dom';

const GREEN = 'var(--green)';
const CARD = 'var(--dark-card)';
const CARD_LIGHT = 'var(--dark-light)';
const BORDER = 'var(--dark-border)';
const WHITE = 'var(--white)';

const BRANCH_COLORS = { youtube: '#FF0000', 'short-form': '#8B5CF6', 'ads-creative': '#F59E0B', production: '#3B82F6' };
const BRANCH_LABELS = { youtube: 'YouTube', 'short-form': 'Short Form', 'ads-creative': 'Ads/Creative', production: 'Production' };

const CATEGORIES = ['Getting Started', 'Daily Workflow', 'Pipeline & Tasks', 'Content Calendar', 'SOB Campaigns', 'Analytics & Reporting', 'Tools & Integrations', 'Department Standards', 'Role-Specific'];
const CATEGORY_ICONS = { 'Getting Started': '🚀', 'Daily Workflow': '📋', 'Pipeline & Tasks': '🔄', 'Content Calendar': '📅', 'SOB Campaigns': '📣', 'Analytics & Reporting': '📊', 'Tools & Integrations': '🔧', 'Department Standards': '📏', 'Role-Specific': '👤' };

function searchArticles(articles, query) {
  if (!query.trim()) return null;
  const terms = query.toLowerCase().split(/\s+/).filter(t => t.length > 1);
  if (terms.length === 0) return null;

  const results = [];
  for (const a of articles) {
    const titleLower = a.title.toLowerCase();
    const contentLower = (a.content || '').toLowerCase();
    const catLower = a.category.toLowerCase();
    let score = 0;
    let matchedTerms = 0;
    let snippetStart = -1;

    for (const term of terms) {
      const titleMatch = titleLower.includes(term);
      const contentMatch = contentLower.includes(term);
      const catMatch = catLower.includes(term);

      if (titleMatch) { score += 10; matchedTerms++; }
      if (contentMatch) {
        // Count occurrences in content for relevance
        let count = 0;
        let idx = 0;
        while ((idx = contentLower.indexOf(term, idx)) !== -1) { count++; idx += term.length; }
        score += Math.min(count, 5); // Cap at 5 per term
        matchedTerms++;
        // Find first occurrence for snippet
        if (snippetStart === -1) { snippetStart = contentLower.indexOf(term); }
      }
      if (catMatch) { score += 2; matchedTerms++; }
    }

    if (matchedTerms > 0) {
      // Generate snippet around the first match in content
      let snippet = '';
      if (snippetStart !== -1) {
        const start = Math.max(0, snippetStart - 80);
        const end = Math.min((a.content || '').length, snippetStart + 200);
        snippet = (start > 0 ? '...' : '') + (a.content || '').slice(start, end).trim() + (end < (a.content || '').length ? '...' : '');
      }

      results.push({ ...a, score, matchedTerms, snippet, totalTerms: terms.length });
    }
  }

  // Sort by: matched term count (desc), then score (desc)
  results.sort((a, b) => {
    if (b.matchedTerms !== a.matchedTerms) return b.matchedTerms - a.matchedTerms;
    return b.score - a.score;
  });

  return results;
}

function highlightText(text, query) {
  if (!query.trim() || !text) return text;
  const terms = query.toLowerCase().split(/\s+/).filter(t => t.length > 1);
  if (terms.length === 0) return text;

  // Build a regex that matches any of the terms (case insensitive)
  const escaped = terms.map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const regex = new RegExp(`(${escaped.join('|')})`, 'gi');
  const parts = text.split(regex);

  return parts.map((part, i) => {
    if (terms.includes(part.toLowerCase())) {
      return <mark key={i} style={{ background: '#37CA3733', color: '#37CA37', borderRadius: 2, padding: '0 2px' }}>{part}</mark>;
    }
    return part;
  });
}

export default function KnowledgeBase() {
  const { isAdmin } = useAuth();
  const [searchParams] = useSearchParams();
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
      const articleId = searchParams.get('article');
      if (articleId) { const found = data.find(a => a.id === articleId); if (found) setSelectedArticle(found); }
    }
    setLoading(false);
  }

  const isSearching = search.trim().length > 1;

  const searchResults = useMemo(() => {
    if (!isSearching) return null;
    return searchArticles(articles, search);
  }, [articles, search, isSearching]);

  const filtered = useMemo(() => {
    if (isSearching) return []; // Search results handled separately
    let f = articles;
    if (catFilter !== 'all') f = f.filter(a => a.category === catFilter);
    if (branchFilter !== 'all') f = f.filter(a => !a.branch_slug || a.branch_slug === branchFilter);
    return f;
  }, [articles, catFilter, branchFilter, isSearching]);

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
        <button onClick={() => { setSelectedArticle(null); window.history.replaceState({}, '', '/knowledge-base'); }} style={s.backBtn}>&larr; Back to Knowledge Base</button>
        <div style={{ ...s.card, marginTop: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: 11, color: 'var(--text-muted)', background: CARD_LIGHT, padding: '2px 8px', borderRadius: 4 }}>{a.category}</span>
            {a.branch_slug && <span style={{ fontSize: 11, color: BRANCH_COLORS[a.branch_slug], fontWeight: 600 }}>{BRANCH_LABELS[a.branch_slug]}</span>}
            {a.role && <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>-- {a.role}</span>}
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: WHITE, margin: '8px 0 16px' }}>{a.title}</h1>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>{a.content}</div>
          {isAdmin && (
            <div style={{ display: 'flex', gap: 8, marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--dark-border)' }}>
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
          <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>{articles.length} guides available -- search anything</p>
        </div>
        {isAdmin && <button onClick={() => setEditing({ title: '', category: 'Getting Started', content: '', branch_slug: '', role: '', sort_order: 0 })} style={s.addBtn}>+ New Guide</button>}
      </div>

      {/* Search bar -- prominent, Google-style */}
      <div style={{ position: 'relative', marginBottom: 20 }}>
        <div style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        </div>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search all guides... try 'purchase order', 'SOB keyword', 'deadline', 'editor feedback'"
          style={s.searchInput}
        />
        {search && (
          <button onClick={() => setSearch('')} style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 18 }}>&times;</button>
        )}
      </div>

      {/* Filters -- only show when not searching */}
      {!isSearching && (
        <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
          <select value={catFilter} onChange={e => setCatFilter(e.target.value)} style={s.select}>
            <option value="all">All Categories</option>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <select value={branchFilter} onChange={e => setBranchFilter(e.target.value)} style={s.select}>
            <option value="all">All Branches</option>
            {Object.entries(BRANCH_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
      )}

      {/* Search results view */}
      {isSearching && (
        <div>
          {searchResults && searchResults.length > 0 ? (
            <>
              <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 12 }}>{searchResults.length} result{searchResults.length !== 1 ? 's' : ''} for "{search}"</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {searchResults.map(a => (
                  <div key={a.id} onClick={() => setSelectedArticle(a)} style={s.searchResultCard}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span style={{ fontSize: 14 }}>{CATEGORY_ICONS[a.category] || '📄'}</span>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{a.category}</span>
                      {a.branch_slug && <span style={{ fontSize: 10, color: BRANCH_COLORS[a.branch_slug], fontWeight: 600 }}>{BRANCH_LABELS[a.branch_slug]}</span>}
                      <span style={{ fontSize: 10, color: 'var(--text-muted)', marginLeft: 'auto' }}>
                        {a.matchedTerms}/{a.totalTerms} terms matched
                      </span>
                    </div>
                    <h3 style={{ fontSize: 15, fontWeight: 700, color: WHITE, margin: '0 0 6px', lineHeight: 1.3 }}>
                      {highlightText(a.title, search)}
                    </h3>
                    {a.snippet && (
                      <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0, lineHeight: 1.5 }}>
                        {highlightText(a.snippet, search)}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div style={{ ...s.card, textAlign: 'center', padding: 40 }}>
              <p style={{ color: 'var(--text-muted)', fontSize: 14, margin: '0 0 8px' }}>No results for "{search}"</p>
              <p style={{ color: 'var(--text-muted)', fontSize: 12 }}>Try different keywords or check spelling</p>
            </div>
          )}
        </div>
      )}

      {/* Category browse view -- only show when not searching */}
      {!isSearching && (
        <>
          {Object.keys(grouped).length === 0 && (
            <div style={{ ...s.card, textAlign: 'center', padding: 40 }}>
              <p style={{ color: 'var(--text-muted)', fontSize: 14, margin: '0 0 12px' }}>No guides yet.</p>
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
        </>
      )}
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
            <textarea value={form.content} onChange={e => setForm(p => ({ ...p, content: e.target.value }))} rows={20} style={{ ...s.input, resize: 'vertical', lineHeight: 1.7 }} placeholder="Write the guide content here." />
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
  card: { background: CARD, border: '1px solid var(--dark-border)', borderRadius: 12, padding: 20 },
  addBtn: { background: '#37CA37', border: 'none', borderRadius: 8, color: '#000', padding: '8px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer' },
  backBtn: { background: 'transparent', border: 'none', color: 'var(--text-muted)', fontSize: 13, cursor: 'pointer', padding: '4px 0', display: 'flex', alignItems: 'center', gap: 4 },
  searchInput: { width: '100%', boxSizing: 'border-box', background: CARD, border: '1px solid var(--dark-border)', borderRadius: 12, color: WHITE, padding: '14px 42px', fontSize: 14, outline: 'none', fontFamily: 'Outfit, Arial, sans-serif', transition: 'border-color 0.15s' },
  select: { background: CARD_LIGHT, border: '1px solid var(--dark-border)', borderRadius: 8, color: WHITE, padding: '8px 12px', fontSize: 12, outline: 'none', fontFamily: 'Outfit, Arial, sans-serif' },
  articleCard: { background: CARD, border: '1px solid var(--dark-border)', borderRadius: 10, padding: 16, cursor: 'pointer', transition: 'border-color 0.15s' },
  searchResultCard: { background: CARD, border: '1px solid var(--dark-border)', borderRadius: 10, padding: 16, cursor: 'pointer', transition: 'border-color 0.15s' },
  label: { fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 },
  input: { width: '100%', boxSizing: 'border-box', background: CARD_LIGHT, border: '1px solid var(--dark-border)', borderRadius: 6, color: WHITE, padding: '8px 10px', fontSize: 13, outline: 'none', fontFamily: 'Outfit, Arial, sans-serif' },
  saveBtn: { background: '#37CA37', border: 'none', borderRadius: 8, color: '#000', padding: '10px 20px', fontSize: 13, fontWeight: 700, cursor: 'pointer' },
  cancelBtn: { background: 'transparent', border: '1px solid var(--dark-border)', borderRadius: 8, color: 'var(--text-muted)', padding: '10px 20px', fontSize: 13, cursor: 'pointer' },
  editBtn: { background: CARD_LIGHT, border: '1px solid var(--dark-border)', borderRadius: 6, color: 'var(--text-secondary)', padding: '6px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer' },
  deleteBtn: { background: 'transparent', border: '1px solid #EF444444', borderRadius: 6, color: '#EF4444', padding: '6px 14px', fontSize: 12, cursor: 'pointer' },
};
