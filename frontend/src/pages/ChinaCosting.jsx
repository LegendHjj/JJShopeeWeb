import React, { useState, useEffect, useMemo } from 'react';
import { 
  Trash2, 
  Plus, 
  Copy, 
  Check, 
  Info, 
  FileText, 
  DollarSign, 
  Clipboard,
  X,
  AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const DEFAULT_ITEMS = [
  { id: 1, name: "JAY周杰伦专辑封面歌词钥匙扣", qty: 50, priceRmb: 0.98 },
  { id: 2, name: "扭蛋机亚克力摇摇乐", qty: 40, priceRmb: 4.50 },
  { id: 3, name: "新款三丽鸥可爱收纳盒ins风透明收纳", qty: 18, priceRmb: 8.80 }
];

export default function ChinaCosting() {
  // --- States ---
  const [exchangeRate, setExchangeRate] = useState(() => {
    return localStorage.getItem('china_costing_exchange_rate') || '1.6';
  });
  
  const [totalPriceRmb, setTotalPriceRmb] = useState(() => {
    return localStorage.getItem('china_costing_total_price_rmb') || '388.40';
  });

  const [shippingFeeRm, setShippingFeeRm] = useState(() => {
    return localStorage.getItem('china_costing_shipping_fee_rm') || '10.00';
  });

  const [items, setItems] = useState(() => {
    const saved = localStorage.getItem('china_costing_items');
    return saved ? JSON.parse(saved) : DEFAULT_ITEMS;
  });

  const [pasteText, setPasteText] = useState('');
  const [copiedId, setCopiedId] = useState(null);
  const [copiedAll, setCopiedAll] = useState(false);
  const [importStatus, setImportStatus] = useState(null); // { type: 'success'|'error', message: string }

  // --- Auto Save to LocalStorage ---
  useEffect(() => {
    localStorage.setItem('china_costing_exchange_rate', exchangeRate);
  }, [exchangeRate]);

  useEffect(() => {
    localStorage.setItem('china_costing_total_price_rmb', totalPriceRmb);
  }, [totalPriceRmb]);

  useEffect(() => {
    localStorage.setItem('china_costing_shipping_fee_rm', shippingFeeRm);
  }, [shippingFeeRm]);

  useEffect(() => {
    localStorage.setItem('china_costing_items', JSON.stringify(items));
  }, [items]);

  // --- Cost Allocation Calculations (2 Decimal Places) ---
  const calculations = useMemo(() => {
    const rate = parseFloat(exchangeRate) || 0;
    const orderRmb = parseFloat(totalPriceRmb) || 0;
    const shippingRm = parseFloat(shippingFeeRm) || 0;

    // Total Cost RM = (totalPriceRmb / exchangeRate) + shippingFeeRm
    const totalCostRm = rate > 0 ? (orderRmb / rate) + shippingRm : 0;

    // Map items and calculate subtotals & factors
    const itemsWithFactors = items.map(item => {
      const qty = parseInt(item.qty) || 0;
      const priceRmb = parseFloat(item.priceRmb) || 0;
      const subtotalRmb = qty * priceRmb;
      
      // allocationFactor = priceRmb * 100 * qty
      const allocationFactor = priceRmb * 100 * qty;

      return {
        ...item,
        qty,
        priceRmb,
        subtotalRmb,
        allocationFactor
      };
    });

    const sumAllocationFactor = itemsWithFactors.reduce((sum, item) => sum + item.allocationFactor, 0);
    const sumSubtotalRmb = itemsWithFactors.reduce((sum, item) => sum + item.subtotalRmb, 0);

    // Allocate RM costs proportionally
    const finalItemsList = itemsWithFactors.map(item => {
      // allocatedCost = (Total Cost RM / Sum of Factors) * item.factor
      const allocatedCostRm = sumAllocationFactor > 0
        ? (totalCostRm / sumAllocationFactor) * item.allocationFactor
        : 0;

      // unitCost = allocatedCost / qty
      const unitCostRm = item.qty > 0 ? allocatedCostRm / item.qty : 0;

      // Format output string to exactly 2 decimal places
      const formattedUnitCost = unitCostRm.toFixed(2);
      const copyText = `${item.name || 'Unnamed Item'} - Per Unit = RM ${formattedUnitCost}`;

      return {
        ...item,
        allocatedCostRm,
        unitCostRm,
        copyText
      };
    });

    return {
      totalCostRm,
      sumSubtotalRmb,
      finalItemsList
    };
  }, [items, exchangeRate, totalPriceRmb, shippingFeeRm]);

  // --- Handlers ---
  const handleAddItem = () => {
    const nextId = items.length > 0 ? Math.max(...items.map(i => i.id)) + 1 : 1;
    setItems([...items, { id: nextId, name: '', qty: 1, priceRmb: 0.00 }]);
  };

  const handleUpdateItem = (id, field, value) => {
    setItems(items.map(item => {
      if (item.id === id) {
        let parsedVal = value;
        if (field === 'qty') {
          parsedVal = value === '' ? '' : parseInt(value) || 0;
        } else if (field === 'priceRmb') {
          parsedVal = value === '' ? '' : parseFloat(value) || 0;
        }
        return { ...item, [field]: parsedVal };
      }
      return item;
    }));
  };

  const handleRemoveItem = (id) => {
    setItems(items.filter(item => item.id !== id));
  };

  const handleClearAll = () => {
    if (window.confirm("Are you sure you want to clear all items?")) {
      setItems([]);
      setTotalPriceRmb('');
      setShippingFeeRm('');
      setImportStatus(null);
    }
  };

  const handleLoadDemo = () => {
    setItems(DEFAULT_ITEMS);
    setExchangeRate('1.6');
    setTotalPriceRmb('388.40');
    setShippingFeeRm('10.00');
    setImportStatus({ type: 'success', message: 'Loaded demonstration data successfully!' });
  };

  // --- Clipboard Helpers ---
  const handleCopySingle = async (text, id) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1500);
    } catch (err) {
      alert("Failed to copy text: " + err);
    }
  };

  const handleCopyAll = async () => {
    const textToCopy = calculations.finalItemsList.map(item => item.copyText).join('\n');
    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopiedAll(true);
      setTimeout(() => setCopiedAll(false), 2000);
    } catch (err) {
      alert("Failed to copy text: " + err);
    }
  };

  // --- Smart Raw Paste Parser ---
  const handleParsePaste = () => {
    if (!pasteText.trim()) {
      setImportStatus({ type: 'error', message: 'No text was pasted.' });
      return;
    }

    try {
      const lines = pasteText.split('\n').map(l => l.trim()).filter(Boolean);
      const newItems = [];
      let skippedCount = 0;

      // Check if this is a shopping purchase web copy (contains '¥' and multi-line structures)
      const hasYenSymbol = pasteText.includes('¥');
      const hasShoppingBoilerplate = pasteText.includes('退货') || pasteText.includes('退款') || pasteText.includes('[快照]');

      if (hasYenSymbol && hasShoppingBoilerplate) {
        let currentProductName = '';
        let currentVariant = '';

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];

          // 1. Detect product title line (often ends with [快照] or is a standalone text line at the start of blocks)
          if (line.includes('[快照]')) {
            currentProductName = line.replace(/\[快照\]/g, '').trim();
            currentVariant = '';
            continue;
          }

          // 2. Detect variant specification lines
          if (line.startsWith('颜色:') || line.startsWith('规格:') || line.includes('颜色:') || line.includes('规格:')) {
            currentVariant = line;
            // If we don't have a product name yet, take the previous line as name (if not boilerplate)
            if (!currentProductName && i > 0) {
              const prev = lines[i - 1];
              if (!prev.includes('退') && !prev.includes('退款') && !prev.includes('发货') && !prev.includes('¥')) {
                currentProductName = prev;
              }
            }
            continue;
          }

          // 3. Detect Price line
          if (line.includes('¥')) {
            const priceMatch = line.match(/¥\s*([\d.]+)/);
            if (priceMatch) {
              const price = parseFloat(priceMatch[1]);
              
              // Next line contains quantity purchase
              if (i + 1 < lines.length) {
                const qtyVal = parseInt(lines[i + 1]);
                if (!isNaN(qtyVal) && qtyVal > 0) {
                  
                  // Backtrack to find product name if missing
                  if (!currentProductName) {
                    let j = i - 1;
                    while (j >= 0) {
                      const check = lines[j];
                      if (
                        check.includes('¥') || 
                        check.includes('颜色:') || 
                        check.includes('规格:') || 
                        check.includes('退') || 
                        check.includes('发货') || 
                        check.includes('保单')
                      ) {
                        j--;
                        continue;
                      }
                      currentProductName = check;
                      break;
                    }
                  }

                  const fullName = currentProductName + (currentVariant ? ` (${currentVariant})` : '');
                  newItems.push({
                    id: Date.now() + i + Math.random(),
                    name: fullName || 'Parsed Product',
                    qty: qtyVal,
                    priceRmb: price
                  });

                  // Skip the quantity line
                  i++;
                }
              }
            }
          }
        }
      }

      // If we couldn't parse as shopping block, or if it failed, fallback to space/tab-separated rows
      if (newItems.length === 0) {
        lines.forEach((line, index) => {
          // Try split by Tab
          let parts = line.split('\t');
          // If no tabs, split by Comma
          if (parts.length < 2) parts = line.split(',');
          // If no commas, split by space(s)
          if (parts.length < 2) parts = line.split(/\s+/).filter(Boolean);

          if (parts.length >= 2) {
            let name = '';
            let qty = 1;
            let price = 0.00;

            if (parts.length >= 3) {
              // Extract last two columns as numbers (Qty and Price)
              const lastPart = parts[parts.length - 1];
              const secondLastPart = parts[parts.length - 2];
              
              const valLast = parseFloat(lastPart);
              const valSecondLast = parseFloat(secondLastPart);

              if (!isNaN(valLast) && !isNaN(valSecondLast)) {
                // Determine which is quantity vs price. Qty is usually integer.
                if (Number.isInteger(valSecondLast)) {
                  qty = parseInt(secondLastPart);
                  price = valLast;
                } else {
                  qty = parseInt(lastPart) || 1;
                  price = valSecondLast;
                }
                name = parts.slice(0, parts.length - 2).join(' ');
              } else {
                name = parts[0];
                qty = parseInt(parts[1]) || 1;
                price = parseFloat(parts[2]) || 0;
              }
            } else if (parts.length === 2) {
              // Name and Price
              name = parts[0];
              price = parseFloat(parts[1]) || 0;
            }

            if (name && !isNaN(price)) {
              newItems.push({
                id: Date.now() + index + Math.random(),
                name: name.trim(),
                qty: qty,
                priceRmb: price
              });
            } else {
              skippedCount++;
            }
          } else {
            skippedCount++;
          }
        });
      }

      if (newItems.length > 0) {
        setItems(prev => [...prev, ...newItems]);
        setImportStatus({ 
          type: 'success', 
          message: `Successfully imported ${newItems.length} items from pasted list!` 
        });
        setPasteText('');
      } else {
        setImportStatus({ 
          type: 'error', 
          message: 'Could not parse any valid items. Make sure data columns are separated by tabs/spaces, or copy full blocks from the purchase website.' 
        });
      }
    } catch (err) {
      setImportStatus({ type: 'error', message: `Parse error: ${err.message}` });
    }
  };

  const totalsDifference = useMemo(() => {
    const orderRmb = parseFloat(totalPriceRmb) || 0;
    const diff = orderRmb - calculations.sumSubtotalRmb;
    return parseFloat(diff.toFixed(2));
  }, [totalPriceRmb, calculations.sumSubtotalRmb]);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight flex items-center gap-3">
            <FileText className="text-blue-400" size={26} />
            China Costing Calculator
          </h1>
          <p className="text-gray-400 mt-1 text-xs md:text-sm">
            Calculate RM unit costs for bulk China purchases by allocating shipping fees proportionally
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleLoadDemo}
            className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 rounded-xl transition-all text-xs font-semibold"
          >
            Load Example Data
          </button>
          <button
            onClick={handleClearAll}
            className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 rounded-xl transition-all text-xs font-semibold"
          >
            Clear Items
          </button>
        </div>
      </div>

      {/* Main Parameters Panel */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        
        {/* Exchange Rate */}
        <div className="bg-[#141414] border border-white/5 rounded-2xl p-4 space-y-2 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full blur-2xl -mr-6 -mt-6 transition-all group-hover:bg-blue-500/10" />
          <label className="block text-xs text-gray-400 font-semibold uppercase tracking-wider">Exchange Rate (RMB/MYR)</label>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-500">1 RM =</span>
            <input
              type="number"
              step="0.01"
              value={exchangeRate}
              onChange={e => setExchangeRate(e.target.value)}
              className="flex-1 bg-[#0a0a0a] border border-white/10 rounded-xl px-3 py-2 text-white font-mono font-bold focus:ring-1 focus:ring-blue-500 outline-none"
              placeholder="e.g. 1.6"
            />
            <span className="text-xs text-gray-400">RMB</span>
          </div>
          <p className="text-[10px] text-gray-500">Divides RMB prices to get RM equivalents</p>
        </div>

        {/* Total Price RMB */}
        <div className="bg-[#141414] border border-white/5 rounded-2xl p-4 space-y-2 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/5 rounded-full blur-2xl -mr-6 -mt-6 transition-all group-hover:bg-purple-500/10" />
          <label className="block text-xs text-gray-400 font-semibold uppercase tracking-wider">Total Order Price (RMB)</label>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-500">¥</span>
            <input
              type="number"
              step="0.01"
              value={totalPriceRmb}
              onChange={e => setTotalPriceRmb(e.target.value)}
              className="flex-1 bg-[#0a0a0a] border border-white/10 rounded-xl px-3 py-2 text-white font-mono font-bold focus:ring-1 focus:ring-purple-500 outline-none"
              placeholder="Total RMB paid"
            />
          </div>
          <p className="text-[10px] text-gray-500">Parcel invoice total in Chinese currency</p>
        </div>

        {/* Malaysia Shipping Fee RM */}
        <div className="bg-[#141414] border border-white/5 rounded-2xl p-4 space-y-2 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full blur-2xl -mr-6 -mt-6 transition-all group-hover:bg-amber-500/10" />
          <label className="block text-xs text-gray-400 font-semibold uppercase tracking-wider">Malaysia Shipping Fee (RM)</label>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-500">RM</span>
            <input
              type="number"
              step="0.1"
              value={shippingFeeRm}
              onChange={e => setShippingFeeRm(e.target.value)}
              className="flex-1 bg-[#0a0a0a] border border-white/10 rounded-xl px-3 py-2 text-white font-mono font-bold focus:ring-1 focus:ring-amber-500 outline-none"
              placeholder="Shipping fee"
            />
          </div>
          <p className="text-[10px] text-gray-500">Shipping cost from China to Malaysia</p>
        </div>

        {/* Total Cost in RM Card */}
        <div className="bg-gradient-to-br from-blue-900/20 to-purple-900/20 border border-blue-500/20 rounded-2xl p-4 flex flex-col justify-between relative overflow-hidden">
          <div className="absolute -right-4 -bottom-4 opacity-5 text-white pointer-events-none">
            <DollarSign size={96} />
          </div>
          <div>
            <span className="block text-xs text-blue-400 font-bold uppercase tracking-wider">Total Cost in RM</span>
            <span className="text-xs text-gray-500">Order RM + Shipping Fee</span>
          </div>
          <div className="mt-2 flex items-baseline space-x-1">
            <span className="text-2xl font-black text-white font-mono">RM {calculations.totalCostRm.toFixed(2)}</span>
            <span className="text-xs text-gray-400">Total</span>
          </div>
        </div>

      </div>

      {/* Input Validation Alert */}
      {totalPriceRmb && items.length > 0 && Math.abs(totalsDifference) > 0.05 && (
        <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="text-amber-400 shrink-0 mt-0.5" size={16} />
          <div className="text-xs text-gray-400">
            <span className="font-semibold text-amber-400">Total Price Discrepancy: </span>
            The inputted total order price (¥{parseFloat(totalPriceRmb).toFixed(2)}) differs from the sum of the items in the table (¥{calculations.sumSubtotalRmb.toFixed(2)}) by <span className="font-bold text-white font-mono">¥{totalsDifference.toFixed(2)}</span>. This is typical if the order has Chinese domestic shipping costs or discounts. The shipping allocation will distribute the cost based on the total order price (¥{parseFloat(totalPriceRmb).toFixed(2)}).
          </div>
        </div>
      )}

      {/* Copy/Parse Notification Banner */}
      {importStatus && (
        <div className={`p-4 rounded-xl text-xs flex items-center justify-between border ${
          importStatus.type === 'error' 
            ? 'bg-red-500/5 border-red-500/20 text-red-400' 
            : 'bg-emerald-500/5 border-emerald-500/20 text-emerald-400'
        }`}>
          <div className="flex items-center gap-2">
            <Info size={14} className="shrink-0" />
            <span>{importStatus.message}</span>
          </div>
          <button onClick={() => setImportStatus(null)} className="p-1 hover:bg-white/5 rounded">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Paste Items Section (Direct on Page) */}
      <div className="bg-[#141414] border border-white/5 rounded-2xl p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-white text-sm flex items-center gap-2">
              <Clipboard size={16} className="text-blue-400" />
              Quick Import / Paste Items List
            </h3>
            <p className="text-xs text-gray-500 mt-1">
              Supports lists separated by tabs or spaces, or direct copies from Taobao/1688 orders.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-3">
            <textarea
              value={pasteText}
              onChange={e => setPasteText(e.target.value)}
              placeholder="Paste your items here...&#10;&#10;Example 1 (Space/Tab separated):&#10;BluePen 100 0.30&#10;Eraser 100 0.60&#10;&#10;Example 2 (Taobao/1688 copy):&#10;超锋利便携式美工刀 [快照]&#10;颜色: 长款（颜色随机）&#10;¥ 0.17&#10;5"
              rows={5}
              className="w-full bg-[#0a0a0a] border border-white/10 rounded-xl p-3 text-white font-mono text-xs outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div className="flex flex-col justify-end space-y-2">
            <div className="text-[10px] text-gray-500 space-y-1 bg-[#0a0a0a]/50 p-2.5 rounded-xl border border-white/5">
              <span className="font-semibold text-gray-400 block">How to paste:</span>
              <span>• Paste rows from Excel</span>
              <br />
              <span>• Paste text with space/tab spacing</span>
              <br />
              <span>• Copy entire order details screen</span>
            </div>
            <button
              onClick={handleParsePaste}
              disabled={!pasteText.trim()}
              className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:pointer-events-none"
            >
              <Clipboard size={14} />
              Parse & Add Items
            </button>
          </div>
        </div>
      </div>

      {/* Main Items Table Section */}
      <div className="bg-[#141414] border border-white/5 rounded-2xl overflow-hidden flex flex-col">
        
        {/* Table Controls Header */}
        <div className="p-4 border-b border-white/5 bg-white/5 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center space-x-2">
            <h3 className="font-bold text-white text-sm md:text-base">Product Purchase List</h3>
            <span className="px-2 py-0.5 bg-blue-600/20 text-blue-400 text-[10px] font-bold rounded font-mono">
              {items.length} {items.length === 1 ? 'item' : 'items'}
            </span>
          </div>

          <button
            onClick={handleAddItem}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold transition-all shadow-md"
          >
            <Plus size={12} />
            Add Row
          </button>
        </div>

        {/* Table container */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs min-w-[800px]">
            <thead className="bg-[#0a0a0a] text-[10px] text-gray-500 uppercase tracking-wider border-b border-white/5">
              <tr>
                <th className="px-4 py-3 w-10 text-center">#</th>
                <th className="px-4 py-3">Product Name</th>
                <th className="px-4 py-3 w-24 text-center">Quantity</th>
                <th className="px-4 py-3 w-28 text-center">Price RMB</th>
                <th className="px-4 py-3 w-28 text-right">Subtotal RMB</th>
                <th className="px-4 py-3 w-32 text-right">Allocated Cost (RM)</th>
                <th className="px-4 py-3 w-32 text-right">Price per Unit (RM)</th>
                <th className="px-4 py-3 w-40 text-center">Copy Output</th>
                <th className="px-4 py-3 w-12 text-center"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {calculations.finalItemsList.map((item, idx) => (
                <tr key={item.id} className="hover:bg-white/[0.01] transition-colors group">
                  <td className="px-4 py-2 text-gray-600 font-mono text-center">{idx + 1}</td>
                  <td className="px-4 py-2">
                    <input
                      type="text"
                      value={item.name}
                      onChange={e => handleUpdateItem(item.id, 'name', e.target.value)}
                      placeholder="e.g. Blue Pen"
                      className="w-full bg-transparent border-b border-transparent hover:border-white/15 focus:border-blue-500 py-1 text-gray-200 outline-none transition-colors"
                    />
                  </td>
                  <td className="px-4 py-2">
                    <input
                      type="number"
                      value={item.qty}
                      onChange={e => handleUpdateItem(item.id, 'qty', e.target.value)}
                      placeholder="0"
                      className="w-full bg-[#0a0a0a] border border-white/10 rounded-lg px-2 py-1 text-white font-mono text-center focus:ring-1 focus:ring-blue-500 outline-none"
                    />
                  </td>
                  <td className="px-4 py-2">
                    <input
                      type="number"
                      step="0.01"
                      value={item.priceRmb}
                      onChange={e => handleUpdateItem(item.id, 'priceRmb', e.target.value)}
                      placeholder="¥0.00"
                      className="w-full bg-[#0a0a0a] border border-white/10 rounded-lg px-2 py-1 text-white font-mono text-center focus:ring-1 focus:ring-blue-500 outline-none"
                    />
                  </td>
                  <td className="px-4 py-2 text-right font-mono text-gray-400">
                    ¥{item.subtotalRmb.toFixed(2)}
                  </td>
                  <td className="px-4 py-2 text-right font-mono text-gray-300">
                    RM {item.allocatedCostRm.toFixed(2)}
                  </td>
                  <td className="px-4 py-2 text-right font-mono text-emerald-400 font-bold">
                    RM {item.unitCostRm.toFixed(2)}
                  </td>
                  <td className="px-4 py-2 text-center">
                    <button
                      onClick={() => handleCopySingle(item.copyText, item.id)}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-bold border transition-all ${
                        copiedId === item.id 
                          ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                          : 'bg-white/5 border-white/10 text-gray-400 hover:text-white hover:bg-white/10'
                      }`}
                      title="Copy item pricing record string"
                    >
                      {copiedId === item.id ? <Check size={10} /> : <Copy size={10} />}
                      {copiedId === item.id ? 'Copied' : 'Copy'}
                    </button>
                  </td>
                  <td className="px-4 py-2 text-center">
                    <button
                      onClick={() => handleRemoveItem(item.id)}
                      className="p-1 text-gray-600 hover:text-red-400 rounded transition-colors"
                      title="Remove Row"
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
              
              {items.length === 0 && (
                <tr>
                  <td colSpan="9" className="py-12 text-center text-gray-500 italic">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <Clipboard size={36} className="text-gray-700" />
                      <p className="text-xs">No items in the list. Use the import area above or click "Add Row".</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>

            {items.length > 0 && (
              <tfoot className="bg-[#0a0a0a]/50 font-semibold border-t border-white/5 text-gray-300">
                <tr>
                  <td colSpan="2" className="px-4 py-3 text-right">Sum / Total:</td>
                  <td className="px-4 py-3 text-center font-mono text-gray-400">
                    {items.reduce((sum, item) => sum + (parseInt(item.qty) || 0), 0)}
                  </td>
                  <td className="px-4 py-3"></td>
                  <td className="px-4 py-3 text-right font-mono text-gray-400">
                    ¥{calculations.sumSubtotalRmb.toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-gray-300">
                    RM {calculations.finalItemsList.reduce((sum, item) => sum + item.allocatedCostRm, 0).toFixed(2)}
                  </td>
                  <td colSpan="3" className="px-4 py-3"></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* Copy All Outputs Panel */}
      {items.length > 0 && (
        <div className="bg-[#141414] border border-white/5 rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-white text-sm flex items-center gap-1.5">
                <Clipboard size={16} className="text-blue-400" />
                Formatted Copy-Paste Output
              </h3>
              <p className="text-xs text-gray-500">Preview of the values that will be copied to your records.</p>
            </div>
            <button
              onClick={handleCopyAll}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-md ${
                copiedAll 
                  ? 'bg-emerald-600 text-white' 
                  : 'bg-blue-600 hover:bg-blue-500 text-white'
              }`}
            >
              {copiedAll ? <Check size={14} /> : <Copy size={14} />}
              {copiedAll ? 'All Copied!' : 'Copy All Results'}
            </button>
          </div>

          <div className="bg-[#0a0a0a] border border-white/5 rounded-xl p-4 font-mono text-xs text-gray-400 max-h-52 overflow-y-auto space-y-1 divide-y divide-white/5">
            {calculations.finalItemsList.map((item, idx) => (
              <div key={item.id} className="py-2 flex items-center justify-between group">
                <span className="text-gray-300 select-all">{item.copyText}</span>
                <button 
                  onClick={() => handleCopySingle(item.copyText, item.id)} 
                  className="opacity-0 group-hover:opacity-100 p-1 hover:bg-white/5 rounded text-gray-500 hover:text-white transition-all"
                  title="Copy this row"
                >
                  <Copy size={12} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
