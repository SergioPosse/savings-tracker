import { useState } from 'react';
import { TrendingUp } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { setAuthCredentials } from '../api/client';
import { login, register } from '../api/auth';

export default function Login() {
  const { login: setLoggedIn } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (mode === 'register' && password !== confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }

    setLoading(true);
    try {
      setAuthCredentials(username, password);
      if (mode === 'login') {
        await login(username, password);
      } else {
        await register(username, password);
      }
      setLoggedIn(username, password);
    } catch (err: unknown) {
      setAuthCredentials('', '');
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setError(msg || 'Error al conectar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0d1117]">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center mb-4">
            <TrendingUp className="w-7 h-7 text-emerald-400" />
          </div>
          <h1 className="text-2xl font-semibold text-white">Savings Tracker</h1>
          <p className="text-sm text-gray-500 mt-1">
            {mode === 'login' ? 'Iniciá sesión para continuar' : 'Creá tu cuenta'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="bg-[#161b22] rounded-xl border border-[#30363d] p-6 space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1.5">Usuario</label>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              required
              autoFocus
              autoComplete="username"
              className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-2.5 text-white placeholder-gray-600 focus:outline-none focus:border-emerald-500 transition-colors"
              placeholder="tu_usuario"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1.5">Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-2.5 text-white placeholder-gray-600 focus:outline-none focus:border-emerald-500 transition-colors"
              placeholder="••••••••"
            />
          </div>

          {mode === 'register' && (
            <div>
              <label className="block text-sm text-gray-400 mb-1.5">Confirmar contraseña</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                required
                autoComplete="new-password"
                className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-2.5 text-white placeholder-gray-600 focus:outline-none focus:border-emerald-500 transition-colors"
                placeholder="••••••••"
              />
            </div>
          )}

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <button
            type="submit"
            disabled={loading || !username || !password}
            className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-2.5 rounded-lg transition-colors"
          >
            {loading
              ? (mode === 'login' ? 'Ingresando...' : 'Creando cuenta...')
              : (mode === 'login' ? 'Ingresar' : 'Crear cuenta')}
          </button>

          <p className="text-center text-sm text-gray-500">
            {mode === 'login' ? (
              <>¿No tenés cuenta?{' '}
                <button type="button" onClick={() => { setMode('register'); setError(''); }}
                  className="text-emerald-400 hover:text-emerald-300 transition-colors">
                  Registrarse
                </button>
              </>
            ) : (
              <>¿Ya tenés cuenta?{' '}
                <button type="button" onClick={() => { setMode('login'); setError(''); }}
                  className="text-emerald-400 hover:text-emerald-300 transition-colors">
                  Iniciar sesión
                </button>
              </>
            )}
          </p>
        </form>
      </div>
    </div>
  );
}
