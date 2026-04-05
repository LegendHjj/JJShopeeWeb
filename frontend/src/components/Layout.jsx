import React, { useState, useEffect } from 'react';
import { Outlet, Navigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { clearAllCaches } from '../lib/firestoreApi';
import { Calculator, BarChart3, LogOut, Package, RefreshCcw, MessageSquare, FileSpreadsheet, Menu, X } from 'lucide-react';

const Layout = () => {
  const { isAuthenticated, logout } = useAuth();
  const location = useLocation();
  const [syncing, setSyncing] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
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

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const handleSync = async () => {
    setSyncing(true);
    // 1. Clear all local storage caches
    clearAllCaches();
    
    // 2. Set last sync time
    const now = new Date().toLocaleString();
    localStorage.setItem('shopee_last_global_sync', now);
    setLastSync(now);

    // 3. Simple reload of the window to force all pages to re-fetch from Firebase
    window.location.reload();
  };

  const navItems = [
    { path: '/dashboard', icon: BarChart3, label: 'Dashboard' },
    { path: '/calculator', icon: Calculator, label: 'Income Calculator' },
    { path: '/profit-manager', icon: Package, label: 'Profit Manager' },
    { path: '/shopee-stock', icon: Package, label: 'Shopee Stock' },
    { path: '/support-faq', icon: MessageSquare, label: 'Quick Reply' },
    { path: '/variant-checker', icon: FileSpreadsheet, label: 'Variant Checker' },
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
        <h1 className="text-base font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
          ShopeeWeb
        </h1>
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
        <div className="p-6 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
              ShopeeWeb
            </h1>
            <p className="text-xs text-gray-500 mt-1">Management Dashboard</p>
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

        <div className="flex-1 px-4 space-y-2 mt-4 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;
            
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                  isActive 
                    ? 'bg-gradient-to-r from-blue-600/20 to-purple-600/20 text-blue-400 border border-blue-500/20 shadow-lg shadow-blue-900/10' 
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'text-blue-400' : ''}`} />
                <span className="font-medium">{item.label}</span>
              </Link>
            );
          })}
        </div>

        <div className="p-4 border-t border-white/5 space-y-2">
          <div className="flex flex-col mb-2">
            <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Cloud Sync</span>
            <span className="text-[10px] text-gray-600">Last: {lastSync}</span>
          </div>
          <button
            onClick={handleSync}
            disabled={syncing}
            className="w-full flex items-center justify-center space-x-2 px-4 py-3 rounded-xl bg-blue-600/10 text-blue-400 border border-blue-500/20 hover:bg-blue-600/20 transition-all duration-200 disabled:opacity-50"
          >
            <RefreshCcw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
            <span className="font-medium text-sm">Sync with Cloud</span>
          </button>
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
      <main className="flex-1 ml-0 md:ml-64 pt-16 md:pt-0 p-4 md:p-8 bg-[#0a0a0a] relative min-h-screen print:ml-0 print:p-0 print:bg-white">
         {/* Subtle radial gradient background */}
         <div className="absolute top-0 left-0 w-full h-[500px] bg-gradient-to-b from-[#141414] to-transparent pointer-events-none print:hidden" />
         
         <div className="relative z-10 max-w-7xl mx-auto">
           <Outlet />
         </div>
      </main>
    </div>
  );
};

export default Layout;
