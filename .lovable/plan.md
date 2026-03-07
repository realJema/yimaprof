

# Add AI Usage Tracking to Admin Dashboard

## Overview
Create a database table to log every AI request (help-chat, ai-grade), then display daily usage stats in the admin dashboard.

## Changes

### 1. New DB table: `ai_usage_logs`
```sql
CREATE TABLE public.ai_usage_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  function_name text NOT NULL,  -- 'help-chat' or 'ai-grade'
  user_ip text,
  tokens_estimate integer,
  status text DEFAULT 'success',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.ai_usage_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can view ai_usage_logs" ON public.ai_usage_logs FOR SELECT USING (is_admin(auth.uid()));
CREATE POLICY "Edge functions can insert" ON public.ai_usage_logs FOR INSERT WITH CHECK (true);
CREATE INDEX idx_ai_usage_created ON public.ai_usage_logs(created_at);
```

### 2. Update edge functions to log usage
Both `help-chat/index.ts` and `ai-grade/index.ts` will insert a row into `ai_usage_logs` after each request (function name, status, timestamp). Uses the Supabase service role key for insert.

### 3. New component: `src/components/admin/AIUsageStats.tsx`
- Queries `ai_usage_logs` grouped by day (last 30 days) and by function name
- Shows summary cards: total requests today, total this month, breakdown by function
- Recharts bar chart showing daily request counts (already installed)

### 4. Add to Admin dashboard
- Add "AI Usage" nav item in `Admin.tsx`
- Render `AIUsageStats` component in that tab

## Files

| File | Action |
|------|--------|
| Migration | New `ai_usage_logs` table |
| `supabase/functions/help-chat/index.ts` | Add usage logging after response |
| `supabase/functions/ai-grade/index.ts` | Add usage logging after response |
| `src/components/admin/AIUsageStats.tsx` | New dashboard component with chart |
| `src/pages/Admin.tsx` | Add AI Usage tab |

