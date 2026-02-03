

## Filter State Persistence and Breadcrumb Synchronization

This plan addresses the need to persist filter selections across navigation on the Browse page (`Exams2`) and synchronize them with breadcrumbs so users can easily return to their filtered view.

### Problem Statement

Currently, the Browse page (`Exams2.tsx`) uses local React state for all filters:
- `selectedSystem`, `selectedClasses`, `selectedSubjects`, `selectedSeries`, `selectedYear`, `selectedExamType`, `selectedPeriod`, `sortBy`, `searchTerm`

When a user navigates to an exam and returns, all filter state is lost. Additionally, the ExamViewer breadcrumbs already include some URL parameters (`system` and `class`), but the Browse page doesn't read these parameters.

### Solution Overview

Convert all filter state from React state to URL search parameters using `useSearchParams` from react-router-dom. This approach:
1. Persists filters in the URL during navigation
2. Works with browser back/forward buttons
3. Allows shareable filtered views
4. Enables breadcrumbs to correctly link back with the active filters

---

### Implementation Steps

#### Step 1: Update Exams2.tsx to Use URL Parameters

**Changes to `src/pages/Exams2.tsx`:**

1. **Import `useSearchParams`** from `react-router-dom`

2. **Replace state declarations with URL-based state**:
   - Read filter values from URL search params on component mount
   - Create setter functions that update URL params instead of React state

3. **URL Parameter Schema**:
   ```text
   /exams2?system=francophone
          &class=id1,id2
          &subject=id1,id2
          &series=id1,id2
          &year=yearId
          &type=examTypeId
          &period=periodId
          &sort=newest
          &search=searchTerm
          &page=1
   ```

4. **Helper Functions**:
   - `getParamArray(key)`: Parse comma-separated IDs from URL
   - `setParamArray(key, values)`: Set comma-separated IDs in URL
   - `getParam(key, defaultValue)`: Get single param with fallback
   - `setParam(key, value)`: Set single param

5. **Filter setters will update URL**:
   ```typescript
   const toggleClass = (id: string) => {
     const current = getParamArray('class');
     const updated = current.includes(id) 
       ? current.filter(c => c !== id) 
       : [...current, id];
     setParamArray('class', updated);
   };
   ```

6. **Clear filters function** will reset all URL params

7. **Pagination** will also use URL params for `page` parameter

#### Step 2: Update Exam Cards to Preserve Filter Context

**Changes to `src/pages/Exams2.tsx`:**

Update the exam card `Link` to pass the current filter state:

```typescript
<Link 
  key={exam.id} 
  to={`/exam/${exam.id}?${new URLSearchParams({
    from: `/exams2?${searchParams.toString()}`
  }).toString()}`}
>
```

This passes the complete current URL as a `from` parameter, enabling perfect restoration.

#### Step 3: Update ExamViewer Breadcrumbs

**Changes to `src/pages/ExamViewer.tsx`:**

1. **Read the `from` parameter** to get the original browse URL with filters

2. **Update breadcrumb links** to use the preserved filter context:
   - "Exams" breadcrumb links back to the full filtered URL
   - Class breadcrumb links back with system and class filter active

3. **Update Back button** to use the `from` parameter if available, otherwise use `navigate(-1)`

```typescript
const fromUrl = searchParams.get('from') || '/exams2';

// In breadcrumbs:
<Link to={fromUrl}>
  {language === 'fr' ? 'Epreuves' : 'Exams'}
</Link>
```

#### Step 4: Initialize Filters from URL on Page Load

**Changes to `src/pages/Exams2.tsx`:**

Ensure that when the page loads with URL parameters (e.g., from a breadcrumb click), the filters are properly initialized:

```typescript
const [searchParams, setSearchParams] = useSearchParams();

// Derived state from URL
const selectedSystem = searchParams.get('system') || 'all';
const selectedClasses = useMemo(() => 
  searchParams.get('class')?.split(',').filter(Boolean) || [], 
  [searchParams]
);
// ... similar for other filters
```

---

### Technical Details

#### URL Parameter Mapping

| Filter | URL Param | Format | Example |
|--------|-----------|--------|---------|
| System | `system` | Single value | `francophone` |
| Classes | `class` | Comma-separated IDs | `id1,id2` |
| Subjects | `subject` | Comma-separated IDs | `id1,id2` |
| Series | `series` | Comma-separated IDs | `id1,id2` |
| Year | `year` | Single ID | `yearId` |
| Exam Type | `type` | Single ID | `typeId` |
| Period | `period` | Single ID | `periodId` |
| Sort | `sort` | Single value | `newest` |
| Search | `search` | String | `math` |
| Page | `page` | Number | `2` |

#### Files to Modify

1. **`src/pages/Exams2.tsx`** (Primary changes)
   - Add `useSearchParams` import
   - Replace `useState` for filters with URL-derived values
   - Update all filter setters to modify URL params
   - Update exam card links to include `from` parameter
   - Add memoized URL parsing helpers

2. **`src/pages/ExamViewer.tsx`** (Breadcrumb updates)
   - Read `from` parameter for return navigation
   - Update breadcrumb links to use preserved filter URL
   - Update Back button behavior

#### Edge Cases Handled

- Invalid URL params gracefully default to 'all' or empty arrays
- Multi-select filters use comma-separated IDs that are URL-safe
- Browser refresh preserves current filters
- Empty filter values are removed from URL to keep it clean
- Pagination resets to page 1 when filters change (already implemented)

---

### Benefits

1. **Persistence**: Filters survive navigation and page refreshes
2. **Shareability**: Users can share or bookmark specific filtered views
3. **Browser History**: Back/forward buttons work correctly with filter state
4. **Breadcrumb Sync**: Clicking breadcrumbs restores the exact filter state
5. **Deep Linking**: External links can open the page with pre-selected filters

