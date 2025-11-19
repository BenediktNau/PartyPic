import React, { createContext, useState, useContext, useEffect } from 'react';

// So sehen die Daten aus, die wir im Context speichern
interface AuthState {
  token: string | null;
  user: { email: string; userId: string } | null;
  isAuthenticated: boolean;
  setAuthData: (data: { token: string; user: any }) => void;
  logout: () => void;
}

// 1. Context erstellen
const AuthContext = createContext<AuthState | undefined>(undefined);

// 2. Provider-Komponente erstellen
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<any | null>(null);

  // Beim ersten Laden der App versuchen, den Token aus dem localStorage zu holen
  useEffect(() => {
    const storedToken = localStorage.getItem('authToken');
    const storedUser = localStorage.getItem('authUser');
    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
    }
  }, []);

  // Funktion, um Benutzerdaten nach erfolgreichem Login zu setzen
  const setAuthData = (data: { token: string; user: any }) => {
    setToken(data.token);
    setUser(data.user);
    localStorage.setItem('authToken', data.token);
    localStorage.setItem('authUser', JSON.stringify(data.user));
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('authToken');
    localStorage.removeItem('authUser');
  };

  const isAuthenticated = !!token;

  return (
    <AuthContext.Provider value={{ token, user, isAuthenticated, setAuthData, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth muss innerhalb eines AuthProvider verwendet werden');
  }
  return context;
};