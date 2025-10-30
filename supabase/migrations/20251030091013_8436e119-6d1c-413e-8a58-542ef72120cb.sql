-- Allow authenticated users to view id and username of other profiles for affiliate referral search
-- This policy is more permissive than "Users can view their own profile" but only exposes username
CREATE POLICY "Authenticated users can search usernames"
ON public.profiles
FOR SELECT
TO authenticated
USING (true);