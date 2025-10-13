-- Remove the role column from profiles table to consolidate role management in user_roles table
-- This prevents dual role systems and potential security issues

-- Drop the role column from profiles table
ALTER TABLE public.profiles DROP COLUMN IF EXISTS role;

-- Note: The user_roles table is already the source of truth for roles
-- The is_admin() and has_role() functions already use the user_roles table
-- This migration ensures all role checks go through the secure user_roles table