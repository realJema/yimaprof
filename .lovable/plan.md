

# Fix: Always Score All Questions (MCQ + Long-Form)

## Problem

Line 599-600 in `ExamViewer.tsx`:
```
const hasMcq = hasMcqQuestions();
const mcqScore = hasMcq ? calculateScore() : null;
```

When an exam has zero MCQ questions, `hasMcq` is `false`, so `calculateScore()` is never called. The score stays `null`, which triggers the "no auto-scoreable questions" fallback in the results dialog.

## Solution

A single, focused change in `src/pages/ExamViewer.tsx`:

1. **Add a `hasScorableQuestions` function** that returns `true` if the exam has ANY question (MCQ or long-form) -- not just MCQs.

2. **Update `handleSubmitEvaluation`** (lines 599-601): always call `calculateScore()` when scorable questions exist, regardless of MCQ presence.

3. Keep `hasMcqQuestions()` only for the results dialog layout (to decide whether to show the MCQ breakdown row).

### Before
```typescript
const hasMcq = hasMcqQuestions();
const mcqScore = hasMcq ? calculateScore() : null;
setScore(mcqScore);
```

### After
```typescript
const hasScorable = hasScorableQuestions();
const computedScore = hasScorable ? calculateScore() : null;
setScore(computedScore);
```

No changes needed in `EvaluationResultsDialog.tsx` -- it already displays the total score circle when `hasFullScore` is true (i.e., when `earnedPoints` and `totalPoints` are present), which will now always be the case for exams with any questions.

### File Changed

| File | Change |
|------|--------|
| `src/pages/ExamViewer.tsx` | Add `hasScorableQuestions`, update scoring gate in `handleSubmitEvaluation` |
