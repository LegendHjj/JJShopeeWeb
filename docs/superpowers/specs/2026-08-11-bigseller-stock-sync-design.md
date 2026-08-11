# BigSeller Stock Sync Design

## Goal

Add a browser-only page that compares BigSeller's Inventory List against a Shopee price/stock export and downloads an import workbook containing only valid stock differences.

## Navigation and page structure

- Add **BigSeller Stock Sync** to the existing sidebar and route it to `/bigseller-stock-sync`.
- Follow the site's current dark/orange visual system and responsive layout.
- Show two file drop zones: **Inventory List** and **Shopee Price & Stock**. Each zone also supports click-to-select.
- Show a processing summary after both files pass validation.
- Show the supplied BigSeller screenshots below the tool as a step-by-step guide for downloading both source workbooks and importing the generated workbook.

## Input contract

The page accepts `.xlsx` and `.xls` files and validates the first worksheet by header names:

- Inventory List requires `SKU Name` and `On Hand`.
- Shopee Price & Stock requires `SKU` and `Stock`, plus the complete fixed eight-column import header:
  1. `Note: Please do not modify Item_ID and Variation_ID!`
  2. `Item_ID (Not Editable)`
  3. `Variation_ID (Not Editable)`
  4. `Product Name`
  5. `Variations`
  6. `SKU`
  7. `Stock`
  8. `Price`

Files with missing required headers, unreadable worksheets, or non-numeric stock values are rejected with a specific message. Blank Shopee SKUs are ignored and counted in the summary because they cannot be matched safely.

## Matching and validation rules

1. Trim leading and trailing whitespace from SKU values and otherwise match them exactly, including letter case.
2. Build the latest-stock lookup from Inventory `SKU Name` to Inventory `On Hand`.
3. Detect any SKU occurring more than once in the Shopee export.
4. Treat a duplicated Shopee SKU as a source-data error. Exclude every Shopee row for that SKU from comparison and export, list the duplicate SKU with its occurrence count, and ask the user to correct it in Shopee before the next run.
5. Ignore unmatched Shopee SKUs and report their count.
6. Compare numeric Inventory `On Hand` with Shopee `Stock` for each remaining unique match.
7. Keep only rows whose quantities differ.

The summary reports total Shopee rows, matched rows, changed rows, unchanged rows, blank SKU rows, unmatched SKUs, and duplicated SKUs.

## Export contract

- Reuse the Shopee workbook's first-row values so the fixed eight-column import header, including cell A1, remains exact.
- For each valid changed row, copy all eight values from the Shopee export and replace only column G (`Stock`) with Inventory `On Hand`.
- Preserve Shopee row order.
- Do not include unchanged, blank-SKU, unmatched, or duplicate-SKU rows.
- Use one worksheet and download one file named `importBatch_YYYYMMDD_HHmmss.xlsx`, using local time and a 24-hour clock.
- Disable export when there are no valid changed rows.

## User guidance

The guide explains:

1. Download the Inventory List from **Inventory > Warehouse > Inventory List > Import & Export > Export All**.
2. Download the Shopee workbook from **Products > Shopee > Active > Import & Export > Import to update product info**, select the store, then export.
3. Drop both downloaded files into this page and export the generated import batch.
4. Return to the same Shopee import dialog, upload the generated file, select **Update stock**, and confirm.

The existing supplied screenshots are displayed with captions matching these steps.

## Implementation boundaries

- Run parsing, comparison, and workbook generation entirely in the browser.
- Reuse the already-installed `xlsx`, React, Tailwind, and Lucide dependencies.
- Add no backend endpoint, database storage, upload service, or new dependency.
- Keep files in page memory only; the website does not transmit or retain them.

## Error handling

- Keep each drop zone's error next to that input.
- Replacing a file clears only that input's previous result and recomputes when both inputs are valid.
- A malformed workbook never produces an export.
- Duplicate and unmatched SKU details remain visible after valid rows are exported so the user can correct the source data.

## Verification

- Unit-test comparison behavior before implementation: changed rows, unchanged rows, blank/unmatched SKUs, duplicate exclusion, whitespace trimming, case sensitivity, numeric normalization, source-row preservation, stock replacement, and timestamped filenames.
- Verify the generated workbook against the supplied samples: fixed header values, eight columns, row order, preserved identifiers/product data/prices, and only column G changed.
- Run lint and production build.
- Test both drop zones and the export flow in the browser on desktop and mobile layouts.
- Compare the finished page visually with the existing site's design system and confirm the guide images remain readable and responsive.
