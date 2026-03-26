-- =============================================
-- PEACHFIT MEDIA HUB - PIPELINE SCHEMA
-- Run this in your Supabase SQL Editor
-- =============================================

-- PIPELINE STATUSES (per branch, ordered)
CREATE TABLE pipeline_statuses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  branch_slug TEXT NOT NULL,
  name TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  color TEXT DEFAULT '#37CA37',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- PIPELINE TASKS (main task/video card)
CREATE TABLE pipeline_tasks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  branch_slug TEXT NOT NULL,
  status_id UUID REFERENCES pipeline_statuses(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  sort_order INTEGER DEFAULT 0,

  -- Common fields
  assignee_id UUID REFERENCES profiles(id),
  due_date DATE,
  publish_date DATE,
  priority TEXT CHECK (priority IN ('high', 'medium', 'low')),
  first_pass BOOLEAN DEFAULT false,

  -- YouTube-specific fields
  content_pillar TEXT,
  content_tier TEXT,
  editor_assigned TEXT,
  qc_date DATE,
  qc_result TEXT,
  qc_score INTEGER,
  revenue_attribution JSONB DEFAULT '{}',
  thumbnail_status TEXT DEFAULT 'not-started',

  -- Short Form-specific fields
  backlog_week TEXT,
  platform TEXT[],
  qc_reviewer TEXT,

  -- Talent (multi-select, stored as array)
  talent TEXT[] DEFAULT '{}',

  -- Links
  script_link TEXT,
  drive_folder_link TEXT,
  google_doc_link TEXT,
  video_link TEXT,

  -- Metadata
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- PIPELINE SUBTASKS (checklist items per task)
CREATE TABLE pipeline_subtasks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID REFERENCES pipeline_tasks(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  completed BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  completed_at TIMESTAMPTZ,
  completed_by UUID REFERENCES profiles(id)
);

-- PIPELINE COMMENTS (notes/activity on tasks)
CREATE TABLE pipeline_comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID REFERENCES pipeline_tasks(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) NOT NULL,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- RLS POLICIES
-- =============================================

ALTER TABLE pipeline_statuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE pipeline_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE pipeline_subtasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE pipeline_comments ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read
CREATE POLICY "Pipeline statuses viewable by all" ON pipeline_statuses FOR SELECT TO authenticated USING (true);
CREATE POLICY "Pipeline tasks viewable by all" ON pipeline_tasks FOR SELECT TO authenticated USING (true);
CREATE POLICY "Pipeline subtasks viewable by all" ON pipeline_subtasks FOR SELECT TO authenticated USING (true);
CREATE POLICY "Pipeline comments viewable by all" ON pipeline_comments FOR SELECT TO authenticated USING (true);

-- All authenticated users can manage tasks (team members need to move cards, check subtasks, etc.)
CREATE POLICY "Authenticated users manage tasks" ON pipeline_tasks FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users manage subtasks" ON pipeline_subtasks FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users manage comments" ON pipeline_comments FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Only admins manage statuses
CREATE POLICY "Admins manage statuses" ON pipeline_statuses FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- =============================================
-- SEED: YOUTUBE STATUSES
-- =============================================

INSERT INTO pipeline_statuses (branch_slug, name, sort_order, color) VALUES
  ('youtube', 'Idea Bank', 1, '#6B7280'),
  ('youtube', 'In Production', 2, '#F59E0B'),
  ('youtube', 'Rough Cut', 3, '#3B82F6'),
  ('youtube', 'Final Cut', 4, '#8B5CF6'),
  ('youtube', 'QC Review', 5, '#EC4899'),
  ('youtube', 'Revisions', 6, '#EF4444'),
  ('youtube', 'Thumbnail Ready', 7, '#F97316'),
  ('youtube', 'Publishing Queue', 8, '#10B981'),
  ('youtube', 'Published', 9, '#37CA37'),
  ('youtube', 'Posted / Archive', 10, '#6366F1'),
  ('youtube', 'Archived', 11, '#9CA3AF');

-- =============================================
-- SEED: SHORT FORM STATUSES
-- =============================================

INSERT INTO pipeline_statuses (branch_slug, name, sort_order, color) VALUES
  ('short-form', 'Backlog', 1, '#6B7280'),
  ('short-form', 'Script/Talking Points', 2, '#F59E0B'),
  ('short-form', 'Filming', 3, '#3B82F6'),
  ('short-form', 'Editing', 4, '#8B5CF6'),
  ('short-form', 'QC Review', 5, '#EC4899'),
  ('short-form', 'Revisions', 6, '#EF4444'),
  ('short-form', 'Ready to Post', 7, '#10B981'),
  ('short-form', 'Scheduled', 8, '#37CA37'),
  ('short-form', 'Published', 9, '#6366F1'),
  ('short-form', 'Archived', 10, '#9CA3AF');

-- =============================================
-- SEED: ADS/CREATIVE STATUSES
-- =============================================

INSERT INTO pipeline_statuses (branch_slug, name, sort_order, color) VALUES
  ('ads-creative', 'Brief', 1, '#6B7280'),
  ('ads-creative', 'Script', 2, '#F59E0B'),
  ('ads-creative', 'Filming', 3, '#3B82F6'),
  ('ads-creative', 'Editing', 4, '#8B5CF6'),
  ('ads-creative', 'QC Review', 5, '#EC4899'),
  ('ads-creative', 'Revisions', 6, '#EF4444'),
  ('ads-creative', 'Approved', 7, '#10B981'),
  ('ads-creative', 'Live', 8, '#37CA37'),
  ('ads-creative', 'Archived', 9, '#9CA3AF');

-- =============================================
-- SEED: PRODUCTION STATUSES
-- =============================================

INSERT INTO pipeline_statuses (branch_slug, name, sort_order, color) VALUES
  ('production', 'Requested', 1, '#6B7280'),
  ('production', 'Scheduled', 2, '#F59E0B'),
  ('production', 'In Progress', 3, '#3B82F6'),
  ('production', 'Review', 4, '#EC4899'),
  ('production', 'Complete', 5, '#37CA37'),
  ('production', 'Archived', 6, '#9CA3AF');

-- =============================================
-- DEFAULT SUBTASK TEMPLATES
-- =============================================

-- Function to auto-create subtasks when a YouTube task is created
CREATE OR REPLACE FUNCTION create_youtube_subtasks()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.branch_slug = 'youtube' THEN
    INSERT INTO pipeline_subtasks (task_id, title, sort_order) VALUES
      (NEW.id, 'Idea validated and approved', 1),
      (NEW.id, 'Script drafted', 2),
      (NEW.id, 'Script reviewed and approved', 3),
      (NEW.id, 'Filming scheduled', 4),
      (NEW.id, 'Filming complete', 5),
      (NEW.id, 'Raw footage uploaded to Drive', 6),
      (NEW.id, 'Editor assigned and briefed', 7),
      (NEW.id, 'Rough cut delivered', 8),
      (NEW.id, 'QC reviewed rough cut', 9),
      (NEW.id, 'Loom feedback sent', 10),
      (NEW.id, 'Revisions complete -- final cut delivered', 11),
      (NEW.id, 'QC reviewed final cut', 12),
      (NEW.id, 'Thumbnails designed (3 variations)', 13),
      (NEW.id, 'Thumbnail selected', 14),
      (NEW.id, 'Metadata prepared (title, description, tags, cards, end screen)', 15),
      (NEW.id, 'Published -- UTM/HYROS tracking confirmed', 16);
  END IF;

  IF NEW.branch_slug = 'short-form' THEN
    INSERT INTO pipeline_subtasks (task_id, title, sort_order) VALUES
      (NEW.id, 'Script/talking points written', 1),
      (NEW.id, 'Filming complete', 2),
      (NEW.id, 'Raw footage uploaded to Drive', 3),
      (NEW.id, 'Editing complete', 4),
      (NEW.id, 'Captions/subtitles added', 5),
      (NEW.id, 'QC review pass', 6),
      (NEW.id, 'Approved video uploaded to Drive', 7),
      (NEW.id, 'Recommended sound added', 8),
      (NEW.id, 'Caption added to post', 9),
      (NEW.id, 'Video scheduled on platform(s)', 10),
      (NEW.id, 'Published and confirmed live', 11);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_pipeline_task_created
  AFTER INSERT ON pipeline_tasks
  FOR EACH ROW EXECUTE FUNCTION create_youtube_subtasks();
