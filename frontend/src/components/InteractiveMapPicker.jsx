import React, { useState } from 'react';
import { MapPin, Check, Crosshair } from 'lucide-react';

const PRESET_ZONES = [
  { name: 'Downtown Hub', address: '101 Market Street, San Francisco, CA', lat: 37.7749, lng: -122.4194 },
  { name: 'Financial District', address: '555 California St, San Francisco, CA', lat: 37.7925, lng: -122.4042 },
  { name: 'Mission Logistics', address: '2400 Mission St, San Francisco, CA', lat: 37.7587, lng: -122.4190 },
  { name: 'Marina Terminal', address: '2100 Chestnut St, San Francisco, CA', lat: 37.8005, lng: -122.4385 },
  { name: 'Sunset District', address: '1200 9th Ave, San Francisco, CA', lat: 37.7645, lng: -122.4665 },
  { name: 'SoMa Tech Core', address: '650 Townsend St, San Francisco, CA', lat: 37.7715, lng: -122.4035 }
];

export const InteractiveMapPicker = ({
  label = 'Select Location',
  selectedLocation,
  onSelect,
  pinType = 'pickup'
}) => {
  const [customLat, setCustomLat] = useState(selectedLocation?.lat || 37.7749);
  const [customLng, setCustomLng] = useState(selectedLocation?.lng || -122.4194);
  const [customAddress, setCustomAddress] = useState(selectedLocation?.address || '');

  const handlePresetSelect = (zone) => {
    setCustomLat(zone.lat);
    setCustomLng(zone.lng);
    setCustomAddress(zone.address);
    onSelect({
      address: zone.address,
      lat: zone.lat,
      lng: zone.lng
    });
  };

  const handleManualApply = () => {
    onSelect({
      address: customAddress || 'Pinned Location',
      lat: parseFloat(customLat) || 37.7749,
      lng: parseFloat(customLng) || -122.4194
    });
  };

  return (
    <div className="glass-panel p-4 rounded-2xl space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold text-apple-900 flex items-center gap-1.5">
          <MapPin size={13} className={pinType === 'dropoff' ? 'text-black' : 'text-apple-500'} />
          <span>{label}</span>
        </label>
        <span className="text-[10px] text-apple-400 font-mono uppercase">Quick Zones</span>
      </div>

      {/* Preset Zone Pills */}
      <div className="flex flex-wrap gap-1.5">
        {PRESET_ZONES.map((zone) => {
          const isSelected = selectedLocation?.address === zone.address;
          return (
            <button
              key={zone.name}
              type="button"
              onClick={() => handlePresetSelect(zone)}
              className={`text-[11px] px-2.5 py-1 rounded-full border transition flex items-center gap-1 ${
                isSelected
                  ? 'bg-black text-white border-black font-medium shadow-xs'
                  : 'bg-white/70 text-apple-600 border-black/[0.06] hover:border-black/[0.15] hover:bg-white'
              }`}
            >
              {isSelected && <Check size={10} strokeWidth={3} />}
              <span>{zone.name}</span>
            </button>
          );
        })}
      </div>

      {/* Manual Address & Coordinates */}
      <div className="space-y-2 pt-1">
        <input
          type="text"
          placeholder="Street address or landmark..."
          value={customAddress}
          onChange={(e) => setCustomAddress(e.target.value)}
          onBlur={handleManualApply}
          className="w-full text-xs px-3 py-2 rounded-xl glass-input text-apple-900 placeholder-apple-400 focus:outline-none"
        />

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <div>
            <input
              type="number"
              step="0.0001"
              placeholder="Lat"
              value={customLat}
              onChange={(e) => setCustomLat(e.target.value)}
              onBlur={handleManualApply}
              className="w-full text-xs px-2.5 py-1.5 rounded-xl glass-input text-apple-800 font-mono focus:outline-none"
            />
          </div>
          <div>
            <input
              type="number"
              step="0.0001"
              placeholder="Lng"
              value={customLng}
              onChange={(e) => setCustomLng(e.target.value)}
              onBlur={handleManualApply}
              className="w-full text-xs px-2.5 py-1.5 rounded-xl glass-input text-apple-800 font-mono focus:outline-none"
            />
          </div>
          <div>
            <button
              type="button"
              onClick={handleManualApply}
              className="w-full h-full text-xs bg-apple-100 hover:bg-apple-200 text-apple-900 font-medium px-2.5 py-1.5 rounded-xl border border-black/[0.06] transition flex items-center justify-center gap-1 active:scale-95"
            >
              <Crosshair size={12} />
              <span>Apply Pin</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
