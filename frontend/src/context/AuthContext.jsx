import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(
    () => sessionStorage.getItem('shopee_auth') === 'true'
  );

  const login = async (password) => {
    const correctPassword = import.meta.env.VITE_APP_PASSWORD;
    if (password === correctPassword) {
      sessionStorage.setItem('shopee_auth', 'true');
      setIsAuthenticated(true);
      return { success: true };
    }
    return { success: false, error: 'invalid_password' };
  };

  const logout = () => {
    sessionStorage.removeItem('shopee_auth');
    setIsAuthenticated(false);
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
