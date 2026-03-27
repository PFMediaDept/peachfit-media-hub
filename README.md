# PeachFit Media Hub

Internal operations portal for the PeachFit Media Department. Built with React + Vite, Supabase (auth + PostgreSQL), and deployed on Vercel.

**Live:** [peachfit-media-hub.vercel.app](https://peachfit-media-hub.vercel.app)

---

## What It Does

The Media Hub is the central command center for the media department. Every team member logs in to see their tasks, track content through the pipeline, and stay aligned on what's shipping and when.

- **My Tasks** -- personal view of everything assigned to you (tasks, subtasks, editor assignments) with stats and filters
- **Content Calendar** -- month/week views with drag-to-reschedule, quick-add, status color-coding, backlog sidebar, Stories support, and shareable read-only links
- **Pipeline Board** -- Kanban board per branch (YouTube, Short Form, Ads/Creative, Production) with drag-and-drop, task detail modal, subtask checklists, and comments
- **Notifications** -- in-app bell icon with real-time updates + automatic Slack DMs when you get assigned to something
- **Team Directory** -- who's on the team, their roles, branches, and contact info
- **SOPs & Training** -- standard operating procedures organized by branch
- **Onboarding Checklists** -- per-branch task lists for new hires
- **Brand Assets** -- colors, typography, specs all in one place
- **Admin Panel** -- user management, SOP editor, announcements, settings
- **Mobile App** -- full mobile experience with bottom tab bar, timeline calendar, app-style pipeline, and bottom sheet task details

---

## Tech Stack

| Layer | Tool |
|-------|------|
| Frontend | React 18 + Vite |
| Auth | Supabase Auth (email/password) |
| Database | Supabase PostgreSQL |
| File Storage | Supabase Storage (avatars) |
| Hosting | Vercel (auto-deploy from GitHub) |
| Slack Integration | Slack Bot API via pg_net |
| Repo | github.com/PFMediaDept/peachfit-media-hub |

---

## Project Structure

```
peachfit-media-hub/
  public/
    logo.avif                 # PeachFit logo
  src/
    main.jsx                  # Routes and app entry
    styles/global.css         # Global styles + mobile responsive
    lib/
      supabase.js             # Supabase client
      AuthContext.jsx          # Auth provider + hooks
    components/
      Layout.jsx              # Desktop/mobile layout switcher
      Sidebar.jsx             # Desktop sidebar navigation
      MobileNav.jsx           # Bottom tab bar for mobile
      NotificationBell.jsx    # Real-time notification dropdown
      ProtectedRoute.jsx      # Auth guard
    pages/
      Login.jsx               # Sign in + forgot password
      ResetPassword.jsx       # Password reset form
      Dashboard.jsx           # Home page with branch cards
      MyTasks.jsx             # Personal task command center
      ContentCalendar.jsx     # Calendar + public share view
      MobileCalendar.jsx      # Mobile timeline calendar
      PipelineBoard.jsx       # Desktop Kanban board
      MobilePipeline.jsx      # Mobile app-style pipeline
      ProfileEdit.jsx         # Edit profile, upload avatar
      Branch.jsx              # Branch overview, SOPs, onboarding
      AdminUsers.jsx          # Invite + manage team members
      AdminSOPs.jsx           # Create/edit SOPs
      AdminAnnouncements.jsx  # Announcements CRUD
      AdminOnboarding.jsx     # Onboarding checklists
      AdminSettings.jsx       # ClickUp embeds, quick links, etc.
      GeneralPages.jsx        # Team directory, standards, assets, links
  supabase-schema.sql         # Core database schema
  pipeline-schema.sql         # Pipeline tables + triggers
  vercel.json                 # SPA routing config
  package.json
  vite.config.js
```

---

## Local Development Setup

### Prerequisites

- Node.js 18+
- npm
- Git
- A Supabase project (free tier works)

### 1. Clone the repo

```bash
git clone https://github.com/PFMediaDept/peachfit-media-hub.git
cd peachfit-media-hub
npm install
```

### 2. Environment variables

Create a `.env` file in the project root:

```
VITE_SUPABASE_URL=https://qpizjxgfrxhdsiybzivv.supabase.co
VITE_SUPABASE_ANON_KEY=your_legacy_anon_key_here
```

**CRITICAL:** The anon key must be the **legacy** key from Supabase Settings > API Keys > Legacy tab. It starts with `eyJ...`.

### 3. Run locally

```bash
npm run dev
```

Opens at `http://localhost:5173`

### 4. Database setup (first time only)

Run these SQL files in Supabase SQL Editor in order:

1. `supabase-schema.sql` -- core tables (profiles, branches, SOPs, etc.)
2. `pipeline-schema.sql` -- pipeline tables, statuses, subtask triggers

Then run these additional migrations (found in chat history, save them locally):

3. Notifications table + assignment triggers
4. Calendar shares + public calendar function
5. Profile fields (phone, bio, avatar_url, location, slack_handle)
6. Content type field on pipeline_tasks
7. Slack DM notification trigger

---

## Deployment

Vercel auto-deploys from the `main` branch on GitHub.

```bash
git add .
git commit -m "description of changes"
git push
```

Vercel picks it up automatically. If deploy doesn't trigger:

```bash
git commit --allow-empty -m "Trigger deploy" && git push
```

### Vercel Environment Variables

Set these in Vercel dashboard > Settings > Environment Variables:

- `VITE_SUPABASE_URL` -- your Supabase project URL
- `VITE_SUPABASE_ANON_KEY` -- legacy anon key (starts with `eyJ...`)

---

## Adding a New Team Member

1. Go to **Admin > User Management** in the Media Hub
2. Enter their email and click Invite
3. Supabase sends them an invite email
4. They click the link, set their password, and land on the dashboard
5. Assign them to branches in Admin > User Management
6. Set their Slack user ID in Supabase SQL Editor:

```sql
UPDATE profiles SET slack_user_id = 'UXXXXXXXXXX' WHERE email = 'their@email.com';
```

To find someone's Slack user ID: open Slack > click their profile > click "..." > Copy member ID.

---

## Known Issues and Recurring Fixes

### Subtask colors revert to gray after PipelineBoard updates

The database defaults subtask colors to `#6B7280`. The code must check for this default and fall back to the color map. After any PipelineBoard deploy, verify with:

```bash
grep "st.color !== '#6B7280'" src/pages/PipelineBoard.jsx
```

If missing, run:

```bash
sed -i '' "s/const stColor = st.color || SUBTASK_COLORS/const stColor = (st.color \&\& st.color !== '#6B7280') ? st.color : SUBTASK_COLORS/" src/pages/PipelineBoard.jsx
```

### Subtask assignees showing initials instead of full names

Verify with:

```bash
grep "full_name" src/pages/PipelineBoard.jsx | grep option
```

### File downloads from Claude open in After Effects on macOS

Always download `.jsx` files as `.txt` and rename via Terminal:

```bash
cp ~/Downloads/FILENAME.txt ~/Downloads/peachfit-media-hub/src/pages/FILENAME.jsx
```

---

## Database Schema Overview

### Core Tables

- **profiles** -- user accounts (name, email, title, role, avatar, slack_user_id)
- **branches** -- department branches (YouTube, Short Form, Ads/Creative, Production)
- **user_branches** -- which users belong to which branches
- **sops** -- standard operating procedures per branch
- **onboarding_tasks** -- per-branch onboarding checklists
- **announcements** -- department announcements
- **standards** -- department standards and rules
- **brand_assets** -- colors, typography, specs
- **quick_links** -- tool links (Drive, Slack, ClickUp, etc.)

### Pipeline Tables

- **pipeline_statuses** -- status columns per branch (Idea Bank, In Production, etc.)
- **pipeline_tasks** -- content tasks with all custom fields
- **pipeline_subtasks** -- auto-generated checklists per task with color coding
- **pipeline_comments** -- activity feed per task

### Notification Tables

- **notifications** -- in-app + Slack DM notifications (auto-generated by triggers)
- **calendar_shares** -- public calendar share tokens

### Key Triggers

- Task/subtask/editor assignment changes -> auto-create notification
- New notification -> auto-send Slack DM via pg_net
- New pipeline task -> auto-generate subtasks per branch

---

## Branch-Specific Pipeline Statuses

**YouTube (11):** Idea Bank, In Production, Rough Cut, Final Cut, QC Review, Revisions, Thumbnail Ready, Publishing Queue, Published, Posted/Archive, Archived

**Short Form (10):** Backlog, Script/Talking Points, Filming, Editing, QC Review, Revisions, Ready to Post, Scheduled, Published, Archived

**Ads/Creative (9):** Brief, Script, Filming, Editing, QC Review, Revisions, Approved, Live, Archived

**Production (6):** Requested, Scheduled, In Progress, Review, Complete, Archived

---

## Brand Specs

- **PeachFit Green:** #37CA37 (docs) / #07FB89 (neon)
- **Peach:** #F4AB9C
- **Black:** #000000
- **Dark backgrounds:** #0C0C0C (primary), #1A1A1A (light), #141414 (card)
- **Border:** #2A2A2A
- **White:** #FFFFFF
- **Font:** Outfit (Google Fonts), Arial fallback
- **Dark theme throughout**
- **No em dashes** -- use double hyphens (--)

---

## Contact

Garrett Harper -- garrett@peachfitwellness.com
Media Department Head, PeachFit Wellness
