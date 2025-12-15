-- Create forum_topics table
CREATE TABLE public.forum_topics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  is_closed BOOLEAN DEFAULT FALSE,
  is_hidden BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  reply_count INTEGER DEFAULT 0,
  view_count INTEGER DEFAULT 0
);

-- Create forum_replies table
CREATE TABLE public.forum_replies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  topic_id UUID NOT NULL REFERENCES public.forum_topics(id) ON DELETE CASCADE,
  parent_reply_id UUID REFERENCES public.forum_replies(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  is_deleted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  depth INTEGER DEFAULT 0
);

-- Create forum_reactions table
CREATE TABLE public.forum_reactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  reply_id UUID NOT NULL REFERENCES public.forum_replies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reaction_type TEXT NOT NULL DEFAULT 'like',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(reply_id, user_id, reaction_type)
);

-- Enable RLS
ALTER TABLE public.forum_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_reactions ENABLE ROW LEVEL SECURITY;

-- Forum topics policies
CREATE POLICY "Anyone can view non-hidden topics"
  ON public.forum_topics FOR SELECT
  USING (is_hidden = false OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'::app_role));

CREATE POLICY "Authenticated users can create topics"
  ON public.forum_topics FOR INSERT
  WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Admins can update topics"
  ON public.forum_topics FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'::app_role));

-- Forum replies policies
CREATE POLICY "Anyone can view non-deleted replies"
  ON public.forum_replies FOR SELECT
  USING (is_deleted = false OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'::app_role));

CREATE POLICY "Authenticated users can create replies"
  ON public.forum_replies FOR INSERT
  WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Admins can update replies"
  ON public.forum_replies FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'::app_role));

-- Forum reactions policies
CREATE POLICY "Anyone can view reactions"
  ON public.forum_reactions FOR SELECT
  USING (true);

CREATE POLICY "Users can manage their own reactions"
  ON public.forum_reactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own reactions"
  ON public.forum_reactions FOR DELETE
  USING (auth.uid() = user_id);

-- Function to update reply count
CREATE OR REPLACE FUNCTION public.update_topic_reply_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.forum_topics SET reply_count = reply_count + 1, updated_at = now() WHERE id = NEW.topic_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.forum_topics SET reply_count = reply_count - 1 WHERE id = OLD.topic_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for reply count
CREATE TRIGGER update_reply_count_trigger
  AFTER INSERT OR DELETE ON public.forum_replies
  FOR EACH ROW
  EXECUTE FUNCTION public.update_topic_reply_count();

-- Update timestamps trigger for topics
CREATE TRIGGER update_forum_topics_updated_at
  BEFORE UPDATE ON public.forum_topics
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Update timestamps trigger for replies
CREATE TRIGGER update_forum_replies_updated_at
  BEFORE UPDATE ON public.forum_replies
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Indexes for performance
CREATE INDEX idx_forum_topics_author ON public.forum_topics(author_id);
CREATE INDEX idx_forum_topics_created ON public.forum_topics(created_at DESC);
CREATE INDEX idx_forum_replies_topic ON public.forum_replies(topic_id);
CREATE INDEX idx_forum_replies_parent ON public.forum_replies(parent_reply_id);
CREATE INDEX idx_forum_reactions_reply ON public.forum_reactions(reply_id);