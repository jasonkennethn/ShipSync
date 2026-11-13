import React, { useState } from 'react';
import { Search, X, Package, RefreshCw, AlertCircle } from 'lucide-react';
import { api } from '../services/api';
import { LiveTrackingMap } from './LiveTrackingMap';
import { DeliveryStatusBadge } from './DeliveryStatusBadge';
import { TimelineView } from './TimelineView';

export const TrackParcelModal = ({ isOpen, onClose, initialTrackingNumber = '' }) => {
  const [trackingNumber, setTrackingNumber] = useState(initialTrackingNumber);
  const [shipment, setShipment] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSearch = async (e) => {
    e?.preventDefault();
    if (!trackingNumber.trim()) return;

    setError('');
    setLoading(true);
    try {
      const data = await api.getShipment(trackingNumber.trim());
      setShipment(data);
    } catch (err) {
      setError('Shipment not found for this tracking ID.');
      setShipment(null);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className="glass-panel rounded-3xl max-w-3xl w-full p-6 sm:p-8 shadow-2xl my-8 animate-in fade-in zoom-in-95 text-apple-900 border border-white/80">
        <div className="flex items-center justify-between pb-4 border-b border-black/[0.06] mb-6">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-black text-white flex items-center justify-center font-bold">
              <Package size={16} />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-apple-900">
                Track Shipment Live
              </h2>
              <p className="text-xs text-apple-500">
                Real-time OpenStreetMap telemetry & cost breakdown
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-apple-100 rounded-full text-apple-400 hover:text-black transition"
          >
            <X size={16} />
          </button>
        </div>

        {/* Search */}
        <form onSubmit={handleSearch} className="flex gap-2 mb-6">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3.5 top-3 text-apple-400" />
            <input
              type="text"
              placeholder="Enter Tracking ID (e.g. SYNC-LIVE889)..."
              value={trackingNumber}
              onChange={(e) => setTrackingNumber(e.target.value)}
              className="w-full text-xs pl-9 pr-4 py-2.5 rounded-xl glass-input text-apple-900 placeholder-apple-400 focus:outline-none font-mono"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="px-5 py-2.5 bg-black hover:bg-zinc-800 text-white font-medium text-xs rounded-xl transition shadow-xs disabled:opacity-50"
          >
            {loading ? <RefreshCw size={13} className="animate-spin" /> : 'Search'}
          </button>
        </form>

        {error && (
          <div className="mb-4 p-3 bg-red-50/80 border border-red-200 rounded-2xl text-red-600 text-xs flex items-center gap-2">
            <AlertCircle size={14} />
            <span>{error}</span>
          </div>
        )}

        {shipment ? (
          <div className="space-y-5">
            <div className="p-4 rounded-2xl bg-apple-100/60 border border-black/[0.04] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-apple-700 bg-white px-2 py-0.5 rounded border border-black/[0.04]">
                    {shipment.tracking_number}
                  </span>
                  <DeliveryStatusBadge status={shipment.status} />
                </div>
                <h3 className="text-sm font-semibold text-apple-900 mt-1">
                  {shipment.package_title}
                </h3>
              </div>

              <div className="text-right">
                <span className="text-[10px] text-apple-400 uppercase font-mono block">Fare Paid</span>
                <span className="text-sm font-bold text-apple-900 font-mono block">${shipment.delivery_fee}</span>
              </div>
            </div>

            {/* Apple Map */}
            <LiveTrackingMap
              pickup={{
                lat: shipment.pickup_lat,
                lng: shipment.pickup_lng,
                address: shipment.pickup_address
              }}
              dropoff={{
                lat: shipment.dropoff_lat,
                lng: shipment.dropoff_lng,
                address: shipment.dropoff_address
              }}
              current={{
                lat: shipment.current_lat,
                lng: shipment.current_lng
              }}
              agentName={shipment.agent_name}
              vehicleType={shipment.agent_vehicle}
              height="280px"
            />

            {/* Cost Breakdown */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div className="p-2.5 rounded-xl bg-apple-100/50 border border-black/[0.04]">
                <span className="text-[10px] text-apple-400 block">Base Cost</span>
                <span className="font-semibold text-apple-900 font-mono">${shipment.base_cost || '6.00'}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-apple-100/50 border border-black/[0.04]">
                <span className="text-[10px] text-apple-400 block">Distance Fee</span>
                <span className="font-semibold text-apple-900 font-mono">${shipment.distance_cost || '4.00'}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-apple-100/50 border border-black/[0.04]">
                <span className="text-[10px] text-apple-400 block">Courier Payout</span>
                <span className="font-semibold text-apple-900 font-mono">${shipment.driver_payout || '10.50'}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-apple-100/50 border border-black/[0.04]">
                <span className="text-[10px] text-apple-400 block">Security PIN</span>
                <span className="font-bold text-apple-900 font-mono">{shipment.delivery_otp}</span>
              </div>
            </div>

            {/* Milestones */}
            <div className="pt-2 border-t border-black/[0.06]">
              <TimelineView
                timeline={shipment.timeline || []}
                currentStatus={shipment.status}
              />
            </div>
          </div>
        ) : (
          !loading && (
            <div className="text-center p-8 rounded-2xl bg-apple-100/40 border border-black/[0.04] text-xs text-apple-400 space-y-2">
              <p>Try inspecting sample dispatches:</p>
              <div className="flex justify-center gap-2">
                <button
                  onClick={() => { setTrackingNumber('SYNC-LIVE889'); }}
                  className="px-2.5 py-1 bg-white border border-black/[0.08] text-apple-800 rounded-lg font-mono hover:border-black"
                >
                  SYNC-LIVE889
                </button>
                <button
                  onClick={() => { setTrackingNumber('SYNC-ORD412'); }}
                  className="px-2.5 py-1 bg-white border border-black/[0.08] text-apple-800 rounded-lg font-mono hover:border-black"
                >
                  SYNC-ORD412
                </button>
              </div>
            </div>
          )
        )}
      </div>
    </div>
  );
};
