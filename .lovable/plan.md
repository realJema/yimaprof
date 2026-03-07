

# AI-Powered Evaluation Correction System

## Current State
The evaluation system currently scores:
- **MCQ**: exact match (works well)
- **Long-form**: basic keyword/word-overlap matching against expected answers (crude, often inaccurate)

## Proposed Change
Replace the local `scoreLongForm` function with an AI-powered scoring system that sends the student's answers alongside the expected answers/rubric to an LLM for intelligent grading.

## Architecture

### 1. New Edge Function: `supabase/functions/ai-grade/index.ts`
- Receives: array of `{ questionText, studentAnswer, expectedAnswer, rubric, maxPoints }`
- Uses Lovable AI Gateway (`google/gemini-3-flash-preview`) with **tool calling** to return structured scores
- System prompt instructs the model to act as a teacher grading exam answers
- Returns: array of `{ questionIndex, score, maxPoints, feedback }` as structured output
- Handles CORS, 429/402 errors

### 2. Modify `src/pages/ExamViewer.tsx`
- After submission, if there are long-form questions, call the `ai-grade` edge function
- Show a "Grading in progress..." loading state in the results dialog
- Once AI scores return, update the total score and display per-question feedback
- MCQ scoring remains local (instant, deterministic)
- Fallback: if AI call fails (offline, rate limit), fall back to existing keyword scoring

### 3. Modify `src/components/exam/EvaluationResultsDialog.tsx`
- Add a loading state ("AI is grading your answers...")
- Display per-question AI feedback when available (expandable list)

### 4. Update `supabase/config.toml`
- Add `[functions.ai-grade]` with `verify_jwt = false`

## Flow
```text
User submits evaluation
  → MCQ scored instantly (local)
  → Long-form answers sent to ai-grade edge function
  → AI returns scores + feedback per question
  → Results dialog shows combined score + AI feedback
  → Saved to user_evaluations table
```

## Edge Function Payload (tool calling for structured output)
```typescript
tools: [{
  type: "function",
  function: {
    name: "grade_answers",
    parameters: {
      type: "object",
      properties: {
        grades: {
          type: "array",
          items: {
            type: "object",
            properties: {
              questionIndex: { type: "number" },
              score: { type: "number" },
              maxPoints: { type: "number" },
              feedback: { type: "string" }
            }
          }
        }
      }
    }
  }
}]
```

## Files

| File | Action |
|------|--------|
| `supabase/functions/ai-grade/index.ts` | New edge function for AI grading |
| `supabase/config.toml` | Add function entry |
| `src/pages/ExamViewer.tsx` | Replace `scoreLongForm` with AI call, add loading state |
| `src/components/exam/EvaluationResultsDialog.tsx` | Add grading loading state + per-question feedback display |

## Key Decisions
- MCQ stays local (no need for AI)
- AI grading is non-blocking: results dialog opens immediately with MCQ score, then updates when AI finishes
- Existing keyword scoring kept as fallback for offline/error cases
- `LOVABLE_API_KEY` is already configured in secrets

