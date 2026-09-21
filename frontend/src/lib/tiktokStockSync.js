import * as XLSX from 'xlsx/xlsx.mjs';

const skuText = value => String(value ?? '').trim();

export function readShopeeStock(rows) {
  if (rows[0]?.[5] !== 'et_title_variation_sku' || rows[0]?.[9] !== 'et_title_variation_stock' || rows[1]?.[0] !== 'sales_info' || rows[2]?.[5] !== 'SKU' || rows[2]?.[9] !== 'Stock') {
    throw new Error('Upload the original Shopee Sales Info export (SKU in column F, Stock in column J).');
  }
  const stocks = new Map();
  const conflicts = new Set();
  for (const row of rows.slice(6)) {
    const sku = skuText(row[5]);
    if (!sku) continue;
    const value = row[9];
    const stock = typeof value === 'number' || (typeof value === 'string' && value.trim()) ? Number(value) : NaN;
    if (!Number.isSafeInteger(stock) || stock < 0) throw new Error(`Stock for SKU "${sku}" must be a non-negative whole number.`);
    if (stocks.has(sku) && stocks.get(sku) !== stock) conflicts.add(sku);
    stocks.set(sku, stock);
  }
  if (!stocks.size) throw new Error('No product SKUs found in the Shopee file.');
  for (const sku of conflicts) stocks.delete(sku);
  return { stocks, conflicts: [...conflicts] };
}

export function buildTikTokStock(template, shopeeRows) {
  template = new Uint8Array(template);
  const { stocks, conflicts } = readShopeeStock(shopeeRows);
  const workbook = XLSX.read(template, { type: 'array' });
  const sheet = workbook.Sheets.Sheet1;
  if (workbook.SheetNames.length !== 1 || sheet?.D1?.v !== 'Seller SKU' || sheet?.I3?.v !== 'Can be edited') throw new Error('The saved TikTok template is invalid.');
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null });
  const updates = new Map();
  const unmatched = [];
  let matched = 0;
  let blank = 0;
  let unlinked = 0;
  for (let index = 3; index < rows.length; index++) {
    const row = rows[index];
    const sku = skuText(row[3]);
    if (!sku) { blank++; continue; }
    if (row[8] === '/') { unlinked++; continue; }
    if (!stocks.has(sku)) { unmatched.push(sku); continue; }
    matched++;
    if (Number(row[8]) !== stocks.get(sku)) updates.set(`I${index + 1}`, stocks.get(sku));
  }

  // Edit the original XML so IDs, protected columns, styles and workbook metadata survive exactly.
  const archive = XLSX.CFB.read(template, { type: 'array' });
  const entry = XLSX.CFB.find(archive, '/xl/worksheets/sheet1.xml');
  if (!entry) throw new Error('The saved TikTok worksheet could not be found.');
  let replaced = 0;
  const xml = new TextDecoder().decode(entry.content).replace(/<c\b([^>]*\br="(I\d+)"[^>]*)>([\s\S]*?)<\/c>/g, (cell, attributes, address) => {
    if (!updates.has(address)) return cell;
    replaced++;
    return `<c${attributes.replace(/\s+t="[^"]*"/g, '')}><v>${updates.get(address)}</v></c>`;
  });
  if (replaced !== updates.size) throw new Error('Some TikTok stock cells could not be updated. No file was generated.');
  entry.content = new TextEncoder().encode(xml);
  entry.size = entry.content.length;
  const bytes = XLSX.CFB.write(archive, { type: 'array', fileType: 'zip', compression: true });
  return { bytes, matched, changed: updates.size, unmatched, conflicts, blank, unlinked, total: rows.length - 3 };
}
