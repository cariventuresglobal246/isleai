// src/AuthContext.jsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export const AuthContext = createContext(null);

// Stable hook export (never flip this to default or change its name)
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>');
  return ctx;
}

// Stable component export (keep as named export)
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const API = import.meta.env.VITE_API_URL;

  useEffect(() => {
    (async () => {
      try {
        const storedUserJson = localStorage.getItem('user');
        const storedToken = localStorage.getItem('authToken');

        const headers = { 'Content-Type': 'application/json' };
        if (storedToken) {
          headers['Authorization'] = `Bearer ${storedToken}`;
        }

        const res = await fetch(`${API}/auth/me`, {
          credentials: 'include',
          headers,
        });

        if (res.ok) {
          const data = await res.json();
          setUser(data.user);
          // keep local copy in sync
          localStorage.setItem('user', JSON.stringify(data.user));
        } else {
          // ❗ iOS / cross-site cookies / header issues can cause this.
          // If we *do* have a stored user + token, trust that instead of logging out.
          if (storedUserJson && storedToken) {
            try {
              const parsed = JSON.parse(storedUserJson);
              setUser(parsed);
            } catch {
              setUser(null);
              localStorage.removeItem('user');
              localStorage.removeItem('authToken');
            }
          } else {
            setUser(null);
            localStorage.removeItem('user');
            localStorage.removeItem('authToken');
          }
        }
      } catch (e) {
        console.error('Auth check failed:', e);
        // On network errors, still try to restore from localStorage
        const storedUserJson = localStorage.getItem('user');
        if (storedUserJson) {
          try {
            const parsed = JSON.parse(storedUserJson);
            setUser(parsed);
          } catch {
            setUser(null);
            localStorage.removeItem('user');
            localStorage.removeItem('authToken');
          }
        } else {
          setUser(null);
        }
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
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) return false;

      const data = await res.json();
      if (!data?.user || !data?.token) return false;

      // ✅ Store user + token
      setUser(data.user);
      localStorage.setItem('user', JSON.stringify(data.user));
      localStorage.setItem('authToken', data.token);

      // Navigate to /baje after successful login
      navigate('/baje', { replace: true });
      return true;
    } catch (e) {
      console.error('Login error:', e);
      return false;
    }
  };

  const logout = async () => {
    try {
      await fetch(`${API}/auth/logout`, { method: 'POST', credentials: 'include' });
      setUser(null);
      localStorage.removeItem('user');
      localStorage.removeItem('authToken');
      navigate('/login', { replace: true });
    } catch (e) {
      console.error('Logout error:', e);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
