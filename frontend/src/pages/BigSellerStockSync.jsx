import React, { useMemo, useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  RefreshCw,
  ShieldCheck,
  UploadCloud,
} from 'lucide-react';
import {
  buildStockImport,
  formatImportBatchFilename,
  validateInventoryRows,
  validateShopeeRows,
} from '../lib/bigSellerStockSync';

const guideSteps = [
  {
    title: '1. Download the Inventory List',
    text: 'In BigSeller, open Inventory > Warehouse > Inventory List, then choose Import & Export > Export All.',
    image: 'bigseller-inventory-export.png',
    alt: 'BigSeller Inventory List Export All menu',
  },
  {
    title: '2. Open the Shopee export',
    text: 'Open Products > Shopee > Active, then choose Import & Export > Import to update product info.',
    image: 'bigseller-shopee-export-menu.png',
    alt: 'BigSeller Shopee Active Import and Export menu',
  },
  {
    title: '3. Export the Shopee price and stock file',
    text: 'Select your store in Step 1 and click Export. Keep the downloaded workbook unchanged.',
    image: 'bigseller-shopee-export-dialog.png',
    alt: 'BigSeller export product information dialog',
  },
  {
    title: '4. Import the generated batch',
    text: 'After this page creates the import batch, upload it in Step 2, select Update stock, and confirm.',
    image: 'bigseller-shopee-import-dialog.png',
    alt: 'BigSeller import product information dialog with Update stock selected',
  },
];

const emptyFile = { data: null, error: '' };
const exportColumnWidths = [
  { wch: 54 }, { wch: 20 }, { wch: 24 }, { wch: 64 },
  { wch: 28 }, { wch: 26 }, { wch: 12 }, { wch: 12 },
];

function DropZone({ title, description, value, onFile }) {
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);

  const drop = event => {
    event.preventDefault();
    setDragging(false);
    const file = event.dataTransfer.files?.[0];
    if (file) onFile(file);
  };

  return (
    <div className="min-w-0">
      <div
        className={`min-h-48 rounded-xl border-2 border-dashed p-5 transition-colors ${
          dragging
            ? 'border-orange-400 bg-orange-500/10'
            : value.data
              ? 'border-emerald-500/40 bg-emerald-500/[0.06]'
              : value.error
                ? 'border-red-500/40 bg-red-500/[0.06]'
                : 'border-white/10 bg-black/20 hover:border-orange-500/40 hover:bg-white/[0.03]'
        }`}
        onDragEnter={event => { event.preventDefault(); setDragging(true); }}
        onDragOver={event => event.preventDefault()}
        onDragLeave={event => { if (!event.currentTarget.contains(event.relatedTarget)) setDragging(false); }}
        onDrop={drop}
      >
        <button
          type="button"
          className="flex min-h-36 w-full flex-col items-center justify-center text-center"
          onClick={() => inputRef.current?.click()}
        >
          <span className={`mb-4 grid h-12 w-12 place-items-center rounded-xl ${value.data ? 'bg-emerald-500/15 text-emerald-400' : 'bg-orange-500/15 text-orange-400'}`}>
            {value.data ? <CheckCircle2 size={24} /> : <UploadCloud size={24} />}
          </span>
          <span className="text-base font-bold text-white">{title}</span>
          <span className="mt-1 max-w-sm text-sm leading-6 text-gray-400">{description}</span>
          <span className="mt-4 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-gray-300">
            {value.data ? 'Replace file' : 'Choose or drop Excel file'}
          </span>
          <input
            ref={inputRef}
            type="file"
            className="hidden"
            accept=".xlsx,.xls"
            onChange={event => {
              const file = event.target.files?.[0];
              if (file) onFile(file);
              event.target.value = '';
            }}
          />
        </button>
      </div>
      {value.data && (
        <div className="mt-3 flex min-w-0 items-center gap-2 overflow-hidden text-sm text-emerald-400">
          <FileSpreadsheet size={16} />
          <span className="min-w-0 truncate font-medium">{value.data.name}</span>
          <span className="shrink-0 text-xs text-gray-500">{value.data.rows.length - 1} rows</span>
        </div>
      )}
      {value.error && <p className="mt-3 text-sm text-red-400">{value.error}</p>}
    </div>
  );
}

