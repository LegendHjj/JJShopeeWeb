import test from 'node:test';
import assert from 'node:assert/strict';
import { buildVariantMapping, copySingaporeRows } from './shopeeSingapore.js';

test('maps exact column F SKUs, including multiple Singapore listings, without modifying source', () => {
  const mapping = buildVariantMapping([['1','','11','','','ABC'], ['2','','12','','','AB']], [['3','','21','','','ABC'], ['4','','22','','','ABC'], ['5','','23','','','AB']]);
  const original = [{ VariantianID: '11,12,999', Notes: 'keep', sellingPrice: 5, nested: { value: 1 } }];
  const before = JSON.stringify(original);
  const { rows, unresolved } = copySingaporeRows(original, mapping);
  assert.equal(rows[0].VariantianID, '21,22,23,999');
  assert.equal(rows[0].sellingPrice, 5);
  assert.equal(unresolved.length, 1);
  rows[0].nested.value = 2;
  assert.equal(JSON.stringify(original), before);
});

test('uses explicit SKU fallback and never matches blank or placeholder SKUs', () => {
  const mapping = buildVariantMapping([['1','','11','','','0']], [['2','','21','','','0'], ['3','','22','','','SKU']]);
  const { rows } = copySingaporeRows([{VariantianID:'11'}, {VariantianID:'old', SKUID:'SKU'}, {VariantianID:null}], mapping);
  assert.equal(rows[0].VariantianID,'11');
  assert.equal(rows[1].VariantianID,'22');
  assert.equal(rows[2].VariantianID,null);
});
