import { createContext, useContext, useState, ReactNode } from 'react';

interface AuthState {
  username: string;
  password: string;
}

interface AuthContextType {
  isLoggedIn: boolean;
  auth: AuthState;
  login: (username: string, password: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isLoggedIn, setIsLoggedIn] = useState(() => localStorage.getItem('loggedIn') === 'true');
  const [auth, setAuth] = useState<AuthState>(() => ({
    username: localStorage.getItem('username') || '',
    password: localStorage.getItem('appPassword') || '',
  }));

  const login = (username: string, password: string) => {
    localStorage.setItem('loggedIn', 'true');
    localStorage.setItem('username', username);
    localStorage.setItem('appPassword', password);
    setIsLoggedIn(true);
    setAuth({ username, password });
  };

  const logout = () => {
    localStorage.removeItem('loggedIn');
    localStorage.removeItem('username');
    localStorage.removeItem('appPassword');
    setIsLoggedIn(false);
    setAuth({ username: '', password: '' });
  };

  return (
    <AuthContext.Provider value={{ isLoggedIn, auth, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
