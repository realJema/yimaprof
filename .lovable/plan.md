

# Add Exam Review & Rating Section (Correction Mode Only)

## Overview
Add a star rating and comment review system for exams, visible only when correction mode is active. Users can leave one review per exam with a 1-5 star rating and optional comment. Other users' reviews are also displayed.

## Database Changes

### New table: `exam_reviews`
```sql
CREATE TABLE public.exam_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id uuid NOT NULL REFERENCES public.exams(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (exam_id, user_id)
);

ALTER TABLE public.exam_reviews ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can view reviews
CREATE POLICY "Anyone can view reviews" ON public.exam_reviews FOR SELECT TO authenticated USING (true);
-- Users can insert their own review
CREATE POLICY "Users can insert own review" ON public.exam_reviews FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
-- Users can update their own review
CREATE POLICY "Users can update own review" ON public.exam_reviews FOR UPDATE TO authenticated USING (auth.uid() = user_id);
-- Users can delete their own review
CREATE POLICY "Users can delete own review" ON public.exam_reviews FOR DELETE TO authenticated USING (auth.uid() = user_id);
```

## New Component: `src/components/exam/ExamReviewSection.tsx`

A self-contained component that:
- Accepts `examId` and `isVisible` (only renders when correction mode is active)
- Fetches existing reviews for the exam (with profile info for display)
- Shows the current user's review form (star picker + textarea)
- If user already reviewed, shows their review with an edit option
- Displays average rating and total review count at the top
- Lists all reviews with star display, comment, username, and date
- Star rating: interactive clickable stars (1-5) using Lucide `Star` icon (filled/outline)

### UI Layout
```text
┌──────────────────────────────────────┐
│ ⭐ Reviews & Ratings                │
│ Average: ★★★★☆ (4.2) · 12 reviews  │
├──────────────────────────────────────┤
│ Your Review                          │
│ ★★★★☆  (click to rate)             │
│ [Comment textarea...............]    │
│                    [Submit Review]   │
├──────────────────────────────────────┤
│ User A · ★★★★★ · 2 days ago        │
│ "Great exam, very helpful!"         │
│──────────────────────────────────────│
│ User B · ★★★☆☆ · 1 week ago        │
│ "Could use more detailed solutions" │
└──────────────────────────────────────┘
```

## Integration: `src/pages/ExamViewer.tsx`

- Import `ExamReviewSection`
- Place it after the exam content div (line ~1133), inside the container, only when `mode === 'correction'`
```tsx
{mode === 'correction' && <ExamReviewSection examId={examId!} />}
```

## Files

| File | Action |
|------|--------|
| Migration SQL | Create `exam_reviews` table with RLS |
| `src/components/exam/ExamReviewSection.tsx` | New component |
| `src/pages/ExamViewer.tsx` | Add review section in correction mode |

