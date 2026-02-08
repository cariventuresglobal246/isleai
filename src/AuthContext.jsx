// src/AuthContext.jsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from './lib/supabaseClient';

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

  useEffect(() => {
    // 1. Check active session on initial load
    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user) {
          setUser(session.user);
          // Optional: Ensure our manual token is set if you use it for API calls
          localStorage.setItem('access_token', session.access_token);
        } else {
          setUser(null);
          localStorage.removeItem('access_token');
        }
      } catch (error) {
        console.error("Session check error:", error);
      } finally {
        setLoading(false);
      }
    };

    checkSession();

    // 2. Listen for changes (SignIn, SignOut, TokenRefresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("Auth Event:", event); // Debugging help
      
      if (session?.user) {
        setUser(session.user);
        localStorage.setItem('access_token', session.access_token);
      } else {
        setUser(null);
        localStorage.removeItem('access_token');
        localStorage.removeItem('user');
      }
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const login = async (email, password) => {
    // Rely on Login.jsx to call supabase.auth.signInWithPassword.
    // The listener above will detect the change automatically.
    return true; 
  };

  const logout = async () => {
    await supabase.auth.signOut();
    // The listener above will handle state cleanup
    navigate('/login', { replace: true });
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}