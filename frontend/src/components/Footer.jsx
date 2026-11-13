import React from 'react';
import { Navigation, ShieldCheck, Globe, Cpu } from 'lucide-react';

export const Footer = () => {
  return (
    <footer className="bg-apple-50/80 border-t border-black/[0.06] mt-auto py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-apple-500 font-sans">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-lg bg-black text-white flex items-center justify-center font-bold">
              <Navigation size={11} className="transform rotate-45" />
            </div>
            <span className="font-semibold text-apple-900">ShipSync Logistics</span>
            <span>•</span>
            <span>© {new Date().getFullYear()}</span>
          </div>

          <div className="flex items-center gap-5 text-[11px] text-apple-400">
            <span className="flex items-center gap-1">
              <Globe size={12} className="text-apple-500" /> OpenStreetMap (No API Key)
            </span>
            <span className="flex items-center gap-1">
              <ShieldCheck size={12} className="text-apple-500" /> End-to-End Encrypted
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
};
