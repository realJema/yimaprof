-- Create series reference table for educational tracks
CREATE TABLE public.series (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    code text NOT NULL,
    name text NOT NULL,
    name_en text,
    name_fr text,
    system text NOT NULL CHECK (system IN ('francophone', 'anglophone', 'general')),
    description text,
    order_number integer DEFAULT 0,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.series ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Anyone can view active series
CREATE POLICY "Anyone can view active series" 
ON public.series 
FOR SELECT 
USING (is_active = true);

-- RLS Policies: Admins can manage all series
CREATE POLICY "Admins can manage series" 
ON public.series 
FOR ALL 
USING (is_admin(auth.uid()));

-- Add series_id to exams table (nullable for existing exams)
ALTER TABLE public.exams ADD COLUMN series_id uuid REFERENCES public.series(id);

-- Insert initial Francophone series
INSERT INTO public.series (code, name, name_en, name_fr, system, description, order_number) VALUES
('GEN', 'General', 'General', 'Général', 'general', 'For exams applicable to all series or legacy exams without a defined series', 0),
('A', 'Serie A', 'Series A - Letters and Philosophy', 'Série A - Lettres et Philosophie', 'francophone', 'Focus on literature, languages, and philosophy', 1),
('B', 'Serie B', 'Series B - Economics and Social Sciences', 'Série B - Sciences Économiques et Sociales', 'francophone', 'Focus on economics and social sciences', 2),
('C', 'Serie C', 'Series C - Mathematics and Physics', 'Série C - Mathématiques et Sciences Physiques', 'francophone', 'Focus on pure mathematics and physics', 3),
('D', 'Serie D', 'Series D - Life and Earth Sciences', 'Série D - Sciences de la Vie et de la Terre', 'francophone', 'Focus on biology, chemistry, and earth sciences', 4),
('E', 'Serie E/TI', 'Series E/TI - Industrial Technology', 'Série E/TI - Techniques Industrielles', 'francophone', 'Focus on industrial and technical skills', 5),
('F', 'Serie F', 'Series F - Management Technology', 'Série F - Techniques de Gestion', 'francophone', 'Focus on business and management', 6);

-- Insert initial Anglophone series
INSERT INTO public.series (code, name, name_en, name_fr, system, description, order_number) VALUES
('S1', 'Science S1', 'Science S1 (Math, Physics, Chemistry)', 'Sciences S1 (Maths, Physique, Chimie)', 'anglophone', 'Mathematics, Physics, Chemistry', 10),
('S2', 'Science S2', 'Science S2 (Math, Chemistry, Biology)', 'Sciences S2 (Maths, Chimie, Biologie)', 'anglophone', 'Mathematics, Chemistry, Biology', 11),
('S3', 'Science S3', 'Science S3 (Physics, Chemistry, Biology)', 'Sciences S3 (Physique, Chimie, Biologie)', 'anglophone', 'Physics, Chemistry, Biology', 12),
('A1', 'Arts A1', 'Arts A1 (Literature, History, Economics)', 'Arts A1 (Littérature, Histoire, Économie)', 'anglophone', 'Literature, History, Economics', 13),
('A2', 'Arts A2', 'Arts A2 (Literature, Economics, Geography)', 'Arts A2 (Littérature, Économie, Géographie)', 'anglophone', 'Literature, Economics, Geography', 14),
('A3', 'Arts A3', 'Arts A3 (History, Economics, Geography)', 'Arts A3 (Histoire, Économie, Géographie)', 'anglophone', 'History, Economics, Geography', 15),
('A4', 'Arts A4', 'Arts A4 (Literature, French, History)', 'Arts A4 (Littérature, Français, Histoire)', 'anglophone', 'Literature, French, History', 16),
('A5', 'Arts A5', 'Arts A5 (History, Geography, Philosophy)', 'Arts A5 (Histoire, Géographie, Philosophie)', 'anglophone', 'History, Geography, Philosophy', 17);