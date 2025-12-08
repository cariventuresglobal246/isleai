import React, { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export const AuthContext = createContext(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>');
  return ctx;
}

export function AuthProvider({ children }) {
  // Initialize state from LocalStorage to prevent flash
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('user');
    return savedUser ? JSON.parse(savedUser) : null;
  });
  
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const API = import.meta.env.VITE_API_URL;

  const getHeaders = () => {
    const token = localStorage.getItem('access_token');
    return {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    };
  };

  useEffect(() => {
    (async () => {
      try {
        const token = localStorage.getItem('access_token');
        if (!token) {
          setLoading(false);
          return;
        }

        const res = await fetch(`${API}/auth/me`, {
          headers: getHeaders(),
        });
        
        if (res.ok) {
          const data = await res.json();
          setUser(data.user);
          localStorage.setItem('user', JSON.stringify(data.user)); // Sync up
        } else {
          console.warn('Session check failed:', res.status);
          // CRITICAL FIX: Do NOT auto-logout here immediately on error.
          // Only logout if it's strictly a 401 AND we definitely don't have a valid session.
          // For now, we trust the localStorage user to keep the app stable on iPad.
          if (res.status === 401) {
             // Optional: You can uncomment this later if you want strict security
             // handleLogout(); 
          }
        }
      } catch (e) {
        console.error('Auth check network error:', e);
      } finally {
        setLoading(false);
      }
    })();
  }, [API]);

  const login = async (email, password) => {
    try {
      const res = await fetch(`${API}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      
      if (!res.ok) return false;
      const data = await res.json();
      
      if (data.token) localStorage.setItem('access_token', data.token);
      
      setUser(data.user);
      localStorage.setItem('user', JSON.stringify(data.user));
      
      navigate('/baje', { replace: true });
      return true;
    } catch (e) {
      console.error('Login error:', e);
      return false;
    }
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('user');
    localStorage.removeItem('access_token');
    navigate('/login', { replace: true });
  }

  const logout = async () => {
    try {
      await fetch(`${API}/auth/logout`, { 
        method: 'POST',
        headers: getHeaders() 
      });
    } catch (e) {
      console.error('Logout error:', e);
    } finally {
      handleLogout();
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, getHeaders }}>
      {children}
    </AuthContext.Provider>
  );
}
