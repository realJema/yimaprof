

# Implementation Plan: Payment UX, Exam Features, Scoring & Localization

This plan covers 6 areas of work across payment, exam display, scoring, rendering, and localization improvements.

---

## 1. Payment Processing -- Timeout & UX Improvements

### 1a. Add Timeout Prompt on Payment Processing Page
**File:** `src/pages/PaymentProcessing.tsx`

- Add a new status: `'timeout'` alongside existing `'initiating' | 'processing' | 'completed' | 'failed'`
- After 90 seconds in `processing` state, transition to `timeout` status
- Show a yellow warning card (not red) with:
  - Yellow `AlertTriangle` icon (from lucide-react)
  - Message: "Vous n'avez pas confirme votre paiement a temps" / "You haven't confirmed your payment in time"
  - Question: "Avez-vous effectue le paiement ?" / "Have you completed the payment?"
  - Two buttons:
    - **"Oui, verifier"** -- triggers a manual poll of the transaction status. If still `processing`, show "Paiement non encore confirme" with option to wait more or retry
    - **"Reessayer"** -- navigates back to `/payment?planId=xxx&phone=xxx` (prefilling phone)
- The `failed` status UI will also use yellow/warning styling instead of red/destructive

### 1b. Retry with Prefilled Phone Number
**File:** `src/pages/Payment.tsx`

- Read `phone` from URL search params on mount
- If present, prefill the phone input and auto-detect carrier
- On retry from timeout, navigate: `/payment?planId=xxx&phone=previousPhone`

### 1c. Save Phone Number to Profile
**File:** `src/pages/Payment.tsx`

- On payment initiation (when navigating to processing), save the phone number to the user's `profiles` table (the `phone` column already exists)
- On mount, if no phone in URL params, load the saved phone from the profile as default

### 1d. Add Payment Instructions on Processing Page
**File:** `src/pages/PaymentProcessing.tsx`

- When `status === 'processing'`, show an instruction block below the phone number:
  - "Vous allez recevoir une notification sur votre telephone"
  - "Composez #150*50# pour valider comme recommande"
  - "Veuillez patienter, la confirmation peut prendre quelques instants"

---

## 2. Exam Details -- Images Only in Corrections

### File: `src/components/exam/ExamContentRenderer.tsx`

- Modify the image rendering block (item_type === 'image') to check the current `mode`
- Only render images when `mode === 'correction'` or `showAnswers === true`
- In other modes (preview, evaluation), skip image items entirely or show a placeholder badge "Image visible dans la correction"

---

## 3. Exam Details -- Series Display & Filter

### 3a. Display Series on Exam Cards
**File:** `src/pages/Exams2.tsx`

- The series data is already fetched in the exam query (`series:series(id, code, name, name_en, name_fr)`)
- Add a `Badge` showing `exam.series?.code` (e.g., "A", "C", "D") on each exam card
- Style with a distinct color to differentiate from other badges

### 3b. Display Series on Exam Viewer
**File:** `src/pages/ExamViewer.tsx`

- The exam query already joins `series` data but the interface doesn't include it
- Add `series_id` and `series` to the `Exam` interface
- Display the series in both mobile and desktop info sections

### 3c. Series Filter (Already Exists)
- The series filter is already implemented in `Exams2.tsx` (lines 146, 278-291, 374-380)
- No changes needed here

---

## 4. Scoring System -- Keyword-Based Long-Form Scoring

### 4a. Implement Keyword/Concept Scoring for Long-Form Questions
**File:** `src/pages/ExamViewer.tsx` (in `calculateScore`)

- Expand `calculateScore` to handle both MCQ and long-form questions:
  - **MCQ**: Keep existing exact-match logic
  - **Long-form**: Score based on keywords/concepts from the answer's rubric criteria
    - Normalize text (lowercase, remove accents/punctuation)
    - For each rubric criterion, check if key terms appear in the student's answer
    - Award partial points based on keyword matches (e.g., if 3 of 5 keywords found, award 60% of that criterion's points)
    - If no rubric, check against the expected answer text using word overlap
- Update the score object to include: `{ earnedPoints: number, totalPoints: number, mcqCorrect: number, mcqTotal: number }`

### 4b. Update Results Dialog
**File:** `src/components/exam/EvaluationResultsDialog.tsx`

- Display combined score (points earned / total points) instead of just MCQ correct/total
- Show breakdown: MCQ score + Long-form score
- Keep the percentage-based color coding

### 4c. Store Full Scores in Database
**File:** `src/pages/ExamViewer.tsx` (in `saveEvaluation`)

- The `user_evaluations` table already has `mcq_score` and `mcq_total` columns
- We need two new columns for the full score

**Database migration:**
```sql
ALTER TABLE user_evaluations
  ADD COLUMN IF NOT EXISTS total_score numeric,
  ADD COLUMN IF NOT EXISTS total_possible numeric;
```

- Save `total_score` and `total_possible` alongside existing `mcq_score` / `mcq_total`

---

## 5. Markdown Rendering in Exam Content

### File: `src/components/exam/ExamContentRenderer.tsx`

- The `LatexText` component already handles LaTeX; extend text rendering to also support basic markdown
- For text fields that may contain markdown (headings, instructions, passages, question text, answer text):
  - Detect if text contains markdown syntax (e.g., `**bold**`, `*italic*`, `|table|`, `- list`)
  - If markdown detected, render using a lightweight inline markdown parser
  - Support: bold, italic, lists, tables, line breaks
- Implementation: create a `<MarkdownText>` wrapper component or extend `<LatexText>` to handle both markdown and LaTeX

### New file: `src/components/ui/markdown-text.tsx`
- A component that renders markdown with basic formatting
- Uses regex-based parsing for simple markdown (no heavy dependency needed)
- Supports: `**bold**`, `*italic*`, `- lists`, `| tables |`, `\n` line breaks
- Falls through to `<LatexText>` for LaTeX content

---

## 6. Localization -- Replace "Semestre" with "Trimestre"

### File: `src/contexts/LanguageContext.tsx`

Two occurrences to fix:
- Line 306: `periods: 'Periodes/Semestres'` --> `periods: 'Periodes/Trimestres'`
- Line 727: `examPeriod: 'Periode/Semestre'` --> `examPeriod: 'Periode/Trimestre'`

---

## Technical Summary

| Area | Files Modified | New Files | DB Changes |
|------|---------------|-----------|------------|
| Payment timeout & UX | `PaymentProcessing.tsx`, `Payment.tsx` | None | None |
| Images in corrections only | `ExamContentRenderer.tsx` | None | None |
| Series display | `ExamViewer.tsx`, `Exams2.tsx` | None | None |
| Long-form scoring | `ExamViewer.tsx`, `EvaluationResultsDialog.tsx` | None | Add `total_score`, `total_possible` columns |
| Markdown rendering | `ExamContentRenderer.tsx` | `markdown-text.tsx` | None |
| Localization fix | `LanguageContext.tsx` | None | None |

### Implementation Order
1. Localization fix (quick win, 2 lines)
2. Images in corrections only (simple conditional)
3. Series display on exam viewer
4. Payment timeout & UX improvements
5. Markdown rendering
6. Long-form scoring system (most complex)

