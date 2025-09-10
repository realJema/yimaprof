-- Add content column to exams table for storing markdown content
ALTER TABLE public.exams ADD COLUMN content TEXT;