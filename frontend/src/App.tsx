import { useEffect } from 'react';
import { useAuth } from './context/AuthContext';
import { setAuthCredentials } from './api/client';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';

function App() {
  const { isLoggedIn, auth } = useAuth();

  useEffect(() => {
    if (auth.username && auth.password) {
      setAuthCredentials(auth.username, auth.password);
    }
  }, [auth]);

  return isLoggedIn ? <Dashboard /> : <Login />;
}

export default App;
