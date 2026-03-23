import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';

import IncomeCalculator from './pages/IncomeCalculator';
import ProfitManager from './pages/ProfitManager';
import ShopeeStock from './pages/ShopeeStock';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          
          <Route path="/" element={<Layout />}>
            <Route index element={<Navigate to="/shopee-stock" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="calculator" element={<IncomeCalculator />} />
            <Route path="profit-manager" element={<ProfitManager />} />
            <Route path="shopee-stock" element={<ShopeeStock />} />
          </Route>
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
