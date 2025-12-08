import React, { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export const AuthContext = createContext(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>');
  return ctx;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const API = import.meta.env.VITE_API_URL;

  // Helper to get headers with the token
  const getHeaders = () => {
    const token = localStorage.getItem('auth_token');
    return {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    };
  };

  useEffect(() => {
    (async () => {
      try {
        // Use getHeaders() to attach the token
        const res = await fetch(`${API}/auth/me`, {
          headers: getHeaders(),
        });
        
        if (res.ok) {
          const data = await res.json();
          setUser(data.user);
        } else {
          // If 401, clear everything
          setUser(null);
          localStorage.removeItem('user');
          localStorage.removeItem('auth_token');
        }
      } catch (e) {
        console.error('Auth check failed:', e);
        // Optional: Keep user logged in on network error if you rely on localStorage 'user' object
        // but for now, we assume safe fail:
        setUser(null);
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
      
      // 1. SAVE TOKEN
      if (data.token) {
        localStorage.setItem('auth_token', data.token);
      }
      
      // 2. SAVE USER
      setUser(data.user);
      localStorage.setItem('user', JSON.stringify(data.user));
      
      navigate('/baje', { replace: true });
      return true;
    } catch (e) {
      console.error('Login error:', e);
      return false;
    }
  };

  const logout = async () => {
    try {
      // Best effort notification to server
      await fetch(`${API}/auth/logout`, { 
        method: 'POST',
        headers: getHeaders()
      });
    } catch (e) {
      console.error('Logout error:', e);
    } finally {
      // Always clean up client side
      setUser(null);
      localStorage.removeItem('user');
      localStorage.removeItem('auth_token');
      navigate('/login', { replace: true });
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, getHeaders }}>
      {children}
    </AuthContext.Provider>
  );
}
