-- Add policy to allow admins to update subscriptions (for cancellation)
CREATE POLICY "Admins can update subscriptions" 
ON public.subscriptions 
FOR UPDATE 
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));