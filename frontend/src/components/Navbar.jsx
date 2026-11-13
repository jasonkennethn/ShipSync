import React, { useState } from 'react';
import { 
  Navigation, 
  Search, 
  ChevronDown, 
  LogOut, 
  User, 
  Truck, 
  Sparkles,
  ArrowRightLeft
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const Navbar = ({ onOpenTrackModal, onOpenDemoSeedModal }) => {
  const { user, isAuthenticated, logout, login } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [switching, setSwitching] = useState(false);

  const handleQuickSwitch = async (targetEmail) => {
    setSwitching(true);
    try {
      await login(targetEmail, 'Password@123');
      setDropdownOpen(false);
    } catch (err) {
      console.error('Quick switch failed:', err);
    } finally {
      setSwitching(false);
    }
  };

  const isAgent = user?.role === 'agent' || user?.role === 'delivery_agent';

  return (
    <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-black/[0.06] transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-5">
          <div className="flex items-center gap-2.5 group cursor-pointer">
            <div className="w-7 h-7 rounded-xl bg-black text-white flex items-center justify-center font-bold shadow-xs group-hover:scale-105 transition">
              <Navigation size={15} className="transform rotate-45" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold tracking-tight text-apple-900">
                ShipSync
              </span>
              <span className="text-[10px] text-apple-400 font-mono bg-apple-100 px-1.5 py-0.5 rounded-md border border-black/[0.04]">
                v2.0
              </span>
            </div>
          </div>

          <div className="hidden lg:flex items-center gap-1.5 bg-apple-100/70 border border-black/[0.04] px-2.5 py-0.5 rounded-full text-[11px] font-medium text-apple-600">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>Active Network Mesh</span>
          </div>
        </div>

        {/* Right Controls */}
        <div className="flex items-center gap-2">
          {/* Track Parcel Pill */}
          <button
            onClick={onOpenTrackModal}
            className="flex items-center gap-1.5 text-xs font-medium text-apple-700 hover:text-black bg-apple-100/80 hover:bg-apple-200/60 border border-black/[0.04] px-3 py-1.5 rounded-full transition"
          >
            <Search size={13} />
            <span className="hidden sm:inline">Track Parcel</span>
          </button>

          {isAuthenticated ? (
            <div className="relative">
              {/* Profile Toggle */}
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center gap-2 px-2.5 py-1 rounded-full border border-black/[0.08] hover:border-black/[0.16] bg-white transition"
              >
                <div className="w-5 h-5 rounded-full bg-black text-white font-semibold flex items-center justify-center text-[10px]">
                  {user.username?.charAt(0).toUpperCase() || 'U'}
                </div>
                <div className="hidden sm:block text-left text-xs leading-tight">
                  <span className="font-medium text-apple-900">{user.username}</span>
                  <span className="text-[10px] text-apple-400 ml-1.5 font-mono">
                    ({isAgent ? 'Provider' : 'User'})
                  </span>
                </div>
                <ChevronDown size={12} className="text-apple-400 hidden sm:block" />
              </button>

              {/* Frosted Dropdown Menu */}
              {dropdownOpen && (
                <div 
                  className="absolute right-0 mt-2 w-60 glass-panel rounded-2xl p-2 z-50 animate-in fade-in slide-in-from-top-1 text-xs"
                  onMouseLeave={() => setDropdownOpen(false)}
                >
                  <div className="px-3 py-2 border-b border-black/[0.06]">
                    <p className="text-[10px] uppercase font-mono text-apple-400">Signed In As</p>
                    <p className="font-semibold text-apple-900 truncate">{user.email || user.username}</p>
                    <span className="inline-block mt-1 text-[10px] px-2 py-0.5 rounded-full bg-apple-100 text-apple-700 border border-black/[0.04] font-medium">
                      {isAgent ? 'Delivery Provider' : 'User Portal'}
                    </span>
                  </div>

                  {/* Portal Switcher */}
                  <div className="py-1 border-b border-black/[0.06]">
                    <button
                      onClick={() => handleQuickSwitch('user@shipsync.io')}
                      disabled={switching || !isAgent}
                      className={`w-full text-left px-3 py-1.5 rounded-xl transition flex items-center justify-between ${
                        !isAgent ? 'bg-black text-white font-medium' : 'text-apple-700 hover:bg-apple-100'
                      }`}
                    >
                      <span className="flex items-center gap-1.5"><User size={13} /> User Portal</span>
                      {!isAgent && <span className="text-[10px]">Active</span>}
                    </button>

                    <button
                      onClick={() => handleQuickSwitch('agent@shipsync.io')}
                      disabled={switching || isAgent}
                      className={`w-full text-left px-3 py-1.5 rounded-xl transition flex items-center justify-between ${
                        isAgent ? 'bg-black text-white font-medium' : 'text-apple-700 hover:bg-apple-100'
                      }`}
                    >
                      <span className="flex items-center gap-1.5"><Truck size={13} /> Provider Portal</span>
                      {isAgent && <span className="text-[10px]">Active</span>}
                    </button>
                  </div>

                  <div className="pt-1">
                    <button
                      onClick={() => { logout(); setDropdownOpen(false); }}
                      className="w-full text-left px-3 py-1.5 text-red-600 hover:bg-red-50/60 rounded-xl transition flex items-center gap-1.5"
                    >
                      <LogOut size={13} />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={onOpenDemoSeedModal}
              className="text-xs font-medium text-apple-800 bg-apple-100 hover:bg-apple-200/70 border border-black/[0.06] px-3 py-1.5 rounded-full transition flex items-center gap-1"
            >
              <Sparkles size={12} />
              <span>Demos</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
