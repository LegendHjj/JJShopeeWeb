import React, { useState, useEffect, useCallback } from 'react';
import { fetchCollection, saveCollection, deleteDocument, COLLECTIONS } from '../lib/firestoreApi';
import { Save, AlertCircle, RefreshCw, Calculator, Plus, X, ChevronDown, ArrowUpDown, ChevronUp, FileJson, Download, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// ─── Fixed Fees (hardcoded as specified) ─────────────────────────────────────
const COMMISSION = 0.0862;   // 8.62%
const SERVICE    = 0.0996;   // 9.96%
const TRANSACTION= 0.0642;   // 6.42%
const TOTAL_FEES = COMMISSION + SERVICE + TRANSACTION;

// ─── Helpers ─────────────────────────────────────────────────────────────────
const calcRow = (row, maxDiscPercent) => {
  const orgPrice     = parseFloat(row.orgPrice)     || 0;
  const sellingPrice = parseFloat(row.sellingPrice) || 0;
  if (orgPrice === 0 || sellingPrice === 0) return row;

  const netSelling          = sellingPrice * (1 - TOTAL_FEES);
  const sellingPriceProfit  = parseFloat((netSelling - orgPrice).toFixed(3));

  const discMult            = 1 - (parseFloat(maxDiscPercent) / 100);
  const maxDiscPrice        = discMult * sellingPrice;
  const MaxDiscountSellingPrice = `${maxDiscPrice.toFixed(2)}(${maxDiscPercent}%)`;

  const netDisc             = maxDiscPrice * (1 - TOTAL_FEES);
  const sellingPriceProfitAfterDisc = parseFloat((netDisc - orgPrice).toFixed(3));

  const currentIncome       = parseFloat(row.currentIncomePriceAfterCalc) || 0;
  const ProfitExt           = parseFloat((sellingPriceProfitAfterDisc - currentIncome).toFixed(3));

  return {
    ...row,
    sellingPriceProfit,
    MaxDiscountSellingPrice,
    sellingPriceProfitAfterDisc,
    ProfitExt,
  };
};

const EMPTY_ITEM = {
  seqNr: 0,
  productName: '',
  orgPrice: '',
  sellingPrice: '',
  currentIncomePriceAfterCalc: '',
  sellingPriceProfit: '',
  MaxDiscountSellingPrice: '',
  sellingPriceProfitAfterDisc: '',
  ProfitExt: '',
  previousIncome: '',
  blnCalcPer10: false,
  VariantianID: '',
  SKUID: '',
  Notes: '',
};

// ─── Detail Modal ─────────────────────────────────────────────────────────────
const DetailModal = ({ item, maxDiscPercent, onMaxDiscChange, onSave, onClose, onAddNew, isNew }) => {
  const [form, setForm] = useState({ ...item });
  const [saving, setSaving] = useState(false);

  useEffect(() => { setForm({ ...item }); }, [item]);

  const set = (field, val) => setForm(f => ({ ...f, [field]: val }));

  const handleCalc = () => {
    const updated = calcRow(form, maxDiscPercent);
    setForm(updated);
  };

  const handleSave = async () => {
    setSaving(true);
    await onSave(form);
    setSaving(false);
  };

  const inputCls = "w-full bg-[#1a1a1a] border border-white/10 rounded-lg px-3 py-2 text-white outline-none focus:border-blue-500 text-sm transition-colors";
  const labelCls = "block text-xs font-medium text-gray-400 mb-1";
  const readCls  = "w-full bg-[#0f0f0f] border border-white/5 rounded-lg px-3 py-2 text-sm font-mono";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onDoubleClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.2 }}
        className="relative bg-[#141414] border border-white/10 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
        onDoubleClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-white/5 sticky top-0 bg-[#141414] z-10">
          <div>
            <h2 className="text-lg font-bold text-white">{isNew ? '➕ Add New Product' : '✏️ Edit Product'}</h2>
            <p className="text-xs text-gray-500 mt-0.5">#{form.seqNr} — {form.productName || 'Unnamed'}</p>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="p-5 grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* ── Left: Core fields ─────────────────────────────── */}
          <div className="md:col-span-2 space-y-4">
            {/* Row 1: Seq + Name + Per10 */}
            <div className="grid grid-cols-12 gap-3">
              <div className="col-span-2">
                <label className={labelCls}>No</label>
                <input className={inputCls} type="number" value={form.seqNr} onChange={e => set('seqNr', parseInt(e.target.value) || 0)} />
              </div>
              <div className="col-span-8">
                <label className={labelCls}>Product Name</label>
                <input className={inputCls} type="text" value={form.productName} onChange={e => set('productName', e.target.value)} />
              </div>
              <div className="col-span-2 flex flex-col items-center justify-end pb-1">
                <label className={`${labelCls} text-center`}>Per 10</label>
                <input type="checkbox" checked={form.blnCalcPer10 || false} onChange={e => set('blnCalcPer10', e.target.checked)} className="w-5 h-5 rounded accent-blue-500" />
              </div>
            </div>

            {/* Row 2: Prices */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className={labelCls}>Original Price</label>
                <input className={inputCls} type="number" step="0.01" value={form.orgPrice || ''} onChange={e => set('orgPrice', e.target.value)} />
              </div>
              <div>
                <label className={labelCls}>Selling Price</label>
                <input className={inputCls} type="number" step="0.01" value={form.sellingPrice || ''} onChange={e => set('sellingPrice', e.target.value)} />
              </div>
              <div>
                <label className={labelCls}>Selling Price Profit</label>
                <div className={`${readCls} text-emerald-400`}>{form.sellingPriceProfit || '—'}</div>
              </div>
            </div>

            {/* Row 3: Discount calculations */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className={labelCls}>Max Discount Price</label>
                <div className={`${readCls} text-yellow-400`}>{form.MaxDiscountSellingPrice || '—'}</div>
              </div>
              <div>
                <label className={labelCls}>Max Disc Price Profit</label>
                <div className={`${readCls} text-purple-400`}>{form.sellingPriceProfitAfterDisc || '—'}</div>
              </div>
              <div>
                <label className={labelCls}>Extra Profit</label>
                <div className={`${readCls} text-blue-400 font-bold`}>{form.ProfitExt || '—'}</div>
              </div>
            </div>

            {/* Row 4: Income fields */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className={labelCls}>Current Income (Target)</label>
                <input className={`${inputCls} border-emerald-500/30 focus:border-emerald-500`} type="number" step="0.01" value={form.currentIncomePriceAfterCalc || ''} onChange={e => set('currentIncomePriceAfterCalc', e.target.value)} />
              </div>
              <div>
                <label className={labelCls}>Previous Income</label>
                <input className={inputCls} type="number" step="0.01" value={form.previousIncome || ''} onChange={e => set('previousIncome', e.target.value)} />
              </div>
            </div>

            {/* Row 5: IDs */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Variance ID</label>
                <input className={inputCls} type="text" value={form.VariantianID || ''} onChange={e => set('VariantianID', e.target.value)} />
              </div>
              <div>
                <label className={labelCls}>SKU ID</label>
                <input className={inputCls} type="text" value={form.SKUID || ''} onChange={e => set('SKUID', e.target.value)} />
              </div>
            </div>

            {/* Row 6: Notes */}
            <div>
              <label className={labelCls}>Product Notes / Message</label>
              <textarea
                className={`${inputCls} resize-none font-mono text-xs`}
                rows={5}
                value={form.Notes || ''}
                onChange={e => set('Notes', e.target.value)}
                placeholder="Notes will be appended here..."
              />
            </div>
          </div>

          {/* ── Right: Fee panel + Calculate ─────────────────── */}
          <div className="flex flex-col gap-4">
            {/* Fixed fees display */}
            <div className="bg-[#0f0f0f] border border-white/5 rounded-xl p-4 space-y-3">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Platform Fees (Fixed)</p>
              <div className="space-y-2">
                {[
                  { label: 'Commission Fee', val: COMMISSION },
                  { label: 'Service Fee',    val: SERVICE },
                  { label: 'Transaction Fee',val: TRANSACTION },
                ].map(f => (
                  <div key={f.label} className="flex justify-between items-center">
                    <span className="text-xs text-gray-400">{f.label}</span>
                    <span className="text-sm font-mono font-bold text-orange-400">{(f.val * 100).toFixed(2)}%</span>
                  </div>
                ))}
                <div className="pt-1 border-t border-white/5 flex justify-between items-center">
                  <span className="text-xs text-gray-500">Total</span>
                  <span className="text-sm font-mono font-bold text-red-400">{(TOTAL_FEES * 100).toFixed(2)}%</span>
                </div>
              </div>
            </div>

            {/* Max discount % */}
            <div>
              <label className={labelCls}>Max Discount %</label>
              <input
                type="number"
                value={maxDiscPercent}
                onChange={e => onMaxDiscChange(parseFloat(e.target.value) || 0)}
                className="w-full bg-[#1a1a1a] border border-purple-500/40 rounded-lg px-3 py-2 text-white outline-none focus:border-purple-500 text-sm"
              />
            </div>

            {/* Calculate button */}
            <button
              onClick={handleCalc}
              className="w-full py-2.5 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all"
            >
              <Calculator size={16} />
              Calculate
            </button>

            {/* Append note timestamp */}
            <button
              onClick={() => {
                const ts = new Date().toLocaleString();
                const note = `${ts}\nSelling Price: ${form.sellingPrice || ''}\nMax Disc Price: ${form.MaxDiscountSellingPrice || ''}\nMax Disc Profit: ${form.sellingPriceProfitAfterDisc || ''}\nCurrent Income: ${form.currentIncomePriceAfterCalc || ''}\n\n`;
                set('Notes', (form.Notes || '') + note);
              }}
              className="w-full py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 rounded-xl font-medium text-sm transition-all"
            >
              📋 Append Timestamp Note
            </button>

            {/* Save */}
            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-green-900/20 transition-all mt-auto"
            >
              {saving ? <RefreshCw className="animate-spin" size={16} /> : <Save size={16} />}
              {saving ? 'Saving...' : 'Save Changes'}
            </button>

            {/* Add as new */}
            {!isNew && (
              <button
                onClick={() => onAddNew(form)}
                className="w-full py-2.5 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 text-blue-400 rounded-xl font-medium text-sm flex items-center justify-center gap-2 transition-all"
              >
                <Plus size={16} />
                Copy as New Item
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
const ProfitManager = () => {
  const [productCostData, setProductCostData] = useState([]);
  const [originalProductCostData, setOriginalProductCostData] = useState([]);
  const [originalData, setOriginalData]       = useState([]);
  const [originalOriginalData, setOriginalOriginalData] = useState([]);
  const [loading, setLoading]                 = useState(true);
  const [saving, setSaving]                   = useState(false);
  const [source, setSource]                   = useState('shopee'); // 'shopee' | 'tiktok'
  const [maxDiscPercent, setMaxDiscPercent]   = useState(10);
  const [searchTerm, setSearchTerm]           = useState('');
  const [notification, setNotification]       = useState(null);
  const [selectedItem, setSelectedItem]       = useState(null);  // item being edited in modal
  const [isNewItem, setIsNewItem]             = useState(false);
  const [sortConfig, setSortConfig] = useState({ key: 'seqNr', direction: 'asc' });

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const SortIndicator = ({ columnKey }) => {
    if (sortConfig.key !== columnKey) return <ArrowUpDown size={12} className="ml-1 opacity-10 group-hover:opacity-50 transition-opacity" />;
    return sortConfig.direction === 'asc' 
      ? <ChevronUp size={12} className="ml-1 text-blue-400" /> 
      : <ChevronDown size={12} className="ml-1 text-blue-400" />;
  };

  useEffect(() => { fetchData(); }, [source]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const cols = source === 'tiktok' ? COLLECTIONS.tiktok : COLLECTIONS.shopee;
      const [costData, orgData] = await Promise.all([
        fetchCollection(cols.prodActPriceCalc),
        fetchCollection(cols.orgProductInfo),
      ]);
      setProductCostData((costData || []).map(item => ({ ...item, _localId: item._docId || Math.random().toString(36).substr(2, 9) })));
      setOriginalProductCostData(JSON.parse(JSON.stringify(costData || [])));
      setOriginalData((orgData || []).map(item => ({ ...item, _localId: item._docId || Math.random().toString(36).substr(2, 9) })));
      setOriginalOriginalData(JSON.parse(JSON.stringify(orgData || [])));
    } catch (err) {
      showNotification('Error loading data from Firestore.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const showNotification = (msg, type = 'success') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 3500);
  };

  // Save from modal — updates in-memory list then triggers full save
  const handleModalSave = async (updatedItem) => {
    let newData;
    if (isNewItem) {
      newData = [updatedItem, ...productCostData];
    } else {
      newData = productCostData.map(r => (r._localId === updatedItem._localId) ? updatedItem : r);
    }
    setProductCostData(newData); // Immediate update for UI
    
    // Save to cloud and get back the updated items (with new IDs)
    const freshCostData = await persistSave(newData);
    
    // Merge only the newly saved items back into local state to keep IDs in sync
    if (freshCostData && freshCostData.length > 0) {
      setProductCostData(prev => prev.map(item => {
        const saved = freshCostData.find(f => (item._docId && f._docId === item._docId) || (item._localId && f._localId === item._localId));
        return saved ? { ...saved, _localId: item._localId } : item;
      }));
    }
    setSelectedItem(null);
  };

  // Full persist (cost + org sync) - OPTIMIZED for partial writes
  const persistSave = async (costData) => {
    setSaving(true);
    try {
      const cols = source === 'tiktok' ? COLLECTIONS.tiktok : COLLECTIONS.shopee;

      // 1. Filter modified cost data
      const modifiedCost = costData.filter(item => {
        if (!item._docId) return true; // Brand new
        const original = originalProductCostData.find(o => o._docId === item._docId);
        if (!original) return true;
        return JSON.stringify(item) !== JSON.stringify(original);
      });

      // 2. Sync orgProductInfo and track what actually changed there
      const updatedOrg = [...originalData];
      const itemsToUpdateInOrg = [];

      costData.forEach(costRow => {
        const idx = updatedOrg.findIndex(o => o.seqNr === costRow.seqNr);
        const income   = parseFloat(costRow.currentIncomePriceAfterCalc) || 0;
        const selling  = parseFloat(costRow.sellingPrice) || 0;
        const entry = {
          seqNr: costRow.seqNr,
          productName: costRow.productName,
          productPrice: income,
          includedPackageFee: costRow.includedPackageFee || false,
          blnCalcPer10: costRow.blnCalcPer10 || false,
          VariantianID: costRow.VariantianID || '',
          SKUID: costRow.SKUID || '',
          sellingPrice: selling,
        };

        if (idx >= 0) {
          // Sync based on SeqNr only for Org collection linkage
          const orgOriginal = originalOriginalData.find(o => o._docId === costRow._docId);
          if (!orgOriginal || JSON.stringify(entry) !== JSON.stringify(orgOriginal)) {
            Object.assign(updatedOrg[idx], entry);
            itemsToUpdateInOrg.push(updatedOrg[idx]);
          }
        } else if (costRow.productName) {
          // Brand new product, add to org
          const newEntry = { ...entry, _localId: Math.random().toString(36).substr(2, 9) };
          updatedOrg.push(newEntry);
          itemsToUpdateInOrg.push(newEntry);
        }
      });

      if (modifiedCost.length === 0 && itemsToUpdateInOrg.length === 0) {
        showNotification('No changes detected.');
        setSaving(false);
        return;
      }

      // 3. Save only modified chunks to Firestore
      const savePromises = [];
      if (modifiedCost.length > 0) {
        savePromises.push(saveCollection(cols.prodActPriceCalc, modifiedCost));
      }
      if (itemsToUpdateInOrg.length > 0) {
        savePromises.push(saveCollection(cols.orgProductInfo, itemsToUpdateInOrg));
      }

      const results = await Promise.all(savePromises);
      const savedItems = modifiedCost.length > 0 ? results[0] : [];

      // 4. Update states to match saved data without full re-fetch
      if (savedItems.length > 0) {
         setOriginalProductCostData(prev => {
           const next = [...prev];
           savedItems.forEach(s => {
             const i = next.findIndex(n => n._docId === s._docId);
             if (i >= 0) next[i] = JSON.parse(JSON.stringify(s)); else next.push(JSON.parse(JSON.stringify(s)));
           });
           return next;
         });
      }
      
      showNotification(`Saved ${modifiedCost.length} prices! ✓`);
      return savedItems;
    } catch (err) {
      console.error(err);
      showNotification('Failed to save to Firestore. Check console.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAll = () => persistSave(productCostData);

  const handleExportJson = () => {
    // 1. Sort by seqNr to match original file behavior
    const sortedForExport = [...productCostData].sort((a, b) => (a.seqNr || 0) - (b.seqNr || 0));

    // 2. Map to strict key order to match prodActPriceCalc.json
    const exportData = sortedForExport.map(item => ({
      seqNr: item.seqNr,
      productName: item.productName || "",
      PrevIncomePrice: item.PrevIncomePrice ?? null,
      currentIncomePriceAfterCalc: item.currentIncomePriceAfterCalc ?? null,
      orgPrice: item.orgPrice ?? null,
      sellingPrice: item.sellingPrice ?? null,
      MaxDiscountSellingPrice: item.MaxDiscountSellingPrice ?? null,
      sellingPriceProfit: item.sellingPriceProfit ?? null,
      sellingPriceProfitAfterDisc: item.sellingPriceProfitAfterDisc ?? null,
      ProfitExt: item.ProfitExt ?? null,
      blnCalcPer10: item.blnCalcPer10 || false,
      VariantianID: item.VariantianID ?? null,
      SKUID: item.SKUID ?? null,
      Notes: item.Notes ?? null
    }));

    const filename = source === 'tiktok' ? 'prodActPriceCalcTikTok.json' : 'prodActPriceCalc.json';
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleAddNew = (cloneFrom = null) => {
    setIsNewItem(true);
    const maxSeq = productCostData.reduce((m, r) => Math.max(m, r.seqNr || 0), 0);
    const base = cloneFrom ? JSON.parse(JSON.stringify(cloneFrom)) : { ...EMPTY_ITEM };
    const { _docId, ...cleanBase } = base; 
    setSelectedItem({ 
      ...cleanBase, 
      _localId: Math.random().toString(36).substr(2, 9),
      seqNr: maxSeq + 1, 
      productName: cloneFrom ? `${cloneFrom.productName} (copy)` : '', 
      Notes: '' 
    });
  };

  const handleCopyAsNew = (form) => {
    setSelectedItem(null);
    setTimeout(() => handleAddNew(form), 100);
  };

  const handleDeleteItem = async (item) => {
    if (!window.confirm(`Permanently delete "${item.productName}" from both local and cloud?`)) return;
    try {
      setLoading(true);
      const cols = source === 'tiktok' ? COLLECTIONS.tiktok : COLLECTIONS.shopee;
      if (item._docId) await deleteDocument(cols.prodActPriceCalc, item._docId);
      
      setProductCostData(prev => prev.filter(s => {
        if (item._docId && s._docId === item._docId) return false;
        if (item._localId && s._localId === item._localId) return false;
        return true;
      }));
      showNotification('Item deleted permanently.');
    } catch (err) {
      console.error(err);
      showNotification('Delete failed.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const filteredData = productCostData.filter(item =>
    (item.productName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (item.VariantianID || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const sortedData = [...filteredData].sort((a, b) => {
    const key = sortConfig.key;
    if (!key) return 0;
    
    let aVal = a[key] ?? '';
    let bVal = b[key] ?? '';

    if (aVal === bVal) return 0;
    const modifier = sortConfig.direction === 'asc' ? 1 : -1;
    
    // Sort numbers as numbers if possible
    const numA = parseFloat(aVal);
    const numB = parseFloat(bVal);
    if (!isNaN(numA) && !isNaN(numB)) {
        return (numA - numB) * modifier;
    }

    if (typeof aVal === 'string') {
        return aVal.localeCompare(bVal) * modifier;
    }
    return (aVal - bVal) * modifier;
  });

  const profitColor = (val) => {
    const n = parseFloat(val);
    if (isNaN(n)) return 'text-gray-500';
    return n >= 0 ? 'text-emerald-400' : 'text-red-400';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* ── Header ─────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Price &amp; Profit Manager</h1>
          <p className="text-gray-400 mt-1 text-sm">Double-click any row to view and edit full product details</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {/* Source switcher */}
          <div className="relative">
            <select
              value={source}
              onChange={e => setSource(e.target.value)}
              className="appearance-none bg-[#1a1a1a] border border-white/10 text-white rounded-xl pl-4 pr-10 py-2.5 text-sm font-medium outline-none focus:border-blue-500 cursor-pointer"
            >
              <option value="shopee">🟠 Shopee Data</option>
              <option value="tiktok">⚫ TikTok Data</option>
            </select>
            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>

          <button
            onClick={handleExportJson}
            className="flex items-center gap-2 px-4 py-2.5 bg-amber-600/20 text-amber-500 hover:bg-amber-600/30 border border-amber-500/30 rounded-xl transition-all text-sm font-semibold"
            title="Export to JSON (using local cache)"
          >
            <FileJson size={16} />Export JSON
          </button>


          <button
            onClick={() => handleAddNew()}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 border border-blue-500/30 rounded-xl transition-all text-sm font-semibold"
          >
            <Plus size={16} />Add Item
          </button>

          <button
            onClick={handleSaveAll}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white rounded-xl shadow-lg transition-all font-semibold text-sm"
          >
            {saving ? <RefreshCw className="animate-spin" size={16} /> : <Save size={16} />}
            {saving ? 'Saving...' : 'Save All'}
          </button>
        </div>
      </div>

      {/* ── Notification ───────────────────────────────────── */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className={`p-3.5 rounded-xl border flex items-center gap-2 text-sm ${
              notification.type === 'error'
                ? 'bg-red-500/10 border-red-500/20 text-red-400'
                : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
            }`}
          >
            <AlertCircle size={16} />
            {notification.msg}
          </motion.div>
        )}
      </AnimatePresence>

    {/* ── Fee Summary Bar ── */}
    <div className="flex items-center gap-6 px-5 py-3 bg-[#141414] border border-white/5 rounded-xl text-xs text-gray-400">
      <span className="font-semibold text-gray-300">Fixed Fees Summary:</span>
      <span>Commission <span className="text-orange-400 font-mono font-bold">8.62%</span></span>
      <span>Service <span className="text-orange-400 font-mono font-bold">9.96%</span></span>
      <span>Transaction <span className="text-orange-400 font-mono font-bold">6.42%</span></span>
      <span className="ml-auto">Combined Total Fees <span className="text-red-400 font-mono font-bold">{(TOTAL_FEES*100).toFixed(2)}%</span></span>
    </div>

      {/* ── Data Grid ─────────────────────────────────────── */}
      <div className="bg-[#141414] border border-white/5 rounded-2xl overflow-hidden flex flex-col" style={{ height: '580px' }}>
        <div className="p-3 border-b border-white/5 bg-white/5 flex gap-3 items-center shrink-0">
          <input
            type="text"
            placeholder="Search by product name or variant ID…"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="px-4 py-2 bg-[#0a0a0a] border border-white/10 rounded-xl text-white outline-none focus:border-blue-500 flex-1 text-sm"
          />
          <p className="text-xs text-gray-400 whitespace-nowrap">{filteredData.length} / {productCostData.length} items</p>
        </div>

        <div className="flex-1 overflow-auto">
          <table className="w-full text-left text-xs text-gray-400">
            <thead className="text-gray-500 uppercase bg-[#0a0a0a] sticky top-0 z-10 shadow-md text-[10px]">
              <tr>
                <th className="px-3 py-3 w-10 text-center cursor-pointer hover:bg-white/5 transition-colors group" onClick={() => handleSort('seqNr')}>
                  <div className="flex items-center justify-center">No <SortIndicator columnKey="seqNr" /></div>
                </th>
                <th className="px-3 py-3 min-w-[220px] cursor-pointer hover:bg-white/5 transition-colors group" onClick={() => handleSort('productName')}>
                  <div className="flex items-center">Product Name <SortIndicator columnKey="productName" /></div>
                </th>
                <th className="px-3 py-3 w-16 text-center">Actions</th>
                <th className="px-3 py-3 w-20 text-right cursor-pointer hover:bg-white/5 transition-colors group" onClick={() => handleSort('orgPrice')}>
                  <div className="flex items-center justify-end">Org <SortIndicator columnKey="orgPrice" /></div>
                </th>
                <th className="px-3 py-3 w-20 text-right cursor-pointer hover:bg-white/5 transition-colors group" onClick={() => handleSort('sellingPrice')}>
                  <div className="flex items-center justify-end">Sell <SortIndicator columnKey="sellingPrice" /></div>
                </th>
                <th className="px-3 py-3 w-20 text-right cursor-pointer hover:bg-white/5 transition-colors group" onClick={() => handleSort('sellingPriceProfit')}>
                  <div className="flex items-center justify-end">SPP <SortIndicator columnKey="sellingPriceProfit" /></div>
                </th>
                <th className="px-3 py-3 w-32 text-center cursor-pointer hover:bg-white/5 transition-colors group" onClick={() => handleSort('MaxDiscountSellingPrice')}>
                  <div className="flex items-center justify-center">Max Disc <SortIndicator columnKey="MaxDiscountSellingPrice" /></div>
                </th>
                <th className="px-3 py-3 w-24 text-right cursor-pointer hover:bg-white/5 transition-colors group" onClick={() => handleSort('sellingPriceProfitAfterDisc')}>
                  <div className="flex items-center justify-end">Disc Prof <SortIndicator columnKey="sellingPriceProfitAfterDisc" /></div>
                </th>
                <th className="px-3 py-3 w-24 text-right cursor-pointer hover:bg-white/5 transition-colors group" onClick={() => handleSort('currentIncomePriceAfterCalc')}>
                  <div className="flex items-center justify-end">Income <SortIndicator columnKey="currentIncomePriceAfterCalc" /></div>
                </th>
                <th className="px-3 py-3 w-20 text-right cursor-pointer hover:bg-white/5 transition-colors group" onClick={() => handleSort('ProfitExt')}>
                  <div className="flex items-center justify-end">Ext <SortIndicator columnKey="ProfitExt" /></div>
                </th>
                <th className="px-3 py-3 w-16 text-center cursor-pointer hover:bg-white/5 transition-colors group" onClick={() => handleSort('blnCalcPer10')}>
                  <div className="flex items-center justify-center">Per10 <SortIndicator columnKey="blnCalcPer10" /></div>
                </th>
                <th className="px-3 py-3 min-w-[140px] cursor-pointer hover:bg-white/5 transition-colors group" onClick={() => handleSort('VariantianID')}>
                  <div className="flex items-center">Variant ID <SortIndicator columnKey="VariantianID" /></div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {sortedData.map((item) => (
                <tr
                  key={item._localId || item._docId}
                  className="hover:bg-white/5 transition-colors cursor-pointer group"
                  onDoubleClick={() => { setSelectedItem(item); setIsNewItem(false); }}
                >
                  <td className="px-3 py-2.5 text-center text-gray-500">{item.seqNr}</td>
                  <td className="px-3 py-2.5 font-medium text-gray-200 max-w-[280px] truncate" title={item.productName}>{item.productName || '—'}</td>
                  <td className="px-3 py-2 text-center">
                    <button onClick={(e) => { e.stopPropagation(); handleDeleteItem(item); }} className="p-1.5 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors">
                      <Trash2 size={14} />
                    </button>
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono">{item.orgPrice || '—'}</td>
                  <td className="px-3 py-2.5 text-right font-mono">{item.sellingPrice || '—'}</td>
                  <td className={`px-3 py-2.5 text-right font-mono font-bold ${profitColor(item.sellingPriceProfit)}`}>{item.sellingPriceProfit !== undefined && item.sellingPriceProfit !== '' ? item.sellingPriceProfit : '—'}</td>
                  <td className="px-3 py-2.5 text-center font-mono text-yellow-400 text-xs">{item.MaxDiscountSellingPrice || '—'}</td>
                  <td className={`px-3 py-2.5 text-right font-mono font-bold ${profitColor(item.sellingPriceProfitAfterDisc)}`}>{item.sellingPriceProfitAfterDisc !== undefined && item.sellingPriceProfitAfterDisc !== '' ? item.sellingPriceProfitAfterDisc : '—'}</td>
                  <td className="px-3 py-2.5 text-right font-mono text-emerald-400">{item.currentIncomePriceAfterCalc || '—'}</td>
                  <td className={`px-3 py-2.5 text-right font-mono font-bold ${profitColor(item.ProfitExt)}`}>{item.ProfitExt !== undefined && item.ProfitExt !== '' ? item.ProfitExt : '—'}</td>
                  <td className="px-3 py-2.5 text-center">{item.blnCalcPer10 ? <span className="text-blue-400">✓</span> : <span className="text-gray-700">—</span>}</td>
                  <td className="px-3 py-2.5 text-gray-500 font-mono text-xs truncate max-w-[160px]" title={item.VariantianID}>{item.VariantianID || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="p-3 border-t border-white/5 text-xs text-gray-500 italic shrink-0">
          💡 Double-click any row to open the detail editor
        </div>
      </div>

      {/* ── Detail Modal ───────────────────────────────────── */}
      <AnimatePresence>
        {selectedItem && (
          <DetailModal
            item={selectedItem}
            maxDiscPercent={maxDiscPercent}
            onMaxDiscChange={setMaxDiscPercent}
            onSave={handleModalSave}
            onClose={() => setSelectedItem(null)}
            onAddNew={handleCopyAsNew}
            isNew={isNewItem}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default ProfitManager;
