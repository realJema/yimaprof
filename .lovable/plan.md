

## LaTeX Rendering for Exam Content

This plan adds LaTeX/math formula rendering to all exam content displays, handling both plain text and LaTeX mixed content seamlessly.

---

### Problem Analysis

The exam JSON content contains LaTeX notation like:
- Inline math: `\(P\)`, `\(\mathbb{R}\)`, `\(2x^{3} - 5x^{2} - x + 6\)`
- Display math: `\[...\]` (block equations)

These are currently displayed as raw text strings instead of rendered mathematical formulas.

---

### Text Locations Requiring LaTeX Support

After analyzing the codebase, here are all the text fields that may contain LaTeX:

| Component | Content Type | Lines |
|-----------|--------------|-------|
| **ExamContentRenderer.tsx** | Headings | 109 |
| | Instructions | 121 |
| | Passages | 132 |
| | Image captions | 144 |
| | Question text | 183 |
| | MCQ answer text (evaluation) | 220 |
| | MCQ answer text (preview) | 244 |
| | Long-form expected answer | 276 |
| | Rubric criteria | 289 |
| | Sub-question text | 314 |
| | Sub-question answer | 323 |
| | User's submitted answer | 343 |
| | Legacy question text | 372 |
| | Legacy MCQ answer (eval) | 401 |
| | Legacy MCQ answer (preview) | 425 |
| | Legacy long-form answer | 455 |
| **EditableExamContentRenderer.tsx** | Headings | 205 |
| | Instructions | 225 |
| | Passages | 245 |
| | Image captions | 266 |
| | Question text | 319 |
| | MCQ answer text | 374 |
| | Long-form expected answer | 389 |
| | Rubric criteria | 399 |
| | Sub-question text | 423 |
| | Sub-question answer | 434 |
| | Legacy question text | 470 |
| | Legacy MCQ answer text | 505 |
| | Legacy long-form answer | 520 |
| | Legacy rubric criteria | 530 |

---

### Implementation Steps

#### Step 1: Install KaTeX Dependency

Add `katex` package for LaTeX rendering. We'll use KaTeX directly instead of react-katex for more control.

```text
Package: katex (latest version)
```

#### Step 2: Create LatexText Component

Create a new reusable component `src/components/ui/latex-text.tsx` that:

1. Accepts a `text` prop (string)
2. Detects LaTeX patterns using regex
3. Splits text into segments (plain text vs LaTeX)
4. Renders LaTeX portions with KaTeX
5. Returns plain text unchanged if no LaTeX detected

**Component Logic:**

```text
function LatexText({ text, className }) {
  // Pattern matches: \(...\) for inline, \[...\] for block
  const pattern = /(\\\([\s\S]*?\\\)|\\\[[\s\S]*?\\\])/g;
  
  // Split text by pattern, keeping delimiters
  const segments = text.split(pattern);
  
  // For each segment:
  //   - If matches \(...\): render inline with KaTeX
  //   - If matches \[...\]: render block with KaTeX
  //   - Otherwise: render as plain text
  
  return combined segments;
}
```

**Key Features:**
- Handles mixed content (text + LaTeX + text)
- Preserves whitespace and line breaks
- Graceful error handling (shows raw text if KaTeX fails)
- Supports both inline and block math
- No rendering overhead for plain text (fast path)

#### Step 3: Import KaTeX CSS

Add KaTeX stylesheet import to `src/index.css`:

```css
@import 'katex/dist/katex.min.css';
```

#### Step 4: Update ExamContentRenderer.tsx

Replace direct text rendering with `<LatexText>` in all identified locations:

**Before:**
```tsx
<p className="...">{item.text}</p>
```

**After:**
```tsx
<p className="..."><LatexText text={item.text} /></p>
```

Apply to all 16+ text rendering locations in both `renderNewFormat()` and `renderLegacyFormat()` functions.

#### Step 5: Update EditableExamContentRenderer.tsx

For the editable admin view, LaTeX rendering is more nuanced:

- **When NOT editing**: Show rendered LaTeX (use LatexText)
- **When editing**: Show raw text (current behavior for contentEditable)

Since contentEditable fields already show raw text, we'll add a preview mode indicator or tooltip showing the rendered version, or simply keep the edit experience as-is since admins need to see the raw LaTeX to edit it.

For non-editable display areas (like the expected answer preview), use `<LatexText>`.

---

### Files to Create/Modify

| File | Action |
|------|--------|
| `package.json` | Add `katex` dependency |
| `src/components/ui/latex-text.tsx` | **Create** - New component |
| `src/index.css` | Add KaTeX CSS import |
| `src/components/exam/ExamContentRenderer.tsx` | Update ~16 text locations |
| `src/components/exam/EditableExamContentRenderer.tsx` | Update display-only locations |

---

### Technical Details

#### LaTeX Pattern Matching

```text
Regex: /(\\\([\s\S]*?\\\)|\\\[[\s\S]*?\\\])/g

Matches:
- \( ... \) - inline math (non-greedy)
- \[ ... \] - display/block math (non-greedy)
- [\s\S]*? handles multi-line content
```

#### Error Handling

```text
try {
  return katex.renderToString(latex, { throwOnError: false });
} catch (e) {
  // Fallback to showing raw text
  return originalText;
}
```

#### Performance Optimization

```text
// Fast path: if no LaTeX delimiters, return text as-is
if (!text.includes('\\(') && !text.includes('\\[')) {
  return <>{text}</>;
}
```

---

### Example Transformations

**Input:**
```text
On considère le polynôme \(P\) défini sur \(\mathbb{R}\) par \(P(x) = 2x^{3} - 5x^{2} - x + 6\).
```

**Output (rendered):**
```text
On considère le polynôme P défini sur ℝ par P(x) = 2x³ - 5x² - x + 6.
```
(With proper mathematical formatting - blackboard bold R, superscripts, etc.)

---

### Summary

This implementation:
1. Creates a reusable `LatexText` component for consistent math rendering
2. Handles mixed plain text and LaTeX content gracefully
3. Updates both ExamContentRenderer and EditableExamContentRenderer
4. Uses KaTeX for fast, lightweight rendering
5. Includes error handling and performance optimization

