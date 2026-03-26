# PEACHFIT MEDIA HUB -- SESSION HANDOFF
# Date: March 26, 2026
# Use this to continue the build in a new chat session

---

## PROJECT STATUS

**Live URL:** peachfit-media-hub.vercel.app
**GitHub:** github.com/PFMediaDept/peachfit-media-hub
**Supabase project:** qpizjxgfrxhdsiybzivv (Peachfit Media, free tier)
**Vercel team:** pfmediadept (Hobby plan)

**CRITICAL:** Vercel env var `VITE_SUPABASE_ANON_KEY` must use the LEGACY anon key (starts with `eyJ...`) from Supabase Settings > API Keys > Legacy tab. The new `sb_publishable_` format does NOT work with the Supabase JS client.

---

## WHAT'S BUILT AND DEPLOYED

### Foundation (all working)
- React + Vite app with Supabase auth
- Role-based access (admin/member)
- 4 branches: YouTube, Short Form, Ads/Creative, Production
- Branded dark theme (PeachFit colors, Outfit font)
- Sidebar navigation with branch-based sections
- Login page with auth state management (fixed in v3)
- vercel.json for SPA routing

### Pages (all working)
- Dashboard (greeting, branch cards, announcements, quick access)
- Team Directory
- Department Standards (seeded with 6 standards)
- Brand Assets (seeded with colors, typography, specs)
- Quick Links (seeded with tools)
- Branch views (overview, pipeline, SOPs, onboarding)
- Admin: User Management (invite + list)
- Admin: SOP Manager (CRUD, branch assignment)
- Admin: Announcements (CRUD, branch targeting)
- Admin: Onboarding Editor (per-branch task lists)
- Admin: Settings (ClickUp embeds, quick links, brand assets, standards editors)

### Native Pipeline Board (built, deployed, needs fixes)
- Kanban board with drag-and-drop
- Task creation per column
- Task detail modal with all custom fields
- Subtask checklists (auto-generated per branch)
- Comments/activity feed per task
- Branch-specific fields (YouTube vs Short Form)

---

## KNOWN ISSUES TO FIX IN NEXT SESSION

### 1. Pipeline board showing ClickUp embed instead of native board on some deployments
The old ClickUp embed URL is still stored in the `branch_settings` table. The native PipelineBoard component IS in the code and routes correctly, but the previous deployment (v2) might be cached. The current deployed code (v4) uses PipelineBoard -- if ClickUp still shows, it's a caching issue or the user landed on an old Vercel deployment URL.

**Fix:** Clear the `clickup_embed_url` from branch_settings table. The BranchPipeline component was replaced in main.jsx with PipelineBoard -- verify this is deployed.

### 2. Task creation may fail silently
RLS policies were set to allow all authenticated users to manage pipeline_tasks, but if the policies didn't apply correctly (some were disabled earlier during debugging), task creation could fail.

**Fix:** Run in SQL Editor:
```sql
ALTER TABLE pipeline_tasks DISABLE ROW LEVEL SECURITY;
ALTER TABLE pipeline_subtasks DISABLE ROW LEVEL SECURITY;
ALTER TABLE pipeline_comments DISABLE ROW LEVEL SECURITY;
ALTER TABLE pipeline_statuses DISABLE ROW LEVEL SECURITY;
```
Then re-enable with correct policies after confirming it works.

### 3. Column headers need to be more visually prominent
Garrett wants the status column headers to look more like ClickUp's -- colored badges/pills with the status name, not just a small dot + text.

**Fix:** Update the `board.columnHeader` styles in PipelineBoard.jsx. Change from small dot to full colored pill/badge matching the status color.

### 4. Auth session sometimes hangs on page refresh
Fixed in v3 with improved AuthContext (useCallback, mounted flag, signIn sets loading), but if it still occurs, the user can navigate directly to /login to re-authenticate.

---

## DATABASE SCHEMA

### Original tables (from supabase-schema.sql -- already running):
- branches, profiles, user_branches, branch_settings
- sops, onboarding_tasks, onboarding_progress
- announcements, standards, brand_assets, quick_links
- RLS policies, auto-create profile trigger

### Pipeline tables (from pipeline-schema.sql -- already running):
- pipeline_statuses (per-branch, seeded for all 4 branches)
- pipeline_tasks (all custom fields for YouTube + Short Form)
- pipeline_subtasks (auto-generated via trigger on task creation)
- pipeline_comments (activity feed per task)

### YouTube statuses (11 columns):
Idea Bank, In Production, Rough Cut, Final Cut, QC Review, Revisions, Thumbnail Ready, Publishing Queue, Published, Posted/Archive, Archived

### Short Form statuses (10 columns):
Backlog, Script/Talking Points, Filming, Editing, QC Review, Revisions, Ready to Post, Scheduled, Published, Archived

### Ads/Creative statuses (9 columns):
Brief, Script, Filming, Editing, QC Review, Revisions, Approved, Live, Archived

### Production statuses (6 columns):
Requested, Scheduled, In Progress, Review, Complete, Archived

---

