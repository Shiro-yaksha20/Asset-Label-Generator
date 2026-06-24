# Asset Label Generator — Implementation Spec

A free, open-source web app for generating printable asset labels with QR codes. Runs entirely in the browser, hosted on GitHub Pages, no backend.

---

## 1. Goal

Build a static web app that:
1. Accepts CSV/Excel asset data + a logo PNG
2. Renders a live preview of asset labels
3. Tiles labels onto A4 or A3 sheets
4. Exports as PDF or PNG

Everything runs client-side. Hostable on GitHub Pages with zero configuration.

---

## 2. Tech Stack (locked)

| Concern | Library | Why |
|---|---|---|
| CSV/Excel parsing | **SheetJS (xlsx)** | Reads both formats with one API |
| QR code generation | **qrcode.js** | Lightweight, pure JS, no dependencies |
| PDF export | **jsPDF** | Generates PDF client-side |
| Canvas rendering for PNG | **html2canvas** | Converts DOM to PNG cleanly |
| Layout | **CSS Flexbox/Grid** | Solves the truncation problem the Python app had |
| Module loading | Plain `<script>` tags via CDN | No build step, no npm |

**No frameworks** (React/Vue). Plain HTML + CSS + vanilla JS. Anyone can fork and edit without a build pipeline.

---

## 3. File Structure

```
asset-label-generator/
├── index.html
├── css/
│   └── style.css
├── js/
│   ├── app.js          // main controller, event wiring
│   ├── data.js         // CSV/Excel parsing
│   ├── label.js        // single label rendering (DOM-based)
│   ├── sheet.js        // tile labels onto A4/A3 sheets
│   ├── export.js       // PDF + PNG output
│   └── qr.js           // QR code generation helpers
├── assets/
│   ├── placeholder-logo.png    // shown before user uploads logo
│   └── sample.csv              // example input file
├── README.md
└── LICENSE                     // MIT
```

**Why separate files**: each file does ONE thing. Easier to debug, easier for contributors to read, easier for AI agents to edit one file without breaking others.

---

## 4. Required Inputs (from user)

The app has a left sidebar with these inputs:

| Field | Type | Required | Notes |
|---|---|---|---|
| Asset data file | File picker | Yes | Accepts `.csv`, `.xlsx`, `.xls` |
| Logo file | File picker | No | PNG (transparent preferred). If empty, placeholder shown |
| QR link | Text input | Yes | The URL the QR code points to (same for all labels) |
| Company name | Text input | No | Only used if "Show company name" toggle is on |
| Footer text | Text input | No | Only used if "Show footer" toggle is on |
| Label size | Dropdown | Yes | 7 presets + Custom (see Section 6) |
| Sheet size | Dropdown | Yes | A4 or A3 |
| Show company name text | Toggle | — | Default: **off** |
| Show details row | Toggle | — | Default: **off** |
| Show footer text | Toggle | — | Default: **off** |

When user changes any of these, the live preview re-renders.

---

## 5. CSV/Excel Input Format

The input file must have these columns, in this order:

| Column | Header (exact) | Required | Example |
|---|---|---|---|
| 1 | `Asset ID` | Yes | PE-LAP-000001 |
| 2 | `Serial Number` | Yes | CND3500P9R |
| 3 | `Device Type` | No | Laptop |
| 4 | `Department` | No | IT |
| 5 | `Location` | No | ADMIN OFFICE |

