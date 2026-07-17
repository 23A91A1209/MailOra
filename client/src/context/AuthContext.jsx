/**
 * AuthContext.jsx
 * Provides global authentication state across the entire MailOra app.
 *
 * Exposes:
 *   user       — the logged-in user object (or null)
 *   token      — auth token (or null)
 *   isLoggedIn — boolean derived from user
 *   login(userData, token) — call after successful API login
 *   logout()   — clears state; caller handles redirect
 *
 * Persists to localStorage under 'mailora-user' and 'mailora-token'
 * so the session survives page refresh.
 */
import { createContext, useState, useContext, useCallback } from 'react';
import axiosClient from '../helpers/axiosClient';

const AuthContext = createContext();

const USER_KEY  = 'mailora-user';
const TOKEN_KEY = 'mailora-token';

export const AuthProvider = ({ children }) => {
  // Restore session from localStorage on mount
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem(USER_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY) || null);

  const isLoggedIn = Boolean(user);

  /** Called after a successful API response */
  const login = useCallback((userData, authToken = null) => {
    setUser(userData);
    setToken(authToken);
    localStorage.setItem(USER_KEY, JSON.stringify(userData));
    if (authToken) localStorage.setItem(TOKEN_KEY, authToken);
  }, []);

  /** Clears auth state — calls server to clear httpOnly cookie */
  const logout = useCallback(async () => {
    try {
      await axiosClient.post('/api/auth/logout');
    } catch {
      // Even if the server call fails, clear local state
    }
    setUser(null);
    setToken(null);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(TOKEN_KEY);
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, isLoggedIn, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
};

export default AuthContext;
