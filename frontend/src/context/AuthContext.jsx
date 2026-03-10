import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('drizzle_user');
      return stored ? JSON.parse(stored) : null;
    } catch { return null; }
  });
  const [token, setToken] = useState(() => localStorage.getItem('drizzle_token'));

  useEffect(() => {
    if (token) localStorage.setItem('drizzle_token', token);
    else localStorage.removeItem('drizzle_token');
  }, [token]);

  useEffect(() => {
    if (user) localStorage.setItem('drizzle_user', JSON.stringify(user));
    else localStorage.removeItem('drizzle_user');
  }, [user]);

  const logout = useCallback(() => {
    setUser(null);
    setToken(null);
  }, []);

  useEffect(() => {
    window.addEventListener('auth:logout', logout);
    return () => window.removeEventListener('auth:logout', logout);
  }, [logout]);

  function login(userData, jwtToken) {
    setUser(userData);
    setToken(jwtToken);
  }

  function updateUser(updatedUser) {
    setUser(updatedUser);
  }

  return (
    <AuthContext.Provider value={{ user, token, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
