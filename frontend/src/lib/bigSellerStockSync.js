export const SHOPEE_HEADERS = [
  'Note: Please do not modify Item_ID and Variation_ID!',
  'Item_ID (Not Editable)',
  'Variation_ID (Not Editable)',
  'Product Name',
  'Variations',
  'SKU',
  'Stock',
  'Price',
];

const sku = value => String(value ?? '').trim();
const hasValues = row => row?.some(value => value != null && String(value).trim() !== '');

const stockNumber = (value, label, itemSku) => {
  const number = value === '' || value == null ? Number.NaN : Number(value);
  if (!Number.isFinite(number)) throw new Error(`${label} for SKU "${itemSku}" must be a number.`);
  return number;
};

export function validateInventoryRows(inventoryRows) {
  const inventoryHeader = inventoryRows?.[0] ?? [];
  const inventorySkuIndex = inventoryHeader.indexOf('SKU Name');
  const inventoryStockIndex = inventoryHeader.indexOf('On Hand');
  if (inventorySkuIndex < 0 || inventoryStockIndex < 0) {
    throw new Error('Inventory file must contain "SKU Name" and "On Hand" columns.');
  }

  const inventoryStock = new Map();
  for (const row of inventoryRows.slice(1).filter(hasValues)) {
    const itemSku = sku(row[inventorySkuIndex]);
    if (itemSku) inventoryStock.set(itemSku, stockNumber(row[inventoryStockIndex], 'Inventory On Hand', itemSku));
  }
  return inventoryStock;
}

export function validateShopeeRows(shopeeRows) {
  const shopeeHeader = shopeeRows?.[0] ?? [];
  if (shopeeHeader.length !== 8 || SHOPEE_HEADERS.some((header, index) => shopeeHeader[index] !== header)) {
    throw new Error('Shopee file must keep the fixed 8-column header.');
  }
  const rows = shopeeRows.slice(1).filter(hasValues);
  for (const row of rows) {
    const itemSku = sku(row[5]);
    if (itemSku) stockNumber(row[6], 'Shopee Stock', itemSku);
  }
  return rows;
}

export function buildStockImport(inventoryRows, shopeeRows) {
  const inventoryStock = validateInventoryRows(inventoryRows);
  const shopeeHeader = shopeeRows[0];
  const rows = validateShopeeRows(shopeeRows);
  const skuCounts = new Map();
  for (const row of rows) {
    const itemSku = sku(row[5]);
    if (itemSku) skuCounts.set(itemSku, (skuCounts.get(itemSku) ?? 0) + 1);
  }
  const duplicateSkus = [...skuCounts]
    .filter(([, count]) => count > 1)
    .map(([itemSku, count]) => ({ sku: itemSku, count }));
  const duplicateSet = new Set(duplicateSkus.map(item => item.sku));

  const outputRows = [[...shopeeHeader]];
  const unmatchedSkus = [];
  const summary = {
    totalRows: rows.length,
    matchedRows: 0,
    changedRows: 0,
    unchangedRows: 0,
    blankSkuRows: 0,
    unmatchedRows: 0,
    duplicateSkuRows: 0,
  };

  for (const row of rows) {
    const itemSku = sku(row[5]);
    if (!itemSku) {
      summary.blankSkuRows += 1;
      continue;
    }
    if (duplicateSet.has(itemSku)) {
      summary.duplicateSkuRows += 1;
      continue;
    }
    const currentStock = Number(row[6]);
    if (!inventoryStock.has(itemSku)) {
      summary.unmatchedRows += 1;
      unmatchedSkus.push(itemSku);
      continue;
    }

    summary.matchedRows += 1;
    const latestStock = inventoryStock.get(itemSku);
    if (latestStock === currentStock) {
      summary.unchangedRows += 1;
      continue;
    }

    const outputRow = row.slice(0, 8);
    outputRow[6] = latestStock;
    outputRows.push(outputRow);
    summary.changedRows += 1;
  }

  return { outputRows, summary, duplicateSkus, unmatchedSkus: [...new Set(unmatchedSkus)] };
}

export function formatImportBatchFilename(date = new Date()) {
  const pad = value => String(value).padStart(2, '0');
  return `importBatch_${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}_${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}.xlsx`;
}
