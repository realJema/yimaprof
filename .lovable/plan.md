
## Issue
On `/admin/exams`, the exam list and pagination cap at 1000 because Supabase's PostgREST default `Content-Range` limit is 1000 rows per request. The current `fetchExams()` in `src/pages/AdminExams.tsx` does a single `.select(...)` with no `.range()`, so it silently truncates to 1000.

## Fix
Update `fetchExams()` in `src/pages/AdminExams.tsx` to fetch all exam rows by paging through with `.range()` in a loop until all rows are retrieved.

### Approach
- Fetch in chunks of 1000 using `.range(from, from + 999)`.
- Continue until a page returns fewer than 1000 rows.
- Concatenate results into a single array, then `setExams(...)`.
- Keeps the existing joins (classes, subjects, exam_types, academic_years, periods, establishments) and ordering by `created_at desc`.

This restores accurate paper counts and pagination beyond 1000 exams without any DB or schema change.

## Files
| File | Action |
|------|--------|
| `src/pages/AdminExams.tsx` | Replace `fetchExams` with a paged loop fetcher |
