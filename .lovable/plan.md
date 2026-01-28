
## Add Educational Series (Tracks) to Exam System

This plan adds support for educational series/tracks (e.g., Terminale C, D, Upper Sixth Science S1) to the exam system, allowing better categorization and filtering of exam papers.

---

### Overview

Educational series/tracks represent specialized study paths in Cameroonian secondary schools:
- **Francophone System**: Série A (Letters), B (Economics), C (Math/Physics), D (Biology), E/TI/F (Technical)
- **Anglophone System**: Science S1-S3, Arts A1-A5

A "General" option will handle existing exams without a defined series.

---

### Database Changes

#### 1. Create `series` Reference Table

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `code` | text | Short code (e.g., "C", "D", "S1") |
| `name` | text | Internal name |
| `name_en` | text | English display name |
| `name_fr` | text | French display name |
| `system` | text | 'francophone', 'anglophone', or 'general' |
| `description` | text | Optional description |
| `order_number` | integer | Display order |
| `is_active` | boolean | Active status |
| `created_at` | timestamp | Creation timestamp |

**Initial Data:**

Francophone Series:
- General (for all)
- Série A - Lettres et Philosophie
- Série B - Sciences Économiques et Sociales  
- Série C - Mathématiques et Sciences Physiques
- Série D - Sciences de la Vie et de la Terre
- Série E/TI - Techniques Industrielles
- Série F - Techniques de Gestion

Anglophone Series:
- General (for all)
- Science S1 (Math, Physics, Chemistry)
- Science S2 (Math, Chemistry, Biology)
- Science S3 (Physics, Chemistry, Biology)
- Arts A1 (Literature, History, Economics)
- Arts A2 (Literature, Economics, Geography)
- Arts A3 (History, Economics, Geography)
- Arts A4 (Literature, French, History)
- Arts A5 (History, Geography, Philosophy)

#### 2. Add `series_id` to `exams` Table

```text
ALTER TABLE exams ADD COLUMN series_id uuid REFERENCES series(id);
```

- Nullable to support existing exams without series
- Foreign key to series table

#### 3. RLS Policies for Series Table

- Anyone can view active series (SELECT)
- Only admins can manage series (ALL)

---

### Frontend Changes

#### 1. Update `useExamFormData` Hook

Add series fetching with system filtering:

```text
File: src/hooks/useExamFormData.tsx

Add:
- Series interface
- Query to fetch series
- refetchSeries function
- Return series in hook output
```

#### 2. Update ExamManager Form (Edit Exam Page)

```text
File: src/pages/ExamManager.tsx

Changes:
- Add series_id to ExamData interface
- Add series_id to formData state
- Add Series dropdown after Class selection
- Filter series options based on selected class's section
- Include "General" option always visible
- Include series_id in exam save/update operations
```

**Series Dropdown Logic:**
- If class is Francophone → show Francophone + General series
- If class is Anglophone → show Anglophone + General series
- If no class selected → show all series

#### 3. Update Browse Page (Exams2)

```text
File: src/pages/Exams2.tsx

Changes:
- Add series filter state
- Fetch series from database
- Filter series options based on selected system
- Add Series multi-select filter in sidebar
- Include series in exam filtering logic
- Display series on exam cards
```

#### 4. Update Admin Exam Management

```text
File: src/components/admin/ExamManagement.tsx

Changes:
- Add series to Exam interface
- Include series in exam fetch query
- Add series filter dropdown
- Display series in exam cards
```

#### 5. Create SeriesManagement Component

```text
File: src/components/admin/SeriesManagement.tsx

New component for System Configuration:
- CRUD operations for series
- Table display with code, name translations, system
- Form with all fields
- System dropdown (francophone/anglophone/general)
```

#### 6. Update Admin Page

```text
File: src/pages/Admin.tsx

Changes:
- Import SeriesManagement
- Add Series ConfigSection in System Configuration tab
```

---

### Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `supabase/migrations/[timestamp]_add_series.sql` | Create | Database migration |
| `src/hooks/useExamFormData.tsx` | Modify | Add series fetching |
| `src/pages/ExamManager.tsx` | Modify | Add series dropdown to form |
| `src/pages/Exams2.tsx` | Modify | Add series filter |
| `src/components/admin/ExamManagement.tsx` | Modify | Add series display/filter |
| `src/components/admin/SeriesManagement.tsx` | Create | Admin CRUD component |
| `src/pages/Admin.tsx` | Modify | Add Series section |

---

### UI/UX Considerations

1. **Series Dropdown Placement**: After Class selector, as series depends on educational system
2. **Filter Behavior**: Series filter appears after System filter is selected
3. **"General" Option**: Always available, used for:
   - Exams applicable to all series (e.g., general knowledge)
   - Legacy exams imported without series info
4. **Dynamic Filtering**: Series options update based on class section selection

---

### Data Flow

```text
1. User selects Class → determines system (francophone/anglophone)
2. Series dropdown filters to show relevant series + General
3. User selects series (optional - defaults to none)
4. On save, series_id stored in exams table
5. On browse, series filter shows based on selected system
```

---

### Migration Strategy

1. Create series table with initial data
2. Add nullable series_id column to exams
3. Existing exams remain with NULL series_id (treated as "not specified")
4. Users can edit existing exams to assign series
5. Browse page shows "All Series" by default

---

### Summary

This implementation:
1. Creates a new `series` reference table with Francophone and Anglophone tracks
2. Adds `series_id` to exams table (nullable for backward compatibility)
3. Updates the exam editor with a filtered series dropdown
4. Adds series filtering to the browse and admin pages
5. Creates an admin management component for series CRUD
6. Includes a "General" option for universal or legacy exams
