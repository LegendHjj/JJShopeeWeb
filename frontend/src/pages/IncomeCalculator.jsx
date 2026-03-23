import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { fetchCollection, COLLECTIONS } from '../lib/firestoreApi';
import { Upload, Calculator, RefreshCw, AlertCircle, Trash2, ArrowUpDown, ChevronUp, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Defaults kept but not user-configurable per design spec
const PACKING_FEE = 0.40;
const CALC_EXTRA_FEE = false;
const INC_DISCOUNT = false;

const IncomeCalculator = () => {
  const [productInfo, setProductInfo] = useState([]);
  const [loading, setLoading] = useState(true);
  const [calculating, setCalculating] = useState(false);
  const [totalProfit, setTotalProfit] = useState(null);
  const [logs, setLogs] = useState([]);
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

  const sortedProducts = [...productInfo].sort((a, b) => {
    const key = sortConfig.key;
    if (!key) return 0;
    
    let aVal = a[key] ?? '';
    let bVal = b[key] ?? '';

    if (aVal === bVal) return 0;
    const modifier = sortConfig.direction === 'asc' ? 1 : -1;
    
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

  useEffect(() => {
    fetchProductInfo();
  }, []);

  const fetchProductInfo = async () => {
    try {
      setLoading(true);
      const data = await fetchCollection(COLLECTIONS.shopee.orgProductInfo);
      const dataWithQty = data.map(item => ({
        ...item,
        qty: 0,
        totalBuyerOrder: 0
      }));
      setProductInfo(dataWithQty);
    } catch (error) {
      console.error('Failed to fetch orgProductInfo from Firestore', error);
      addLog('Error: Failed to fetch product info from Firestore.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const addLog = (message, type = 'info') => {
    //setLogs(prev => [...prev, { id: Date.now() + Math.random(), message, type, time: new Date().toLocaleTimeString() }]);
    setLogs(prev => [...prev, { message, type }]);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);
        processExcelData(data);
        addLog(`Successfully loaded Excel file: ${file.name}`, 'success');
      } catch (err) {
        addLog(`Error parsing Excel: ${err.message}`, 'error');
      }
    };
    reader.readAsBinaryString(file);
    // Reset input so same file can be re-uploaded
    e.target.value = '';
  };

  const processExcelData = (data) => {
    setProductInfo(prev => {
      const updatedProducts = prev.map(p => ({ ...p }));
      data.forEach(row => {
        let strVarianceID = row['Variation ID'] || '';
        let strParentSKU = '';
        let intConfirmedUnits = parseInt(row['Units (Confirmed Order)']) || 0;
        if (strVarianceID === '-') {
          if (row['Parent SKU'] && row['Parent SKU'] !== '-') {
            strParentSKU = row['Parent SKU'];
          }
          strVarianceID = row['Item ID'] || '';
        }
        let prdInfo = updatedProducts.find(p => (p.VariantianID || '').includes(strVarianceID));
        if (!prdInfo && strParentSKU.length > 0) {
          prdInfo = updatedProducts.find(p => (p.SKUID || '').includes(strParentSKU));
        }
        if (prdInfo) {
          if (['47166294095', '66728578958', '47166294096', '66728578959'].includes(strVarianceID)) {
            if (intConfirmedUnits !== 0) intConfirmedUnits = Math.floor(intConfirmedUnits / 2);
          }
          prdInfo.qty += intConfirmedUnits;
        }
      });
      return updatedProducts;
    });
  };

  const handleCalculate = () => {
    setCalculating(true);
    setLogs([]);
    let grandTotal = 0;
    const productsToCalc = JSON.parse(JSON.stringify(productInfo));

    productsToCalc.forEach(prd => {
      const { qty, totalBuyerOrder, productName, includedPackageFee, blnCalcPer10 } = prd;
      if (qty > 0) {
        let tempProductPrice = 0;
        let tempTotalPackagePrice = 0;
        let activeProductPrice = prd.productPrice;

        if (CALC_EXTRA_FEE) {
          activeProductPrice += prd.sellingPrice * (INC_DISCOUNT ? 0.25 : 0.16);
        }

        if (includedPackageFee) {
          tempProductPrice = activeProductPrice * qty;
          grandTotal += tempProductPrice;
          addLog(`${productName} | Qty: ${qty} | Profit: RM ${tempProductPrice.toFixed(2)}`);
        } else {
          tempTotalPackagePrice = PACKING_FEE * totalBuyerOrder;
          if (!blnCalcPer10) {
            tempProductPrice = (activeProductPrice * qty) - tempTotalPackagePrice;
          } else {
            tempProductPrice = ((activeProductPrice / 10) * qty) - tempTotalPackagePrice;
          }
          grandTotal += tempProductPrice;
          addLog(`${productName} | Qty: ${qty} | Profit: RM ${tempProductPrice.toFixed(2)}`);
        }
      }
    });

    setTotalProfit(grandTotal);
    addLog(`✓ Total profit = RM ${grandTotal.toFixed(2)}`, 'success');
    setCalculating(false);
  };

  const handleResetQty = () => {
    setProductInfo(prev => prev.map(p => ({ ...p, qty: 0, totalBuyerOrder: 0 })));
    setTotalProfit(null);
    setLogs();
  };

  const updateProductQty = (seqNr, field, value) => {
    setProductInfo(prev => prev.map(p =>
      p.seqNr === seqNr ? { ...p, [field]: parseInt(value) || 0 } : p
    ));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Income Calculator</h1>
          <p className="text-gray-400 mt-1">Calculate your total net profit from Excel sales data</p>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-lg cursor-pointer transition-all">
            <Upload size={16} />
            <span className="font-semibold text-sm">Upload Excel</span>
            <input type="file" accept=".xls,.xlsx" className="hidden" onChange={handleFileUpload} />
          </label>
          <button
            onClick={handleResetQty}
            className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 rounded-xl transition-all"
          >
            <Trash2 size={16} />
            <span className="text-sm font-medium">Reset</span>
          </button>
          <button
            onClick={handleCalculate}
            disabled={calculating}
            className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white rounded-xl font-bold shadow-lg transition-all"
          >
            {calculating ? <RefreshCw className="animate-spin w-4 h-4" /> : <Calculator className="w-4 h-4" />}
            <span>{calculating ? 'Calculating...' : 'Calculate Profit'}</span>
          </button>
        </div>
      </div>

      {/* Total Result Banner */}
      <AnimatePresence>
        {totalProfit !== null && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="p-5 bg-gradient-to-r from-green-900/40 to-emerald-900/40 border border-green-500/30 rounded-2xl flex items-center justify-between"
          >
            <span className="text-green-300 font-medium">Total Calculated Profit</span>
            <span className="text-3xl font-bold text-white">RM {totalProfit.toFixed(2)}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Product Quantities Table */}
      <div className="bg-[#141414] border border-white/5 rounded-2xl overflow-hidden flex flex-col" style={{ height: '450px' }}>
        <div className="p-4 border-b border-white/5 bg-white/5 flex justify-between items-center shrink-0">
          <h3 className="font-semibold text-white">Product Quantities</h3>
          <p className="text-xs text-gray-400">{productInfo.length} items loaded</p>
        </div>
        <div className="flex-1 overflow-auto">
          <table className="w-full text-left text-sm text-gray-400">
            <thead className="text-[10px] text-gray-500 uppercase bg-[#0a0a0a] sticky top-0 z-10">
              <tr>
                <th className="px-4 py-3 w-16 cursor-pointer hover:bg-white/5 transition-colors group" onClick={() => handleSort('seqNr')}>
                  <div className="flex items-center">Seq <SortIndicator columnKey="seqNr" /></div>
                </th>
                <th className="px-4 py-3 cursor-pointer hover:bg-white/5 transition-colors group" onClick={() => handleSort('productName')}>
                  <div className="flex items-center">Product Name <SortIndicator columnKey="productName" /></div>
                </th>
                <th className="px-4 py-3 w-28 text-center cursor-pointer hover:bg-white/5 transition-colors group" onClick={() => handleSort('qty')}>
                  <div className="flex items-center justify-center">Qty Sold <SortIndicator columnKey="qty" /></div>
                </th>
                <th className="px-4 py-3 w-32 text-center cursor-pointer hover:bg-white/5 transition-colors group" onClick={() => handleSort('totalBuyerOrder')}>
                  <div className="flex items-center justify-center">Orders <SortIndicator columnKey="totalBuyerOrder" /></div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {sortedProducts.map((product) => (
                <tr key={product._docId || product.seqNr} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors group">
                  <td className="px-4 py-2 text-gray-500">{product.seqNr}</td>
                  <td className="px-4 py-2 font-medium text-gray-200">{product.productName}</td>
                  <td className="px-4 py-2">
                    <input
                      type="number"
                      value={product.qty}
                      onChange={(e) => updateProductQty(product.seqNr, 'qty', e.target.value)}
                      className="w-full bg-[#0a0a0a] border border-white/10 rounded-lg px-2 py-1.5 text-white focus:ring-1 focus:ring-blue-500 outline-none text-center"
                    />
                  </td>
                  <td className="px-4 py-2">
                    <input
                      type="number"
                      value={product.totalBuyerOrder}
                      onChange={(e) => updateProductQty(product.seqNr, 'totalBuyerOrder', e.target.value)}
                      className="w-full bg-[#0a0a0a] border border-white/10 rounded-lg px-2 py-1.5 text-white focus:ring-1 focus:ring-blue-500 outline-none text-center"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Logs Panel */}
      <div className="bg-[#141414] border border-white/5 rounded-2xl p-5">
        <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-gray-400" />
          Calculation Logs
          {logs.length > 0 && (
            <button onClick={() => setLogs([])} className="ml-auto text-xs text-gray-500 hover:text-gray-300">
              Clear
            </button>
          )}
        </h3>
        <div className="h-52 overflow-y-auto space-y-1.5 font-mono text-xs p-3 bg-[#0a0a0a] rounded-xl border border-white/5">
          <AnimatePresence>
            {logs.length === 0 ? (
              <p className="text-gray-600 text-center mt-16 italic">No logs yet. Upload an Excel or click Calculate.</p>
            ) : (
              logs.map((log) => (
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  key={log.id}
                  className={
                    log.type === 'error' ? 'text-red-400' :
                      log.type === 'success' ? 'text-green-400' : 'text-gray-400'
                  }
                >
                  <span className="text-gray-600">[{log.time}]</span> {log.message}
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default IncomeCalculator;
