

# Fix: Always Score All Questions (MCQ + Long-Form)

## Root Cause

In `handleSubmitEvaluation` (line 599-601 of `ExamViewer.tsx`):
```
const hasMcq = hasMcqQuestions();
const mcqScore = hasMcq ? calculateScore() : null;
```

When an exam has zero MCQ questions (all long-form), `hasMcq` is `false`, so `calculateScore()` is **never called**. The score is set to `null`, triggering the "no auto-scoreable questions" message in the results dialog.

## Fix

### 1. ExamViewer.tsx -- Always calculate score

**Replace** `hasMcqQuestions()` with a broader `hasScorable()` check that returns true if ANY question exists (MCQ or long-form with answers). Then always call `calculateScore()`.

Changes:
- Rename/replace `hasMcqQuestions` with `hasScorableQuestions` that checks for any question item (MCQ or long-form with an answer)
- In `handleSubmitEvaluation`, always call `calculateScore()` when scorable questions exist
- Pass `hasMcq` separately to the results dialog (for display purposes only)

```typescript
// Before
const hasMcq = hasMcqQuestions();
const mcqScore = hasMcq ? calculateScore() : null;

// After
const scorable = hasScorableQuestions();
const computedScore = scorable ? calculateScore() : null;
const hasMcq = hasMcqQuestions(); // still needed for dialog layout
```

### 2. EvaluationResultsDialog.tsx -- Fix display logic

The dialog currently shows the "no questions" message when `!hasMcq && !hasFullScore`. After the fix, `hasFullScore` will be true whenever there are scorable questions (even if zero MCQs), so the score circle and stats will display correctly.

No changes needed in the dialog itself -- the existing logic already handles the case where `hasFullScore` is true and `hasMcq` is false (it shows total score without MCQ breakdown).

### 3. saveEvaluation -- Pass correct score

Update the `saveEvaluation` call to always pass the computed score, setting `mcq_score`/`mcq_total` to the MCQ subset values (which may be 0/0 if no MCQs).

### Files Modified

| File | Change |
|------|--------|
| `src/pages/ExamViewer.tsx` | Add `hasScorableQuestions`, always call `calculateScore`, update `handleSubmitEvaluation` and `saveEvaluation` calls |

This is a small, focused fix -- the scoring logic (`calculateScore` and `scoreLongForm`) already works correctly for both question types. The only issue is the gate that prevents it from being called.

