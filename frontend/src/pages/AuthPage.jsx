import React, { useState } from 'react';
import { 
  Navigation, 
  ArrowRight, 
  AlertCircle, 
  CheckCircle2, 
  Sparkles, 
  User, 
  Truck,
  Copy,
  Check
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

export const AuthPage = () => {
  const { login, register } = useAuth();
  const [mode, setMode] = useState('login'); // 'login' or 'register'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('user'); // 'user' or 'agent'
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copiedKey, setCopiedKey] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (mode === 'login') {
        await login(email.trim(), password);
      } else {
        await register({
          email: email.trim(),
          password,
          role
        });
      }
    } catch (err) {
      setError(err.message || 'Authentication failed. Please verify your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemo = async (demoEmail) => {
    setEmail(demoEmail);
    setPassword('Password@123');
    setError('');
    setLoading(true);
    try {
      try {
        await login(demoEmail, 'Password@123');
      } catch (loginErr) {
        // If not seeded, trigger seed then login
        await api.seedDemo();
        await login(demoEmail, 'Password@123');
      }
    } catch (err) {
      setError(`Demo sign in failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const copyCredential = (text, key) => {
    navigator.clipboard?.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(''), 2000);
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center p-4 sm:p-6 bg-apple-grid relative overflow-hidden">
      {/* Soft Ambient Glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[520px] h-[340px] bg-gradient-to-tr from-zinc-200/50 to-zinc-100/30 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10 space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-1.5">
          <div className="w-12 h-12 rounded-2xl bg-black text-white flex items-center justify-center mx-auto shadow-glass shadow-black/10">
            <Navigation size={22} className="transform rotate-45" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-apple-900">
            ShipSync
          </h1>
          <p className="text-xs text-apple-400">
            Integrated Logistics & Multi-Vendor Dispatch
          </p>
        </div>

        {/* Apple Glassmorphic Card */}
        <div className="glass-panel rounded-3xl p-6 sm:p-8 space-y-6">
          {/* Segmented Mode Switcher */}
          <div className="flex bg-apple-100/80 p-1 rounded-2xl border border-black/[0.04]">
            <button
              type="button"
              onClick={() => { setMode('login'); setError(''); }}
              className={`flex-1 py-1.5 text-xs font-medium rounded-xl transition ${
                mode === 'login'
                  ? 'bg-white text-apple-900 shadow-sm font-semibold'
                  : 'text-apple-500 hover:text-apple-900'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => { setMode('register'); setError(''); }}
              className={`flex-1 py-1.5 text-xs font-medium rounded-xl transition ${
                mode === 'register'
                  ? 'bg-white text-apple-900 shadow-sm font-semibold'
                  : 'text-apple-500 hover:text-apple-900'
              }`}
            >
              Create Account
            </button>
          </div>

          {error && (
            <div className="p-3 bg-red-50/80 border border-red-200/60 rounded-2xl text-red-600 text-xs font-medium flex items-center gap-2">
              <AlertCircle size={14} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Simple Form: Email & Password ONLY */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-apple-500 mb-1.5">
                Email Address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full text-xs px-3.5 py-2.5 rounded-xl glass-input text-apple-900 placeholder-apple-400 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-apple-500 mb-1.5">
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full text-xs px-3.5 py-2.5 rounded-xl glass-input text-apple-900 placeholder-apple-400 focus:outline-none"
              />
            </div>

            {/* In Create Account mode: Pick Role (User or Delivery Provider) */}
            {mode === 'register' && (
              <div className="pt-1">
                <label className="block text-xs font-medium text-apple-500 mb-1.5">
                  Account Type
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setRole('user')}
                    className={`py-2 px-3 rounded-xl border text-xs font-medium transition flex items-center justify-center gap-1.5 ${
                      role === 'user'
                        ? 'bg-black text-white border-black'
                        : 'bg-white/70 border-black/[0.08] text-apple-600 hover:bg-white'
                    }`}
                  >
                    <User size={13} />
                    <span>User</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setRole('agent')}
                    className={`py-2 px-3 rounded-xl border text-xs font-medium transition flex items-center justify-center gap-1.5 ${
                      role === 'agent'
                        ? 'bg-black text-white border-black'
                        : 'bg-white/70 border-black/[0.08] text-apple-600 hover:bg-white'
                    }`}
                  >
                    <Truck size={13} />
                    <span>Delivery</span>
                  </button>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 bg-black hover:bg-zinc-800 active:scale-[0.98] text-white font-medium text-xs rounded-xl shadow-glass transition flex items-center justify-center gap-1.5 disabled:opacity-50 mt-2"
            >
              {loading ? (
                <span>Authenticating...</span>
              ) : (
                <>
                  <span>{mode === 'login' ? 'Continue' : 'Create Account'}</span>
                  <ArrowRight size={13} />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Demo Credentials List Below */}
        <div className="glass-panel rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-apple-800 flex items-center gap-1.5">
              <Sparkles size={12} className="text-apple-900" />
              Demo Credentials
            </span>
            <span className="text-[10px] text-apple-400 font-mono">Password: Password@123</span>
          </div>

          <div className="space-y-2">
            {/* User Credential */}
            <div className="p-2.5 rounded-xl bg-white/70 border border-black/[0.04] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-apple-100 flex items-center justify-center text-apple-700">
                  <User size={12} />
                </div>
                <div>
                  <span className="text-xs font-semibold text-apple-900 block leading-tight">
                    User Portal
                  </span>
                  <span className="text-[10px] text-apple-400 font-mono">
                    user@shipsync.io
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => copyCredential('user@shipsync.io', 'user')}
                  title="Copy Email"
                  className="p-1.5 hover:bg-apple-100 rounded-lg text-apple-500 transition"
                >
                  {copiedKey === 'user' ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickDemo('user@shipsync.io')}
                  disabled={loading}
                  className="text-[11px] font-medium bg-black text-white hover:bg-zinc-800 px-2.5 py-1 rounded-lg transition"
                >
                  Sign In
                </button>
              </div>
            </div>

            {/* Delivery Provider Credential */}
            <div className="p-2.5 rounded-xl bg-white/70 border border-black/[0.04] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-apple-100 flex items-center justify-center text-apple-700">
                  <Truck size={12} />
                </div>
                <div>
                  <span className="text-xs font-semibold text-apple-900 block leading-tight">
                    Delivery Provider
                  </span>
                  <span className="text-[10px] text-apple-400 font-mono">
                    agent@shipsync.io
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => copyCredential('agent@shipsync.io', 'agent')}
                  title="Copy Email"
                  className="p-1.5 hover:bg-apple-100 rounded-lg text-apple-500 transition"
                >
                  {copiedKey === 'agent' ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickDemo('agent@shipsync.io')}
                  disabled={loading}
                  className="text-[11px] font-medium bg-black text-white hover:bg-zinc-800 px-2.5 py-1 rounded-lg transition"
                >
                  Sign In
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
