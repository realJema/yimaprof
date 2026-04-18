

## Plan

Update the exam-type filter labels on the admin exam list AND seed the `exam_types` table so the same options appear in all exam edit/create forms.

### Changes

**1. Database — seed exam_types**
Insert the 4 standard types (idempotent on `name`):
- `Examen blanc` / Mock Exam
- `Examen harmonisé` / Harmonized Exam
- `Examen officiel` / Official Exam
- `Examen officiel type` / Official Type Exam

This automatically updates every edit form because they all read from `exam_types` via `useExamFormData` (used by `ExamManager.tsx`, AdminExams filter, ExamList browse filter, etc.).

**2. Header label — Parcourir → Épreuves**
- `src/components/layout/Header.tsx`: replace nav label
- `src/contexts/LanguageContext.tsx`: update `nav.browse` translations (FR: "Épreuves", EN: "Papers")

**3. Admin exam list filter label — "Type" → "Type d'épreuve"**
- `src/pages/AdminExams.tsx`: rename the exam-type filter label/placeholder

### Files

| File | Action |
|------|--------|
| New migration | Seed 4 rows into `exam_types` |
| `src/components/layout/Header.tsx` | Use new translation key |
| `src/contexts/LanguageContext.tsx` | Update `nav.browse` strings |
| `src/pages/AdminExams.tsx` | Filter label → "Type d'épreuve" |

No edit-form code changes needed — they auto-pick up the new types from the DB.

