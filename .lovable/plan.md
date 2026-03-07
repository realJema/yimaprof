

# Add AI Chat Bubble for Platform Guidance

## Overview
Add a floating chat bubble (bottom-right corner) powered by Lovable AI that helps users understand how to use the platform. The chatbot will have a system prompt with knowledge about YimaProf's features and will stream responses.

## Architecture

### 1. Edge Function: `supabase/functions/help-chat/index.ts`
- Receives conversation messages from client
- Prepends a system prompt describing YimaProf features (exams, subscriptions, corrections, evaluations, forum, affiliate system)
- Streams response from Lovable AI Gateway using `google/gemini-3-flash-preview`
- Handles CORS, 429/402 errors

### 2. New Component: `src/components/chat/HelpChatBubble.tsx`
- Floating button (bottom-right, `MessageCircle` icon) with open/close toggle
- Chat panel: message list + input field
- Streams AI responses token-by-token
- Bilingual welcome message (fr/en) based on language context
- Persists conversation in component state (resets on page reload)
- Auto-scrolls to latest message

### 3. Integration: `src/components/layout/Layout.tsx`
- Add `<HelpChatBubble />` alongside the existing `<ResumeExamWatcher />`

## UI Layout
```text
                              ┌─────────────────────┐
                              │ 💬 YimaProf Help    │
                              ├─────────────────────┤
                              │ Welcome! How can I  │
                              │ help you today?     │
                              │                     │
                              │ User: How do I...   │
                              │ Bot: You can...     │
                              ├─────────────────────┤
                              │ [Type a message...] │
                              └─────────────────────┘
                                              [💬] ← floating button
```

## Files

| File | Action |
|------|--------|
| `supabase/functions/help-chat/index.ts` | New edge function |
| `supabase/config.toml` | Add `[functions.help-chat]` entry |
| `src/components/chat/HelpChatBubble.tsx` | New component |
| `src/components/layout/Layout.tsx` | Import and render chat bubble |

## System Prompt (in edge function)
Will describe YimaProf as an exam prep platform for Cameroon students, covering: browsing exams, viewing corrections, running timed evaluations, subscriptions, affiliate program, forum, and settings. Bilingual responses matching user language.

