import React, { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { COLLECTIONS } from '../lib/firestoreApi';
import { Upload, Search, AlertTriangle, CheckCircle2, RefreshCw, FileSpreadsheet, Copy, X, ArrowUpDown, ChevronUp, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// ─── Helper: Read Profit Manager data from localStorage cache only ───────────
const getCachedProfitData = () => {
  try {
    const cacheKey = `shopee_cache_${COLLECTIONS.shopee.prodActPriceCalc}`;
    const raw = localStorage.getItem(cacheKey);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

// ─── Helper: Flatten all VariantianIDs from Profit Manager (comma-separated) ─
const buildKnownIdSet = (profitData) => {
  const set = new Set();
  profitData.forEach(item => {
    const vid = (item.VariantianID || '').toString().trim();
    if (!vid) return;
    // Split by comma, trim, and add each
    vid.split(',').forEach(id => {
      const trimmed = id.trim();
      if (trimmed) set.add(trimmed);
    });
    // Also add SKUID as fallback
    const skuid = (item.SKUID || '').toString().trim();
    if (skuid) {
      skuid.split(',').forEach(id => {
        const trimmed = id.trim();
        if (trimmed) set.add(trimmed);
      });
    }
  });
  return set;
};

// ─── Main Component ──────────────────────────────────────────────────────────
export default function VariantChecker() {
  const [excelRows, setExcelRows] = useState([]);
  const [uploadedFileName, setUploadedFileName] = useState('');
  const [showOnlyMissing, setShowOnlyMissing] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [copiedAll, setCopiedAll] = useState(false);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });

  // Load Profit Manager data from localStorage (no Firebase call)
  const profitData = useMemo(() => getCachedProfitData(), []);
  const knownIds = useMemo(() => buildKnownIdSet(profitData), [profitData]);

  const handleSort = (key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  const SortIndicator = ({ columnKey }) => {
    if (sortConfig.key !== columnKey) return <ArrowUpDown size={12} className="ml-1 opacity-10 group-hover:opacity-50" />;
    return sortConfig.direction === 'asc'
      ? <ChevronUp size={12} className="ml-1 text-blue-400" />
      : <ChevronDown size={12} className="ml-1 text-blue-400" />;
  };

  // ── File Upload ──
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadedFileName(file.name);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(ws);

        // Extract relevant columns and check against known IDs
        const rows = data.map((row, idx) => {
          let variationId = (row['Variation ID'] || '').toString().trim();
          const parentSKU = (row['Parent SKU'] || '').toString().trim();
          const productName = row['Product Name'] || row['product_name'] || '';
          const variationName = row['Variation Name'] || row['variation_name'] || '';
          const confirmedUnits = parseInt(row['Units (Confirmed Order)']) || parseInt(row['Quantity']) || 0;

          // Skip rows where Variation ID is empty or '-' (only check column D)
          if (!variationId || variationId === '-') {
            return null; // Will be filtered out below
          }

          // Check if this ID exists in Profit Manager
          const found = knownIds.has(variationId) ||
            (parentSKU && parentSKU !== '-' && knownIds.has(parentSKU));

          // Find matching product name from profit data for reference
          let matchedProduct = '';
          if (found) {
            const match = profitData.find(p =>
              (p.VariantianID || '').includes(variationId) ||
              (p.SKUID || '').includes(parentSKU)
            );
            matchedProduct = match?.productName || '';
          }

          return {
            _idx: idx,
            variationId,
            parentSKU,
            productName,
            variationName,
            confirmedUnits,
            found,
            matchedProduct,
          };
        }).filter(Boolean); // Remove skipped rows (null entries)

        setExcelRows(rows);
      } catch (err) {
        alert(`Error parsing Excel: ${err.message}`);
      }
    };
    reader.readAsBinaryString(file);
    e.target.value = '';
  };

  // ── Filtering & Sorting ──
  const filteredRows = useMemo(() => {
    let rows = excelRows;
    if (showOnlyMissing) rows = rows.filter(r => !r.found);
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      rows = rows.filter(r =>
        r.variationId.toLowerCase().includes(term) ||
        r.productName.toLowerCase().includes(term) ||
        r.variationName.toLowerCase().includes(term) ||
        r.parentSKU.toLowerCase().includes(term)
      );
    }
    if (sortConfig.key) {
      rows = [...rows].sort((a, b) => {
        const mod = sortConfig.direction === 'asc' ? 1 : -1;
        const av = a[sortConfig.key] ?? '';
        const bv = b[sortConfig.key] ?? '';
        if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * mod;
        return String(av).localeCompare(String(bv)) * mod;
      });
    }
    return rows;
  }, [excelRows, showOnlyMissing, searchTerm, sortConfig]);

  // ── Stats ──
  const totalRows = excelRows.length;
  const missingCount = excelRows.filter(r => !r.found).length;
  const matchedCount = totalRows - missingCount;

  // Deduplicate missing IDs
  const uniqueMissingIds = useMemo(() => {
    const set = new Set();
    excelRows.filter(r => !r.found).forEach(r => set.add(r.variationId));
    return [...set];
  }, [excelRows]);

  // ── Copy All Missing IDs ──
  const handleCopyAllMissing = async () => {
    const text = uniqueMissingIds.join('\n');
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2000);
  };

  return (
    <div className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight flex items-center gap-3">
            <FileSpreadsheet className="text-amber-400" size={24} />
            Variant ID Checker
          </h1>
          <p className="text-gray-400 mt-1 text-xs md:text-sm">
            Upload a Shopee Excel to find Variation IDs missing from your Profit Manager
          </p>
        </div>
        <label className="flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl shadow-lg cursor-pointer transition-all font-semibold text-sm w-full md:w-auto">
          <Upload size={16} />
          Upload Excel
          <input type="file" accept=".xls,.xlsx" className="hidden" onChange={handleFileUpload} />
        </label>
      </div>

      {/* Info: Profit Manager cache status */}
      <div className="flex flex-wrap items-center gap-2 md:gap-3 px-3 md:px-5 py-2.5 md:py-3 bg-[#141414] border border-white/5 rounded-xl text-xs text-gray-400">
        <span className="font-semibold text-gray-300">Data Source:</span>
        <span className="hidden md:inline">Profit Manager localStorage cache</span>
        <span className="md:hidden">Local cache</span>
        <span className="text-gray-600">|</span>
        <span className="text-emerald-400 font-mono font-bold">{profitData.length}</span>
        <span>products</span>
        <span className="text-gray-600">|</span>
        <span className="text-blue-400 font-mono font-bold">{knownIds.size}</span>
        <span>IDs indexed</span>
      </div>

      {uploadedFileName && (
        <>
          {/* File & Stats Bar */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-[#141414] border border-white/5 rounded-xl p-4 flex items-center gap-3">
              <FileSpreadsheet size={20} className="text-blue-400 shrink-0" />
              <div className="min-w-0">
                <p className="text-xs text-gray-500">Uploaded File</p>
                <p className="text-sm text-white font-medium truncate">{uploadedFileName}</p>
              </div>
            </div>
            <div className="bg-[#141414] border border-white/5 rounded-xl p-4 text-center">
              <p className="text-xs text-gray-500">Total Rows</p>
              <p className="text-2xl font-bold text-white font-mono">{totalRows}</p>
            </div>
            <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-4 text-center">
              <p className="text-xs text-emerald-400">Matched</p>
              <p className="text-2xl font-bold text-emerald-400 font-mono">{matchedCount}</p>
            </div>
            <div className={`rounded-xl p-4 text-center ${missingCount > 0 ? 'bg-red-500/5 border border-red-500/20' : 'bg-emerald-500/5 border border-emerald-500/20'}`}>
              <p className={`text-xs ${missingCount > 0 ? 'text-red-400' : 'text-emerald-400'}`}>Missing</p>
              <p className={`text-2xl font-bold font-mono ${missingCount > 0 ? 'text-red-400' : 'text-emerald-400'}`}>{missingCount}</p>
            </div>
          </div>

          {/* Controls */}
          <div className="flex flex-col md:flex-row flex-wrap items-stretch md:items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                type="text"
                placeholder="Search by Variant ID, Product Name, or SKU..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full bg-[#0a0a0a] border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-white outline-none focus:border-blue-500 text-sm"
              />
            </div>

            <div className="flex items-center gap-2 bg-[#141414] border border-white/5 rounded-xl p-1">
              <button
                onClick={() => setShowOnlyMissing(true)}
                className={`flex-1 md:flex-none px-3 md:px-4 py-2 rounded-lg text-xs md:text-sm font-medium transition-all ${showOnlyMissing ? 'bg-red-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
              >
                ⚠️ Missing ({missingCount})
              </button>
              <button
                onClick={() => setShowOnlyMissing(false)}
                className={`flex-1 md:flex-none px-3 md:px-4 py-2 rounded-lg text-xs md:text-sm font-medium transition-all ${!showOnlyMissing ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
              >
                📋 All ({totalRows})
              </button>
            </div>

            {uniqueMissingIds.length > 0 && (
              <button
                onClick={handleCopyAllMissing}
                className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all w-full md:w-auto ${
                  copiedAll
                    ? 'bg-emerald-600 text-white'
                    : 'bg-amber-600/20 text-amber-400 hover:bg-amber-600/30 border border-amber-500/30'
                }`}
              >
                {copiedAll ? <CheckCircle2 size={16} /> : <Copy size={16} />}
                {copiedAll ? 'Copied!' : `Copy Missing IDs (${uniqueMissingIds.length})`}
              </button>
            )}
          </div>

          {/* Results Table */}
          <div className="bg-[#141414] border border-white/5 rounded-2xl overflow-hidden">
            <div className="overflow-auto" style={{ maxHeight: 'min(500px, 55vh)' }}>
              <table className="w-full text-left text-sm min-w-[800px]">
                <thead className="bg-[#0a0a0a] sticky top-0 z-10 text-[10px] text-gray-500 uppercase">
                  <tr>
                    <th className="px-4 py-3 w-10 text-center">#</th>
                    <th className="px-4 py-3 w-12 text-center">Status</th>
                    <th className="px-4 py-3 cursor-pointer hover:bg-white/5 group" onClick={() => handleSort('variationId')}>
                      <div className="flex items-center">Variation ID <SortIndicator columnKey="variationId" /></div>
                    </th>
                    <th className="px-4 py-3 cursor-pointer hover:bg-white/5 group" onClick={() => handleSort('productName')}>
                      <div className="flex items-center">Product Name (Excel) <SortIndicator columnKey="productName" /></div>
                    </th>
                    <th className="px-4 py-3 cursor-pointer hover:bg-white/5 group" onClick={() => handleSort('variationName')}>
                      <div className="flex items-center">Variation Name <SortIndicator columnKey="variationName" /></div>
                    </th>
                    <th className="px-4 py-3 cursor-pointer hover:bg-white/5 group" onClick={() => handleSort('parentSKU')}>
                      <div className="flex items-center">Parent SKU <SortIndicator columnKey="parentSKU" /></div>
                    </th>
                    <th className="px-4 py-3 w-20 text-center cursor-pointer hover:bg-white/5 group" onClick={() => handleSort('confirmedUnits')}>
                      <div className="flex items-center justify-center">Units <SortIndicator columnKey="confirmedUnits" /></div>
                    </th>
                    <th className="px-4 py-3">Matched To</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredRows.map((row, idx) => (
                    <tr key={row._idx} className={`transition-colors ${row.found ? 'hover:bg-white/[0.02]' : 'bg-red-500/[0.03] hover:bg-red-500/[0.06]'}`}>
                      <td className="px-4 py-2 text-gray-600 text-center text-xs">{idx + 1}</td>
                      <td className="px-4 py-2 text-center">
                        {row.found
                          ? <CheckCircle2 size={16} className="text-emerald-500 mx-auto" />
                          : <AlertTriangle size={16} className="text-red-400 mx-auto" />
                        }
                      </td>
                      <td className={`px-4 py-2 font-mono text-xs ${row.found ? 'text-gray-400' : 'text-red-400 font-bold'}`}>{row.variationId}</td>
                      <td className="px-4 py-2 text-gray-300 text-xs max-w-[250px] truncate" title={row.productName}>{row.productName || '—'}</td>
                      <td className="px-4 py-2 text-gray-500 text-xs max-w-[180px] truncate" title={row.variationName}>{row.variationName || '—'}</td>
                      <td className="px-4 py-2 text-gray-500 font-mono text-xs">{row.parentSKU || '—'}</td>
                      <td className="px-4 py-2 text-center text-gray-400 font-mono text-xs">{row.confirmedUnits}</td>
                      <td className="px-4 py-2 text-emerald-400 text-xs max-w-[200px] truncate" title={row.matchedProduct}>{row.matchedProduct || '—'}</td>
                    </tr>
                  ))}
                  {filteredRows.length === 0 && (
                    <tr>
                      <td colSpan="8" className="py-16 text-center">
                        <div className="flex flex-col items-center text-gray-500">
                          {showOnlyMissing ? (
                            <>
                              <CheckCircle2 size={40} className="mb-2 text-emerald-500/30" />
                              <p className="font-medium text-emerald-400">All Variant IDs are matched! 🎉</p>
                              <p className="text-xs mt-1">Every ID in the Excel exists in your Profit Manager data.</p>
                            </>
                          ) : (
                            <>
                              <FileSpreadsheet size={40} className="mb-2 opacity-20" />
                              <p>No results found.</p>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Unique Missing IDs Summary */}
          {uniqueMissingIds.length > 0 && (
            <div className="bg-red-500/5 border border-red-500/20 rounded-2xl p-5">
              <h3 className="text-sm font-bold text-red-400 mb-3 flex items-center gap-2">
                <AlertTriangle size={16} />
                {uniqueMissingIds.length} Unique Missing Variant IDs
                <span className="text-xs text-gray-500 font-normal ml-2">— These items won't be calculated in Income Calculator</span>
              </h3>
              <div className="flex flex-wrap gap-2">
                {uniqueMissingIds.map(id => (
                  <span key={id} className="px-3 py-1 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 font-mono text-xs">
                    {id}
                  </span>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Empty state */}
      {!uploadedFileName && (
        <div className="bg-[#141414] border border-white/5 rounded-2xl p-16 text-center">
          <FileSpreadsheet size={56} className="mx-auto mb-4 text-gray-700" />
          <h2 className="text-lg font-bold text-gray-400 mb-2">Upload a Shopee Excel Report</h2>
          <p className="text-sm text-gray-600 max-w-md mx-auto">
            Upload your <span className="text-amber-400 font-mono">parentskudetail</span> Excel file.
            This tool will compare each Variation ID against your Profit Manager data
            (from localStorage cache — no Firebase quota used) and highlight any missing IDs.
          </p>
          <p className="text-xs text-gray-600 mt-4">
            💡 Missing IDs = items that won't be included in your Income Calculator profit calculations
          </p>
        </div>
      )}
    </div>
  );
}
