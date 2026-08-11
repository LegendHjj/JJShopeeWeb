import React, { useState, useEffect } from 'react';
import { Outlet, Navigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { incrementalSync, forceFullSync } from '../lib/firestoreApi';
import { Calculator, BarChart3, LogOut, Package, RefreshCcw, MessageSquare, FileSpreadsheet, Menu, X, Wrench, Globe, Boxes, ArrowRightLeft } from 'lucide-react';

const Layout = () => {
  const { isAuthenticated, logout } = useAuth();
  const location = useLocation();
  const [syncing, setSyncing] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [syncStatus, setSyncStatus] = useState(null); // { msg, type }
  const [lastSync, setLastSync] = useState(
    localStorage.getItem('shopee_last_global_sync') || 'Never'
  );

  // Close sidebar when route changes (mobile)
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  // Prevent body scroll when sidebar is open on mobile
  useEffect(() => {
    if (sidebarOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [sidebarOpen]);

  // Auto-hide sync status after 4 seconds
  useEffect(() => {
    if (syncStatus) {
      const timer = setTimeout(() => setSyncStatus(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [syncStatus]);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const handleSync = async (e) => {
    setSyncing(true);
    setSyncStatus(null);

    try {
      let result;
      // Shift+Click = Force Full Sync (fallback for troubleshooting)
      if (e && e.shiftKey) {
        result = await forceFullSync();
      } else {
        result = await incrementalSync();
      }

      // Update last sync display
      const now = new Date().toLocaleString();
      localStorage.setItem('shopee_last_global_sync', now);
      setLastSync(now);

      // Build status message
      if (result.fullSync) {
        setSyncStatus({ msg: `Full sync complete ✓ (${result.totalChanges} docs loaded)`, type: 'success' });
      } else if (result.totalChanges === 0 && result.totalDeletions === 0) {
        setSyncStatus({ msg: 'Already up to date ✓', type: 'success' });
      } else {
        const parts = [];
        if (result.totalChanges > 0) parts.push(`${result.totalChanges} change(s)`);
        if (result.totalDeletions > 0) parts.push(`${result.totalDeletions} deletion(s)`);
        setSyncStatus({ msg: `Synced: ${parts.join(', ')} ✓`, type: 'success' });
      }

      // Reload page to reflect synced data in all components
      // Small delay so user can see the status message
      setTimeout(() => window.location.reload(), 1200);
    } catch (error) {
      console.error('[Sync] Failed:', error);
      setSyncStatus({ msg: 'Sync failed — check network', type: 'error' });
    } finally {
      setSyncing(false);
    }
  };

  const navItems = [
    { path: '/dashboard', icon: BarChart3, label: 'Dashboard' },
    { path: '/calculator', icon: Calculator, label: 'Income Calculator' },
    { path: '/profit-manager', icon: Package, label: 'Profit Manager' },
    { path: '/shopee-stock', icon: Package, label: 'Shopee Stock' },
    { path: '/bigseller-stock-sync', icon: ArrowRightLeft, label: 'BigSeller Stock Sync' },
    { path: '/china-costing', icon: Globe, label: 'China Costing' },
    { path: '/support-faq', icon: MessageSquare, label: 'Quick Reply' },
    { path: '/variant-checker', icon: FileSpreadsheet, label: 'Variant Checker' },
    { path: '/troubleshooting', icon: Wrench, label: 'Troubleshooting' },
  ];

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex print:bg-white print:text-black">
      {/* Mobile Top Bar */}
      <div className="fixed top-0 left-0 right-0 z-40 bg-[#141414]/95 backdrop-blur-md border-b border-white/5 flex items-center justify-between px-4 py-3 md:hidden print:hidden">
        <button
          onClick={() => setSidebarOpen(true)}
          className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
          aria-label="Open menu"
        >
          <Menu size={22} />
        </button>
        <div className="flex items-center gap-2">
          <span className="grid h-7 w-7 place-items-center rounded-lg bg-orange-600 text-white">
            <Boxes size={16} />
          </span>
          <h1 className="text-sm font-bold tracking-tight text-white">ShopeeWeb</h1>
        </div>
        <div className="w-10" /> {/* Spacer to center title */}
      </div>

      {/* Mobile Backdrop Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar Navigation */}
      <nav className={`
        w-64 bg-[#141414] border-r border-white/5 flex flex-col fixed h-full z-50 print:hidden
        transition-transform duration-300 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        md:translate-x-0
      `}>
        <div className="p-5 flex items-center justify-between border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-orange-600 text-white shadow-lg shadow-blue-900/10">
              <Boxes size={20} />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-white">
                ShopeeWeb
              </h1>
              <p className="text-[11px] font-medium uppercase tracking-wider text-gray-500">Ops Console</p>
            </div>
          </div>
          {/* Close button - mobile only */}
          <button
            onClick={() => setSidebarOpen(false)}
            className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-xl transition-colors md:hidden"
            aria-label="Close menu"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 px-3 space-y-1.5 mt-4 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;
            
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center space-x-3 px-3 py-2.5 rounded-xl transition-all duration-200 border ${
                  isActive 
                    ? 'bg-blue-600/20 text-blue-400 border-blue-500/30 shadow-lg shadow-blue-900/10' 
                    : 'text-gray-400 border-transparent hover:text-white hover:bg-white/5 hover:border-white/10'
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'text-blue-400' : ''}`} />
                <span className="text-sm font-semibold">{item.label}</span>
              </Link>
            );
          })}
        </div>

        <div className="p-4 border-t border-white/5 space-y-2 bg-[#0a0a0a]/35">
          <div className="flex flex-col mb-2 rounded-xl border border-white/5 bg-white/5 px-3 py-2">
            <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Cloud Sync</span>
            <span className="text-[10px] text-gray-400 truncate">Last: {lastSync}</span>
          </div>
          <button
            onClick={handleSync}
            disabled={syncing}
            className="w-full flex items-center justify-center space-x-2 px-4 py-3 rounded-xl bg-blue-600/10 text-blue-400 border border-blue-500/20 hover:bg-blue-600/20 transition-all duration-200 disabled:opacity-50"
            title="Sync changes from cloud (Shift+Click for full sync)"
          >
            <RefreshCcw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
            <span className="font-medium text-sm">{syncing ? 'Syncing...' : 'Sync with Cloud'}</span>
          </button>
          {syncStatus && (
            <div className={`text-[11px] font-medium px-3 py-2 rounded-lg text-center transition-all ${
              syncStatus.type === 'error' 
                ? 'bg-red-500/10 text-red-400 border border-red-500/20' 
                : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
            }`}>
              {syncStatus.msg}
            </div>
          )}
          <button
            onClick={logout}
            className="w-full flex items-center justify-center space-x-2 px-4 py-3 rounded-xl text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-all duration-200"
          >
            <LogOut className="w-5 h-5" />
            <span className="font-medium">Sign Out</span>
          </button>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="min-w-0 flex-1 ml-0 md:ml-64 pt-16 md:pt-0 p-4 md:p-7 bg-[#0a0a0a] relative min-h-screen print:ml-0 print:p-0 print:bg-white">
         <div className="absolute inset-x-0 top-0 h-24 border-b border-white/5 bg-[#141414]/35 pointer-events-none print:hidden" />
         
         <div className="relative z-10 max-w-7xl mx-auto">
           <Outlet />
         </div>
      </main>
    </div>
  );
};

export default Layout;
