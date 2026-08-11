# BigSeller Stock Sync Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a browser-only BigSeller stock comparison page that exports only valid Shopee stock differences and reports duplicate Shopee SKUs.

**Architecture:** Keep workbook I/O in one React page and isolate row validation/comparison in one pure JavaScript module. Test the pure module with Node's built-in test runner, then wire it into the existing router, sidebar, and design system.

**Tech Stack:** React 19, Vite 6, SheetJS `xlsx`, Tailwind CSS, Lucide React, Node `node:test`.

## Global Constraints

- Process files entirely in the browser; do not upload or retain them.
- Reuse installed dependencies and add no backend endpoint or package.
- Match trimmed SKUs exactly and case-sensitively.
- Exclude every Shopee row belonging to a duplicated SKU and report the SKU for correction.
- Preserve the fixed eight-column Shopee header and replace only column G for valid changed rows.
- Name exports `importBatch_YYYYMMDD_HHmmss.xlsx` in local 24-hour time.
- Follow the existing dark/orange responsive design system.

---

### Task 1: Tested comparison module

**Files:**
- Create: `frontend/src/lib/bigSellerStockSync.test.js`
- Create: `frontend/src/lib/bigSellerStockSync.js`
- Modify: `frontend/package.json`

**Interfaces:**
- Consumes: two worksheet row matrices from `XLSX.utils.sheet_to_json(..., { header: 1, defval: null })`.
- Produces: `buildStockImport(inventoryRows, shopeeRows)` and `formatImportBatchFilename(date)`.

- [ ] **Step 1: Add the built-in test command and failing tests**

```json
"test": "node --test src/lib/bigSellerStockSync.test.js"
```

Test literal fixtures for fixed-header validation, changed/unchanged rows, blank and unmatched SKUs, duplicate exclusion, whitespace trimming, case sensitivity, numeric strings, preserved source columns, and `importBatch_20260811_143205.xlsx`.

- [ ] **Step 2: Run the test and verify RED**

Run: `npm test`
Expected: FAIL because `bigSellerStockSync.js` does not exist.

- [ ] **Step 3: Implement the minimum pure module**

```js
export function buildStockImport(inventoryRows, shopeeRows) {
  // Validate headers and numeric stocks, map Inventory On Hand by SKU,
  // remove every duplicate Shopee SKU, and return the fixed header plus
  // copied Shopee rows whose Stock is replaced by Inventory On Hand.
}

export function formatImportBatchFilename(date = new Date()) {
  // Return importBatch_YYYYMMDD_HHmmss.xlsx using local date parts.
}
```

- [ ] **Step 4: Run the test and verify GREEN**

Run: `npm test`
Expected: all tests pass with zero failures.

- [ ] **Step 5: Commit**

```powershell
git add frontend/package.json frontend/src/lib/bigSellerStockSync.js frontend/src/lib/bigSellerStockSync.test.js
git commit -m "feat: add BigSeller stock comparison"
```

### Task 2: Page, navigation, and guide assets

**Files:**
- Create: `frontend/src/pages/BigSellerStockSync.jsx`
- Add: `frontend/public/guides/bigseller-inventory-export.png`
- Add: `frontend/public/guides/bigseller-shopee-export-menu.png`
- Add: `frontend/public/guides/bigseller-shopee-export-dialog.png`
- Add: `frontend/public/guides/bigseller-shopee-import-dialog.png`
- Modify: `frontend/src/App.jsx`
- Modify: `frontend/src/components/Layout.jsx`

**Interfaces:**
- Consumes: `buildStockImport`, `formatImportBatchFilename`, browser `File.arrayBuffer()`, and SheetJS workbook helpers.
- Produces: `/bigseller-stock-sync`, two accessible drop zones, comparison results, validation warnings, and a downloaded `.xlsx` workbook.

- [ ] **Step 1: Implement the page using the tested module**

```jsx
const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null, raw: true });
const result = buildStockImport(inventory.rows, shopee.rows);
const outputSheet = XLSX.utils.aoa_to_sheet(result.outputRows);
XLSX.writeFile(outputWorkbook, formatImportBatchFilename());
```

Render upload status, summary counts, duplicate/unmatched details, an export button disabled without changed rows, and the four captioned guide images. Replacing either file recomputes automatically when both inputs are valid.

- [ ] **Step 2: Add the route and sidebar entry**

Import the page in `App.jsx`, register `bigseller-stock-sync`, and add a `RefreshCw`-icon sidebar item labelled `BigSeller Stock Sync`.

- [ ] **Step 3: Copy the supplied guide images with descriptive names**

Copy the four approved screenshots into `frontend/public/guides` without modifying their pixels.

- [ ] **Step 4: Run static verification**

Run: `npm test && npm run lint && npm run build`
Expected: all commands exit zero.

- [ ] **Step 5: Commit**

```powershell
git add frontend/src/pages/BigSellerStockSync.jsx frontend/src/App.jsx frontend/src/components/Layout.jsx frontend/public/guides
git commit -m "feat: add BigSeller stock sync page"
```

### Task 3: Workbook and browser verification

**Files:**
- Modify only if verification finds a defect in Task 1 or Task 2 files.
- Keep screenshots and temporary browser scripts outside the repository.

**Interfaces:**
- Consumes: the three supplied sample workbooks and the local Vite app.
- Produces: a verified generated workbook and desktop/mobile UI evidence.

- [ ] **Step 1: Verify the generated workbook with supplied samples**

Run the comparison against the supplied Inventory and Shopee workbooks, export one workbook, inspect its first row and representative changed rows, confirm eight columns and only column G replacement, and render the result for a visual pass.

- [ ] **Step 2: Verify the browser flow**

Start Vite, open `/#/bigseller-stock-sync`, load both files through the page, confirm summary and duplicate warning, export the workbook, and check console health.

- [ ] **Step 3: Verify responsive layout**

Capture desktop and mobile screenshots outside the repository. Confirm no clipping, overlap, broken images, unreadable text, or inaccessible controls.

- [ ] **Step 4: Run final verification**

Run: `npm test && npm run lint && npm run build`
Expected: all commands exit zero with zero test failures and zero lint errors.

- [ ] **Step 5: Commit any verification fixes**

```powershell
git add frontend/src/lib/bigSellerStockSync.js frontend/src/lib/bigSellerStockSync.test.js frontend/src/pages/BigSellerStockSync.jsx frontend/src/App.jsx frontend/src/components/Layout.jsx
git commit -m "fix: finish BigSeller stock sync verification"
```
