import React, { useState, useEffect } from 'react';
import { fetchCollection, saveCollection, deleteDocument, COLLECTIONS } from '../lib/firestoreApi';
import * as XLSX from 'xlsx';
import { Package, Upload, Edit2, Check, X, Printer, Save, AlertCircle, Plus, Info, RefreshCw, ArrowUpDown, ChevronUp, ChevronDown, Download, FileJson, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// ─── Detail Modal ─────────────────────────────────────────────────────────────
const StockDetailModal = ({ item, onSave, onClose, onAddNew, isAddingNew }) => {
  const [form, setForm] = useState({ ...item });
  const [saving, setSaving] = useState(false);

  useEffect(() => { setForm({ ...item }); }, [item]);

  const set = (field, val) => setForm(f => ({ ...f, [field]: val }));

  const handleSave = async () => {
    // Basic sanitization
    const sanitizedForm = {
      ...form,
      CurrentStock: Math.max(-999999, Math.min(999999, parseInt(form.CurrentStock) || 0)),
      SafetyStock: Math.max(0, Math.min(999999, parseInt(form.SafetyStock) || 0)),
      seqNr: parseInt(form.seqNr) || 0
    };
    setSaving(true);
    await onSave(sanitizedForm);
    setSaving(false);
  };

  const inputCls = "w-full bg-[#1a1a1a] border border-white/10 rounded-lg px-3 py-2 text-white outline-none focus:border-blue-500 text-sm transition-colors";
  const labelCls = "block text-xs font-medium text-gray-400 mb-1";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onDoubleClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative bg-[#141414] border border-white/10 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-5 border-b border-white/5 sticky top-0 bg-[#141414] z-10" 
             onDoubleClick={e => e.stopPropagation()}>
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
  const [uploadedFileName, setUploadedFileName] = useState("");
  const [printDate, setPrintDate] = useState("");
  const [printFontSize, setPrintFontSize] = useState(11);
  const [printLineSpacing, setPrintLineSpacing] = useState('normal');

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
      setStockData(data.map(item => ({ 
        ...item, 
        _localId: item._docId || Math.random().toString(36).substr(2, 9) 
      })));
      setOriginalStockData(JSON.parse(JSON.stringify(data)));
    } catch (error) {
      console.error("Failed to fetch stock data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchStockData(); }, []);

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadedFileName(file.name);
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

  const buildHookLoopSlots = () => {
    const slots = [];
    for (let i = 1; i <= 24; i++) {
      slots.push({ HookLoopCategory: `HOOKLOOP${i}MBLACK`, DisplayName: `${i}M H&L`, quantity: 0, totalOrderID: '' });
      slots.push({ HookLoopCategory: `HOOKLOOP${i}MWHITE`, DisplayName: `${i}M H&L`, quantity: 0, totalOrderID: '' });
      slots.push({ HookLoopCategory: `HOOK${i}MBLACK`,     DisplayName: `${i}M HOOK`, quantity: 0, totalOrderID: '' });
      slots.push({ HookLoopCategory: `HOOK${i}MWHITE`,     DisplayName: `${i}M HOOK`, quantity: 0, totalOrderID: '' });
      slots.push({ HookLoopCategory: `LOOP${i}MBLACK`,     DisplayName: `${i}M LOOP`, quantity: 0, totalOrderID: '' });
      slots.push({ HookLoopCategory: `LOOP${i}MWHITE`,     DisplayName: `${i}M LOOP`, quantity: 0, totalOrderID: '' });
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
      slots.push({ HookLoopCategory: `NONCUTSTICK${i}MBIEGE`, DisplayName: `${i}M`, quantity: 0, totalOrderID: '' });
      slots.push({ HookLoopCategory: `NONCUTSTICK${i}MWHITE`, DisplayName: `${i}M`, quantity: 0, totalOrderID: '' });
      slots.push({ HookLoopCategory: `NONCUTSTICK${i}MBLACK`, DisplayName: `${i}M`, quantity: 0, totalOrderID: '' });
      slots.push({ HookLoopCategory: `NONCUTSTICK${i}MBLUE`,  DisplayName: `${i}M`, quantity: 0, totalOrderID: '' });
      slots.push({ HookLoopCategory: `NONCUTSTICK${i}MGREY`,  DisplayName: `${i}M`, quantity: 0, totalOrderID: '' });
    }
    return slots;
  };

  const fnCalculateQuantity = (hookLoopList, newCategory, item) => {
    const qty = item.Quantity;
    if (qty > 24) {
      hookLoopList.push({
        HookLoopCategory: `NEW METER (${newCategory})`,
        totalOrderID: item.orderID,
        quantity: 1,
        DisplayName: `(${item.orderID}) + ${newCategory}`
      });
    }
    const slot = hookLoopList.find(s => s.HookLoopCategory === newCategory);
    if (slot) {
      slot.quantity += 1;
      slot.totalOrderID += slot.totalOrderID ? `, ${item.orderID}` : item.orderID;
    }
  };

  const getTargetCategory = (itemName, qty) => {
    const n = itemName.toUpperCase();
    const q = Math.round(qty);
    if (n === 'HOOKLOOP1MBLACK' || n === 'HOOKLOOP2MBLACK' || n === 'HOOKLOOP3MBLACK') return { category: `HOOKLOOP${q}MBLACK` };
    if (n === 'HOOKLOOP1MWHITE' || n === 'HOOKLOOP2MWHITE' || n === 'HOOKLOOP3MWHITE') return { category: `HOOKLOOP${q}MWHITE` };
    if (n === 'HOOKONLY1MWHITE') return { category: `HOOK${q}MWHITE` };
    if (n === 'HOOKONLY1MBLACK') return { category: `HOOK${q}MBLACK` };
    if (n === 'LOOPONLY1MWHITE') return { category: `LOOP${q}MWHITE` };
    if (n === 'LOOPONLY1MBLACK') return { category: `LOOP${q}MBLACK` };
    if (n === '16MMHLNOGLUE1MBLACK' || n === '16MMHLNOGLUE2MBLACK' || n === '16MMHLNOGLUE3MBLACK') return { category: `16MMHOOKLOOPNOGLUE${q}MBLACK` };
    if (n === '16MMHLNOGLUE1MWHITE' || n === '16MMHLNOGLUE2MWHITE' || n === '16MMHLNOGLUE3MWHITE') return { category: `16MMHOOKLOOPNOGLUE${q}MWHITE` };
    if (n === '25MMHLNOGLUE1MBLACK' || n === '25MMHLNOGLUE2MBLACK' || n === '25MMHLNOGLUE3MBLACK') return { category: `25MMHOOKLOOPNOGLUE${q}MBLACK` };
    if (n === '25MMHLNOGLUE1MWHITE' || n === '25MMHLNOGLUE2MWHITE' || n === '25MMHLNOGLUE3MWHITE') return { category: `25MMHOOKLOOPNOGLUE${q}MWHITE` };
    if (n === '38MMHLNOGLUE1MBLACK' || n === '38MMHLNOGLUE2MBLACK' || n === '38MMHLNOGLUE3MBLACK') return { category: `38MMHOOKLOOPNOGLUE${q}MBLACK` };
    if (n === '38MMHLNOGLUE1MWHITE' || n === '38MMHLNOGLUE2MWHITE' || n === '38MMHLNOGLUE3MWHITE') return { category: `38MMHOOKLOOPNOGLUE${q}MWHITE` };
    if (n === 'NONCUTSTK1MBIEGE' || n === 'NONCUTSTK2MBIEGE' || n === 'NONCUTSTK3MBIEGE') return { category: `NONCUTSTICK${q}MBIEGE` };
    if (n === 'NONCUTSTK1MBLACK' || n === 'NONCUTSTK2MBLACK' || n === 'NONCUTSTK3MBLACK') return { category: `NONCUTSTICK${q}MBLACK` };
    if (n === 'NONCUTSTK1MWHITE' || n === 'NONCUTSTK2MWHITE' || n === 'NONCUTSTK3MWHITE') return { category: `NONCUTSTICK${q}MWHITE` };
    if (n === 'NONCUTSTK1MBLUE' || n === 'NONCUTSTK2MBLUE' || n === 'NONCUTSTK3MBLUE') return { category: `NONCUTSTICK${q}MBLUE` };
    if (n === 'NONCUTSTK1MGREY' || n === 'NONCUTSTK2MGREY' || n === 'NONCUTSTK3MGREY') return { category: `NONCUTSTICK${q}MGREY` };
    return null;
  };

  const calculateStock = () => {
    if (!excelData.length) return alert("Upload Excel first.");
    let GblitemList = [];
    let itemList = [];
    let currentOrderId = "";
    excelData.forEach(row => {
      if (row["Order Status"] === "Cancelled") return;
      const rowOrderId = (row["Order ID"] || "").toString().trim();
      const skuCode = (row["SKU Reference No."] || "").toString().trim();
      const rawQuantity = parseInt(row["Quantity"]) || 1;
      if (rowOrderId !== currentOrderId) { itemList = []; currentOrderId = rowOrderId; }
      let prdInfo = stockData.find(p => (p.SKUIDCode || "").includes(skuCode));
      if (!prdInfo) prdInfo = stockData.find(p => (p.VariantianName || "").includes((row["Variation Name"] || "") + (row["Product Name"] || "").substring(0, 20)));
      let SameCategoryCountID = prdInfo?.SameCategoryCountID || "UNKNOWN";
      let jsonQuantity = prdInfo?.SameCategoryCountQuantity || 1;
      let customizeName = prdInfo?.CustomizeName || ((row["Variation Name"] || "") + " | " + (row["Product Name"] || ""));
      let categorySeqNr = parseInt(prdInfo?.categorySeqNr || prdInfo?.CategorySeqNr || 0);
      const finalQty = jsonQuantity * rawQuantity;
      if (SameCategoryCountID !== "UNKNOWN" && SameCategoryCountID !== "") {
        const matchedItem = itemList.find(i => i.SameCategoryCountID === SameCategoryCountID);
        if (matchedItem) matchedItem.Quantity += finalQty;
        else { const ni = { orderID: currentOrderId, Name: prdInfo?.SKUIDCode || skuCode, Quantity: finalQty, CustomizeName: customizeName, CategorySeqNr: categorySeqNr, SameCategoryCountID }; itemList.push(ni); GblitemList.push(ni); }
      } else {
        const ni = { orderID: currentOrderId, Name: prdInfo?.SKUIDCode || skuCode, Quantity: rawQuantity, CustomizeName: customizeName, CategorySeqNr: categorySeqNr, SameCategoryCountID }; itemList.push(ni); GblitemList.push(ni);
      }
    });
    const filterNum1List = GblitemList.filter(p => p.CategorySeqNr === 1 || p.CategorySeqNr === 2 || p.CategorySeqNr === 5).sort((a, b) => (a.Name || "").localeCompare(b.Name || ""));
    const HookLoopList = buildHookLoopSlots();
    filterNum1List.forEach(item => { const res = getTargetCategory(item.Name, item.Quantity); if (res) fnCalculateQuantity(HookLoopList, res.category, item); });
    const wL = [], bL = [], wNG = [], bNG = [], ncw = [], ncb = [], ncg = [], ncbl = [], ncbge = [];
    HookLoopList.forEach(slot => {
      if (slot.quantity === 0) return;
      const cat = slot.HookLoopCategory; const entry = { DisplayName: `${slot.DisplayName} X ${slot.quantity}` };
      if (cat.includes("NONCUT")) {
        if (cat.includes("WHITE")) ncw.push(entry); else if (cat.includes("BLACK")) ncb.push(entry); else if (cat.includes("GREY")) ncg.push(entry); else if (cat.includes("BLUE")) ncbl.push(entry); else if (cat.includes("BIEGE")) ncbge.push(entry);
      } else if (cat.includes("NOGLUE")) {
        if (cat.includes("WHITE")) wNG.push(entry); else bNG.push(entry);
      } else {
        if (cat.includes("WHITE")) wL.push(entry); else bL.push(entry);
      }
    });
    setHookLoopWhiteList(wL); setHookLoopBlackList(bL); setHookLoopWhiteNoGlueList(wNG); setHookLoopBlackNoGlueList(bNG);
    setNonCutStickListColors({ white: ncw, black: ncb, grey: ncg, blue: ncbl, beige: ncbge });
    const others = [];
    GblitemList.filter(p => p.CategorySeqNr !== 1 && p.CategorySeqNr !== 2 && p.CategorySeqNr !== 5 && p.CategorySeqNr !== 800).forEach(ech => {
      let ex = others.find(o => o.SKUReferenceNo === ech.Name);
      if (ex) { ex.quantity += ech.Quantity; ex.totalOrderID += `, ${ech.orderID}`; }
      else others.push({ CategorySeqNr: ech.CategorySeqNr, quantity: ech.Quantity, DisplayName: ech.CustomizeName, SKUReferenceNo: ech.Name, totalOrderID: ech.orderID });
    });
    setOtherItemList(others.sort((a, b) => (a.CategorySeqNr === 0 ? 1000 : a.CategorySeqNr) - (b.CategorySeqNr === 0 ? 1000 : b.CategorySeqNr)));
  };

  const handlePrint = () => { setPrintDate(new Date().toLocaleString()); setTimeout(() => window.print(), 100); };

  const handleSaveStock = async () => {
    try {
      setLoading(true);
      const modifiedItems = stockData.filter(item => {
        if (!item._docId) return true;
        const original = originalStockData.find(o => o._docId === item._docId);
        return !original || JSON.stringify(item) !== JSON.stringify(original);
      });
      if (modifiedItems.length === 0) return alert("No changes to save.");
      console.log(`[Cloud Save] Saving ${modifiedItems.length} items...`);
      const savedItems = await saveCollection(COLLECTIONS.shopee.prodStockCalc, modifiedItems);
      if (savedItems && savedItems.length > 0) {
        setStockData(prev => prev.map(item => {
          const saved = savedItems.find(s => (item._docId && s._docId === item._docId) || (item._localId && s._localId === item._localId));
          return saved ? { ...saved, _localId: item._localId } : item;
        }));
        setOriginalStockData(prev => {
          const next = [...prev];
          savedItems.forEach(s => {
            const i = next.findIndex(n => n._docId === s._docId);
            if (i >= 0) next[i] = JSON.parse(JSON.stringify(s)); else next.push(JSON.parse(JSON.stringify(s)));
          });
          return next;
        });
      }
      alert(`Successfully saved ${modifiedItems.length} items!`);
    } catch (error) { console.error(error); alert("Save failed."); } finally { setLoading(false); }
  };

  const saveEdit = (updatedItem) => {
    if (isAddingNew) setStockData(prev => [updatedItem, ...prev]);
    else setStockData(prev => prev.map(item => (item._docId === updatedItem._docId || item._localId === updatedItem._localId) ? updatedItem : item));
    setSelectedItem(null); setIsAddingNew(false);
  };

  const cancelEdit = () => { setSelectedItem(null); setIsAddingNew(false); };

  const handleAddNew = () => {
    const maxSeq = stockData.length > 0 ? Math.max(...stockData.map(s => s.seqNr || 0)) : 0;
    setSelectedItem({
      _localId: Math.random().toString(36).substr(2, 9), seqNr: maxSeq + 1, categorySeqNr: 0, CategorySeqNr: 0, productName: "", CurrentStock: 0, SafetyStock: 0, SKUIDCode: "", CustomizeName: "", VariantianID: "", Remark: ""
    });
    setIsAddingNew(true);
  };

  const handleCopyAsNew = (form) => {
    setSelectedItem(null);
    const maxSeq = stockData.length > 0 ? Math.max(...stockData.map(s => s.seqNr || 0)) : 0;
    setTimeout(() => {
      const { _docId, ...rest } = JSON.parse(JSON.stringify(form));
      setSelectedItem({ ...rest, _localId: Math.random().toString(36).substr(2, 9), seqNr: maxSeq + 1, productName: `${form.productName} (copy)`, Remark: '' });
      setIsAddingNew(true);
    }, 100);
  };

  const handleDeleteItem = async (item) => {
    if (!window.confirm(`Permanently delete "${item.productName}"?`)) return;
    try {
      setLoading(true);
      if (item._docId) await deleteDocument(COLLECTIONS.shopee.prodStockCalc, item._docId);
      setStockData(prev => prev.filter(s => (item._docId && s._docId === item._docId) ? false : (item._localId && s._localId === item._localId) ? false : true));
      setOriginalStockData(prev => prev.filter(s => s._docId !== item._docId));
    } catch (error) { alert("Delete failed."); } finally { setLoading(false); }
  };

  const handleExportJson = () => {
    const sorted = [...stockData].sort((a, b) => (a.seqNr || 0) - (b.seqNr || 0));
    const blob = new Blob([JSON.stringify(sorted, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob); const link = document.createElement('a');
    link.href = url; link.download = 'prodStockCalc.json'; link.click(); URL.revokeObjectURL(url);
  };

  const filteredStock = stockData.filter(item => (item.productName || '').toLowerCase().includes(searchTerm.toLowerCase()) || (item.CustomizeName || '').toLowerCase().includes(searchTerm.toLowerCase()) || (item.SKUIDCode || '').toLowerCase().includes(searchTerm.toLowerCase()));
  const sortedStock = [...filteredStock].sort((a, b) => {
    const modifier = sortConfig.direction === 'asc' ? 1 : -1;
    let aV = a[sortConfig.key], bV = b[sortConfig.key];
    if (aV === bV) return 0;
    return (aV > bV ? 1 : -1) * modifier;
  });

  const lineSpacingClass = { tight: 'py-0', normal: 'py-0.5', relaxed: 'py-1' }[printLineSpacing];

  const renderPairTable = (title1, list1, title2, list2) => {
    const max = Math.max(list1.length, list2.length);
    if (max === 0) return null;
    return (
      <div className="mb-6 font-mono" style={{ fontSize: `${printFontSize}px` }}>
        <div className="flex border-b border-black font-bold pb-1 bg-gray-100/10 print:bg-gray-200">
          <div className="flex-1 px-2 border-r border-black">{title1}</div>
          <div className="flex-1 px-2">{title2}</div>
        </div>
        {Array.from({ length: max }).map((_, i) => (
          <div key={i} className={`flex border-b border-black/20 print:border-black ${lineSpacingClass}`}>
            <div className="flex-1 px-2 border-r border-black/20 print:border-black">
              {list1[i] && (
                <div className="flex items-start">
                  <span className="mr-1">☐</span>
                  <span>{list1[i].DisplayName}</span>
                </div>
              )}
            </div>
            <div className="flex-1 px-2">
              {list2[i] && (
                <div className="flex items-start">
                  <span className="mr-1">☐</span>
                  <span>{list2[i].DisplayName}</span>
                </div>
              )}
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
    const bge = nonCutStickListColors.beige;
    const max = Math.max(w.length, b.length, g.length, bl.length, bge.length);
    if (max === 0) return null;

    return (
      <div className="mt-6 mb-4 font-mono" style={{ fontSize: `${printFontSize}px` }}>
        <div className="flex border-b border-black font-bold pb-1 bg-gray-100/10 print:bg-gray-200">
          <div className="flex-1 px-1 border-r border-black text-center">White</div>
          <div className="flex-1 px-1 border-r border-black text-center">Black</div>
          <div className="flex-1 px-1 border-r border-black text-center">Grey</div>
          <div className="flex-1 px-1 border-r border-black text-center">Blue</div>
          <div className="flex-1 px-1 text-center">Beige</div>
        </div>
        {Array.from({ length: max }).map((_, i) => (
          <div key={i} className={`flex border-b border-black/20 print:border-black ${lineSpacingClass}`}>
            <div className="flex-1 px-1 border-r border-black/20 print:border-black text-[10px]">{w[i] && '☐ ' + w[i].DisplayName}</div>
            <div className="flex-1 px-1 border-r border-black/20 print:border-black text-[10px]">{b[i] && '☐ ' + b[i].DisplayName}</div>
            <div className="flex-1 px-1 border-r border-black/20 print:border-black text-[10px]">{g[i] && '☐ ' + g[i].DisplayName}</div>
            <div className="flex-1 px-1 border-r border-black/20 print:border-black text-[10px]">{bl[i] && '☐ ' + bl[i].DisplayName}</div>
            <div className="flex-1 px-1 text-[10px]">{bge[i] && '☐ ' + bge[i].DisplayName}</div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex justify-between items-center print:hidden">
        <div><h1 className="text-3xl font-bold text-white tracking-tight">Shopee Stock</h1><p className="text-gray-400 mt-1">Manage and calculate stock requirements</p></div>
        <div className="flex space-x-2 bg-[#1a1a1a] p-1 rounded-xl border border-white/5">
          <button onClick={() => setActiveTab('calculate')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'calculate' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}>Calculate</button>
          <button onClick={() => setActiveTab('manage')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'manage' ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white'}`}>Manage</button>
        </div>
      </div>
      {activeTab === 'calculate' && (
        <div className="space-y-6">
          <div className="bg-[#141414] border border-white/5 rounded-2xl p-6 print:hidden">
            <div className="flex items-center space-x-4">
              <label className="flex items-center space-x-2 px-6 py-3 bg-blue-600/20 text-blue-400 border border-blue-500/30 rounded-xl cursor-pointer hover:bg-blue-600/30">
                <Upload size={20} /><span>Upload Excel</span><input type="file" className="hidden" accept=".xlsx, .xls" onChange={handleFileUpload} />
              </label>
              {uploadedFileName && (
                <div className="flex flex-col">
                  <span className="text-blue-400 text-sm font-medium">{uploadedFileName}</span>
                  <span className="text-gray-500 text-[10px]">{excelData.length} rows loaded</span>
                </div>
              )}
              <button onClick={calculateStock} disabled={excelData.length === 0} className="px-6 py-3 bg-blue-600 text-white rounded-xl disabled:opacity-50">Calculate Stock</button>
            </div>
          </div>
          {(hookLoopWhiteList.length > 0 || otherItemList.length > 0) && (
            <div className="bg-[#141414] border border-white/5 rounded-2xl p-6 print:bg-white print:text-black">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-6 print:hidden">
                <h2 className="text-xl font-bold text-white tracking-tight">Print View</h2>
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
              <div className="print:text-black">
                {renderPairTable("Black (Hook Loop)", hookLoopBlackList, "White (Hook Loop)", hookLoopWhiteList)}
                {renderPairTable("Black No Glue", hookLoopBlackNoGlueList, "White No Glue", hookLoopWhiteNoGlueList)}
                {renderQuintTable()}
                {otherItemList.length > 0 && <div className="mt-4"><h3 className="font-bold border-b border-black mb-2 pb-1" style={{ fontSize: `${printFontSize + 2}px` }}>Other Items List</h3>{otherItemList.map((it, idx) => <div key={idx} className={`font-mono ${lineSpacingClass}`} style={{ fontSize: `${printFontSize}px` }}>☐ ({it.CategorySeqNr === 1000 ? 0 : it.CategorySeqNr}) - {it.DisplayName} - {it.quantity} Unit</div>)}</div>}
              </div>
            </div>
          )}
        </div>
      )}
      {activeTab === 'manage' && (
        <div className="bg-[#141414] border border-white/5 rounded-2xl p-6 space-y-4">
          <div className="flex gap-3">
            <input type="text" placeholder="Search..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="flex-1 bg-[#0a0a0a] border border-white/10 rounded-xl px-4 py-2 text-white outline-none focus:border-blue-500" />
            <button onClick={handleAddNew} className="px-4 py-2 bg-blue-600/20 text-blue-400 border border-blue-500/30 rounded-xl hover:bg-blue-600/30 transition-all font-medium">Add Item</button>
            <button onClick={handleSaveStock} disabled={loading} className="px-6 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl font-bold flex items-center gap-2"> {loading ? <RefreshCw className="animate-spin" size={18}/> : <Check size={18}/>} Save to Cloud</button>
          </div>
          <div className="overflow-auto border border-white/5 rounded-xl bg-black/20 max-h-[600px]">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#1a1a1a] sticky top-0 font-bold text-gray-500 text-[10px] uppercase">
                <tr>
                  <th className="p-3 cursor-pointer w-12 text-center" onClick={() => handleSort('seqNr')}>No <SortIndicator columnKey="seqNr" /></th>
                  <th className="p-3 cursor-pointer min-w-[180px]" onClick={() => handleSort('productName')}>Product Name <SortIndicator columnKey="productName" /></th>
                  <th className="p-3 cursor-pointer text-blue-400" onClick={() => handleSort('CustomizeName')}>Customize Name <SortIndicator columnKey="CustomizeName" /></th>
                  <th className="p-3 cursor-pointer text-gray-400" onClick={() => handleSort('VariantianName')}>Variant Name <SortIndicator columnKey="VariantianName" /></th>
                  <th className="p-3 cursor-pointer w-20 text-center" onClick={() => handleSort('CurrentStock')}>Stock <SortIndicator columnKey="CurrentStock" /></th>
                  <th className="p-3 cursor-pointer w-24 text-center" onClick={() => handleSort('SKUIDCode')}>SKU <SortIndicator columnKey="SKUIDCode" /></th>
                  <th className="p-3 cursor-pointer w-20 text-center" onClick={() => handleSort('StoreLocation')}>Loc <SortIndicator columnKey="StoreLocation" /></th>
                  <th className="p-3 text-center w-24">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {sortedStock.map(item => (
                  <tr key={item._localId || item._docId} className="hover:bg-white/[0.04] transition-colors cursor-pointer" onDoubleClick={() => setSelectedItem(item)}>
                    <td className="p-3 text-gray-500 text-center text-xs">{item.seqNr}</td>
                    <td className="p-3 text-gray-200">
                      <div className="font-medium">{item.productName}</div>
                      <div className="text-[10px] text-gray-500 font-mono mt-0.5">{item.VariantianID}</div>
                    </td>
                    <td className="p-3 text-blue-400/80 font-medium">{item.CustomizeName || '-'}</td>
                    <td className="p-3 text-gray-500 text-xs italic">{item.VariantianName || '-'}</td>
                    <td className={`p-3 font-mono font-bold text-center ${item.CurrentStock <= (item.SafetyStock || 0) ? 'text-red-400' : 'text-emerald-400'}`}>{item.CurrentStock}</td>
                    <td className="p-3 text-gray-500 font-mono text-xs text-center">{item.SKUIDCode}</td>
                    <td className="p-3 text-gray-500 text-xs text-center">{item.StoreLocation || '-'}</td>
                    <td className="p-3 text-center">
                      <div className="flex justify-center gap-1">
                        <button onClick={() => setSelectedItem(item)} className="p-1.5 text-blue-400 hover:bg-blue-500/10 rounded-lg group/edit"><Edit2 size={14} className="group-hover/edit:scale-110 transition-transform"/></button>
                        <button onClick={(e) => { e.stopPropagation(); handleDeleteItem(item); }} className="p-1.5 text-red-500 hover:bg-red-500/10 rounded-lg group/del"><Trash2 size={14} className="group-hover/del:scale-110 transition-transform"/></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <AnimatePresence>{selectedItem && <StockDetailModal item={selectedItem} onSave={saveEdit} onClose={cancelEdit} onAddNew={handleCopyAsNew} isAddingNew={isAddingNew} />}</AnimatePresence>
        </div>
      )}
    </div>
  );
}
