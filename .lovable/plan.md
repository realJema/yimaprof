

## Filter Persistence for Admin Exam Management Page

This plan implements URL-based filter state persistence for the Admin Exam Management page (`/admin/exams`) and updates the back button on the Exam Editor to redirect correctly with filter preservation.

---

### Current State

**AdminExams.tsx** uses local React state for all filters:
- `searchQuery`, `selectedYear`, `selectedSubject`, `selectedClass`, `selectedStatus`, `selectedLanguage`, `selectedEstablishment`, `currentPage`

When an admin navigates to edit an exam and returns, all filter state is lost.

**ExamManager.tsx** has a back button that navigates to `/admin-exams` (incorrect path - should be `/admin/exams`).

---

### Solution Overview

1. Convert AdminExams filter state from `useState` to URL search parameters using `useSearchParams`
2. Fix the back button in ExamManager to navigate to `/admin/exams`
3. Pass filter context to exam edit links via a `from` parameter
4. Update ExamManager to read and use the `from` parameter for the back button

---

### Implementation Steps

#### Step 1: Update AdminExams.tsx to Use URL Parameters

**Changes:**

1. **Import `useSearchParams`** from `react-router-dom`

2. **Replace state with URL-derived values:**
```typescript
const [searchParams, setSearchParams] = useSearchParams();

// Derived filter values from URL
const searchQuery = searchParams.get('search') || '';
const selectedYear = searchParams.get('year') || 'all';
const selectedSubject = searchParams.get('subject') || 'all';
const selectedClass = searchParams.get('class') || 'all';
const selectedStatus = searchParams.get('status') || 'all';
const selectedLanguage = (searchParams.get('lang') as 'all' | 'fr' | 'en') || 'all';
const selectedEstablishment = searchParams.get('school') || 'all';
const currentPage = parseInt(searchParams.get('page') || '1', 10);
```

3. **URL Parameter Schema:**
```text
/admin/exams?search=term
            &year=2023-2024
            &subject=Mathematics
            &class=classId
            &status=published
            &lang=fr
            &school=establishmentId
            &page=2
```

4. **Create setter helper function:**
```typescript
const setParam = (key: string, value: string) => {
  const newParams = new URLSearchParams(searchParams);
  if (value && value !== 'all' && value !== '') {
    newParams.set(key, value);
  } else {
    newParams.delete(key);
  }
  newParams.set('page', '1'); // Reset page on filter change
  setSearchParams(newParams, { replace: true });
};

const setPage = (page: number) => {
  const newParams = new URLSearchParams(searchParams);
  if (page > 1) {
    newParams.set('page', page.toString());
  } else {
    newParams.delete('page');
  }
  setSearchParams(newParams, { replace: true });
};
```

5. **Update filter setters to use URL params:**
- Search: `onChange={(e) => setParam('search', e.target.value)}`
- Year: `onValueChange={(v) => setParam('year', v)}`
- Subject: `onValueChange={(v) => setParam('subject', v)}`
- Class: `onValueChange={(v) => setParam('class', v)}`
- Status: `onValueChange={(v) => setParam('status', v)}`
- Language: `onValueChange={(v) => setParam('lang', v)}`
- Establishment: `onValueChange={(v) => setParam('school', v)}`

6. **Update clear filters:**
```typescript
const clearFilters = () => {
  setSearchParams({}, { replace: true });
};
```

7. **Update pagination to use URL:**
```typescript
onClick={() => setPage(currentPage - 1)}
onClick={() => setPage(currentPage + 1)}
```

8. **Update exam card edit links to preserve context:**
```typescript
<Link to={`/admin/exam/edit/${exam.id}?from=${encodeURIComponent(`/admin/exams?${searchParams.toString()}`)}`}>
```

#### Step 2: Update ExamManager.tsx Back Button

**Changes:**

1. **Add `useSearchParams` import** (already has `useParams`)

2. **Read the `from` parameter:**
```typescript
const [searchParams] = useSearchParams();
const fromUrl = searchParams.get('from') || '/admin/exams';
```

3. **Fix the back button navigation** (line 1026):
```typescript
// Current (WRONG):
onClick={() => navigate('/admin-exams')}

// Updated (CORRECT):
onClick={() => navigate(fromUrl)}
```

---

### Technical Details

#### URL Parameter Mapping for AdminExams

| Filter | URL Param | Format | Example |
|--------|-----------|--------|---------|
| Search | `search` | String | `math` |
| Year | `year` | Year label | `2023-2024` |
| Subject | `subject` | Subject name | `Mathematics` |
| Class | `class` | Class ID | `uuid` |
| Status | `status` | `published` or `draft` | `published` |
| Language | `lang` | `fr` or `en` | `fr` |
| School | `school` | Establishment ID | `uuid` |
| Page | `page` | Number | `2` |

#### Files to Modify

1. **`src/pages/AdminExams.tsx`**
   - Add `useSearchParams` import
   - Remove `useState` for filters, derive from URL
   - Update all filter change handlers
   - Update edit link to include `from` parameter
   - Keep `sidebarVisible` as local state (UI-only)

2. **`src/pages/ExamManager.tsx`**
   - Add `useSearchParams` import
   - Read `from` parameter
   - Update back button to use `fromUrl`

#### Edge Cases

- Invalid URL params default to 'all' or empty
- Page numbers below 1 reset to 1
- Empty search strings are removed from URL
- `from` parameter gracefully falls back to `/admin/exams`

---

### Benefits

1. **Persistence**: Filters survive navigation to/from exam editor
2. **Browser History**: Back/forward buttons preserve filter state
3. **Shareability**: Admins can share links to specific filtered views
4. **Fixed Navigation**: Back button now uses correct path
5. **Consistent Pattern**: Matches the implementation in Exams2.tsx

