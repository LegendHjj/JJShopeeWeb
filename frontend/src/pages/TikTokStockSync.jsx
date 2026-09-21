import { useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import { Download, ArrowRightLeft, UploadCloud } from 'lucide-react';
import { buildTikTokStock } from '../lib/tiktokStockSync';

const steps = [
  ['Download the latest Shopee stock', 'Open Shopee Mass Update, select Sales Info, click Generate, then Download. Export all products to match as many TikTok SKUs as possible.', 'step1'],
  ['Upload your Shopee Excel file', 'Drag and drop the freshly downloaded Sales Info file into the upload box above. The saved TikTok template is used automatically.'],
  ['Download the TikTok Excel file', 'Review the matching summary, then click Download TikTok stock Excel. Only matched quantities in column I are changed.'],
  ['Open TikTok Bulk restock', 'In TikTok Seller Center, open Products → Manage products → Manage stock, then click Bulk restock.', 'step4'],
  ['Upload the updated list to TikTok', 'Go directly to Step 2: Upload edited list. Drag in the TikTok Excel file downloaded here, then review the import result in TikTok.', 'step5'],
];

export default function TikTokStockSync() {
  const input = useRef(null);
  const request = useRef(0);
  const [result, setResult] = useState(null);
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const base = import.meta.env.BASE_URL;

  const load = async file => {
    const id = ++request.current;
    setResult(null);
    setError('');
    setName(file.name);
    setBusy(true);
    try {
      if (!/\.xlsx$/i.test(file.name)) throw new Error('Please choose the original .xlsx Shopee Sales Info file.');
      if (file.size > 20 * 1024 * 1024) throw new Error('Please choose an Excel file smaller than 20 MB.');
      const [buffer, response] = await Promise.all([file.arrayBuffer(), fetch(`${base}templates/tiktok-stock.xlsx`)]);
      if (!response.ok) throw new Error('Unable to load the saved TikTok template. Please try again.');
      const workbook = XLSX.read(buffer, { type: 'array' });
      if (workbook.SheetNames.length !== 1) throw new Error('Please upload the original single-sheet Shopee Sales Info export.');
      const rows = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { header: 1, defval: null });
      const next = buildTikTokStock(await response.arrayBuffer(), rows);
      if (id === request.current) setResult(next);
    } catch (err) {
      if (id === request.current) setError(err.message || 'Unable to read this workbook.');
    } finally {
      if (id === request.current) setBusy(false);
    }
  };

  const download = () => {
    if (!result?.matched) return;
    const url = URL.createObjectURL(new Blob([result.bytes], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `TikTok_stock_${new Date().toISOString().replace(/[:.]/g, '-')}.xlsx`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <div className="space-y-6 pb-12">
      <header>
        <h1 className="flex items-center gap-3 text-2xl font-bold text-white md:text-3xl"><ArrowRightLeft className="text-orange-400" />Shopee → TikTok Stock Sync</h1>
        <p className="mt-2 text-sm text-gray-400">Use your latest Shopee stock to prepare a TikTok bulk restock Excel file.</p>
      </header>
      <p className="rounded-xl border border-emerald-500/20 bg-emerald-500/[0.06] p-4 text-sm text-emerald-200">Your Shopee file is processed privately in this browser. Match SKU (F) → Seller SKU (D), then copy Stock (J) → Quantity (I).</p>
      <section className="rounded-2xl border border-white/5 bg-[#141414] p-4 md:p-6">
        <h2 className="text-lg font-bold">Upload Shopee Sales Info</h2>
        <p className="mt-1 text-sm text-gray-400">Saved TikTok template: ASHLIFE 205 · 637 SKU rows · September 2026. Upload a fresh Shopee export each time.</p>
        <div className={`mt-5 rounded-xl border-2 border-dashed p-6 ${dragging ? 'border-orange-400 bg-orange-500/10' : 'border-white/10 bg-black/20'}`}
          onDragOver={event => { event.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={event => { event.preventDefault(); setDragging(false); if (event.dataTransfer.files[0]) load(event.dataTransfer.files[0]); }}>
          <button type="button" onClick={() => input.current?.click()} className="flex min-h-32 w-full flex-col items-center justify-center gap-3 rounded-lg text-center focus-visible:outline-2 focus-visible:outline-orange-400">
            <UploadCloud size={32} className="text-orange-400" />
            <span className="font-semibold">Choose or drop Shopee Excel file</span>
            <span className="text-sm text-gray-400">Original Sales Info export (.xlsx)</span>
          </button>
          <input ref={input} type="file" aria-label="Shopee Sales Info Excel" accept=".xlsx" className="hidden" onChange={event => { if (event.target.files[0]) load(event.target.files[0]); event.target.value = ''; }} />
        </div>
        <p role="status" className="mt-3 break-all text-sm text-gray-400">{busy ? 'Reading file and matching SKUs…' : name}</p>
        {error && <p role="alert" className="mt-3 text-sm text-red-300">{error}</p>}
      </section>
      {result && <section aria-label="Matching results" className="space-y-5 rounded-2xl border border-white/5 bg-[#141414] p-4 md:p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h2 className="text-lg font-bold">Comparison complete</h2>
          <button onClick={download} disabled={!result.matched} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-orange-600 px-5 py-3 text-sm font-bold hover:bg-orange-500 disabled:opacity-40"><Download size={18} />Download TikTok stock Excel</button>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[['TikTok rows', result.total], ['Matched', result.matched], ['Quantities changed', result.changed], ['Unmatched', result.unmatched.length]].map(([label, value]) => <div key={label}><p className="text-2xl font-bold text-orange-400">{value}</p><p className="text-sm text-gray-400">{label}</p></div>)}
        </div>
        <p className="text-sm leading-6 text-gray-400">Matching is case-sensitive and ignores surrounding spaces. Every matched TikTok row uses the Shopee quantity, including zero. Unmatched and blank-SKU rows retain their saved template quantities. Warehouse cells marked “/” stay unchanged.</p>
        {!result.matched && <p role="alert" className="text-amber-300">No SKUs matched. Check your Shopee export and SKU spelling before downloading.</p>}
        {result.conflicts.length > 0 && <p role="alert" className="rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-sm text-red-300">Conflicting Shopee quantities: {result.conflicts.join(', ')}. These duplicate SKUs were not updated. Correct their SKU names or quantities before syncing them.</p>}
        {(result.unmatched.length > 0 || result.blank > 0 || result.unlinked > 0) && <details className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 text-sm text-amber-200">
          <summary className="cursor-pointer font-semibold">Review rows kept at saved template values</summary>
          <p className="mt-3">{result.unmatched.length} unmatched · {result.blank} blank SKU · {result.unlinked} unlinked warehouse. These quantities are from the saved template, not current TikTok stock. Review them before importing.</p>
          <p className="mt-3 break-words font-mono text-xs">{[...new Set(result.unmatched)].join(', ')}</p>
        </details>}
      </section>}
      <section className="rounded-2xl border border-white/5 bg-[#141414] p-4 md:p-6">
        <h2 className="text-lg font-bold">How to download and update your stock</h2>
        <p className="mt-1 text-sm text-gray-400">Follow these five steps each time. Click any screenshot to open it full size.</p>
        <ol className="mt-6 space-y-6">{steps.map(([title, text, image], index) => <li key={title} className="rounded-xl border border-white/10 p-4">
          <h3 className="font-bold text-white">{index + 1}. {title}</h3>
          <p className="mt-2 text-sm leading-6 text-gray-400">{text}</p>
          {index === 0 && <a href="https://seller.shopee.com.my/portal/product-mass/mass-update/download" target="_blank" rel="noreferrer" className="mt-2 inline-block text-sm text-orange-400 underline">Open Shopee Mass Update</a>}
          {image && <a href={`${base}guides/tiktok-stock-${image}.png`} target="_blank" rel="noreferrer" className="mt-4 block"><img src={`${base}guides/tiktok-stock-${image}.png`} alt={title} loading="lazy" className="max-h-[520px] w-full rounded-lg bg-white object-contain" /></a>}
        </li>)}</ol>
        <p className="mt-5 text-sm text-gray-500">The saved template covers the TikTok products listed in September 2026. New products or changed Seller SKUs require an updated template.</p>
      </section>
    </div>
  );
}
