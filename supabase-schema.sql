-- =============================================
-- PEACHFIT MEDIA HUB - DATABASE SCHEMA
-- Run this in your Supabase SQL Editor
-- Project > SQL Editor > New Query > Paste > Run
-- =============================================

-- BRANCHES (YouTube, Short Form, Ads/Creative, Production)
CREATE TABLE branches (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  color TEXT DEFAULT '#37CA37',
  created_at TIMESTAMPTZ DEFAULT now()
);

INSERT INTO branches (name, slug, color) VALUES
  ('YouTube', 'youtube', '#378ADD'),
  ('Short Form', 'short-form', '#7F77DD'),
  ('Ads / Creative', 'ads-creative', '#D85A30'),
  ('Production', 'production', '#D4537E');

-- PROFILES (extends Supabase auth.users)
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT,
  full_name TEXT,
  title TEXT,
  role TEXT DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- USER-BRANCH ASSIGNMENTS (many-to-many)
CREATE TABLE user_branches (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  branch_id UUID REFERENCES branches(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, branch_id)
);

-- BRANCH SETTINGS (ClickUp embed URLs per branch)
CREATE TABLE branch_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  branch_slug TEXT REFERENCES branches(slug) NOT NULL UNIQUE,
  clickup_embed_url TEXT,
  updated_at TIMESTAMPTZ DEFAULT now()
);

INSERT INTO branch_settings (branch_slug) VALUES
  ('youtube'), ('short-form'), ('ads-creative'), ('production');

-- SOPs (assigned to one or more branches)
CREATE TABLE sops (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT DEFAULT 'General',
  loom_url TEXT,
  doc_url TEXT,
  branch_slugs TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ONBOARDING TASKS (per branch)
CREATE TABLE onboarding_tasks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  branch_slug TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ONBOARDING PROGRESS (per user per task)
CREATE TABLE onboarding_progress (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  task_id UUID REFERENCES onboarding_tasks(id) ON DELETE CASCADE NOT NULL,
  completed BOOLEAN DEFAULT true,
  completed_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, task_id)
);

-- ANNOUNCEMENTS
CREATE TABLE announcements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  body TEXT,
  branch_slug TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- DEPARTMENT STANDARDS
CREATE TABLE standards (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  body TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- BRAND ASSETS
CREATE TABLE brand_assets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT DEFAULT 'General',
  url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- QUICK LINKS
CREATE TABLE quick_links (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT DEFAULT 'General',
  url TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE branch_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE sops ENABLE ROW LEVEL SECURITY;
ALTER TABLE onboarding_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE onboarding_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE standards ENABLE ROW LEVEL SECURITY;
ALTER TABLE brand_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE quick_links ENABLE ROW LEVEL SECURITY;

-- Profiles: users can read all profiles, update their own
CREATE POLICY "Profiles are viewable by all authenticated users"
  ON profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "Admins can insert profiles"
  ON profiles FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Admins can update any profile"
  ON profiles FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- User branches: readable by all, writable by admins
CREATE POLICY "User branches viewable by all"
  ON user_branches FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage user branches"
  ON user_branches FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Branch settings: readable by all, writable by admins
CREATE POLICY "Branch settings viewable by all"
  ON branch_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage branch settings"
  ON branch_settings FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- SOPs: readable by all authenticated
CREATE POLICY "SOPs viewable by all"
  ON sops FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage SOPs"
  ON sops FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Onboarding tasks: readable by all
CREATE POLICY "Onboarding tasks viewable by all"
  ON onboarding_tasks FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage onboarding tasks"
  ON onboarding_tasks FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Onboarding progress: users manage their own
CREATE POLICY "Users view own progress"
  ON onboarding_progress FOR SELECT TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "Users manage own progress"
  ON onboarding_progress FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users delete own progress"
  ON onboarding_progress FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- Announcements: readable by all
CREATE POLICY "Announcements viewable by all"
  ON announcements FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage announcements"
  ON announcements FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Standards, brand assets, quick links: readable by all, admin writable
CREATE POLICY "Standards viewable by all"
  ON standards FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage standards"
  ON standards FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Brand assets viewable by all"
  ON brand_assets FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage brand assets"
  ON brand_assets FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Quick links viewable by all"
  ON quick_links FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage quick links"
  ON quick_links FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- =============================================
-- AUTO-CREATE PROFILE ON SIGNUP
-- =============================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =============================================
-- SEED DATA (Quick Links, Brand Assets, Standards)
-- =============================================

INSERT INTO quick_links (title, description, category, url) VALUES
  ('Google Drive', 'Shared media department drive', 'Tools', 'https://drive.google.com'),
  ('Slack', 'Team communication', 'Tools', 'https://slack.com'),
  ('ClickUp', 'Content pipeline and project management', 'Tools', 'https://app.clickup.com'),
  ('Metricool', 'Content scheduling', 'Tools', 'https://metricool.com'),
  ('HYROS', 'Revenue attribution', 'Analytics', 'https://hyros.com'),
  ('ManyChat', 'IG DM automation', 'Tools', 'https://manychat.com');

INSERT INTO brand_assets (title, description, category, url) VALUES
  ('PeachFit Green (Documents)', '#37CA37', 'Colors', '#'),
  ('Neon Green (Creative)', '#07FB89', 'Colors', '#'),
  ('Peach', '#F4AB9C', 'Colors', '#'),
  ('Black', '#000000', 'Colors', '#'),
  ('White', '#FFFFFF', 'Colors', '#'),
  ('Dark Background Primary', '#0C0C0C', 'Colors', '#'),
  ('Typography: Outfit (preferred)', 'Arial as fallback', 'Typography', 'https://fonts.google.com/specimen/Outfit'),
  ('Thumbnail Size', '1280x720', 'Specs', '#'),
  ('IG Carousel Size', '1080x1350', 'Specs', '#');

INSERT INTO standards (title, body, sort_order) VALUES
  ('Slack Response Time', 'All team members respond within 15 minutes during work hours. Deep work blocks are the exception -- check at next scheduled break (every 2 hours max for editors, every 90 minutes for short form).', 1),
  ('Lock-In Messages', 'Post your next-day to-do list before end of day. Include: yesterday''s accountability, today''s top priority, secondary outcomes, active pipeline status, and blockers.', 2),
  ('Editor Feedback Standard', 'All feedback includes: Ad #, Hook #, Overlay version, Audio notes, Visual notes, Specific timing notes. Clear. Bullet. Actionable. No vague feedback.', 3),
  ('Google Drive Standards', 'Strict folder hierarchy with standardized naming. Long-form path: PeachFit Social Media > Content > Long Form YouTube > PeachFit Videos > Unposted Videos > [Video Title Folder]. Inside each folder: Raw footage, Script, Overlays, Music, Assets.', 4),
  ('Meeting Participation', 'Everyone contributes. No passive attendance. If someone is not participating, that is a structural problem to address.', 5),
  ('Communication Rules', 'No em dashes -- use double hyphens (--) or restructure. Copy-paste ready for destination. No cleanup required.', 6);
