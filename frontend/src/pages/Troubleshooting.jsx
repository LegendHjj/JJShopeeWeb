import React, { useState } from 'react';
import { Database, RefreshCw, Trash2, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { migrateStampAllDocs, clearAllCaches, forceFullSync } from '../lib/firestoreApi';

const Troubleshooting = () => {
  const [status, setStatus] = useState(null); // { msg, type }
  const [running, setRunning] = useState(false);

  const showStatus = (msg, type = 'success') => {
    setStatus({ msg, type });
    setTimeout(() => setStatus(null), 6000);
  };

  const handleStampRecords = async () => {
    if (!window.confirm(
      'This will stamp ALL existing records with a sync timestamp (one-time migration).\n\n' +
      'This uses writes but is needed so incremental sync can detect old records.\n\n' +
      'Proceed?'
    )) return;

    setRunning(true);
    try {
      const result = await migrateStampAllDocs();
      showStatus(`Migration done ✓ — ${result.totalStamped} stamped, ${result.totalSkipped} already had timestamp`);
    } catch (error) {
      console.error('[Migration] Failed:', error);
      showStatus('Migration failed — check console for details', 'error');
    } finally {
      setRunning(false);
    }
  };

  const handleForceFullSync = async () => {
    if (!window.confirm('Force full sync will clear ALL local caches and re-download everything from Firebase.\n\nThis uses more reads. Proceed?')) return;
    setRunning(true);
    try {
      const result = await forceFullSync();
      showStatus(`Full sync complete ✓ — ${result.totalChanges} docs loaded`);
      setTimeout(() => window.location.reload(), 1500);
    } catch (error) {
      console.error('[Force Sync] Failed:', error);
      showStatus('Force sync failed — check network', 'error');
    } finally {
      setRunning(false);
    }
  };

  const handleClearCache = () => {
    if (!window.confirm('This will clear ALL local caches. You will need to sync from cloud again.\n\nProceed?')) return;
    clearAllCaches();
    showStatus('All local caches cleared ✓ — click "Sync with Cloud" to reload data');
  };

  const tools = [
    {
      title: 'Stamp Records (One-Time)',
      description: 'Stamps all existing Firebase records with _updatedAt timestamp. Required once so incremental sync can detect old records created before the sync feature was added.',
      icon: Database,
      color: 'amber',
      action: handleStampRecords,
      buttonText: 'Run Stamp Migration',
    },
    {
      title: 'Force Full Sync',
      description: 'Clears all local caches and re-downloads everything from Firebase. Use this if data seems out of sync or corrupted. Uses more read quota.',
      icon: RefreshCw,
      color: 'blue',
      action: handleForceFullSync,
      buttonText: 'Force Full Sync',
    },
    {
      title: 'Clear Local Cache',
      description: 'Removes all cached data from this browser. Next page load will fetch fresh data from Firebase. Does NOT delete any cloud data.',
      icon: Trash2,
      color: 'red',
      action: handleClearCache,
      buttonText: 'Clear All Caches',
    },
  ];

  const getColorClasses = (color) => {
    const map = {
      amber: { bg: 'bg-amber-600/10', border: 'border-amber-500/20', text: 'text-amber-400', hover: 'hover:bg-amber-600/20', iconBg: 'bg-amber-500/10' },
      blue: { bg: 'bg-blue-600/10', border: 'border-blue-500/20', text: 'text-blue-400', hover: 'hover:bg-blue-600/20', iconBg: 'bg-blue-500/10' },
      red: { bg: 'bg-red-600/10', border: 'border-red-500/20', text: 'text-red-400', hover: 'hover:bg-red-600/20', iconBg: 'bg-red-500/10' },
    };
    return map[color] || map.blue;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">Troubleshooting</h1>
        <p className="text-gray-400 mt-1 text-sm">Maintenance tools and diagnostics for your ShopeeWeb data</p>
      </div>

      {/* Status Notification */}
      <AnimatePresence>
        {status && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className={`p-4 rounded-xl border flex items-center gap-3 text-sm ${
              status.type === 'error'
                ? 'bg-red-500/10 border-red-500/20 text-red-400'
                : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
            }`}
          >
            <AlertCircle size={18} />
            {status.msg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tools Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {tools.map((tool) => {
          const colors = getColorClasses(tool.color);
          const Icon = tool.icon;

          return (
            <div
              key={tool.title}
              className="bg-[#141414] border border-white/5 rounded-2xl p-6 flex flex-col gap-4 hover:border-white/10 transition-all"
            >
              <div className="flex items-start gap-3">
                <div className={`p-3 rounded-xl ${colors.iconBg}`}>
                  <Icon className={`w-5 h-5 ${colors.text}`} />
                </div>
                <div className="flex-1">
                  <h3 className="text-base font-bold text-white">{tool.title}</h3>
                  <p className="text-xs text-gray-500 mt-1 leading-relaxed">{tool.description}</p>
                </div>
              </div>

              <button
                onClick={tool.action}
                disabled={running}
                className={`mt-auto w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl ${colors.bg} ${colors.text} border ${colors.border} ${colors.hover} transition-all duration-200 font-semibold text-sm disabled:opacity-50`}
              >
                {running ? <RefreshCw className="animate-spin w-4 h-4" /> : <Icon className="w-4 h-4" />}
                {running ? 'Running...' : tool.buttonText}
              </button>
            </div>
          );
        })}
      </div>

      {/* Info Section */}
      <div className="bg-[#141414] border border-white/5 rounded-2xl p-6">
        <h3 className="text-sm font-bold text-gray-300 mb-3">ℹ️ Sync System Info</h3>
        <div className="space-y-2 text-xs text-gray-500">
          <p>• <span className="text-gray-400">Sync with Cloud</span> — Incrementally fetches only changed records (low quota usage)</p>
          <p>• <span className="text-gray-400">Shift + Click Sync</span> — Forces a full re-fetch of all data (higher quota usage)</p>
          <p>• <span className="text-gray-400">Stamp Records</span> — One-time migration to add timestamps to old records</p>
          <p>• <span className="text-gray-400">Last Sync Timestamp</span>: {localStorage.getItem('shopee_last_sync_timestamp') ? new Date(parseInt(localStorage.getItem('shopee_last_sync_timestamp'))).toLocaleString() : 'Not set'}</p>
        </div>
      </div>
    </div>
  );
};

export default Troubleshooting;
