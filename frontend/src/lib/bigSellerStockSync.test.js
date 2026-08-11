import test from 'node:test';
import assert from 'node:assert/strict';
import { buildStockImport, formatImportBatchFilename } from './bigSellerStockSync.js';

const inventoryHeader = ['Image URL', 'SKU Name', 'Title', 'Weight(g)', 'Length(cm)', 'Width(cm)', 'Height(cm)', 'Warehouse', 'Area', 'Shelf', 'On Hand'];
const shopeeHeader = [
  'Note: Please do not modify Item_ID and Variation_ID!',
  'Item_ID (Not Editable)',
  'Variation_ID (Not Editable)',
  'Product Name',
  'Variations',
  'SKU',
  'Stock',
  'Price',
];

const inventoryRow = (sku, stock) => [null, sku, null, null, null, null, null, null, null, null, stock];
const shopeeRow = (sku, stock, itemId = '100', variationId = '200') => [null, itemId, variationId, 'Product', 'Variation', sku, stock, 1.25];

test('exports only changed rows and replaces only Shopee Stock', () => {
  const changed = shopeeRow('CHANGE', 2, '101', '201');
  const result = buildStockImport(
    [inventoryHeader, inventoryRow('CHANGE', 7), inventoryRow('SAME', 4)],
    [shopeeHeader, changed, shopeeRow('SAME', 4, '102', '202')],
  );

  assert.deepEqual(result.outputRows, [shopeeHeader, [null, '101', '201', 'Product', 'Variation', 'CHANGE', 7, 1.25]]);
  assert.deepEqual(result.summary, {
    totalRows: 2,
    matchedRows: 2,
    changedRows: 1,
    unchangedRows: 1,
    blankSkuRows: 0,
    unmatchedRows: 0,
    duplicateSkuRows: 0,
  });
});

test('trims SKUs but keeps matching case-sensitive', () => {
  const result = buildStockImport(
    [inventoryHeader, inventoryRow('  TRIMMED  ', '8'), inventoryRow('CaseSku', 5)],
    [shopeeHeader, shopeeRow('TRIMMED', '3'), shopeeRow('casesku', 1)],
  );

  assert.equal(result.summary.changedRows, 1);
  assert.equal(result.summary.unmatchedRows, 1);
  assert.deepEqual(result.unmatchedSkus, ['casesku']);
  assert.equal(result.outputRows[1][6], 8);
});

test('ignores blank and unmatched Shopee SKUs', () => {
  const result = buildStockImport(
    [inventoryHeader, inventoryRow('KNOWN', 5)],
    [shopeeHeader, shopeeRow('', 1), shopeeRow('MISSING', 2)],
  );

  assert.equal(result.outputRows.length, 1);
  assert.equal(result.summary.blankSkuRows, 1);
  assert.equal(result.summary.unmatchedRows, 1);
  assert.deepEqual(result.unmatchedSkus, ['MISSING']);
});

test('excludes every row belonging to a duplicate Shopee SKU', () => {
  const result = buildStockImport(
    [inventoryHeader, inventoryRow('DUPLICATE', 9), inventoryRow('VALID', 7)],
    [shopeeHeader, shopeeRow('DUPLICATE', 1, '1', '1'), shopeeRow('DUPLICATE', 2, '1', '2'), shopeeRow('VALID', 3)],
  );

  assert.deepEqual(result.duplicateSkus, [{ sku: 'DUPLICATE', count: 2 }]);
  assert.equal(result.summary.duplicateSkuRows, 2);
  assert.equal(result.summary.changedRows, 1);
  assert.equal(result.outputRows[1][5], 'VALID');
});

test('rejects missing fixed Shopee headers', () => {
  const wrongHeader = [...shopeeHeader];
  wrongHeader[0] = 'Wrong note';

  assert.throws(
    () => buildStockImport([inventoryHeader], [wrongHeader]),
    /Shopee file must keep the fixed 8-column header/,
  );
});

test('rejects non-numeric stock values', () => {
  assert.throws(
    () => buildStockImport([inventoryHeader, inventoryRow('SKU', 'many')], [shopeeHeader, shopeeRow('SKU', 1)]),
    /Inventory On Hand for SKU "SKU" must be a number/,
  );
  assert.throws(
    () => buildStockImport([inventoryHeader, inventoryRow('SKU', 1)], [shopeeHeader, shopeeRow('SKU', '')]),
    /Shopee Stock for SKU "SKU" must be a number/,
  );
});

test('rejects non-numeric stock even when the Shopee SKU is duplicated', () => {
  assert.throws(
    () => buildStockImport(
      [inventoryHeader, inventoryRow('DUPLICATE', 1)],
      [shopeeHeader, shopeeRow('DUPLICATE', 'many'), shopeeRow('DUPLICATE', 2)],
    ),
    /Shopee Stock for SKU "DUPLICATE" must be a number/,
  );
});

test('formats a collision-resistant local timestamp filename', () => {
  assert.equal(
    formatImportBatchFilename(new Date(2026, 7, 11, 14, 32, 5)),
    'importBatch_20260811_143205.xlsx',
  );
});