## YOUTUBE TASK FIELDS
- Title, Description/Notes
- Content Pillar: Transformation, Educational, Experiment, Grocery/Meal, Docu-Series
- Content Tier: Flagship, Standard, Quick Turnaround
- Editor Assigned (text)
- Assignee (dropdown from profiles)
- Priority: High, Medium, Low
- First Pass (checkbox)
- Due Date, Publish Date
- QC Date, QC Result (pass/minor/targeted/major/restart), QC Score (0-100%)
- Thumbnail Status: Not Started, In Progress, Ready, A/B Testing
- Talent (multi-select): Jacob Correia, Ryan Snow, Ethan Bernard, Frankie, Other
- Script Link, Drive Folder Link, Video Link, Google Doc Link
- 16 auto-generated subtasks (idea validated through published/UTM confirmed)
- Comments/activity feed

## SHORT FORM TASK FIELDS
- Title, Description/Notes
- Backlog Week (text)
- Content Pillar: Transformation, Cooking, Education, Lifestyle, Trending/Reactive
- Content Tier: Quick Turnaround, Standard, High Production
- Editor Assigned (text)
- Assignee, Priority, First Pass, Due Date, Publish Date
- Platform (multi-select): Instagram Reels, TikTok, YouTube Shorts
- QC Date, QC Result, QC Reviewer
- Talent (multi-select): Jacob Correia, Frankie, Ryan Snow, Ethan Bernard, Other
- Script Link, Drive Folder Link, Video Link, Google Doc Link
- 11 auto-generated subtasks
- Comments/activity feed

---

## FILE STRUCTURE

```
peachfit-media-hub/
  index.html
  package.json
  vite.config.js
  vercel.json
  .env.example
  supabase-schema.sql (original schema)
  pipeline-schema.sql (pipeline tables)
  src/
    main.jsx
    styles/global.css
    lib/
      supabase.js
      AuthContext.jsx
    components/
      ProtectedRoute.jsx
      Sidebar.jsx
      Layout.jsx
    pages/
      Login.jsx
      Dashboard.jsx
      Branch.jsx (BranchOverview, BranchSOPs, BranchOnboarding)
      PipelineBoard.jsx (native Kanban -- TaskDetail, TaskCard, PipelineBoard)
      AdminUsers.jsx
      AdminSOPs.jsx
      AdminAnnouncements.jsx
      AdminOnboarding.jsx
      AdminSettings.jsx (BranchSettings, QuickLinks, BrandAssets, Standards)
      GeneralPages.jsx (TeamDirectory, DeptStandards, BrandAssets, QuickLinks)
```

---

## DEPLOYMENT WORKFLOW

1. Make code changes locally (or download updated tar.gz from Claude)
2. In Terminal:
```
cd ~/Downloads/peachfit-media-hub
git add .
git commit -m "description of changes"
git push
```
3. Vercel auto-deploys from GitHub main branch (~60 seconds)
4. For database changes, run SQL in Supabase SQL Editor

---

## WHAT STILL NEEDS TO BE BUILT

### Priority 1 (fix from this session):
- [ ] Fix pipeline board column headers (colored pills, more prominent)
- [ ] Verify native pipeline loads consistently (not ClickUp embed)
- [ ] Test task creation end-to-end
- [ ] Test drag-and-drop between columns

### Priority 2 (remaining from original build list):
- [ ] README with full setup instructions
- [ ] Onboarding email template (what new hires receive)

### Priority 3 (enhancements):
- [ ] Ads/Creative and Production branch pipeline field customization
- [ ] Task filtering/search on pipeline board
- [ ] Due date color coding (overdue = red, due today = yellow)
- [ ] Subtask progress indicator on task cards
- [ ] Mobile responsive layout
- [ ] Password reset flow
- [ ] User profile edit page

---

## CONTEXT FOR NEW CHAT

Paste this at the start:

"""
I'm building the PeachFit Media Hub -- a React web portal for my media department. It's deployed and live.

**Live:** peachfit-media-hub.vercel.app
**Stack:** React + Vite, Supabase (auth + PostgreSQL), Vercel
**GitHub:** github.com/PFMediaDept/peachfit-media-hub

The full app is built with role-based auth, 4 department branches (YouTube, Short Form, Ads/Creative, Production), admin panels, SOP management, onboarding checklists, announcements, and a native Kanban pipeline board with drag-and-drop, task creation, subtasks, comments, and branch-specific custom fields.

I have a handoff document with the complete file structure, database schema, known issues, and remaining build items. The handoff doc and all source files are in the project files.

Priority for this session:
1. Fix pipeline board column headers to be more visually prominent (colored pills like ClickUp)
2. Verify native pipeline loads consistently (not old ClickUp embed)
3. Test and fix task creation if needed
4. [add whatever else you want to work on]

Brand specs: PeachFit Green #37CA37 / Neon #07FB89, Peach #F4AB9C, Black #000000, Dark #0C0C0C, Dark Light #1A1A1A, White #FFFFFF, Font: Outfit. No em dashes -- use double hyphens (--).
"""
