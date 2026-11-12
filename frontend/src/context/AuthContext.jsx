import React, { createContext, useContext, useEffect, useState } from 'react';
import api from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function refreshUser() {
      const token = localStorage.getItem('token');

      if (!token) {
        if (!cancelled) {
          setUser(null);
          setAuthReady(true);
        }
        return;
      }

      try {
        const { data } = await api.get('/auth/me');

        if (!cancelled) {
          localStorage.setItem('user', JSON.stringify(data));
          setUser(data);
        }
      } catch (err) {
        if (!cancelled) {
          if (err.response?.status === 401) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
          }
          setUser(null);
          console.error('Nu s-au putut actualiza datele utilizatorului.', err);
        }
      } finally {
        if (!cancelled) setAuthReady(true);
      }
    }

    refreshUser();

    function onFocus() {
      if (localStorage.getItem('token')) {
        refreshUser();
      }
    }

    window.addEventListener('focus', onFocus);

    return () => {
      cancelled = true;
      window.removeEventListener('focus', onFocus);
    };
  }, []);

  async function login(email, password) {
    const { data } = await api.post('/auth/login', { email, password });
    localStorage.setItem('token', data.token);

    try {
      const response = await api.get('/auth/me');
      localStorage.setItem('user', JSON.stringify(response.data));
      setUser(response.data);
      setAuthReady(true);
      return response.data;
    } catch (err) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      setUser(null);
      throw err;
    }
  }

  function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setAuthReady(true);
  }

  return (
    <AuthContext.Provider value={{ user, authReady, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
