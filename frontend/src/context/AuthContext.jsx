import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('user');
    return savedUser ? JSON.parse(savedUser) : null;
  });
  const [loading, setLoading] = useState(true);

  const login = async (username, password) => {
    const res = await api.post('/users/login/', { username, password });
    const { access, refresh, user: userData } = res.data;
    localStorage.setItem('access_token', access);
    localStorage.setItem('refresh_token', refresh);
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
    return userData;
  };

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('access_token');
      if (token) {
        try {
          const res = await api.get('/users/profile/');
          setUser(res.data);
          localStorage.setItem('user', JSON.stringify(res.data));
        } catch (err) {
          // Auto login as thahira_admin if token is invalid
          try {
            await login('thahira_admin', 'admin@123');
          } catch (loginErr) {
            console.error("Auto admin login failed:", loginErr);
          }
        }
      } else {
        // Auto login as thahira_admin so admin requires no login
        try {
          await login('thahira_admin', 'admin@123');
        } catch (adminErr) {
          console.error("Auto admin login error:", adminErr);
        }
      }
      setLoading(false);
    };
    checkAuth();
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
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
    setUser(null);
  };

  const updateProfile = async (data) => {
    const res = await api.patch('/users/profile/', data);
    setUser(res.data);
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
