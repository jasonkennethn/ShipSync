import React, { useState, useEffect } from 'react';
import { 
  Package, 
  Plus, 
  Search, 
  RefreshCw, 
  Store, 
  MapPin, 
  Truck, 
  DollarSign, 
  KeyRound, 
  Clock, 
  X, 
  AlertCircle,
  ShieldCheck,
  ArrowRight
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { LiveTrackingMap } from '../components/LiveTrackingMap';
import { DeliveryStatusBadge } from '../components/DeliveryStatusBadge';
import { TimelineView } from '../components/TimelineView';
import { InteractiveMapPicker } from '../components/InteractiveMapPicker';

export const UserPortal = () => {
  const { user } = useAuth();
  const [shipments, setShipments] = useState([]);
  const [providers, setProviders] = useState([]);
  const [selectedShipment, setSelectedShipment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('orders'); // 'orders', 'create', 'map'
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  // Book Delivery Form State
  const [formData, setFormData] = useState({
    package_title: '',
    category: 'General Goods',
    weight_kg: 1.5,
    is_fragile: false,
    special_notes: '',
    recipient_name: '',
    recipient_phone: '',
    recipient_email: '',
    provider: null,
    pickup_address: user?.address || '101 Market Street, San Francisco, CA',
    pickup_lat: 37.7749,
    pickup_lng: -122.4194,
    dropoff_address: '742 Evergreen Terrace, San Francisco, CA',
    dropoff_lat: 37.7833,
    dropoff_lng: -122.4067,
    delivery_fee: 14.50,
    base_cost: 7.50,
    distance_cost: 4.00,
    weight_cost: 3.00,
    driver_payout: 11.20,
    provider_commission: 3.30
  });

  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const loadData = async () => {
    try {
      const [shipmentData, providerData] = await Promise.all([
        api.getShipments(),
        api.getProviders()
      ]);
      setShipments(shipmentData);
      setProviders(providerData);
      if (providerData.length > 0 && !formData.provider) {
        setFormData(prev => ({
          ...prev,
          provider: providerData[0].id
        }));
      }
      if (shipmentData.length > 0 && !selectedShipment) {
        setSelectedShipment(shipmentData[0]);
      }
    } catch (err) {
      console.error('Failed to load user portal data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 4000);
    return () => clearInterval(interval);
  }, []);

  const recalculateCost = (providerId, weight, pLat, pLng, dLat, dLng) => {
    const prov = providers.find(p => p.id === (providerId || formData.provider)) || providers[0];
    const base = prov ? parseFloat(prov.base_fee) : 6.00;
    
    const latDiff = Math.abs((dLat || formData.dropoff_lat) - (pLat || formData.pickup_lat));
    const lngDiff = Math.abs((dLng || formData.dropoff_lng) - (pLng || formData.pickup_lng));
    const distanceKm = Math.max(1.5, Math.round(Math.sqrt(latDiff * latDiff + lngDiff * lngDiff) * 111 * 10) / 10);
    const perKm = prov ? parseFloat(prov.per_km_rate) : 1.20;
    const distanceCost = Math.round(distanceKm * perKm * 100) / 100;

    const w = parseFloat(weight || formData.weight_kg) || 1;
    const weightCost = Math.round(w * 1.5 * 100) / 100;

    const total = Math.round((base + distanceCost + weightCost) * 100) / 100;
    const driverPayout = Math.round(total * 0.78 * 100) / 100;
    const providerCommission = Math.round((total - driverPayout) * 100) / 100;

    setFormData(prev => ({
      ...prev,
      delivery_fee: total,
      base_cost: base,
      distance_cost: distanceCost,
      weight_cost: weightCost,
      driver_payout: driverPayout,
      provider_commission: providerCommission
    }));
  };

  const handleCreateShipment = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!formData.provider) {
      setFormError('Please select a delivery provider');
      return;
    }

    setSubmitting(true);
    try {
      const created = await api.createShipment(formData);
      await loadData();
      setSelectedShipment(created);
      setActiveTab('orders');
      setFormData(prev => ({
        ...prev,
        package_title: '',
        recipient_name: '',
        recipient_phone: '',
        recipient_email: '',
        special_notes: ''
      }));
    } catch (err) {
      setFormError(err.message || 'Failed to dispatch shipment');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredShipments = shipments.filter(s => {
    const matchesSearch = s.tracking_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          s.package_title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          s.recipient_name.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;
    if (filterStatus === 'active') return ['ORDER_PLACED', 'ASSIGNED_TO_AGENT', 'PICKED_UP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY'].includes(s.status);
    if (filterStatus === 'delivered') return s.status === 'DELIVERED';
    return true;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Top Glass Header */}
      <div className="glass-panel rounded-3xl p-5 sm:p-6 shadow-glass flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-full bg-black" />
            <span className="text-[11px] font-mono uppercase tracking-wider text-apple-500">User Portal</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-apple-900">
            Deliveries & Tracking
          </h1>
          <p className="text-xs text-apple-500 mt-0.5">
            Book dispatches with certified courier providers, inspect transparent fares, and track telemetry live.
          </p>
        </div>

        {/* View Switcher Tabs (Responsive for Laptop and Mobile) */}
        <div className="flex bg-apple-100/80 p-1 rounded-2xl border border-black/[0.04] text-xs">
          <button
            onClick={() => setActiveTab('orders')}
            className={`px-3.5 py-1.5 rounded-xl transition ${
              activeTab === 'orders' ? 'bg-white text-apple-900 font-semibold shadow-xs' : 'text-apple-600 hover:text-black'
            }`}
          >
            Orders ({shipments.length})
          </button>
          <button
            onClick={() => setActiveTab('create')}
            className={`px-3.5 py-1.5 rounded-xl transition flex items-center gap-1.5 ${
              activeTab === 'create' ? 'bg-white text-apple-900 font-semibold shadow-xs' : 'text-apple-600 hover:text-black'
            }`}
          >
            <Plus size={13} />
            <span>Send Package</span>
          </button>
          <button
            onClick={() => setActiveTab('map')}
            className={`px-3.5 py-1.5 rounded-xl transition lg:hidden ${
              activeTab === 'map' ? 'bg-white text-apple-900 font-semibold shadow-xs' : 'text-apple-600 hover:text-black'
            }`}
          >
            Live Map
          </button>
        </div>
      </div>

      {/* CREATE DELIVERY VIEW */}
      {activeTab === 'create' && (
        <div className="glass-panel rounded-3xl p-6 sm:p-8 space-y-6 shadow-glass animate-in fade-in">
          <div className="flex items-center justify-between pb-4 border-b border-black/[0.06]">
            <div>
              <h2 className="text-base font-semibold text-apple-900">
                Book a Delivery
              </h2>
              <p className="text-xs text-apple-500 mt-0.5">
                Itemized real-time fee calculation across courier networks
              </p>
            </div>
            <button
              onClick={() => setActiveTab('orders')}
              className="text-xs text-apple-500 hover:text-black"
            >
              Cancel
            </button>
          </div>

          {formError && (
            <div className="p-3 bg-red-50/80 border border-red-200 rounded-2xl text-xs text-red-600 flex items-center gap-2">
              <AlertCircle size={14} />
              <span>{formError}</span>
            </div>
          )}

          <form onSubmit={handleCreateShipment} className="space-y-6">
            {/* Package Details */}
            <div className="space-y-3">
              <span className="text-[11px] font-mono uppercase text-apple-400 block tracking-wider">
                01. Package Specifications
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-apple-600 mb-1">Package Title</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Specialty Dark Roast Coffee"
                    value={formData.package_title}
                    onChange={(e) => setFormData({ ...formData, package_title: e.target.value })}
                    className="w-full text-xs px-3 py-2 rounded-xl glass-input text-apple-900 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-apple-600 mb-1">Category</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full text-xs px-3 py-2 rounded-xl glass-input text-apple-900 focus:outline-none"
                  >
                    <option value="General Goods">General Goods</option>
                    <option value="Food & Groceries">Food & Groceries</option>
                    <option value="Electronics">Electronics</option>
                    <option value="Documents">Important Documents</option>
                    <option value="Fragile Cargo">Fragile Cargo</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-apple-600 mb-1">Weight (kg)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0.1"
                    value={formData.weight_kg}
                    onChange={(e) => {
                      const w = parseFloat(e.target.value) || 1;
                      setFormData({ ...formData, weight_kg: w });
                      recalculateCost(formData.provider, w);
                    }}
                    className="w-full text-xs px-3 py-2 rounded-xl glass-input text-apple-900 font-mono focus:outline-none"
                  />
                </div>
                <div className="flex items-center pt-5">
                  <label className="flex items-center gap-2 cursor-pointer text-xs text-apple-700">
                    <input
                      type="checkbox"
                      checked={formData.is_fragile}
                      onChange={(e) => setFormData({ ...formData, is_fragile: e.target.checked })}
                      className="rounded border-black/20 text-black focus:ring-0 w-4 h-4"
                    />
                    <span>Handle with Fragile Care</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Provider Selection */}
            <div className="space-y-3">
              <span className="text-[11px] font-mono uppercase text-apple-400 block tracking-wider">
                02. Select Delivery Provider
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {providers.map((prov) => {
                  const isSelected = formData.provider === prov.id;
                  return (
                    <div
                      key={prov.id}
                      onClick={() => {
                        setFormData(prev => ({ ...prev, provider: prov.id }));
                        recalculateCost(prov.id);
                      }}
                      className={`p-4 rounded-2xl border transition cursor-pointer flex flex-col justify-between ${
                        isSelected
                          ? 'bg-black text-white border-black shadow-glass font-medium'
                          : 'glass-card text-apple-900 hover:border-black/[0.15]'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-semibold">{prov.name}</span>
                        <Truck size={14} className={isSelected ? 'text-white' : 'text-apple-500'} />
                      </div>
                      <p className={`text-[11px] line-clamp-2 ${isSelected ? 'text-apple-300' : 'text-apple-500'}`}>
                        {prov.description}
                      </p>
                      <div className="mt-3 pt-2 border-t border-black/[0.06] flex items-center justify-between text-[11px] font-mono">
                        <span>ETA: {prov.estimated_delivery_time}</span>
                        <span>⭐ {prov.rating}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Recipient Details */}
            <div className="space-y-3">
              <span className="text-[11px] font-mono uppercase text-apple-400 block tracking-wider">
                03. Recipient Information
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-apple-600 mb-1">Name</label>
                  <input
                    type="text"
                    required
                    placeholder="Sarah Connor"
                    value={formData.recipient_name}
                    onChange={(e) => setFormData({ ...formData, recipient_name: e.target.value })}
                    className="w-full text-xs px-3 py-2 rounded-xl glass-input text-apple-900 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-apple-600 mb-1">Phone</label>
                  <input
                    type="tel"
                    required
                    placeholder="+1 (555) 000-0000"
                    value={formData.recipient_phone}
                    onChange={(e) => setFormData({ ...formData, recipient_phone: e.target.value })}
                    className="w-full text-xs px-3 py-2 rounded-xl glass-input text-apple-900 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-apple-600 mb-1">Email (Optional)</label>
                  <input
                    type="email"
                    placeholder="user@shipsync.io"
                    value={formData.recipient_email}
                    onChange={(e) => setFormData({ ...formData, recipient_email: e.target.value })}
                    className="w-full text-xs px-3 py-2 rounded-xl glass-input text-apple-900 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Geolocation Pickers */}
            <div className="space-y-3">
              <span className="text-[11px] font-mono uppercase text-apple-400 block tracking-wider">
                04. Geolocation Routing
              </span>
              <InteractiveMapPicker
                label="Sender Pickup Location"
                selectedLocation={{
                  address: formData.pickup_address,
                  lat: formData.pickup_lat,
                  lng: formData.pickup_lng
                }}
                onSelect={(loc) => {
                  setFormData(prev => ({
                    ...prev,
                    pickup_address: loc.address,
                    pickup_lat: loc.lat,
                    pickup_lng: loc.lng
                  }));
                  recalculateCost(formData.provider, formData.weight_kg, loc.lat, loc.lng, formData.dropoff_lat, formData.dropoff_lng);
                }}
                pinType="pickup"
              />

              <InteractiveMapPicker
                label="Recipient Destination Point"
                selectedLocation={{
                  address: formData.dropoff_address,
                  lat: formData.dropoff_lat,
                  lng: formData.dropoff_lng
                }}
                onSelect={(loc) => {
                  setFormData(prev => ({
                    ...prev,
                    dropoff_address: loc.address,
                    dropoff_lat: loc.lat,
                    dropoff_lng: loc.lng
                  }));
                  recalculateCost(formData.provider, formData.weight_kg, formData.pickup_lat, formData.pickup_lng, loc.lat, loc.lng);
                }}
                pinType="dropoff"
              />
            </div>

            {/* Transparent Cost Breakdown */}
            <div className="p-4 rounded-2xl bg-apple-100/70 border border-black/[0.04] space-y-3 font-sans">
              <div className="flex items-center justify-between border-b border-black/[0.06] pb-2">
                <span className="text-xs font-semibold text-apple-900">Itemized Cost Breakdown</span>
                <span className="text-xs font-bold font-mono text-apple-900">${formData.delivery_fee.toFixed(2)} Total</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <div className="p-2.5 rounded-xl bg-white/80 border border-black/[0.04]">
                  <span className="text-[10px] text-apple-400 block">Base Fare</span>
                  <span className="font-semibold text-apple-900">${formData.base_cost.toFixed(2)}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-white/80 border border-black/[0.04]">
                  <span className="text-[10px] text-apple-400 block">Distance Fee</span>
                  <span className="font-semibold text-apple-900">${formData.distance_cost.toFixed(2)}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-white/80 border border-black/[0.04]">
                  <span className="text-[10px] text-apple-400 block">Weight Surcharge</span>
                  <span className="font-semibold text-apple-900">${formData.weight_cost.toFixed(2)}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-white/80 border border-black/[0.04]">
                  <span className="text-[10px] text-apple-400 block">Courier Payout (78%)</span>
                  <span className="font-semibold text-apple-900">${formData.driver_payout.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Submit Bar */}
            <div className="pt-3 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setActiveTab('orders')}
                className="px-4 py-2 text-xs text-apple-500 hover:text-black font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-6 py-2.5 bg-black hover:bg-zinc-800 text-white font-medium text-xs rounded-xl shadow-glass transition active:scale-[0.98] disabled:opacity-50"
              >
                {submitting ? 'Confirming Dispatch...' : `Confirm & Pay $${formData.delivery_fee.toFixed(2)}`}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ORDERS & LIVE TRACKING VIEW */}
      {(activeTab === 'orders' || activeTab === 'map') && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Shipment List */}
          <div className={`lg:col-span-5 space-y-4 ${activeTab === 'map' ? 'hidden lg:block' : 'block'}`}>
            <div className="glass-panel p-4 rounded-3xl space-y-3">
              {/* Search */}
              <div className="relative">
                <Search size={14} className="absolute left-3 top-2.5 text-apple-400" />
                <input
                  type="text"
                  placeholder="Search tracking ID or recipient..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full text-xs pl-8 pr-3 py-1.5 rounded-xl glass-input text-apple-900 placeholder-apple-400 focus:outline-none"
                />
              </div>

              {/* Status Filter */}
              <div className="flex gap-1.5 text-xs overflow-x-auto pb-0.5">
                <button
                  onClick={() => setFilterStatus('all')}
                  className={`px-3 py-1 rounded-full transition text-[11px] font-medium ${
                    filterStatus === 'all' ? 'bg-black text-white shadow-xs' : 'bg-apple-100 text-apple-600 hover:text-black'
                  }`}
                >
                  All ({shipments.length})
                </button>
                <button
                  onClick={() => setFilterStatus('active')}
                  className={`px-3 py-1 rounded-full transition text-[11px] font-medium ${
                    filterStatus === 'active' ? 'bg-black text-white shadow-xs' : 'bg-apple-100 text-apple-600 hover:text-black'
                  }`}
                >
                  Active ({shipments.filter(s => ['ORDER_PLACED', 'ASSIGNED_TO_AGENT', 'PICKED_UP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY'].includes(s.status)).length})
                </button>
                <button
                  onClick={() => setFilterStatus('delivered')}
                  className={`px-3 py-1 rounded-full transition text-[11px] font-medium ${
                    filterStatus === 'delivered' ? 'bg-black text-white shadow-xs' : 'bg-apple-100 text-apple-600 hover:text-black'
                  }`}
                >
                  Delivered
                </button>
              </div>
            </div>

            {/* List Cards */}
            <div className="space-y-2.5 max-h-[620px] overflow-y-auto pr-1">
              {loading ? (
                <div className="text-center py-12 glass-panel rounded-3xl">
                  <RefreshCw size={18} className="animate-spin text-apple-400 mx-auto mb-2" />
                  <p className="text-xs text-apple-500">Syncing telemetry...</p>
                </div>
              ) : filteredShipments.length === 0 ? (
                <div className="text-center py-12 glass-panel rounded-3xl p-6">
                  <Package size={28} className="text-apple-300 mx-auto mb-2" />
                  <p className="text-xs font-semibold text-apple-700">No shipments found</p>
                  <button
                    onClick={() => setActiveTab('create')}
                    className="mt-3 text-xs bg-black text-white px-3.5 py-1.5 rounded-full shadow-xs"
                  >
                    Send First Package
                  </button>
                </div>
              ) : (
                filteredShipments.map((s) => {
                  const isSelected = selectedShipment?.id === s.id;
                  return (
                    <div
                      key={s.id}
                      onClick={() => {
                        setSelectedShipment(s);
                        if (window.innerWidth < 1024) setActiveTab('map');
                      }}
                      className={`p-4 rounded-2xl border transition cursor-pointer ${
                        isSelected
                          ? 'bg-white border-black/[0.15] shadow-glass ring-2 ring-black/[0.04]'
                          : 'glass-card'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <div>
                          <span className="text-[10px] font-mono text-apple-400 bg-apple-100 px-2 py-0.5 rounded-md">
                            {s.tracking_number}
                          </span>
                          <h3 className="text-xs font-semibold text-apple-900 mt-1 line-clamp-1">
                            {s.package_title}
                          </h3>
                        </div>
                        <DeliveryStatusBadge status={s.status} size="sm" />
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-apple-500 pt-2 border-t border-black/[0.04]">
                        <span>{s.provider_name}</span>
                        <span className="font-semibold text-apple-900 font-mono">${s.delivery_fee}</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Column: Live Telemetry Map & Details */}
          <div className={`lg:col-span-7 space-y-4 ${activeTab === 'orders' ? 'hidden lg:block' : 'block'}`}>
            {selectedShipment ? (
              <div className="glass-panel rounded-3xl p-6 shadow-glass space-y-5">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-apple-700 bg-apple-100 border border-black/[0.04] px-2.5 py-0.5 rounded-md">
                        {selectedShipment.tracking_number}
                      </span>
                      <DeliveryStatusBadge status={selectedShipment.status} />
                    </div>
                    <h2 className="text-base font-semibold text-apple-900 mt-1">
                      {selectedShipment.package_title}
                    </h2>
                  </div>

                  {/* Security PIN Display */}
                  <div className="text-right p-2.5 rounded-2xl bg-apple-100/70 border border-black/[0.04]">
                    <span className="text-[10px] text-apple-400 uppercase font-mono block">Delivery PIN</span>
                    <span className="text-sm font-mono font-bold text-apple-900 tracking-widest block">
                      {selectedShipment.delivery_otp}
                    </span>
                  </div>
                </div>

                {/* Map */}
                <LiveTrackingMap
                  pickup={{
                    lat: selectedShipment.pickup_lat,
                    lng: selectedShipment.pickup_lng,
                    address: selectedShipment.pickup_address
                  }}
                  dropoff={{
                    lat: selectedShipment.dropoff_lat,
                    lng: selectedShipment.dropoff_lng,
                    address: selectedShipment.dropoff_address
                  }}
                  current={{
                    lat: selectedShipment.current_lat,
                    lng: selectedShipment.current_lng
                  }}
                  agentName={selectedShipment.agent_name}
                  vehicleType={selectedShipment.agent_vehicle}
                  height="340px"
                />

                {/* Routing Summary */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  <div className="p-3 rounded-2xl bg-apple-100/50 border border-black/[0.04]">
                    <span className="text-[10px] text-apple-400 block">Total Fare</span>
                    <span className="font-semibold text-apple-900 font-mono">${selectedShipment.delivery_fee}</span>
                  </div>
                  <div className="p-3 rounded-2xl bg-apple-100/50 border border-black/[0.04]">
                    <span className="text-[10px] text-apple-400 block">Weight</span>
                    <span className="font-medium text-apple-800">{selectedShipment.weight_kg} kg</span>
                  </div>
                  <div className="p-3 rounded-2xl bg-apple-100/50 border border-black/[0.04]">
                    <span className="text-[10px] text-apple-400 block">Courier</span>
                    <span className="font-medium text-apple-800 truncate block">{selectedShipment.agent_name}</span>
                  </div>
                  <div className="p-3 rounded-2xl bg-apple-100/50 border border-black/[0.04]">
                    <span className="text-[10px] text-apple-400 block">Provider</span>
                    <span className="font-medium text-apple-800 truncate block">{selectedShipment.provider_name}</span>
                  </div>
                </div>

                {/* Timeline */}
                <div className="pt-2 border-t border-black/[0.06]">
                  <span className="text-[11px] font-mono uppercase text-apple-400 block mb-2">
                    Milestone Progress
                  </span>
                  <TimelineView
                    timeline={selectedShipment.timeline || []}
                    currentStatus={selectedShipment.status}
                  />
                </div>
              </div>
            ) : (
              <div className="glass-panel rounded-3xl p-12 text-center text-apple-400 text-xs">
                Select an order from the list to inspect live route tracking and transparent pricing.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
