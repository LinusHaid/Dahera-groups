import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Building2, Lock, User, ShieldCheck, AlertCircle, X } from 'lucide-react';

export const Login = ({ isModal = false, onClose, onLoginSuccess }) => {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(username, password);
      if (onLoginSuccess) {
        onLoginSuccess();
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Invalid credentials. Please check your Employee ID and Mobile Number password.');
    } finally {
      setLoading(false);
    }
  };

  if (isModal) {
    return (
      <div className="space-y-4 font-['Plus_Jakarta_Sans',sans-serif]">
        <div className="flex items-center justify-between border-b pb-3 border-stone-100">
          <div>
            <h3 className="text-lg font-black text-stone-900">Employee Portal Sign In</h3>
            <p className="text-xs text-stone-500">Sign in to access your employee portal.</p>
          </div>
          {onClose && (
            <button onClick={onClose} className="p-1 text-stone-400 hover:text-stone-700 rounded-lg">
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-rose-800 text-xs font-medium">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-700" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          <div>
            <label className="block font-bold text-stone-800 mb-1">
              Employee ID or Email
            </label>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. THG-M-01 or THG-F-01"
              className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3.5 py-2.5 text-xs text-stone-900 focus:outline-none focus:border-[#881337] font-mono"
            />
          </div>

          <div>
            <label className="block font-bold text-stone-800 mb-1">Password (Mobile Number)</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3.5 py-2.5 text-xs text-stone-900 focus:outline-none focus:border-[#881337]"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#881337] hover:bg-[#991B1B] text-white font-bold py-3 rounded-xl text-xs transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-50 mt-2"
          >
            {loading ? 'Signing in...' : 'Sign In to Employee Portal'}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF9F6] flex items-center justify-center p-4 relative font-['Plus_Jakarta_Sans',sans-serif]">
      <div className="max-w-4xl w-full grid grid-cols-1 md:grid-cols-2 bg-white border border-stone-200 rounded-3xl shadow-2xl overflow-hidden">
        
        <div className="p-8 md:p-10 bg-gradient-to-br from-[#4C0519] via-[#881337] to-[#991B1B] text-white flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-3.5 mb-8">
              <img
                src="/logo.jpg"
                alt="Thahira Groups Logo"
                className="w-12 h-12 rounded-2xl object-cover shadow-lg border border-white/20"
              />
              <div>
                <h1 className="text-2xl font-black tracking-tight">Thahira Groups</h1>
                <span className="text-[11px] font-semibold text-rose-200 tracking-wider uppercase">Employee Portal</span>
              </div>
            </div>

            <h2 className="text-xl font-bold mb-3">Employee Portal Sign In</h2>
            <p className="text-rose-100 text-xs leading-relaxed">
              Sign in with your assigned Employee ID and Mobile Number password to access your attendance, leaves, and salary slips.
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs text-rose-200/80 pt-6 border-t border-white/10 mt-8">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Thahira Groups • Employee System</span>
          </div>
        </div>

        <div className="p-8 md:p-10 flex flex-col justify-between bg-white">
          <div>
            <div className="mb-6">
              <h3 className="text-xl font-black text-stone-900">Employee Sign In</h3>
              <p className="text-xs text-stone-500 mt-1">Enter your Employee ID or Email below.</p>
            </div>

            {error && (
              <div className="mb-5 p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2.5 text-rose-800 text-xs font-medium">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-700" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-stone-800 mb-1">
                  Employee ID / Email
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="e.g. THG-M-01 or THG-F-01"
                    className="w-full bg-stone-50 border border-stone-300 rounded-xl pl-10 pr-4 py-2.5 text-sm text-stone-900 focus:outline-none focus:border-[#881337] font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-800 mb-1">Password</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter password"
                    className="w-full bg-stone-50 border border-stone-300 rounded-xl pl-10 pr-4 py-2.5 text-sm text-stone-900 focus:outline-none focus:border-[#881337]"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#881337] hover:bg-[#991B1B] text-white font-bold py-3 rounded-xl text-sm transition-all shadow-lg shadow-rose-950/20 flex items-center justify-center gap-2 disabled:opacity-50 mt-2"
              >
                {loading ? 'Signing in...' : 'Sign In to Employee Portal'}
              </button>
            </form>
          </div>

          <div className="mt-8 pt-4 border-t border-stone-100 text-center">
            <span className="text-[11px] text-stone-400">
              Thahira Groups • Authorized Employee Access Only
            </span>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Login;
