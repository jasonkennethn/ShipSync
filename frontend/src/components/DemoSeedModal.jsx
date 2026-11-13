import React, { useState } from 'react';
import { Sparkles, X, Check, RefreshCw, User, Truck } from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

export const DemoSeedModal = ({ isOpen, onClose }) => {
  const { login } = useAuth();
  const [seeding, setSeeding] = useState(false);
  const [success, setSuccess] = useState(false);
  const [loggingIn, setLoggingIn] = useState('');

  const handleSeed = async () => {
    setSeeding(true);
    try {
      await api.seedDemo();
      setSuccess(true);
    } catch (err) {
      console.error('Seed error:', err);
    } finally {
      setSeeding(false);
    }
  };

  const handleQuickLogin = async (email) => {
    setLoggingIn(email);
    try {
      await login(email, 'Password@123');
      onClose();
    } catch (err) {
      console.error('Login error:', err);
    } finally {
      setLoggingIn('');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-md flex items-center justify-center p-4">
      <div className="glass-panel rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl text-apple-900 border border-white/80">
        <div className="flex items-center justify-between pb-4 border-b border-black/[0.06] mb-6">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-black text-white flex items-center justify-center font-bold">
              <Sparkles size={15} />
            </div>
            <div>
              <h2 className="text-sm font-semibold">
                Portals & Demo Access
              </h2>
              <p className="text-xs text-apple-400">
                2 Core Roles: User & Delivery Provider
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-apple-100 rounded-full text-apple-400 hover:text-black transition"
          >
            <X size={15} />
          </button>
        </div>

        <div className="space-y-3 mb-6 text-xs">
          {/* User Portal */}
          <div className="p-3.5 rounded-2xl bg-white/80 border border-black/[0.04] flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-apple-100 flex items-center justify-center text-apple-800">
                <User size={14} />
              </div>
              <div>
                <span className="font-semibold text-apple-900 block">User Portal</span>
                <span className="text-[11px] text-apple-400 font-mono">user@shipsync.io</span>
              </div>
            </div>
            <button
              onClick={() => handleQuickLogin('user@shipsync.io')}
              disabled={!!loggingIn}
              className="px-3.5 py-1.5 bg-black text-white font-medium rounded-xl text-xs transition active:scale-[0.98]"
            >
              {loggingIn === 'user@shipsync.io' ? '...' : 'Sign In'}
            </button>
          </div>

          {/* Delivery Provider Portal */}
          <div className="p-3.5 rounded-2xl bg-white/80 border border-black/[0.04] flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-apple-100 flex items-center justify-center text-apple-800">
                <Truck size={14} />
              </div>
              <div>
                <span className="font-semibold text-apple-900 block">Provider Portal</span>
                <span className="text-[11px] text-apple-400 font-mono">agent@shipsync.io</span>
              </div>
            </div>
            <button
              onClick={() => handleQuickLogin('agent@shipsync.io')}
              disabled={!!loggingIn}
              className="px-3.5 py-1.5 bg-black text-white font-medium rounded-xl text-xs transition active:scale-[0.98]"
            >
              {loggingIn === 'agent@shipsync.io' ? '...' : 'Sign In'}
            </button>
          </div>
        </div>

        <div className="pt-3 border-t border-black/[0.06] flex items-center justify-between text-[11px] text-apple-400">
          <button
            onClick={handleSeed}
            disabled={seeding}
            className="hover:text-black flex items-center gap-1.5"
          >
            <RefreshCw size={12} className={seeding ? 'animate-spin' : ''} />
            <span>{success ? 'Demo Database Seeded ✓' : 'Reset / Reseed Data'}</span>
          </button>
          <span className="font-mono">Password: Password@123</span>
        </div>
      </div>
    </div>
  );
};
