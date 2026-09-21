const tokens = value => String(value ?? '').split(',').map(s => s.trim()).filter(Boolean);
const validSku = value => value && !['0', '-'].includes(value);

// Input rows are spreadsheet data rows: C = variation ID, F = SKU.
export function buildVariantMapping(malaysia, singapore) {
  const singaporeBySku = new Map();
  for (const row of singapore) {
    const sku = String(row[5] ?? '').trim();
    const id = String(row[2] ?? '').trim();
    if (!validSku(sku) || !/^\d+$/.test(id) || id === '0') continue;
    singaporeBySku.set(sku, [...new Set([...(singaporeBySku.get(sku) || []), id])]);
  }
  const byId = new Map();
  for (const row of malaysia) {
    const sku = String(row[5] ?? '').trim();
    const id = String(row[2] ?? '').trim();
    if (validSku(sku) && id !== '0' && singaporeBySku.has(sku)) {
      byId.set(id, [...new Set([...(byId.get(id) || []), ...singaporeBySku.get(sku)])]);
    }
  }
  return { byId, singaporeBySku };
}

export function copySingaporeRows(source, { byId, singaporeBySku }) {
  const unresolved = [];
  let changed = 0;
  const rows = source.map(original => {
    const row = structuredClone(original);
    const ids = tokens(row.VariantianID);
    const mapped = ids.some(id => byId.has(id));
    const fallback = tokens(row.SKUID).flatMap(sku => singaporeBySku.get(sku) || []);
    let missing = [];
    if (mapped) {
      missing = ids.filter(id => !byId.has(id));
      row.VariantianID = [...new Set(ids.flatMap(id => byId.get(id) || [id]))].join(',');
    } else if (fallback.length) {
      row.VariantianID = [...new Set(fallback)].join(',');
    } else {
      missing = ids;
    }
    if (missing.length || (!ids.length && !fallback.length)) {
      unresolved.push({ docId: row._docId, seqNr: row.seqNr, productName: row.productName, ids: missing, reason: missing.length ? 'No matching SKU; original ID retained' : 'No variation ID or matching SKU' });
    }
    if (row.VariantianID !== original.VariantianID) changed++;
    return row;
  });
  return { rows, changed, unresolved };
}
