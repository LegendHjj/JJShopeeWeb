import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as XLSX from 'xlsx/xlsx.mjs';
import { buildTikTokStock, readShopeeStock } from './tiktokStockSync.js';

const template = fs.readFileSync(new URL('../../public/templates/tiktok-stock.xlsx', import.meta.url));
const source = (...rows) => [
  ['et_title_product_id', '', '', '', '', 'et_title_variation_sku', '', '', '', 'et_title_variation_stock'],
  ['sales_info'], ['Product ID', '', '', '', '', 'SKU', '', '', '', 'Stock'], [], [], [],
  ...rows.map(([sku, stock]) => ['1', '', '', '', '', sku, '', '', '', stock]),
];

test('accepts localized Shopee labels using stable field identifiers and still rejects wrong columns', () => {
  const english = source(['SISALPOUCHBAGWITHBEARDS', 60], ['SISALPOUCHBAGNOBEARDS', 1]);
  const chinese = english.map(row => [...row]);
  chinese[2] = ['商品ID', '商品名称', '规格编号', '名称', '主商品货号', '商品货号', '价格', '直营商品价格:SG', 'GTIN', '库存'];
  chinese[3][6] = '必填';
  assert.deepEqual(readShopeeStock(chinese), readShopeeStock(english));
  assert.deepEqual(XLSX.read(buildTikTokStock(template, chinese, -2).bytes).Sheets.Sheet1, XLSX.read(buildTikTokStock(template, english, -2).bytes).Sheets.Sheet1);
  for (const [row, column] of [[0, 5], [0, 9], [1, 0]]) {
    const invalid = chinese.map(values => [...values]);
    invalid[row][column] = 'wrong_field';
    assert.throws(() => readShopeeStock(invalid), /Sales Info/);
  }
});

test('optional adjustment reduces matched stock, floors at zero and rejects invalid adjustments', () => {
  const rows = source(['SISALPOUCHBAGWITHBEARDS', 60], ['SISALPOUCHBAGNOBEARDS', 8], ['MACARONCURVEDH', 1], ['CLIPHANGERBLACK', 0]);
  const output = XLSX.read(buildTikTokStock(template, rows, -2).bytes).Sheets.Sheet1;
  assert.deepEqual(['I4', 'I5', 'I6', 'I7'].map(cell => output[cell].v), [58, 6, 0, 0]);
  assert.equal(XLSX.read(buildTikTokStock(template, rows).bytes).Sheets.Sheet1.I4.v, 60);
  for (const value of [1, -1.5, NaN, Infinity, '', '-2']) assert.throws(() => buildTikTokStock(template, rows, value), /adjustment/);
});

test('updates only matched I cells, including zero, preserving every other template entry', () => {
  const result = buildTikTokStock(new Uint8Array(template).buffer, source(['SISALPOUCHBAGWITHBEARDS', 0], ['SISALPOUCHBAGNOBEARDS', 23]));
  assert.equal(result.matched, 2);
  assert.equal(result.changed, 2);
  const before = XLSX.read(template).Sheets.Sheet1;
  const after = XLSX.read(result.bytes).Sheets.Sheet1;
  assert.equal(after.I4.v, 0);
  assert.equal(after.I5.v, 23);
  for (const key of Object.keys(before).filter(k => !['I4', 'I5'].includes(k))) assert.deepEqual(after[key], before[key], key);
  const original = XLSX.CFB.read(template, { type: 'buffer' });
  const output = XLSX.CFB.read(result.bytes, { type: 'array' });
  for (const path of original.FullPaths.filter(p => !p.endsWith('sheet1.xml') && !p.endsWith('/') && !p.includes('Sh33tJ5'))) {
    assert.deepEqual(new Uint8Array(XLSX.CFB.find(output, path).content), new Uint8Array(XLSX.CFB.find(original, path).content), path);
  }
});

test('validates format, stock and conflicting duplicate SKUs; preserves case and leading zeros', () => {
  assert.throws(() => readShopeeStock([['SKU', 'Stock']]), /Sales Info/);
  for (const stock of ['', null, -1, 1.5, 'bad', Infinity, true]) assert.throws(() => readShopeeStock(source(['A', stock])), /whole number/);
  const duplicate = readShopeeStock(source(['A', 1], ['A', 2], ['A', 1]));
  assert.deepEqual(duplicate.conflicts, ['A']);
  assert.equal(duplicate.stocks.has('A'), false);
  const { stocks: map } = readShopeeStock(source([' 001 ', 3], ['001', 3], ['a', 4], ['', 5]));
  assert.equal(map.get('001'), 3);
  assert.equal(map.has('A'), false);
  assert.equal(map.size, 2);
  assert.equal(buildTikTokStock(template, source(['missing', 3])).matched, 0);
});
