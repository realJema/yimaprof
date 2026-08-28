# Yimaprof — Safe Incremental Update

This is a large program of work. It will be delivered in sequenced batches on top of the existing architecture: no rebuilds, no renames, no data deletion, no changes to auth/payments/RLS internals unless a batch explicitly requires it.

## Batch 0 — Audit (no code changes)

Produce a written audit + architecture document covering:
- Frontend: routes, pages, providers (`AuthProvider`, `LanguageProvider`, `SubscriptionProvider`), hooks (`useAuth`, `useSubscription`, `useEstablishment`).
- Backend: tables, foreign keys, RLS, security-definer RPCs (`has_role`, `is_admin`, `is_establishment_admin`, `current_establishment_id`, `establishment_results`, `establishment_student_activity`), triggers, storage buckets, edge functions (`mesomb-payment`, `mesomb-webhook`, `ai-grade`, `send-notification-email`, `help-chat`).
- End-to-end traces: auth → profile → roles; payment → transaction → webhook → subscription → access; transaction → affiliate/establishment commission; establishment → approval → classes → students → results → revenue; exam → evaluation → submission → AI grading → correction.
- Verdict per feature: works / incomplete / do-not-touch, with dependencies.

Deliverable: `docs/ARCHITECTURE.md` (new file only, nothing else touched).

## Batch 1 — Learning path: class → subject → chapter → lesson → exercises

Keep the existing model. `lessons.chapter` already exists and `lesson_exercises` already links lessons to exams, so no new "chapters" table.
- Group the lessons list by subject then `chapter` for the selected class/series.
- Ensure lessons have correct class/subject/series associations (data fix, not schema change).
- Clearer navigation from a subject into its chapters and from a chapter into its exercises.

## Batch 2 — Chapter exercises / QCM

Reuse the existing exam/evaluation engine (`exams.content`, `user_evaluations`) — no second engine.
- From a lesson, launch its linked exercise in evaluation mode, submit, score, view correction, retry.
- Attempts recorded in `user_evaluations`; exercise context (lesson) surfaced in results.

## Batch 3 — Student progress

- Write/refresh `lesson_progress` (status, percent, time spent) as students read lessons.
- A student-facing progress view: lessons viewed, exercises attempted, exam scores, per-subject performance.
- Same data exposed to school admins through the existing aggregation RPCs.

## Batch 4 — Exam preparation flow polish

No architecture change. Keep `/exams2`, `/exam/:id`, URL filters, free preview, paywall, timer, persistence, AI grading, resume. Only clarity/UX refinements on the existing steps.

## Batch 5 — School classes from platform catalogue

Schools select from the existing `classes` catalogue through `establishment_classes`. No per-school class catalogue. Class picker in the school dashboard limited to platform classes.

## Batch 6 — School-created student accounts

Reuse `establishment_students`, add the missing account creation:
- New edge function (service-role) creates the auth user + profile, assigns the `student` role, links `establishment_id`, links the chosen `establishment_classes` class, and returns a generated initial password once to the school admin (never stored in plain text, never in a URL).
- Force/strongly prompt password change on first login.
- Guardrails: caller must be an approved school admin for that establishment; students get no elevated rights.

## Batch 7 — Demonstration school data

One clearly labelled demo establishment with classes, several real student accounts, and varied realistic activity (lesson progress, exercise attempts, exam results at high/average/weak levels across subjects). Inserted as ordinary rows so all dashboard charts derive from real queries — no hardcoded chart numbers. Tagged so it can be removed later.

## Batch 8 — School dashboard

Improve the existing `/school` tabs (Overview, Classes, Students, Results, Journey) using `establishment_results()` and `establishment_student_activity()`. Add per-student drill-down and results by class/subject/period with charts.

## Batch 9 — School revenue

Keep `transactions → establishment_commissions → establishment_payouts`. Present available / monthly / cumulative earnings, commission history, payout history and status. Verify commissions are not duplicated on transaction status changes.

## Batch 10 — Withdrawal security: password + email OTP

Flow: request payout → re-verify password → OTP emailed via the existing Resend function → enter OTP → confirm.
- New `security_otps` table (hashed code, purpose, expiry, single-use, attempt counter) with strict RLS and grants.
- OTP issue/verify handled server-side in an edge function; payout only created after successful verification.
- Protection against reuse, expiry, brute force, direct API bypass and duplicate requests; actions written to `audit_logs`.

## Batch 11 — Security & anti-bot review

Confirm boundaries: students see only their own data; schools see only their own establishment; no cross-school access; no client-side balance manipulation; admin RPCs unreachable by normal users. Add rate limiting / bot protection on registration, login, password recovery and financial-OTP actions only — not on normal learning flows.

## Batch 12 — Responsive fixes

Targeted fixes only (nav, tables, school dashboard, charts, exam interface, lesson pages, forms, auth, admin). No visual overhaul, no offline work.

## Batch 13 — Scalability assessment

Measure first: index coverage for hot filters, RLS cost, dashboard aggregation queries, large `exams.content` payloads, TanStack Query caching, webhook and concurrent-submission behaviour. Then apply only targeted indexes/query changes.

## Batch 14 — Regression pass

Walk through auth, subscriptions/payments, exams/evaluation/AI grading, lessons/exercises, forum, affiliate, school (registration → approval → classes → students → dashboard → revenue → withdrawal) and admin, and report results.

## Technical notes

- Schema changes are additive only (new tables with GRANTs + RLS, new nullable columns); no drops, renames or type changes.
- Student creation and OTP verification must run in edge functions with the service role; the client never receives privileged keys.
- Demo data is inserted via data queries, never migrations.
- Any change that risks an existing feature will be flagged before implementation.

## Suggested start

Batches 0–3 first (audit, learning path, exercises, progress), then 5–8 (school classes, student accounts, demo data, dashboard), then 9–10 (revenue, OTP withdrawal), then 11–14.