function Stat({ label, value, tone = 'text-white' }) {
  return (
    <div className="border-l border-white/10 pl-4 first:border-l-0 first:pl-0">
      <div className={`text-2xl font-bold tabular-nums ${tone}`}>{value}</div>
      <div className="mt-1 text-xs font-semibold uppercase tracking-wider text-gray-500">{label}</div>
    </div>
  );
}

export default function BigSellerStockSync() {
  const [inventory, setInventory] = useState(emptyFile);
  const [shopee, setShopee] = useState(emptyFile);
  const { result, comparisonError } = useMemo(() => {
    if (!inventory.data || !shopee.data) return { result: null, comparisonError: '' };
    try {
      return { result: buildStockImport(inventory.data.rows, shopee.data.rows), comparisonError: '' };
    } catch (error) {
      return { result: null, comparisonError: error.message };
    }
  }, [inventory.data, shopee.data]);

  const loadFile = async (kind, file) => {
    const update = kind === 'inventory' ? setInventory : setShopee;
    if (!/\.xlsx?$/i.test(file.name)) {
      update({ data: null, error: 'Please choose an .xlsx or .xls Excel file.' });
      return;
    }

    try {
      const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array', cellStyles: true });
      const sheetName = workbook.SheetNames[0];
      if (!sheetName) throw new Error('The workbook does not contain a worksheet.');
      const sheet = workbook.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null, raw: true });
      if (kind === 'inventory') validateInventoryRows(rows);
      else validateShopeeRows(rows);

      update({
        data: {
          name: file.name,
          rows,
          sheetName,
          columns: sheet['!cols'],
          firstRow: sheet['!rows']?.[0],
          headerStyles: Array.from({ length: 8 }, (_, column) => sheet[XLSX.utils.encode_cell({ r: 0, c: column })]?.s),
        },
        error: '',
      });
    } catch (error) {
      update({ data: null, error: error.message || 'Unable to read this workbook.' });
    }
  };

  const exportWorkbook = () => {
    if (!result?.summary.changedRows) return;
    const worksheet = XLSX.utils.aoa_to_sheet(result.outputRows);
    worksheet['!cols'] = shopee.data.columns || exportColumnWidths;
    worksheet['!rows'] = [shopee.data.firstRow || { hpt: 30 }];
    shopee.data.headerStyles.forEach((style, column) => {
      const cell = worksheet[XLSX.utils.encode_cell({ r: 0, c: column })];
      if (style && cell) cell.s = style;
    });
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, shopee.data.sheetName || 'Sheet1');
    XLSX.writeFile(workbook, formatImportBatchFilename(), { compression: true, cellStyles: true });
  };

  const summary = result?.summary;
  const guideBase = `${import.meta.env.BASE_URL}guides/`;

  return (
    <div className="space-y-6 pb-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header>
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-orange-500/15 text-orange-400">
            <RefreshCw size={22} />
          </span>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white md:text-3xl">BigSeller Stock Sync</h1>
            <p className="mt-1 text-sm text-gray-400">Create a Shopee stock import batch from your latest warehouse quantities.</p>
          </div>
        </div>
      </header>

      <div className="flex items-start gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/[0.06] p-4 text-sm text-emerald-200">
        <ShieldCheck className="mt-0.5 shrink-0 text-emerald-400" size={18} />
        <p><strong className="text-emerald-300">Private browser processing:</strong> your Excel files stay on this device and are never uploaded.</p>
      </div>

      <section className="rounded-2xl border border-white/5 bg-[#141414] p-4 md:p-6">
        <div className="mb-5">
          <h2 className="text-lg font-bold text-white">Upload both BigSeller files</h2>
          <p className="mt-1 text-sm text-gray-400">Inventory On Hand is treated as the latest stock. Files are compared automatically.</p>
        </div>
        <div className="grid gap-5 lg:grid-cols-2">
          <DropZone
            title="Inventory List"
            description="The warehouse export containing SKU Name and On Hand."
            value={inventory}
            onFile={file => loadFile('inventory', file)}
          />
          <DropZone
            title="Shopee Price & Stock"
            description="The Shopee export containing the fixed 8-column import format."
            value={shopee}
            onFile={file => loadFile('shopee', file)}
          />
        </div>
      </section>

      {comparisonError && (
        <div className="flex gap-3 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
          <AlertTriangle className="shrink-0" size={18} />
          <p>{comparisonError}</p>
        </div>
      )}

      {result && (
        <section className="rounded-2xl border border-white/5 bg-[#141414] p-4 md:p-6">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <h2 className="text-lg font-bold text-white">Comparison complete</h2>
              <p className="mt-1 text-sm text-gray-400">Only unique matched SKUs with different quantities will be exported.</p>
            </div>
            <button
              type="button"
              onClick={exportWorkbook}
              disabled={!summary.changedRows}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-orange-600 px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-orange-500 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Download size={18} />
              Export {summary.changedRows} stock update{summary.changedRows === 1 ? '' : 's'}
            </button>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-x-4 gap-y-6 border-y border-white/5 py-5 sm:grid-cols-3 xl:grid-cols-6">
            <Stat label="Shopee rows" value={summary.totalRows} />
            <Stat label="Matched" value={summary.matchedRows} />
            <Stat label="To update" value={summary.changedRows} tone="text-orange-400" />
            <Stat label="Unchanged" value={summary.unchangedRows} tone="text-emerald-400" />
            <Stat label="Unmatched" value={summary.unmatchedRows} tone={summary.unmatchedRows ? 'text-amber-400' : 'text-white'} />
            <Stat label="Duplicate rows" value={summary.duplicateSkuRows} tone={summary.duplicateSkuRows ? 'text-red-400' : 'text-white'} />
          </div>

          {result.duplicateSkus.length > 0 && (
            <div className="mt-5 rounded-xl border border-red-500/30 bg-red-500/[0.08] p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 shrink-0 text-red-400" size={18} />
                <div className="min-w-0">
                  <h3 className="font-bold text-red-300">Correct duplicate Shopee SKUs before the next import</h3>
                  <p className="mt-1 text-sm leading-6 text-red-200/80">Every row for these SKUs was excluded to prevent updating the wrong product variation.</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {result.duplicateSkus.map(item => (
                      <span key={item.sku} className="rounded-lg border border-red-500/20 bg-black/20 px-2.5 py-1 font-mono text-xs text-red-300">
                        {item.sku} × {item.count}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {(summary.unmatchedRows > 0 || summary.blankSkuRows > 0) && (
            <details className="mt-4 rounded-xl border border-amber-500/20 bg-amber-500/[0.05] p-4 text-sm">
              <summary className="cursor-pointer font-semibold text-amber-300">Review skipped Shopee rows</summary>
              <p className="mt-3 leading-6 text-amber-100/70">
                {summary.unmatchedRows} unmatched row{summary.unmatchedRows === 1 ? '' : 's'} and {summary.blankSkuRows} blank-SKU row{summary.blankSkuRows === 1 ? '' : 's'} were excluded.
              </p>
              {result.unmatchedSkus.length > 0 && <p className="mt-2 break-words font-mono text-xs text-amber-200/80">{result.unmatchedSkus.join(', ')}</p>}
            </details>
          )}
        </section>
      )}

      <section className="rounded-2xl border border-white/5 bg-[#141414] p-4 md:p-6">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-white">How to download and import the files</h2>
          <p className="mt-1 text-sm text-gray-400">Follow these BigSeller steps each time you update Shopee stock. Click any image to enlarge it.</p>
        </div>
        <div className="grid gap-5 lg:grid-cols-2">
          {guideSteps.map(step => (
            <article key={step.title} className="overflow-hidden rounded-xl border border-white/10 bg-black/20">
              <div className="p-4">
                <h3 className="font-bold text-white">{step.title}</h3>
                <p className="mt-1 text-sm leading-6 text-gray-400">{step.text}</p>
              </div>
              <div className="border-t border-white/5 bg-white p-2">
                <a
                  href={`${guideBase}${step.image}`}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={`Enlarge ${step.title}`}
                  title="Open full-size image"
                  className="block cursor-zoom-in rounded focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-500"
                >
                  <img
                    src={`${guideBase}${step.image}`}
                    alt={step.alt}
                    loading="lazy"
                    className="h-auto w-full rounded object-contain"
                  />
                </a>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
