import React, { useState, useEffect } from 'react';
import { fetchCollection, saveCollection, COLLECTIONS } from '../lib/firestoreApi';
import * as XLSX from 'xlsx';
import { Package, Upload, Edit2, Check, X, Printer, Save, AlertCircle, Plus, Info, RefreshCw, ArrowUpDown, ChevronUp, ChevronDown, Download, FileJson } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// ─── Detail Modal ─────────────────────────────────────────────────────────────
const StockDetailModal = ({ item, onSave, onClose, onAddNew, isAddingNew }) => {
  const [form, setForm] = useState({ ...item });
  const [saving, setSaving] = useState(false);

  const set = (field, val) => setForm(f => ({ ...f, [field]: val }));

  const handleSave = async () => {
    setSaving(true);
    await onSave(form);
    setSaving(false);
  };

  const inputCls = "w-full bg-[#1a1a1a] border border-white/10 rounded-lg px-3 py-2 text-white outline-none focus:border-blue-500 text-sm transition-colors";
  const labelCls = "block text-xs font-medium text-gray-400 mb-1";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative bg-[#141414] border border-white/10 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-5 border-b border-white/5 sticky top-0 bg-[#141414] z-10">
          <div>
            <h2 className="text-lg font-bold text-white">📦 Stock Item Detail</h2>
            <p className="text-xs text-gray-400 mt-0.5">#{form.seqNr} — {form.productName || 'Unnamed Product'}</p>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-blue-400 border-b border-white/5 pb-2">Basic Info</h3>
            <div className="grid grid-cols-4 gap-3">
              <div className="col-span-1">
                <label className={labelCls}>Seq No</label>
                <input className={inputCls} type="number" value={form.seqNr} onChange={e => set('seqNr', parseInt(e.target.value) || 0)} />
              </div>
              <div className="col-span-3">
                <label className={labelCls}>Product Name (Important)</label>
                <input className={inputCls} type="text" value={form.productName || ''} onChange={e => set('productName', e.target.value)} />
              </div>
            </div>
            
            <div>
              <label className={labelCls}>Customize Name (Display)</label>
              <input className={inputCls} type="text" value={form.CustomizeName || ''} onChange={e => set('CustomizeName', e.target.value)} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Variant Name</label>
                <input className={inputCls} type="text" value={form.VariantianName || ''} onChange={e => set('VariantianName', e.target.value)} />
              </div>
              <div>
                <label className={labelCls}>Store Location</label>
                <input className={inputCls} type="text" value={form.StoreLocation || ''} onChange={e => set('StoreLocation', e.target.value)} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Variant ID</label>
                <input className={inputCls} type="text" value={form.VariantianID || ''} onChange={e => set('VariantianID', e.target.value)} />
              </div>
              <div>
                <label className={labelCls}>SKU Code</label>
                <input className={inputCls} type="text" value={form.SKUIDCode || ''} onChange={e => set('SKUIDCode', e.target.value)} />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-purple-400 border-b border-white/5 pb-2">Stock & Category</h3>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className={labelCls}>Cat Seq</label>
                <input className={inputCls} type="number" value={form.CategorySeqNr ?? form.categorySeqNr ?? 0} onChange={e => set('CategorySeqNr', parseInt(e.target.value) || 0)} />
              </div>
              <div>
                <label className={labelCls}>Current Stock</label>
                <input className={inputCls} type="number" value={form.CurrentStock || 0} onChange={e => set('CurrentStock', parseInt(e.target.value) || 0)} />
              </div>
              <div>
                <label className={labelCls}>Safety Stock</label>
                <input className={inputCls} type="number" value={form.SafetyStock || 0} onChange={e => set('SafetyStock', parseInt(e.target.value) || 0)} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Sync ID</label>
                <input className={inputCls} type="text" value={form.SameCategoryCountID || ''} onChange={e => set('SameCategoryCountID', e.target.value)} />
              </div>
              <div>
                <label className={labelCls}>Sync Multiplier</label>
                <input className={inputCls} type="number" value={form.SameCategoryCountQuantity || 1} onChange={e => set('SameCategoryCountQuantity', parseFloat(e.target.value) || 1)} />
              </div>
            </div>

            <div className="flex items-center gap-6 p-3 bg-white/5 rounded-xl">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.blnDisplayMeter || false} onChange={e => set('blnDisplayMeter', e.target.checked)} className="w-4 h-4 rounded accent-blue-500" />
                <span className="text-xs text-gray-300">Display Meter</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.blnUpdateShopeeQuantity || false} onChange={e => set('blnUpdateShopeeQuantity', e.target.checked)} className="w-4 h-4 rounded accent-emerald-500" />
                <span className="text-xs text-gray-300">Update Shopee</span>
              </label>
            </div>

            <div>
              <label className={labelCls}>Remark / Notes</label>
              <textarea className={`${inputCls} resize-none h-24`} value={form.Remark || ''} onChange={e => set('Remark', e.target.value)} />
            </div>
          </div>
        </div>

        <div className="p-5 border-t border-white/5 flex gap-3 justify-end bg-[#0f0f0f]">
          {!isAddingNew && (
            <button 
              onClick={() => onAddNew(form)}
              className="mr-auto px-4 py-2 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 text-blue-400 rounded-lg font-medium text-sm flex items-center gap-2 transition-all"
            >
              <Plus size={16} />
              Copy as New Item
            </button>
          )}
          <button onClick={onClose} className="px-5 py-2 text-gray-400 hover:text-white transition-colors text-sm font-medium">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="px-8 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold text-sm flex items-center gap-2 transition-all">
            {saving ? <RefreshCw className="animate-spin" size={16} /> : <Check size={16} />}
            {isAddingNew ? 'Add Item' : 'Save changes'}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default function ShopeeStock() {
  const [activeTab, setActiveTab] = useState('calculate');
  const [stockData, setStockData] = useState([]);
  const [originalStockData, setOriginalStockData] = useState([]);
  const [loading, setLoading] = useState(false);
  
  const [excelData, setExcelData] = useState([]);
  const [printDate, setPrintDate] = useState("");
  const [printFontSize, setPrintFontSize] = useState(11);
  const [printLineSpacing, setPrintLineSpacing] = useState('normal');

  // Advanced rendering states
  const [hookLoopWhiteList, setHookLoopWhiteList] = useState([]);
  const [hookLoopBlackList, setHookLoopBlackList] = useState([]);
  const [hookLoopWhiteNoGlueList, setHookLoopWhiteNoGlueList] = useState([]);
  const [hookLoopBlackNoGlueList, setHookLoopBlackNoGlueList] = useState([]);
  const [nonCutStickListColors, setNonCutStickListColors] = useState({
    white: [], black: [], grey: [], blue: [], beige: []
  });
  const [otherItemList, setOtherItemList] = useState([]);

  const [selectedItem, setSelectedItem] = useState(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: 'seqNr', direction: 'asc' });

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const SortIndicator = ({ columnKey }) => {
    if (sortConfig.key !== columnKey) return <ArrowUpDown size={14} className="ml-1 opacity-10 group-hover:opacity-50 transition-opacity" />;
    return sortConfig.direction === 'asc' 
      ? <ChevronUp size={14} className="ml-1 text-blue-400" /> 
      : <ChevronDown size={14} className="ml-1 text-blue-400" />;
  };

  const fetchStockData = async () => {
    try {
      setLoading(true);
      const data = await fetchCollection(COLLECTIONS.shopee.prodStockCalc);
      setStockData(data);
      // Keep a deep copy of the original data for comparison
      setOriginalStockData(JSON.parse(JSON.stringify(data)));
    } catch (error) {
      console.error("Failed to fetch stock data from Firestore:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchStockData(); }, []);

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const bstr = evt.target.result;
      const wb = XLSX.read(bstr, { type: 'binary' });
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];
      const data = XLSX.utils.sheet_to_json(ws);
      setExcelData(data);
    };
    reader.readAsBinaryString(file);
    e.target.value = '';
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // EXACT port of C# checkListItem.cs logic
  // ─────────────────────────────────────────────────────────────────────────────

  // Pre-seed the HookLoopList for slots 1M–24M, exactly as C# does (line 646-691)
  const buildHookLoopSlots = () => {
    const slots = [];
    for (let i = 1; i <= 24; i++) {
      // Standard hook/loop/hl
      slots.push({ HookLoopCategory: `HOOKLOOP${i}MBLACK`, DisplayName: `${i}M H&L`, quantity: 0, totalOrderID: '' });
      slots.push({ HookLoopCategory: `HOOKLOOP${i}MWHITE`, DisplayName: `${i}M H&L`, quantity: 0, totalOrderID: '' });
      slots.push({ HookLoopCategory: `HOOK${i}MBLACK`,     DisplayName: `${i}M HOOK`, quantity: 0, totalOrderID: '' });
      slots.push({ HookLoopCategory: `HOOK${i}MWHITE`,     DisplayName: `${i}M HOOK`, quantity: 0, totalOrderID: '' });
      slots.push({ HookLoopCategory: `LOOP${i}MBLACK`,     DisplayName: `${i}M LOOP`, quantity: 0, totalOrderID: '' });
      slots.push({ HookLoopCategory: `LOOP${i}MWHITE`,     DisplayName: `${i}M LOOP`, quantity: 0, totalOrderID: '' });
      // NoGlue variants
      slots.push({ HookLoopCategory: `16MMHOOKLOOPNOGLUE${i}MBLACK`, DisplayName: `${i}M 16MM H&L`, quantity: 0, totalOrderID: '' });
      slots.push({ HookLoopCategory: `16MMHOOKLOOPNOGLUE${i}MWHITE`, DisplayName: `${i}M 16MM H&L`, quantity: 0, totalOrderID: '' });
      slots.push({ HookLoopCategory: `16MMHOOKNOGLUE${i}MBLACK`,     DisplayName: `${i}M 16MM HOOK`, quantity: 0, totalOrderID: '' });
      slots.push({ HookLoopCategory: `16MMHOOKNOGLUE${i}MWHITE`,     DisplayName: `${i}M 16MM HOOK`, quantity: 0, totalOrderID: '' });
      slots.push({ HookLoopCategory: `16MMLOOPNOGLUE${i}MBLACK`,     DisplayName: `${i}M 16MM LOOP`, quantity: 0, totalOrderID: '' });
      slots.push({ HookLoopCategory: `16MMLOOPNOGLUE${i}MWHITE`,     DisplayName: `${i}M 16MM LOOP`, quantity: 0, totalOrderID: '' });
      slots.push({ HookLoopCategory: `25MMHOOKLOOPNOGLUE${i}MBLACK`, DisplayName: `${i}M 25MM H&L`, quantity: 0, totalOrderID: '' });
      slots.push({ HookLoopCategory: `25MMHOOKLOOPNOGLUE${i}MWHITE`, DisplayName: `${i}M 25MM H&L`, quantity: 0, totalOrderID: '' });
      slots.push({ HookLoopCategory: `25MMHOOKNOGLUE${i}MBLACK`,     DisplayName: `${i}M 25MM HOOK`, quantity: 0, totalOrderID: '' });
      slots.push({ HookLoopCategory: `25MMHOOKNOGLUE${i}MWHITE`,     DisplayName: `${i}M 25MM HOOK`, quantity: 0, totalOrderID: '' });
      slots.push({ HookLoopCategory: `25MMLOOPNOGLUE${i}MBLACK`,     DisplayName: `${i}M 25MM LOOP`, quantity: 0, totalOrderID: '' });
      slots.push({ HookLoopCategory: `25MMLOOPNOGLUE${i}MWHITE`,     DisplayName: `${i}M 25MM LOOP`, quantity: 0, totalOrderID: '' });
      slots.push({ HookLoopCategory: `38MMHOOKLOOPNOGLUE${i}MBLACK`, DisplayName: `${i}M 38MM H&L`, quantity: 0, totalOrderID: '' });
      slots.push({ HookLoopCategory: `38MMHOOKLOOPNOGLUE${i}MWHITE`, DisplayName: `${i}M 38MM H&L`, quantity: 0, totalOrderID: '' });
      slots.push({ HookLoopCategory: `38MMHOOKNOGLUE${i}MBLACK`,     DisplayName: `${i}M 38MM HOOK`, quantity: 0, totalOrderID: '' });
      slots.push({ HookLoopCategory: `38MMHOOKNOGLUE${i}MWHITE`,     DisplayName: `${i}M 38MM HOOK`, quantity: 0, totalOrderID: '' });
      slots.push({ HookLoopCategory: `38MMLOOPNOGLUE${i}MBLACK`,     DisplayName: `${i}M 38MM LOOP`, quantity: 0, totalOrderID: '' });
      slots.push({ HookLoopCategory: `38MMLOOPNOGLUE${i}MWHITE`,     DisplayName: `${i}M 38MM LOOP`, quantity: 0, totalOrderID: '' });
      // NonCutStick
      slots.push({ HookLoopCategory: `NONCUTSTICK${i}MBIEGE`, DisplayName: `${i}M`, quantity: 0, totalOrderID: '' });
      slots.push({ HookLoopCategory: `NONCUTSTICK${i}MWHITE`, DisplayName: `${i}M`, quantity: 0, totalOrderID: '' });
      slots.push({ HookLoopCategory: `NONCUTSTICK${i}MBLACK`, DisplayName: `${i}M`, quantity: 0, totalOrderID: '' });
      slots.push({ HookLoopCategory: `NONCUTSTICK${i}MBLUE`,  DisplayName: `${i}M`, quantity: 0, totalOrderID: '' });
      slots.push({ HookLoopCategory: `NONCUTSTICK${i}MGREY`,  DisplayName: `${i}M`, quantity: 0, totalOrderID: '' });
    }
    return slots;
  };

  // Port of C# FNCALCULATEQUANTITY / FNCALCULATEQUANTITYNOGLUE / FNCALCULATEQUANTITYCOLOR
  // All three work identically: find slot by newCategory, increment count, or add "NEW METER" entry if > 24
  const fnCalculateQuantity = (hookLoopList, newCategory, item, isNoGlue) => {
    const qty = item.Quantity;
    if (qty > 24) {
      // Special case: add as a new entry with order ID prefix
      hookLoopList.push({
        HookLoopCategory: `NEW METER (${newCategory})`,
        totalOrderID: item.orderID,
        quantity: 1,
        DisplayName: `(${item.orderID}) + ${newCategory}`
      });
    }

    // Always attempt to find and update the slot (even if qty > 24 adds a special entry,
    // C# still runs the for loop trying to find a slot match — but since qty > 24 means
    // the slot won't exist (max is 24), nothing will be updated, which is correct)
    for (let q = 1; q <= 24; q++) {
      const slot = hookLoopList.find(s => s.HookLoopCategory === newCategory);
      if (slot) {
        slot.quantity += 1;
        if (1 > 1) {
          slot.totalOrderID += `, ${item.orderID} (1 Unit)`;
        } else {
          slot.totalOrderID += slot.totalOrderID ? `, ${item.orderID}` : item.orderID;
        }
        break;
      }
      break; // C# breaks if not found (empty else clause just continues loop, but since we check same category each time, we break after first miss)
    }
  };

  // Build the target category string based on item.Name (base SKU) and quantity
  // This mirrors the switch cases in C# checkListItem_Load
  const getTargetCategory = (itemName, qty) => {
    const n = itemName.toUpperCase();
    const q = Math.round(qty);

    // Standard H&L
    if (n === 'HOOKLOOP1MBLACK' || n === 'HOOKLOOP2MBLACK' || n === 'HOOKLOOP3MBLACK') {
      return { category: `HOOKLOOP${q}MBLACK`, fn: 'standard' };
    }
    if (n === 'HOOKLOOP1MWHITE' || n === 'HOOKLOOP2MWHITE' || n === 'HOOKLOOP3MWHITE') {
      return { category: `HOOKLOOP${q}MWHITE`, fn: 'standard' };
    }
    // Hook only
    if (n === 'HOOKONLY1MWHITE') return { category: `HOOK${q}MWHITE`, fn: 'standard' };
    if (n === 'HOOKONLY1MBLACK') return { category: `HOOK${q}MBLACK`, fn: 'standard' };
    // Loop only
    if (n === 'LOOPONLY1MWHITE') return { category: `LOOP${q}MWHITE`, fn: 'standard' };
    if (n === 'LOOPONLY1MBLACK') return { category: `LOOP${q}MBLACK`, fn: 'standard' };
    // 16MM NoGlue
    if (n === '16MMHLNOGLUE1MBLACK' || n === '16MMHLNOGLUE2MBLACK' || n === '16MMHLNOGLUE3MBLACK') {
      return { category: `16MMHOOKLOOPNOGLUE${q}MBLACK`, fn: 'noglue' };
    }
    if (n === '16MMHLNOGLUE1MWHITE' || n === '16MMHLNOGLUE2MWHITE' || n === '16MMHLNOGLUE3MWHITE') {
      return { category: `16MMHOOKLOOPNOGLUE${q}MWHITE`, fn: 'noglue' };
    }
    // 25MM NoGlue
    if (n === '25MMHLNOGLUE1MBLACK' || n === '25MMHLNOGLUE2MBLACK' || n === '25MMHLNOGLUE3MBLACK') {
      return { category: `25MMHOOKLOOPNOGLUE${q}MBLACK`, fn: 'noglue' };
    }
    if (n === '25MMHLNOGLUE1MWHITE' || n === '25MMHLNOGLUE2MWHITE' || n === '25MMHLNOGLUE3MWHITE') {
      return { category: `25MMHOOKLOOPNOGLUE${q}MWHITE`, fn: 'noglue' };
    }
    // 38MM NoGlue
    if (n === '38MMHLNOGLUE1MBLACK' || n === '38MMHLNOGLUE2MBLACK' || n === '38MMHLNOGLUE3MBLACK') {
      return { category: `38MMHOOKLOOPNOGLUE${q}MBLACK`, fn: 'noglue' };
    }
    if (n === '38MMHLNOGLUE1MWHITE' || n === '38MMHLNOGLUE2MWHITE' || n === '38MMHLNOGLUE3MWHITE') {
      return { category: `38MMHOOKLOOPNOGLUE${q}MWHITE`, fn: 'noglue' };
    }
    // NonCutStick
    if (n === 'NONCUTSTK1MBIEGE' || n === 'NONCUTSTK2MBIEGE' || n === 'NONCUTSTK3MBIEGE') {
      return { category: `NONCUTSTICK${q}MBIEGE`, fn: 'color' };
    }
    if (n === 'NONCUTSTK1MBLACK' || n === 'NONCUTSTK2MBLACK' || n === 'NONCUTSTK3MBLACK') {
      return { category: `NONCUTSTICK${q}MBLACK`, fn: 'color' };
    }
    if (n === 'NONCUTSTK1MWHITE' || n === 'NONCUTSTK2MWHITE' || n === 'NONCUTSTK3MWHITE') {
      return { category: `NONCUTSTICK${q}MWHITE`, fn: 'color' };
    }
    if (n === 'NONCUTSTK1MBLUE' || n === 'NONCUTSTK2MBLUE' || n === 'NONCUTSTK3MBLUE') {
      return { category: `NONCUTSTICK${q}MBLUE`, fn: 'color' };
    }
    if (n === 'NONCUTSTK1MGREY' || n === 'NONCUTSTK2MGREY' || n === 'NONCUTSTK3MGREY') {
      return { category: `NONCUTSTICK${q}MGREY`, fn: 'color' };
    }
    return null; // default: unrecognized (like C# default: console.writeline)
  };

  const calculateStock = () => {
    if (!excelData || excelData.length === 0) {
      alert("Please upload an Excel file first.");
      return;
    }
    if (!stockData || stockData.length === 0) {
      alert("Stock database is empty, unable to calculate.");
      return;
    }

    // ── STEP 1: Build GblitemList (mirrors C# CalculateOverviewForm button3_Click) ──
    let GblitemList = [];
    let itemList = [];     // per-order temp list
    let currentOrderId = "";

    excelData.forEach(row => {
      if (row["Order Status"] === "Cancelled") return;

      const rowOrderId = (row["Order ID"] || "").toString().trim();
      const skuCode = (row["SKU Reference No."] || "").toString().trim();
      const rawQuantity = parseInt(row["Quantity"]) || 1;

      // Detect order change — clear itemList and update currentOrderId
      if (rowOrderId && rowOrderId !== currentOrderId) {
        itemList = [];
        currentOrderId = rowOrderId;
      }

      // Find product in stock data
      let prdInfo = null;
      if (skuCode) {
        prdInfo = stockData.find(p => (p.SKUIDCode || "").includes(skuCode));
      }
      if (!prdInfo) {
        const combinedName = (row["Variation Name"] || "") + (row["Product Name"] || "").substring(0, 20);
        if (combinedName.trim()) {
          prdInfo = stockData.find(p => (p.VariantianName || "").includes(combinedName));
        }
      }

      let sameCategoryCountID = "UNKNOWN";
      let jsonQuantity = 1;
      let customizeName = (row["Variation Name"] || "") + " | " + (row["Product Name"] || "");
      let categorySeqNr = 0;
      let pName = skuCode;
      let blnDisplayMeter = false;

      if (prdInfo) {
        sameCategoryCountID = prdInfo.SameCategoryCountID || "UNKNOWN";
        jsonQuantity = prdInfo.SameCategoryCountQuantity || 1;
        if (jsonQuantity === 0) jsonQuantity = 1;
        customizeName = prdInfo.CustomizeName || customizeName;
        categorySeqNr = parseInt(prdInfo.categorySeqNr || prdInfo.CategorySeqNr || 0);
        pName = prdInfo.SKUIDCode || skuCode;
        blnDisplayMeter = prdInfo.blnDisplayMeter || false;
      }

      const finalQty = jsonQuantity * rawQuantity;

      if (sameCategoryCountID !== "UNKNOWN" && sameCategoryCountID !== "") {
        const matchedItem = itemList.find(i => i.SameCategoryCountID === sameCategoryCountID);
        if (matchedItem) {
          matchedItem.Quantity += finalQty;
        } else {
          const newQtyItem = {
            orderID: currentOrderId,
            Name: pName || skuCode,         // ← This is item.Name used in C# switch
            Quantity: finalQty,
            CustomizeName: customizeName,
            blnDisplayMeter,
            SameCategoryCountID: sameCategoryCountID,
            CategorySeqNr: categorySeqNr
          };
          itemList.push(newQtyItem);
          GblitemList.push(newQtyItem);
        }
      } else {
        // UNKNOWN — add directly (C# line 811-814)
        const newQtyItem = {
          orderID: currentOrderId,
          Name: pName || skuCode,
          Quantity: rawQuantity,
          CustomizeName: customizeName,
          blnDisplayMeter,
          SameCategoryCountID: sameCategoryCountID,
          CategorySeqNr: categorySeqNr
        };
        itemList.push(newQtyItem);
        GblitemList.push(newQtyItem);
      }
    });

    // ── STEP 2: checkListItem_Load logic ──
    // Filter and sort as C# does (line 634-635)
    let filterNum1List = GblitemList
      .filter(p => p.CategorySeqNr === 1 || p.CategorySeqNr === 2 || p.CategorySeqNr === 5)
      .sort((a, b) => (a.Name || "").localeCompare(b.Name || ""));

    // Pre-seed HookLoopList slots (C# lines 646-691)
    const HookLoopList = buildHookLoopSlots();

    // Process each hook/loop item through the switch (C# lines 748-962)
    filterNum1List.forEach(item => {
      const result = getTargetCategory(item.Name, item.Quantity);
      if (result) {
        fnCalculateQuantity(HookLoopList, result.category, item, result.fn === 'noglue');
      }
      // C# default case: console.writeline — i.e., skip/ignore unrecognized items
    });

    // ── STEP 3: Split HookLoopList into render lists (C# lines 1066-1140) ──
    const whiteList = [], blackList = [], whiteNoGlueList = [], blackNoGlueList = [];
    const nonCutWhite = [], nonCutBlack = [], nonCutGrey = [], nonCutBlue = [], nonCutBeige = [];

    HookLoopList.forEach(slot => {
      if (slot.quantity === 0) return; // skip empty slots

      const cat = slot.HookLoopCategory;
      const displayStr = slot.DisplayName + " X " + slot.quantity;
      const entry = { DisplayName: displayStr };

      const isNonCut = cat.includes("NONCUT");
      const isNoGlue = cat.includes("NOGLUE");

      if (isNonCut) {
        if (cat.includes("WHITE")) nonCutWhite.push(entry);
        else if (cat.includes("BLACK")) nonCutBlack.push(entry);
        else if (cat.includes("GREY")) nonCutGrey.push(entry);
        else if (cat.includes("BLUE")) nonCutBlue.push(entry);
        else if (cat.includes("BIEGE")) nonCutBeige.push(entry);
      } else if (isNoGlue) {
        if (cat.includes("WHITE")) whiteNoGlueList.push(entry);
        else blackNoGlueList.push(entry);
      } else {
        if (cat.includes("WHITE")) whiteList.push(entry);
        else blackList.push(entry);
      }
    });

    // NOTE: "NEW METER" (qty > 24) entries were pushed directly into HookLoopList
    // with quantity=1, so they are already included in the forEach above.
    // No second pass needed — removing it prevents the duplicate lines.

    setHookLoopWhiteList(whiteList);
    setHookLoopBlackList(blackList);
    setHookLoopWhiteNoGlueList(whiteNoGlueList);
    setHookLoopBlackNoGlueList(blackNoGlueList);
    setNonCutStickListColors({
      white: nonCutWhite,
      black: nonCutBlack,
      grey: nonCutGrey,
      blue: nonCutBlue,
      beige: nonCutBeige
    });

    // ── STEP 4: Other Items list (C# lines 970-1029) ──
    // Filter: NOT cat 1, NOT cat 800 (but also NOT cat 2, 5 since they're H&L too)
    const filterOtherList = GblitemList.filter(
      p => p.CategorySeqNr !== 1 && p.CategorySeqNr !== 2 && p.CategorySeqNr !== 5 && p.CategorySeqNr !== 800
    );

    const OtherItemList = [];
    filterOtherList.forEach(echOtherQty => {
      const keyName = echOtherQty.Name || "";
      const existing = OtherItemList.find(o => o.SKUReferenceNo === keyName);
      if (existing) {
        existing.quantity += echOtherQty.Quantity;
        if (echOtherQty.Quantity > 1) {
          existing.totalOrderID += `, ${echOtherQty.orderID} (${echOtherQty.Quantity} Unit)`;
        } else {
          existing.totalOrderID += `, ${echOtherQty.orderID}`;
        }
      } else {
        OtherItemList.push({
          CategorySeqNr: echOtherQty.CategorySeqNr,
          totalOrderID: echOtherQty.Quantity > 1
            ? `${echOtherQty.orderID} (${echOtherQty.Quantity} Unit)`
            : echOtherQty.orderID,
          quantity: echOtherQty.Quantity,
          DisplayName: echOtherQty.CustomizeName || keyName,
          SKUReferenceNo: keyName
        });
      }
    });

    // Sort others: 0 → 1000 (bottom), else ascending
    OtherItemList.sort((a, b) => {
      const nA = a.CategorySeqNr === 0 ? 1000 : a.CategorySeqNr;
      const nB = b.CategorySeqNr === 0 ? 1000 : b.CategorySeqNr;
      return nA - nB;
    });

    setOtherItemList(OtherItemList);
  };

  // ─────────────────────────────────────────────────────────────────────────────

  const handlePrint = () => {
    setPrintDate(new Date().toLocaleString());
    setTimeout(() => { window.print(); }, 100);
  };

  const handleSaveStock = async () => {
    try {
      setLoading(true);
      
      // Filter ONLY items that have changed or are new
      const modifiedItems = stockData.filter(item => {
        const original = originalStockData.find(o => o._docId === item._docId);
        if (!original) return true; // Brand new item
        // Deep compare stringified objects to detect any field change
        return JSON.stringify(item) !== JSON.stringify(original);
      });

      if (modifiedItems.length === 0) {
        alert("No changes detected since last save/fetch.");
        return;
      }

      console.log(`[Partial Save] Saving ${modifiedItems.length} items out of ${stockData.length}`);
      await saveCollection(COLLECTIONS.shopee.prodStockCalc, modifiedItems);
      
      // Update originalStockData to match the now-saved state
      setOriginalStockData(JSON.parse(JSON.stringify(stockData)));
      
      alert(`Saved ${modifiedItems.length} items successfully!`);
    } catch (error) {
      console.error("Failed to save stock data to Firestore:", error);
      alert("Failed to save stock data");
    } finally {
      setLoading(false);
    }
  };

  const saveEdit = async (updatedItem) => {
    if (isAddingNew) {
      setStockData(prev => [updatedItem, ...prev]);
      setIsAddingNew(false);
    } else {
      setStockData(prev => prev.map(item => item.seqNr === updatedItem.seqNr ? updatedItem : item));
    }
    setSelectedItem(null);
    // Note: The user can click the main "Save Data" button to persist to Firestore
    // or we could auto-save here if preferred.
  };

  const cancelEdit = () => {
    setSelectedItem(null);
    setIsAddingNew(false);
  };

  const handleAddNew = () => {
    const maxSeq = stockData.length > 0 ? Math.max(...stockData.map(s => s.seqNr || 0)) : 0;
    const newSeqNr = maxSeq + 1;
    const newItem = {
      seqNr: newSeqNr, categorySeqNr: 0, CategorySeqNr: 0,
      productName: "", CurrentStock: 0, sellingPrice: 0,
      blnExtraCountQuantity: false, blnDisplayMeter: false,
      SameCategoryCountID: "", SameCategoryCountQuantity: 1,
      SafetyStock: 0, SKUIDCode: "", CustomizeName: "",
      StoreLocation: "", VariantianName: "", ProductSellingPrice: 0,
      VariantianID: "", Remark: "", blnUpdateShopeeQuantity: false
    };
    setSelectedItem(newItem);
    setIsAddingNew(true);
  };

  const handleCopyAsNew = (form) => {
    setSelectedItem(null);
    const maxSeq = stockData.length > 0 ? Math.max(...stockData.map(s => s.seqNr || 0)) : 0;
    setTimeout(() => {
      setSelectedItem({ ...form, seqNr: maxSeq + 1, productName: `${form.productName} (copy)`, Remark: '' });
      setIsAddingNew(true);
    }, 100);
  };

  const handleExportJson = () => {
    // 1. Sort by seqNr to match original file behavior
    const sortedForExport = [...stockData].sort((a, b) => (a.seqNr || 0) - (b.seqNr || 0));

    // 2. Map to strict key order to match prodStockCalc.json
    const exportData = sortedForExport.map(item => ({
      seqNr: item.seqNr,
      categorySeqNr: item.categorySeqNr ?? item.CategorySeqNr ?? 0,
      productName: item.productName || "",
      CurrentStock: item.CurrentStock || 0,
      sellingPrice: item.sellingPrice || 0,
      blnExtraCountQuantity: item.blnExtraCountQuantity || false,
      blnDisplayMeter: item.blnDisplayMeter || false,
      SameCategoryCountID: item.SameCategoryCountID || "",
      SameCategoryCountQuantity: item.SameCategoryCountQuantity || 1,
      SafetyStock: item.SafetyStock || 0,
      SKUIDCode: item.SKUIDCode || "",
      CustomizeName: item.CustomizeName || "",
      StoreLocation: item.StoreLocation || "",
      VariantianName: item.VariantianName || "",
      ProductSellingPrice: item.ProductSellingPrice || 0,
      VariantianID: item.VariantianID || "",
      Remark: item.Remark || "",
      blnUpdateShopeeQuantity: item.blnUpdateShopeeQuantity || false
    }));

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'prodStockCalc.json';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const lineSpacingClass = { tight: 'py-0', normal: 'py-0.5', relaxed: 'py-1' }[printLineSpacing];

  const renderPairTable = (title1, list1, title2, list2) => {
    const maxLen = Math.max(list1.length, list2.length);
    if (maxLen === 0) return null;
    const rows = [];
    for (let i = 0; i < maxLen; i++) {
      rows.push({ col1: list1[i]?.DisplayName || "", col2: list2[i]?.DisplayName || "" });
    }
    return (
      <div className="mb-4 font-mono" style={{ fontSize: `${printFontSize}px` }}>
        <div className="flex border-b border-black font-bold pb-1 bg-gray-100/10 print:bg-gray-200">
          <div className="flex-1 px-2 border-r border-black">{title1}</div>
          <div className="flex-1 px-2">{title2}</div>
        </div>
        {rows.map((r, i) => (
          <div key={i} className={`flex border-b border-black/20 print:border-black ${lineSpacingClass}`}>
            <div className="flex-1 px-2 border-r border-black/20 print:border-black">
              {r.col1 && <span className="inline-block w-3 mr-1 border border-black/50 print:border-black bg-white" style={{ height: `${printFontSize - 2}px`, width: `${printFontSize - 2}px`, verticalAlign: 'middle' }}></span>} {r.col1}
            </div>
            <div className="flex-1 px-2">
              {r.col2 && <span className="inline-block w-3 mr-1 border border-black/50 print:border-black bg-white" style={{ height: `${printFontSize - 2}px`, width: `${printFontSize - 2}px`, verticalAlign: 'middle' }}></span>} {r.col2}
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderQuintTable = () => {
    const w = nonCutStickListColors.white;
    const b = nonCutStickListColors.black;
    const g = nonCutStickListColors.grey;
    const bl = nonCutStickListColors.blue;
    const be = nonCutStickListColors.beige;
    const maxLen = Math.max(w.length, b.length, g.length, bl.length, be.length);
    if (maxLen === 0) return null;
    const rows = [];
    for (let i = 0; i < maxLen; i++) {
      rows.push({ black: b[i]?.DisplayName || "", white: w[i]?.DisplayName || "", grey: g[i]?.DisplayName || "", blue: bl[i]?.DisplayName || "", beige: be[i]?.DisplayName || "" });
    }
    return (
      <div className="mb-4 font-mono" style={{ fontSize: `${printFontSize}px` }}>
        <div className="flex border-b border-black font-bold pb-1 bg-gray-100/10 print:bg-gray-200">
          <div className="flex-1 px-1 border-r border-black">(BLACK)W</div>
          <div className="flex-1 px-1 border-r border-black">(WHITE)W</div>
          <div className="flex-1 px-1 border-r border-black">(GREY)W</div>
          <div className="flex-1 px-1 border-r border-black">(BLUE)W</div>
          <div className="flex-1 px-1">(BIEGE)W</div>
        </div>
        {rows.map((r, i) => (
          <div key={i} className={`flex border-b border-black/20 print:border-black ${lineSpacingClass}`}>
            {[r.black, r.white, r.grey, r.blue, r.beige].map((val, j) => (
              <div key={j} className={`flex-1 px-1 ${j < 4 ? 'border-r border-black/20 print:border-black' : ''} overflow-hidden text-ellipsis whitespace-nowrap`}>
                {val && <span className="inline-block mr-1 border border-black/50 print:border-black bg-white align-middle" style={{ height: `${printFontSize - 2}px`, width: `${printFontSize - 2}px` }}></span>}{val}
              </div>
            ))}
          </div>
        ))}
      </div>
    );
  };

  const filteredStock = stockData.filter(item =>
    (item.productName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (item.CustomizeName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (item.SKUIDCode || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (item.VariantianID || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const sortedStock = [...filteredStock].sort((a, b) => {
    const key = sortConfig.key;
    if (!key) return 0;
    
    let aVal = a[key];
    let bVal = b[key];

    // Special handling for category headers that might be in different case/field names
    if (key === 'CategorySeqNr') {
        aVal = a.CategorySeqNr ?? a.categorySeqNr ?? 0;
        bVal = b.CategorySeqNr ?? b.categorySeqNr ?? 0;
    }

    if (aVal === bVal) return 0;
    if (aVal === null || aVal === undefined) return 1;
    if (bVal === null || bVal === undefined) return -1;

    const modifier = sortConfig.direction === 'asc' ? 1 : -1;
    
    if (typeof aVal === 'string') {
        return aVal.localeCompare(bVal) * modifier;
    }
    return (aVal - bVal) * modifier;
  });

  const hasCalculatedData = hookLoopWhiteList.length > 0 || hookLoopBlackList.length > 0 || otherItemList.length > 0
    || hookLoopWhiteNoGlueList.length > 0 || hookLoopBlackNoGlueList.length > 0
    || Object.values(nonCutStickListColors).some(l => l.length > 0);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex justify-between items-center print:hidden">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Shopee Stock</h1>
          <p className="text-gray-400 mt-1">Calculate and manage stock requirements</p>
        </div>
        <div className="flex space-x-2 bg-[#1a1a1a] p-1 rounded-xl border border-white/5">
          <button onClick={() => setActiveTab('calculate')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${activeTab === 'calculate' ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}>
            Calculate Stock
          </button>
          <button onClick={() => setActiveTab('manage')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${activeTab === 'manage' ? 'bg-purple-600 text-white shadow-lg shadow-purple-900/20' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}>
            Manage Current Stock
          </button>
        </div>
      </div>

      {activeTab === 'calculate' && (
        <div className="space-y-6">
          <div className="bg-[#141414] border border-white/5 rounded-2xl p-6 shadow-xl print:hidden">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">Excel Upload</h2>
            </div>
            <div className="flex items-center space-x-4">
              <label className="flex items-center space-x-2 px-6 py-3 bg-blue-600/20 text-blue-400 border border-blue-500/30 rounded-xl cursor-pointer hover:bg-blue-600/30 transition-colors">
                <Upload className="w-5 h-5" />
                <span className="font-medium">Upload Excel</span>
                <input type="file" className="hidden" accept=".xlsx, .xls" onChange={handleFileUpload} />
              </label>
              <span className="text-gray-400 text-sm">
                {excelData.length > 0 ? `Loaded ${excelData.length} rows` : 'No file uploaded'}
              </span>
              <div className="flex-1"></div>
              <button onClick={calculateStock} disabled={excelData.length === 0}
                className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-500 text-white font-medium rounded-xl hover:shadow-lg hover:shadow-blue-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                <Package className="w-5 h-5" />
                <span>Calculate Quantity</span>
              </button>
            </div>
          </div>

          {hasCalculatedData && (
            <div className="bg-[#141414] border border-white/5 rounded-2xl p-6 shadow-xl print:border-none print:shadow-none print:bg-white print:text-black">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-6 print:hidden">
                <h2 className="text-xl font-bold text-white tracking-tight">Structured Print View</h2>
                <div className="flex items-center gap-3 flex-wrap">
                  {/* Font size control */}
                  <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5">
                    <span className="text-xs text-gray-400 whitespace-nowrap">Font</span>
                    <button onClick={() => setPrintFontSize(s => Math.max(7, s - 1))} className="text-gray-400 hover:text-white px-1 text-sm font-bold">−</button>
                    <span className="text-white text-sm font-mono w-6 text-center">{printFontSize}</span>
                    <button onClick={() => setPrintFontSize(s => Math.min(16, s + 1))} className="text-gray-400 hover:text-white px-1 text-sm font-bold">+</button>
                  </div>
                  {/* Line spacing control */}
                  <div className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-lg px-2 py-1.5">
                    <span className="text-xs text-gray-400 mr-1 whitespace-nowrap">Spacing</span>
                    {['tight', 'normal', 'relaxed'].map(s => (
                      <button key={s} onClick={() => setPrintLineSpacing(s)}
                        className={`px-2 py-0.5 rounded text-xs font-medium transition-colors ${printLineSpacing === s ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}>
                        {s.charAt(0).toUpperCase() + s.slice(1)}
                      </button>
                    ))}
                  </div>
                  <button onClick={handlePrint}
                    className="flex items-center space-x-2 px-4 py-2 bg-white/5 text-gray-300 rounded-lg hover:bg-white/10 hover:text-white transition-colors border border-white/10">
                    <Printer className="w-4 h-4" />
                    <span>Print List</span>
                  </button>
                </div>
              </div>
              <div className="hidden print:block mb-4 text-black font-mono">
                <h2 className="text-lg font-bold pb-1 border-b border-black mb-2">Check Stock Item Mark</h2>
                <p className="text-xs text-black mb-4">Date printed: {printDate}</p>
              </div>
              <div className="text-gray-300 print:text-black w-full min-h-[300px]">
                {renderPairTable("Black (Hook Loop)", hookLoopBlackList, "White (Hook Loop)", hookLoopWhiteList)}
                {renderPairTable("Black NO GLUE (Hook Loop)", hookLoopBlackNoGlueList, "White NO GLUE (Hook Loop)", hookLoopWhiteNoGlueList)}
                {renderQuintTable()}
                {otherItemList.length > 0 && (
                  <div className="mt-6">
                    <h3 className="font-bold border-b border-black mb-2 pb-1 font-mono print:text-black" style={{ fontSize: `${printFontSize}px` }}>Other Items List</h3>
                    <div className="font-mono" style={{ fontSize: `${printFontSize}px` }}>
                      {otherItemList.map((item, idx) => (
                        <div key={idx} className={`flex ${lineSpacingClass}`}>
                          <span className="inline-block mr-2 border border-black/50 print:border-black bg-white shrink-0" style={{ height: `${printFontSize - 2}px`, width: `${printFontSize - 2}px`, marginTop: '2px' }}></span>
                          <span>({item.CategorySeqNr === 1000 ? 0 : item.CategorySeqNr}) - {item.DisplayName} - {item.quantity} Unit</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'manage' && (
        <div className="bg-[#141414] border border-white/5 rounded-2xl p-6 shadow-xl space-y-6">
          <div className="flex gap-4">
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="Search products by Name, Customize Name, SKU or Variant ID..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full bg-[#0a0a0a] border border-white/10 rounded-xl px-4 py-2.5 text-white outline-none focus:border-blue-500 text-sm transition-all"
              />
            </div>
            <div className="flex space-x-3">
              <button onClick={handleExportJson}
                className="flex items-center space-x-2 px-4 py-2.5 bg-amber-600/20 text-amber-500 font-medium rounded-xl hover:bg-amber-600/30 transition-all border border-amber-500/30"
                title="Export to prodStockCalc.json">
                <FileJson className="w-4 h-4" />
                <span>Export JSON</span>
              </button>
              <button onClick={handleAddNew} disabled={isAddingNew}
                className="flex items-center space-x-2 px-6 py-2.5 bg-blue-600/20 text-blue-400 font-medium rounded-xl hover:bg-blue-600/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                <Plus className="w-4 h-4" />
                <span>Add Item</span>
              </button>
              <button onClick={handleSaveStock} disabled={loading}
                className="flex items-center space-x-2 px-6 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-medium rounded-xl hover:shadow-lg hover:shadow-purple-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                {loading ? <RefreshCw className="animate-spin w-5 h-5" /> : <Check className="w-5 h-5" />}
                <span>Save to Cloud</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto border border-white/5 rounded-xl bg-black/20" style={{ maxHeight: '600px' }}>
            <table className="w-full text-left text-sm cursor-default">
              <thead className="bg-[#1a1a1a] sticky top-0 z-10">
                <tr className="border-b border-white/5 text-gray-500 text-[10px] uppercase tracking-wider">
                  <th className="py-3 px-4 font-semibold w-12 text-center cursor-pointer hover:bg-white/5 transition-colors group" onClick={() => handleSort('seqNr')}>
                    <div className="flex items-center justify-center">No <SortIndicator columnKey="seqNr" /></div>
                  </th>
                  <th className="py-3 px-4 font-semibold min-w-[200px] cursor-pointer hover:bg-white/5 transition-colors group" onClick={() => handleSort('productName')}>
                    <div className="flex items-center">Product Name <SortIndicator columnKey="productName" /></div>
                  </th>
                  <th className="py-3 px-4 font-semibold min-w-[180px] cursor-pointer hover:bg-white/5 transition-colors group" onClick={() => handleSort('CustomizeName')}>
                    <div className="flex items-center">Customize Name <SortIndicator columnKey="CustomizeName" /></div>
                  </th>
                  <th className="py-3 px-4 font-semibold min-w-[150px] cursor-pointer hover:bg-white/5 transition-colors group" onClick={() => handleSort('VariantianName')}>
                    <div className="flex items-center">Variant Name <SortIndicator columnKey="VariantianName" /></div>
                  </th>
                  <th className="py-3 px-4 font-semibold w-24 text-center cursor-pointer hover:bg-white/5 transition-colors group" onClick={() => handleSort('CurrentStock')}>
                    <div className="flex items-center justify-center">Stock <SortIndicator columnKey="CurrentStock" /></div>
                  </th>
                  <th className="py-3 px-4 font-semibold w-24 text-center cursor-pointer hover:bg-white/5 transition-colors group" onClick={() => handleSort('SafetyStock')}>
                    <div className="flex items-center justify-center">Safety <SortIndicator columnKey="SafetyStock" /></div>
                  </th>
                  <th className="py-3 px-4 font-semibold min-w-[140px] cursor-pointer hover:bg-white/5 transition-colors group" onClick={() => handleSort('SKUIDCode')}>
                    <div className="flex items-center">SKU Code <SortIndicator columnKey="SKUIDCode" /></div>
                  </th>
                  <th className="py-3 px-4 font-semibold min-w-[100px] cursor-pointer hover:bg-white/5 transition-colors group" onClick={() => handleSort('StoreLocation')}>
                    <div className="flex items-center">Loc <SortIndicator columnKey="StoreLocation" /></div>
                  </th>
                  <th className="py-3 px-4 font-semibold w-16 text-center cursor-pointer hover:bg-white/5 transition-colors group" onClick={() => handleSort('CategorySeqNr')}>
                    <div className="flex items-center justify-center">Cat <SortIndicator columnKey="CategorySeqNr" /></div>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {sortedStock.map((item, index) => (
                  <tr key={item._docId || `${item.seqNr}-${index}`}
                    className="hover:bg-white/[0.04] transition-colors cursor-pointer group"
                    onDoubleClick={() => {
                        setSelectedItem({ ...item });
                        setIsAddingNew(false);
                    }}>
                    <td className="py-3 px-4 text-gray-500 text-xs text-center">{item.seqNr}</td>
                    <td className="py-3 px-4 text-gray-200 font-medium">
                      <div className="flex flex-col">
                        <span>{item.productName || '-'}</span>
                        <span className="text-[10px] text-gray-500 font-mono mt-0.5">{item.VariantianID || ''}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-blue-400 font-medium">{item.CustomizeName}</td>
                    <td className="py-3 px-4 text-gray-400 text-xs">{item.VariantianName || '-'}</td>
                    <td className={`py-3 px-4 text-center font-mono font-bold ${item.CurrentStock <= (item.SafetyStock || 0) ? 'text-red-400' : 'text-emerald-400'}`}>
                      {item.CurrentStock ?? 0}
                    </td>
                    <td className="py-3 px-4 text-center font-mono text-gray-500">{item.SafetyStock ?? 0}</td>
                    <td className="py-3 px-4 text-gray-400 font-mono text-xs">{item.SKUIDCode}</td>
                    <td className="py-3 px-4 text-gray-500">{item.StoreLocation || '-'}</td>
                    <td className="py-3 px-4 text-gray-500 text-center">{item.CategorySeqNr ?? item.categorySeqNr ?? 0}</td>
                  </tr>
                ))}
                {filteredStock.length === 0 && (
                  <tr>
                    <td colSpan="9" className="py-12 text-center">
                      <div className="flex flex-col items-center justify-center text-gray-500">
                        <Package size={40} className="mb-2 opacity-20" />
                        <p>No stock items found.</p>
                        {searchTerm && <p className="text-xs">Try adjusting your search filters.</p>}
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <AnimatePresence>
            {selectedItem && (
              <StockDetailModal
                item={selectedItem}
                onSave={saveEdit}
                onClose={cancelEdit}
                onAddNew={handleCopyAsNew}
                isAddingNew={isAddingNew}
              />
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
