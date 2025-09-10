-- Create junction table to link subscription plans with classes
CREATE TABLE public.subscription_plan_classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_plan_id UUID NOT NULL REFERENCES public.subscription_plans(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(subscription_plan_id, class_id)
);

-- Enable RLS
ALTER TABLE public.subscription_plan_classes ENABLE ROW LEVEL SECURITY;

-- Create policy for reading subscription plan classes
CREATE POLICY "Anyone can view subscription plan classes" 
ON public.subscription_plan_classes 
FOR SELECT 
USING (true);

-- Create policy for admins to manage subscription plan classes
CREATE POLICY "Admins can manage subscription plan classes" 
ON public.subscription_plan_classes 
FOR ALL 
USING (is_admin(auth.uid()));

-- Get the subscription plan IDs and class IDs to create relationships
-- First, let's set up the relationships based on section matching

-- Insert relationships for Francophone plan (matches francophone classes)
INSERT INTO public.subscription_plan_classes (subscription_plan_id, class_id)
SELECT sp.id, c.id
FROM public.subscription_plans sp
CROSS JOIN public.classes c
WHERE sp.name = 'Francophone' 
AND c.section = 'francophone';

-- Insert relationships for Anglophone plan (matches anglophone classes)  
INSERT INTO public.subscription_plan_classes (subscription_plan_id, class_id)
SELECT sp.id, c.id
FROM public.subscription_plans sp
CROSS JOIN public.classes c
WHERE sp.name = 'Anglophone' 
AND c.section = 'anglophone';

-- Insert relationships for Everything plan (matches all classes)
INSERT INTO public.subscription_plan_classes (subscription_plan_id, class_id)
SELECT sp.id, c.id
FROM public.subscription_plans sp
CROSS JOIN public.classes c
WHERE sp.name = 'Everything';