Extra columns are ignored. Missing optional columns are handled gracefully (just don't show them on the label).

**Validation rules:**
- Asset ID is required for every row — rows with empty Asset ID are skipped with a warning displayed
- Serial Number is required for every row — same handling as Asset ID
- Whitespace is trimmed from all fields
- Headers are case-insensitive (`asset id`, `Asset ID`, `ASSET ID` all match)

A sample CSV (`assets/sample.csv`) must be included with 5-10 example rows.

---

## 6. Label Sizes

**Presets (mm):**

| Name | Width × Height | Use case |
|---|---|---|
| Extra Small | 38 × 19 | Pendrives, accessories |
| Small | 50 × 25 | Laptops, desktops |
| Medium | 63 × 38 | Printers, monitors |
| Large | 100 × 50 | Large equipment, racks |
| A4 Full Page | 210 × 297 | Single device display tag |
| A3 Full Page | 297 × 420 | Large display tag |
| Custom | User input | Width and height in mm |

**Sheet sizes for tiling:**
- A4 = 210 × 297 mm
- A3 = 297 × 420 mm

**Tiling logic:**
- App calculates `columns = floor(sheetWidth / labelWidth)` and `rows = floor(sheetHeight / labelHeight)`
- 5mm margin on all sides of the sheet
- 2mm gap between labels
- If label size > sheet size, show error: "Label larger than sheet — pick A3 or a smaller label"

**A4/A3 Full Page presets** = one label per page, no tiling.

---

## 7. Label Layout (CRITICAL — read carefully)

The label uses a **flexbox column layout** with toggleable sections. This is exactly what the user's template specifies.

### Visual structure:

```
┌────────────────────────────────────────┐
│ HEADER                                 │
│   - Logo only (default)                │
│   - OR Logo + Company name (toggle)    │
├────────────────────────────────────────┤
│ MAIN BODY                              │
│   ┌──────────────┐   ┌──────┐         │
│   │ ASSET ID     │   │  QR  │         │
│   │ (large bold) │   │      │         │
│   │ S/N: xxx     │   │      │         │
│   └──────────────┘   └──────┘         │
├────────────────────────────────────────┤
│ DETAILS ROW (toggle)                   │
│   Type: Laptop | Dept: IT | Loc: ADM   │
├────────────────────────────────────────┤
│ FOOTER (toggle)                        │
│   Property of [Company] — Do Not Remove│
└────────────────────────────────────────┘
```

### Sizing rules (proportional to label dimensions):

All sizes are **percentages of label height** so they scale across all label sizes correctly.

| Element | Size | Notes |
|---|---|---|
| Outer padding | 4% of label height | All sides |
| Header height | 22% of label height | Auto-shrinks if logo+text needs more |
| Logo max height | 18% of label height | Aspect ratio preserved |
| Company name font | 8% of label height | **Auto-shrink if too long** (see below) |
| Asset ID font | 22% of label height | Bold, dominant element |
| Serial number font | 9% of label height | Monospace font |
| QR code size | 38% of label height | Square |
| Details row font | 7% of label height | |
| Footer font | 6% of label height | Uppercase, letter-spacing 0.5px |
| Section gap | 3% of label height | Between sections |

### CRITICAL: Auto-shrink company name (this was the v1 bug)

When company name is shown next to the logo, it must **never truncate or overflow**. Use this logic:

```js
function fitTextToWidth(element, maxWidthPx, initialFontSizePx, minFontSizePx) {
  element.style.fontSize = initialFontSizePx + "px";
  while (element.scrollWidth > maxWidthPx && parseFloat(element.style.fontSize) > minFontSizePx) {
    element.style.fontSize = (parseFloat(element.style.fontSize) - 0.5) + "px";
  }
}
```

Apply this on every render to the company name element. Same logic for footer text and details row if they overflow.

### Company name + Logo header (when company name toggle is ON):

- Use flexbox: `display: flex; align-items: center; gap: 10px;`
- Logo on left, company name on right
- Logo: `flex-shrink: 0; max-width: 30%; max-height: 100%`
- Company name: `flex-grow: 1` — takes remaining width
- Apply auto-shrink to company name text

### Logo-only header (when company name toggle is OFF):

- Logo: `width: 100%; max-height: 100%; object-fit: contain;`
- Logo takes the entire header width
- Never stretches — `object-fit: contain` preserves aspect ratio

### Main body (Asset ID + Serial + QR):

- Use flexbox: `display: flex; justify-content: space-between; align-items: center;`
- Left side: Asset ID (large, bold) stacked over Serial Number (small, monospace)
- Right side: QR code
- QR width = label height × 38%
- Asset ID font auto-shrinks if it would overflow the remaining horizontal space

### Details row (toggle):

- Single line: `Type: {device_type} | Dept: {department} | Loc: {location}`
- If a field is missing in the CSV, just hide that part (e.g. if location is empty: `Type: Laptop | Dept: IT`)
- Background: very light grey (#f8f9fa), rounded corners 4px
- Auto-shrinks font if too long

### Footer (toggle):

- Single line, centered, uppercase, letter-spacing 0.5px
- Font weight: 700
- Border-top: 1px solid #cccccc
- Auto-shrinks font if too long

---

## 8. Live Preview

- Shows ONE label at the chosen size, scaled to fit the preview area
- Updates immediately when any input changes
- Display the actual mm dimensions next to the preview ("Label: 50 × 25 mm")
- Show a navigation bar above the preview: "Showing label 1 of N" with `<` and `>` arrows to cycle through rows
- Each label preview uses the data from one row of the CSV

---

## 9. Export Logic

### PDF Export

1. Loop through all CSV rows
2. Generate each label as a DOM element with exact mm dimensions
3. Use `html2canvas` to convert each label to a canvas
4. Use `jsPDF` to:
   - Set page size to chosen sheet size (A4 or A3) in mm
   - Calculate grid (columns × rows per page)
   - Place each label canvas at the correct position with 5mm margin and 2mm gap
   - Add new pages as needed
5. Save as `asset-labels-YYYY-MM-DD.pdf`

```js
const pdf = new jsPDF({
  unit: 'mm',
  format: sheetSize === 'A4' ? 'a4' : 'a3',
  orientation: 'portrait'
});
```

### PNG Export

- Same logic but instead of a PDF, output one PNG per sheet
- Zipped together if multiple sheets
- File names: `asset-labels-sheet-1.png`, `asset-labels-sheet-2.png`, etc.
- Use `JSZip` library for the zip (add to CDN list)

### Important: WYSIWYG

The label rendering function used for preview MUST be the exact same function used for export. Don't have two code paths — one shared function takes a row of data and returns a DOM element. Both preview and export use it.

---

## 10. UI Layout

```
┌──────────────────────────────────────────────────────────┐
│  Asset Label Generator                                    │
├──────────────────────────────────────────────────────────┤
│                                                           │
│  ┌────────────────┐  ┌──────────────────────────────┐    │
│  │ SIDEBAR        │  │ PREVIEW                       │    │
│  │ (settings)     │  │                               │    │
│  │                │  │  ┌──────────────────┐         │    │
│  │ - Upload CSV   │  │  │  [Label preview] │         │    │
│  │ - Upload Logo  │  │  └──────────────────┘         │    │
│  │ - QR link      │  │  < 1 of 88 >                  │    │
│  │ - Company name │  │  Label: 50 × 25 mm            │    │
│  │ - Footer text  │  │                               │    │
│  │ - Label size   │  │  ┌─────────────┬─────────┐    │
│  │ - Sheet size   │  │  │ Export PDF  │ Export PNG │  │
│  │ - Toggles      │  │  └─────────────┴─────────┘    │
│  └────────────────┘  └──────────────────────────────┘    │
└──────────────────────────────────────────────────────────┘
```

- Sidebar width: 320px fixed
- Preview area: takes remaining width
- No dark theme (user said: not needed)
- Use a clean, neutral light theme — system font stack

---

## 11. CDN URLs (use these exact versions)

Add these to `index.html` head:

```html
<script src="https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/qrcode@1.5.3/build/qrcode.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js"></script>
```

Load these BEFORE your own `js/` files.

---

## 12. Sample CSV (assets/sample.csv)

```csv
Asset ID,Serial Number,Device Type,Department,Location
PE-LAP-000001,CND3500P9R,Laptop,IT,ADMIN OFFICE
PE-LAP-000002,CND3500P9S,Laptop,HR,ADMIN OFFICE
PE-DSK-000001,MXL1234567,Desktop,FINANCE,YARD
PE-DSK-000002,MXL1234568,Desktop,FINANCE,YARD
PE-PRT-000001,EPSON123456,Printer,ADMIN,ADMIN OFFICE
PE-PRT-000002,HP987654321,Printer,IT,YARD
PE-TAB-000001,SAM456789,Tablet,BUSINESS DEVELOPMENT,ADMIN OFFICE
```

---

## 13. README.md (must include)

The README must contain:

1. **What it is** — one-paragraph description
2. **Live demo link** — placeholder for the GitHub Pages URL
3. **Screenshots** — placeholders for now
4. **How to use** — 4-step user guide
5. **Input format** — table of required CSV columns
6. **Local development** — how to run locally (just open `index.html`, no build needed)
7. **Hosting on GitHub Pages** — instructions
8. **License** — MIT
9. **Contributing** — short note

---

## 14. Non-Goals (do NOT build these)

The following are explicitly OUT of scope. Don't add them.

- ❌ Server-side anything (databases, login, user accounts)
- ❌ Per-device unique QR codes (QR is the same on every label)
- ❌ Direct printing from the app (user prints the exported PDF themselves)
- ❌ Custom field mapping UI (input columns are fixed)
- ❌ Multi-language UI (English only)
- ❌ Dark theme
- ❌ Bulk QR generation pointing to per-device URLs
- ❌ Saving settings to localStorage (each session starts fresh)
- ❌ Integration with Google Sheets, Snipe-IT, or any external service

If you find yourself adding these, stop. They're not needed.

---

## 15. Acceptance Criteria (verify before saying "done")

Run through this checklist:

- [ ] Open `index.html` directly in a browser — loads without errors
- [ ] Upload the sample CSV — preview shows label 1 of 7
- [ ] Click `>` arrow — preview cycles to label 2
- [ ] Upload a PNG logo — appears in the header
- [ ] Toggle "Show company name" ON — text appears next to logo
- [ ] Toggle "Show company name" OFF — logo takes full header width
- [ ] Toggle "Show details row" ON — Type/Dept/Loc line appears
- [ ] Toggle "Show footer" ON — footer text appears at bottom
- [ ] Type a very long company name (60+ characters) — text auto-shrinks, never truncates
- [ ] Change label size to "Small" — preview shrinks
- [ ] Change label size to "A4 Full Page" — preview becomes a large single label
- [ ] Enter a QR link — QR code appears and is scannable
- [ ] Export PDF — file downloads, opens correctly, shows all labels tiled on A4
- [ ] Change sheet size to A3, export again — labels tile differently
- [ ] Export PNG — file(s) download
- [ ] Page works offline after first load (no missing CDN errors)

If any of these fail, fix before considering the app done.

---

## 16. Code Style Guidelines

- Use `const` and `let`, never `var`
- Use `async/await` over `.then()` chains
- One responsibility per function
- Comment WHY, not WHAT (the code shows what)
- No external CSS frameworks (no Tailwind, Bootstrap) — keep `style.css` self-contained
- All functions in `js/` files attach to a single global namespace `window.LabelGen` to avoid polluting global scope
- File ordering in `index.html`: CDNs → `data.js` → `qr.js` → `label.js` → `sheet.js` → `export.js` → `app.js`

---

## 17. Order to Build

To avoid getting lost, build in this order. Test each step before moving on.

1. **HTML skeleton** — `index.html` with sidebar + preview area structure, no logic
2. **CSS** — `style.css` with the basic layout
3. **`data.js`** — parse the sample CSV, log rows to console
4. **`label.js`** — render one label into a div, hardcoded data first, then take a row object
5. **`qr.js`** — generate QR code as a canvas/img, embed into label
6. **Auto-shrink text** — implement and test with long company name
7. **Live preview wiring** — `app.js` connects inputs to label rendering
8. **Toggles** — hide/show sections based on checkboxes
9. **Label size selector** — preset dropdown + custom inputs
10. **`sheet.js`** — tile multiple labels onto an A4/A3 sheet
11. **`export.js`** — PDF export first, then PNG
12. **Sample CSV + README** — last
13. **Acceptance test** — go through Section 15

---

## 18. Common Pitfalls (learn from v1)

The previous Python version of this app had two bugs. Don't repeat them:

1. **Text truncation** — v1 clipped the company name when it was too long. Solution: auto-shrink font, never clip. Done via the `fitTextToWidth` function in Section 7.

2. **Company name and footer merged into one field** — v1 had a single "footer text" field that users mistakenly used for company name. Solution: keep them as TWO separate inputs in the sidebar, with TWO separate toggles. Already specified in Section 4.

3. **Preview and export looking different** — common issue when preview uses one renderer and export uses another. Solution: ONE shared function (`renderLabel(data)`) used by both. Already specified in Section 9.

---

## End of Spec

Total scope: ~6 small files of code + sample CSV + README. Should be buildable in one focused session.

Build in the order from Section 17. Test each piece. Verify against Section 15 acceptance criteria before calling it done.
