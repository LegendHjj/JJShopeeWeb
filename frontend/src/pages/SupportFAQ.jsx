import React, { useState, useEffect, useCallback } from 'react';
import { fetchCollection, saveCollection, deleteDocument, COLLECTIONS } from '../lib/firestoreApi';
import { Copy, Check, Plus, X, Edit2, Trash2, Search, RefreshCw, MessageSquare, Save, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// ─── Categories ──────────────────────────────────────────────────────────────
const CATEGORIES = [
  { id: 'all',      label: '📋 All',       color: 'from-gray-600 to-gray-500' },
  { id: 'general',  label: '💬 General',    color: 'from-blue-600 to-blue-500' },
  { id: 'shipping', label: '🚚 Shipping',   color: 'from-amber-600 to-amber-500' },
  { id: 'product',  label: '🧵 Product',    color: 'from-purple-600 to-purple-500' },
  { id: 'stock',    label: '📦 Stock',      color: 'from-emerald-600 to-emerald-500' },
  { id: 'pricing',  label: '💰 Pricing',    color: 'from-rose-600 to-rose-500' },
  { id: 'custom',   label: '⚙️ Custom',     color: 'from-cyan-600 to-cyan-500' },
];

// ─── Pre-seeded Default Responses ────────────────────────────────────────────
const DEFAULT_FAQS = [
  // General
  { seqNr: 1, category: 'general', title: 'Thank You for Purchase', response: 'Hi! Thank you so much for your purchase! 😊 If you have any questions about the product, feel free to message us anytime. We hope you enjoy it! 🙏' },
  { seqNr: 2, category: 'general', title: 'Welcome / Greeting', response: 'Hi there! 👋 Welcome to our shop! How can I help you today? Feel free to ask any questions about our products.' },
  { seqNr: 3, category: 'general', title: 'Follow Up After Delivery', response: 'Hi! We hope you received your order in good condition! 📦 If everything is okay, we would really appreciate it if you could leave us a 5-star review ⭐⭐⭐⭐⭐. Thank you for your support! 🙏' },

  // Shipping
  { seqNr: 4, category: 'shipping', title: 'When Will You Ship?', response: 'Hi! We usually ship within 1-2 working days after payment is confirmed. You will receive a tracking number once the parcel is shipped. Thank you for your patience! 🚚' },
  { seqNr: 5, category: 'shipping', title: 'Shipping Delay', response: 'Hi! Sorry for the delay. Due to high order volume, shipping may take slightly longer than usual. Rest assured your order is being prepared and will be shipped as soon as possible. Thank you for understanding! 🙏' },
  { seqNr: 6, category: 'shipping', title: 'Tracking Number', response: 'Hi! Your tracking number will be updated in the Shopee app once the parcel has been picked up by the courier. You can check the delivery status under "My Purchases" → "To Receive". 📱' },

  // Product (Hook & Loop)
  { seqNr: 7, category: 'product', title: 'Is Hook Loop Stick Enough?', response: 'Hi! Yes, our hook and loop tape has strong adhesive backing that sticks very well on clean, smooth surfaces like glass, plastic, metal, and wood. For best results, please clean the surface with alcohol before applying and press firmly for 10 seconds. Allow 24 hours for the adhesive to fully bond. 💪' },
  { seqNr: 8, category: 'product', title: 'Hook Loop Meter Count (5 Units)', response: 'Hi! If you order 5 units of our 1M hook & loop, you will receive 5 meters in total (5 x 1M = 5M). Each unit is 1 meter long. The hook and loop come as a pair (hook side + loop side). 📏' },
  { seqNr: 9, category: 'product', title: 'Hook vs Loop Difference', response: 'Hi! Hook side is the rough/scratchy side (looks like tiny hooks). Loop side is the soft/fuzzy side. They stick together when pressed. Both sides come included in our hook & loop tape product. 🔗' },
  { seqNr: 10, category: 'product', title: 'Hook Loop Width Options', response: 'Hi! We have hook & loop tape in multiple widths: 16mm, 20mm, 25mm, 38mm, and 50mm. Please check the product variation to select your preferred width. All come with strong self-adhesive backing. 📐' },
  { seqNr: 11, category: 'product', title: 'Non-Cut Stick Product Info', response: 'Hi! Our non-cut stick (velcro dots/squares) are pre-cut and ready to use. Just peel and stick! They are perfect for lightweight items, curtains, photo frames, and organizing. Available in multiple colors: white, black, grey, blue, and beige. 🎨' },

  // Stock
  { seqNr: 12, category: 'stock', title: 'Is This Ready Stock?', response: 'Hi! Yes, this item is ready stock and available for immediate shipping. We ship within 1-2 working days! ✅' },
  { seqNr: 13, category: 'stock', title: 'Out of Stock', response: 'Hi! Sorry, this particular variant is currently out of stock. We are restocking soon. You can follow our shop to get notified when it\'s back. Alternatively, would you like to check other available options? 🔔' },

  // Pricing
  { seqNr: 14, category: 'pricing', title: 'Bulk/Wholesale Price', response: 'Hi! Yes, we offer better pricing for bulk orders. Please let us know the quantity you need and we can provide a special quotation. Feel free to chat with us! 📊' },
  { seqNr: 15, category: 'pricing', title: 'Voucher / Discount', response: 'Hi! Please check our shop page for the latest vouchers and promotions. You can also follow our shop to receive exclusive discount notifications. Don\'t forget to collect the shop voucher before checkout! 🎫' },
];

// ─── FAQ Detail Modal ────────────────────────────────────────────────────────
const FAQModal = ({ item, onSave, onClose, isNew }) => {
  const [form, setForm] = useState({ ...item });
  const [saving, setSaving] = useState(false);

  useEffect(() => { setForm({ ...item }); }, [item]);

  const set = (field, val) => setForm(f => ({ ...f, [field]: val }));

  const handleSave = async () => {
    if (!form.title || !form.response) return alert('Title and Response are required.');
    setSaving(true);
    await onSave(form);
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
        transition={{ duration: 0.2 }}
        className="relative bg-[#141414] border border-white/10 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
        onDoubleClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-5 border-b border-white/5 sticky top-0 bg-[#141414] z-10">
          <h2 className="text-lg font-bold text-white">{isNew ? '➕ Add New Reply' : '✏️ Edit Reply'}</h2>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="grid grid-cols-4 gap-3">
            <div className="col-span-1">
              <label className={labelCls}>Seq No</label>
              <input className={inputCls} type="number" value={form.seqNr || 0} onChange={e => set('seqNr', parseInt(e.target.value) || 0)} />
            </div>
            <div className="col-span-3">
              <label className={labelCls}>Category</label>
              <select
                className={`${inputCls} cursor-pointer`}
                value={form.category || 'general'}
                onChange={e => set('category', e.target.value)}
              >
                {CATEGORIES.filter(c => c.id !== 'all').map(c => (
                  <option key={c.id} value={c.id}>{c.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className={labelCls}>Title (Short description for the button)</label>
            <input className={inputCls} type="text" value={form.title || ''} onChange={e => set('title', e.target.value)} placeholder="e.g. When Will You Ship?" />
          </div>

          <div>
            <label className={labelCls}>Response (Full text that gets copied to clipboard)</label>
            <textarea
              className={`${inputCls} resize-none font-mono text-xs leading-relaxed`}
              rows={8}
              value={form.response || ''}
              onChange={e => set('response', e.target.value)}
              placeholder="Type your full customer support response here..."
            />
            <p className="text-[10px] text-gray-600 mt-1">{(form.response || '').length} characters</p>
          </div>
        </div>

        <div className="p-5 border-t border-white/5 flex gap-3 justify-end bg-[#0f0f0f]">
          <button onClick={onClose} className="px-5 py-2 text-gray-400 hover:text-white transition-colors text-sm font-medium">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="px-8 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold text-sm flex items-center gap-2 transition-all">
            {saving ? <RefreshCw className="animate-spin" size={16} /> : <Save size={16} />}
            {isNew ? 'Add Reply' : 'Save Changes'}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

// ─── Main Component ──────────────────────────────────────────────────────────
export default function SupportFAQ() {
  const [faqs, setFaqs] = useState([]);
  const [originalFaqs, setOriginalFaqs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [copiedId, setCopiedId] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const [isNewItem, setIsNewItem] = useState(false);
  const [notification, setNotification] = useState(null);

  // ── Load data (localStorage cache first, then Firebase) ──
  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const data = await fetchCollection(COLLECTIONS.supportFAQ);

      if (!data || data.length === 0) {
        // First time: seed with defaults
        const seeded = DEFAULT_FAQS.map(item => ({
          ...item,
          _localId: Math.random().toString(36).substr(2, 9),
        }));
        setFaqs(seeded);
        setOriginalFaqs([]);
        // Save defaults to cloud
        await saveCollection(COLLECTIONS.supportFAQ, seeded);
        showNotification('Default FAQ responses loaded! ✨');
      } else {
        setFaqs(data.map(item => ({
          ...item,
          _localId: item._docId || Math.random().toString(36).substr(2, 9),
        })));
        setOriginalFaqs(JSON.parse(JSON.stringify(data)));
      }
    } catch (err) {
      console.error('Failed to load FAQ data:', err);
      // Fallback to defaults if Firebase fails
      const seeded = DEFAULT_FAQS.map(item => ({
        ...item,
        _localId: Math.random().toString(36).substr(2, 9),
      }));
      setFaqs(seeded);
      setOriginalFaqs([]);
      showNotification('Loaded default responses (offline mode).', 'error');
    } finally {
      setLoading(false);
    }
  };

  const showNotification = (msg, type = 'success') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 3000);
  };

  // ── Copy to Clipboard ──
  const handleCopy = async (item) => {
    try {
      await navigator.clipboard.writeText(item.response);
      setCopiedId(item._localId || item._docId);
      setTimeout(() => setCopiedId(null), 1500);
    } catch (err) {
      // Fallback for older browsers
      const ta = document.createElement('textarea');
      ta.value = item.response;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopiedId(item._localId || item._docId);
      setTimeout(() => setCopiedId(null), 1500);
    }
  };

  // ── Save to Cloud ──
  const handleSaveAll = async () => {
    try {
      setSaving(true);
      const modifiedItems = faqs.filter(item => {
        if (!item._docId) return true;
        const original = originalFaqs.find(o => o._docId === item._docId);
        return !original || JSON.stringify(item) !== JSON.stringify(original);
      });

      if (modifiedItems.length === 0) {
        showNotification('No changes to save.');
        return;
      }

      const savedItems = await saveCollection(COLLECTIONS.supportFAQ, modifiedItems);

      if (savedItems && savedItems.length > 0) {
        setFaqs(prev => prev.map(item => {
          const saved = savedItems.find(s =>
            (item._docId && s._docId === item._docId) ||
            (item._localId && s._localId === item._localId)
          );
          return saved ? { ...saved, _localId: item._localId } : item;
        }));
        setOriginalFaqs(prev => {
          const next = [...prev];
          savedItems.forEach(s => {
            const i = next.findIndex(n => n._docId === s._docId);
            if (i >= 0) next[i] = JSON.parse(JSON.stringify(s));
            else next.push(JSON.parse(JSON.stringify(s)));
          });
          return next;
        });
      }

      showNotification(`Saved ${modifiedItems.length} item(s) to cloud! ✅`);
    } catch (err) {
      console.error(err);
      showNotification('Save failed. Check console.', 'error');
    } finally {
      setSaving(false);
    }
  };

  // ── Modal Save ──
  const handleModalSave = async (updatedItem) => {
    if (isNewItem) {
      setFaqs(prev => [...prev, updatedItem]);
    } else {
      setFaqs(prev => prev.map(r =>
        (r._localId === updatedItem._localId) ? updatedItem : r
      ));
    }
    setSelectedItem(null);
    setIsNewItem(false);
    showNotification(isNewItem ? 'New reply added! Save to cloud to persist.' : 'Reply updated! Save to cloud to persist.');
  };

  // ── Add New ──
  const handleAddNew = () => {
    const maxSeq = faqs.reduce((m, r) => Math.max(m, r.seqNr || 0), 0);
    setSelectedItem({
      _localId: Math.random().toString(36).substr(2, 9),
      seqNr: maxSeq + 1,
      category: activeCategory === 'all' ? 'general' : activeCategory,
      title: '',
      response: '',
    });
    setIsNewItem(true);
  };

  // ── Delete ──
  const handleDelete = async (item) => {
    if (!window.confirm(`Delete "${item.title}"?`)) return;
    try {
      if (item._docId) await deleteDocument(COLLECTIONS.supportFAQ, item._docId);
      setFaqs(prev => prev.filter(f =>
        !(item._docId && f._docId === item._docId) &&
        !(item._localId && f._localId === item._localId) ||
        (item._docId && f._docId !== item._docId) ||
        (item._localId && f._localId !== item._localId)
      ));
      // Simpler filter:
      setFaqs(prev => prev.filter(f => {
        if (item._docId && f._docId === item._docId) return false;
        if (item._localId && f._localId === item._localId) return false;
        return true;
      }));
      setOriginalFaqs(prev => prev.filter(f => f._docId !== item._docId));
      showNotification('Reply deleted.');
    } catch (err) {
      showNotification('Delete failed.', 'error');
    }
  };

  // ── Filtering ──
  const filteredFaqs = faqs
    .filter(item => activeCategory === 'all' || item.category === activeCategory)
    .filter(item =>
      (item.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.response || '').toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => (a.seqNr || 0) - (b.seqNr || 0));

  const getCategoryColor = (catId) => {
    const cat = CATEGORIES.find(c => c.id === catId);
    return cat ? cat.color : 'from-gray-600 to-gray-500';
  };

  const getCategoryLabel = (catId) => {
    const cat = CATEGORIES.find(c => c.id === catId);
    return cat ? cat.label : catId;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight flex items-center gap-3">
            <MessageSquare className="text-blue-400" size={24} />
            Quick Reply
          </h1>
          <p className="text-gray-400 mt-1 text-xs md:text-sm">Click any card to copy the response to clipboard instantly 📋</p>
        </div>
        <div className="flex items-center gap-2 md:gap-3">
          <button
            onClick={handleAddNew}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 border border-blue-500/30 rounded-xl transition-all text-sm font-semibold flex-1 md:flex-none justify-center"
          >
            <Plus size={16} /> Add Reply
          </button>
          <button
            onClick={handleSaveAll}
            disabled={saving}
            className="flex items-center gap-2 px-4 md:px-5 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white rounded-xl shadow-lg transition-all font-semibold text-sm flex-1 md:flex-none justify-center"
          >
            {saving ? <RefreshCw className="animate-spin" size={16} /> : <Save size={16} />}
            {saving ? 'Saving...' : 'Save to Cloud'}
          </button>
        </div>
      </div>

      {/* Notification */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className={`p-3 rounded-xl border flex items-center gap-2 text-sm ${
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

      {/* Category Tabs + Search */}
      <div className="bg-[#141414] border border-white/5 rounded-2xl p-3 md:p-4 space-y-3">
        <div className="flex flex-nowrap gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {CATEGORIES.map(cat => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`px-3 md:px-4 py-2 rounded-xl text-xs md:text-sm font-medium transition-all duration-200 whitespace-nowrap shrink-0 ${
                activeCategory === cat.id
                  ? `bg-gradient-to-r ${cat.color} text-white shadow-lg`
                  : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 border border-white/5'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            placeholder="Search replies by title or content..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full bg-[#0a0a0a] border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-white outline-none focus:border-blue-500 text-sm transition-all"
          />
        </div>

        <p className="text-xs text-gray-500">{filteredFaqs.length} replies available</p>
      </div>

      {/* FAQ Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <AnimatePresence>
          {filteredFaqs.map((item) => {
            const isCopied = copiedId === (item._localId || item._docId);
            const itemId = item._localId || item._docId;

            return (
              <motion.div
                key={itemId}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.2 }}
                onClick={() => handleCopy(item)}
                className={`group relative bg-[#141414] border rounded-2xl p-5 cursor-pointer transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5 ${
                  isCopied
                    ? 'border-emerald-500/50 bg-emerald-500/5 shadow-emerald-900/20'
                    : 'border-white/5 hover:border-white/15'
                }`}
              >
                {/* Category badge */}
                <div className="flex items-center justify-between mb-3">
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-gradient-to-r ${getCategoryColor(item.category)} text-white`}>
                    {item.category}
                  </span>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => { e.stopPropagation(); setSelectedItem(item); setIsNewItem(false); }}
                      className="p-1.5 text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors"
                      title="Edit"
                    >
                      <Edit2 size={13} />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(item); }}
                      className="p-1.5 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                      title="Delete"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

                {/* Title */}
                <h3 className="text-white font-semibold text-sm mb-2 line-clamp-1">{item.title}</h3>

                {/* Response preview */}
                <p className="text-gray-400 text-xs leading-relaxed line-clamp-3 mb-4">
                  {item.response}
                </p>

                {/* Copy indicator */}
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-gray-600 font-mono">#{item.seqNr}</span>
                  <div className={`flex items-center gap-1.5 text-xs font-medium transition-all duration-300 ${
                    isCopied ? 'text-emerald-400' : 'text-gray-500 group-hover:text-blue-400'
                  }`}>
                    {isCopied ? (
                      <>
                        <Check size={14} className="text-emerald-400" />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy size={14} />
                        <span>Click to copy</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Copied flash overlay */}
                <AnimatePresence>
                  {isCopied && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="absolute inset-0 rounded-2xl bg-emerald-500/5 pointer-events-none"
                    />
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {filteredFaqs.length === 0 && (
        <div className="text-center py-16">
          <MessageSquare size={48} className="mx-auto mb-3 text-gray-700" />
          <p className="text-gray-500">No replies found.</p>
          <p className="text-gray-600 text-xs mt-1">Try a different category or search term.</p>
        </div>
      )}

      {/* Footer tip */}
      <div className="text-center text-xs text-gray-600 pb-4">
        💡 Click any card to copy → Paste in Shopee Chat → Keep your response rate high! 🚀
      </div>

      {/* Edit Modal */}
      <AnimatePresence>
        {selectedItem && (
          <FAQModal
            item={selectedItem}
            onSave={handleModalSave}
            onClose={() => { setSelectedItem(null); setIsNewItem(false); }}
            isNew={isNewItem}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
