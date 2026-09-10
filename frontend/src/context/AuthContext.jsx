import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  // Always start with user = null so the Login page renders first
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const login = async (username, password) => {
    const res = await api.post('/users/login/', { username, password });
    const { access, refresh, user: userData } = res.data;
    sessionStorage.setItem('access_token', access);
    sessionStorage.setItem('refresh_token', refresh);
    sessionStorage.setItem('user', JSON.stringify(userData));
    localStorage.setItem('access_token', access);
    localStorage.setItem('refresh_token', refresh);
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
    return userData;
  };

  useEffect(() => {
    // Require manual credential entry on app launch/start
    logout();
    setLoading(false);
  }, []);

  useEffect(() => {
    const checkShiftAutoLogout = () => {
      if (user && user.role === 'EMPLOYEE') {
        const now = new Date();
        const currentHour = now.getHours();
        if (currentHour >= 20) {
          logout();
          alert("Automatic Logout: Your shift closed at 8:00 PM. Please log in tomorrow.");
        }
      }
    };

    checkShiftAutoLogout();
    const interval = setInterval(checkShiftAutoLogout, 30000);
    return () => clearInterval(interval);
  }, [user]);

  const logout = () => {
    sessionStorage.clear();
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
    setUser(null);
  };

  const updateProfile = async (data) => {
    const res = await api.patch('/users/profile/', data);
    setUser(res.data);
    sessionStorage.setItem('user', JSON.stringify(res.data));
    localStorage.setItem('user', JSON.stringify(res.data));
    return res.data;
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, updateProfile, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
