import React, { useState, useEffect, useRef } from 'react';
import { 
  Truck, 
  Navigation, 
  MapPin, 
  Check, 
  Package, 
  KeyRound, 
  Clock, 
  Phone, 
  AlertCircle, 
  Play, 
  Pause, 
  RefreshCw, 
  DollarSign, 
  Shield, 
  Store,
  ChevronRight,
  Briefcase,
  Layers,
  ArrowRight
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { LiveTrackingMap } from '../components/LiveTrackingMap';
import { DeliveryStatusBadge } from '../components/DeliveryStatusBadge';
import { TimelineView } from '../components/TimelineView';

export const DeliveryProviderPortal = () => {
  const { user } = useAuth();
  const [providerMode, setProviderMode] = useState('agent'); // 'manager' or 'agent'
  const [shipments, setShipments] = useState([]);
  const [selectedShipment, setSelectedShipment] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  // Agent action state
  const [deliveryOtp, setDeliveryOtp] = useState('');
  const [actionError, setActionError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');
  const [updatingStatus, setUpdatingStatus] = useState(false);

  // Live GPS Simulator
  const [isSimulatingGps, setIsSimulatingGps] = useState(false);
  const simIntervalRef = useRef(null);

  const loadData = async () => {
    try {
      const [shipmentData, analyticsData] = await Promise.all([
        api.getShipments(providerMode === 'manager' ? 'manager' : ''),
        api.getAnalytics().catch(() => null)
      ]);
      setShipments(shipmentData);
      setAnalytics(analyticsData);

      if (shipmentData.length > 0 && !selectedShipment) {
        const myActive = shipmentData.find(s => s.assigned_agent === user.id && s.status !== 'DELIVERED');
        setSelectedShipment(myActive || shipmentData[0]);
      }
    } catch (err) {
      console.error('Failed to load provider portal data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 4000);
    return () => clearInterval(interval);
  }, [providerMode]);

  useEffect(() => {
    return () => {
      if (simIntervalRef.current) clearInterval(simIntervalRef.current);
    };
  }, []);

  const handleClaimOrder = async (shipmentId) => {
    setActionError('');
    try {
      const updated = await api.assignAgent(shipmentId, user.id);
      setActionSuccess('Trip claimed! You are assigned as the courier.');
      await loadData();
      setSelectedShipment(updated);
    } catch (err) {
      setActionError(err.message || 'Failed to claim delivery');
    }
  };

  const handleStatusTransition = async (nextStatus) => {
    if (!selectedShipment) return;
    setActionError('');
    setActionSuccess('');
    setUpdatingStatus(true);

    try {
      const payload = {
        status: nextStatus,
        notes: `Courier ${user.username} progressed status to ${nextStatus}`,
        lat: selectedShipment.current_lat,
        lng: selectedShipment.current_lng
      };

      if (nextStatus === 'DELIVERED') {
        payload.otp = deliveryOtp;
      }

      const updated = await api.updateShipmentStatus(selectedShipment.id, payload);
      setSelectedShipment(updated);
      setActionSuccess(`Status updated to ${nextStatus.replace(/_/g, ' ')}!`);
      setDeliveryOtp('');
      await loadData();
    } catch (err) {
      setActionError(err.message || 'Status transition failed');
    } finally {
      setUpdatingStatus(false);
    }
  };

  // Live GPS Route Broadcaster Simulator
  const toggleGpsSimulator = () => {
    if (isSimulatingGps) {
      clearInterval(simIntervalRef.current);
      simIntervalRef.current = null;
      setIsSimulatingGps(false);
      return;
    }

    if (!selectedShipment) return;

    setIsSimulatingGps(true);
    let step = 0;
    const totalSteps = 25;

    const startLat = selectedShipment.current_lat;
    const startLng = selectedShipment.current_lng;
    const targetLat = selectedShipment.dropoff_lat;
    const targetLng = selectedShipment.dropoff_lng;

    simIntervalRef.current = setInterval(async () => {
      step += 1;
      const progress = Math.min(step / totalSteps, 1);
      const nextLat = startLat + (targetLat - startLat) * progress + (Math.random() - 0.5) * 0.0003;
      const nextLng = startLng + (targetLng - startLng) * progress + (Math.random() - 0.5) * 0.0003;

      try {
        await api.updateLiveLocation(selectedShipment.id, {
          lat: nextLat,
          lng: nextLng,
          speed: 30.5,
          heading: 45
        });

        setSelectedShipment(prev => ({
          ...prev,
          current_lat: nextLat,
          current_lng: nextLng
        }));

        if (progress >= 1) {
          clearInterval(simIntervalRef.current);
          simIntervalRef.current = null;
          setIsSimulatingGps(false);
          setActionSuccess('Arrived at dropoff destination!');
        }
      } catch (err) {
        console.error('GPS broadcast error:', err);
      }
    }, 2000);
  };

  const myAssignedDeliveries = shipments.filter(s => s.assigned_agent === user?.id);
  const unassignedPool = shipments.filter(s => !s.assigned_agent && s.status === 'ORDER_PLACED');

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Top Glass Header */}
      <div className="glass-panel rounded-3xl p-5 sm:p-6 shadow-glass flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5 text-xs text-apple-500 font-medium">
            <span className="w-2 h-2 rounded-full bg-black" />
            <span className="uppercase font-mono text-[11px]">Delivery Provider Terminal</span>
            <span>•</span>
            <span className="text-apple-900 font-semibold">{user?.username}</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-apple-900">
            {providerMode === 'manager' ? 'Fleet Dispatch & Manager Center' : 'Courier Route Navigation'}
          </h1>
          <p className="text-xs text-apple-500 mt-0.5">
            {providerMode === 'manager' 
              ? 'Manage network incoming dispatches, assign couriers, and monitor revenue splits.'
              : 'Claim available dispatches, stream live GPS routes, and confirm recipient handovers.'}
          </p>
        </div>

        {/* Manager vs Agent Toggle */}
        <div className="flex bg-apple-100/80 p-1 rounded-2xl border border-black/[0.04] text-xs">
          <button
            onClick={() => setProviderMode('manager')}
            className={`px-4 py-1.5 rounded-xl transition flex items-center gap-1.5 font-medium ${
              providerMode === 'manager'
                ? 'bg-white text-apple-900 font-semibold shadow-xs'
                : 'text-apple-600 hover:text-black'
            }`}
          >
            <Briefcase size={13} />
            <span>Delivery Manager</span>
          </button>
          <button
            onClick={() => setProviderMode('agent')}
            className={`px-4 py-1.5 rounded-xl transition flex items-center gap-1.5 font-medium ${
              providerMode === 'agent'
                ? 'bg-white text-apple-900 font-semibold shadow-xs'
                : 'text-apple-600 hover:text-black'
            }`}
          >
            <Truck size={13} />
            <span>Delivery Agent</span>
          </button>
        </div>
      </div>

      {actionError && (
        <div className="p-3.5 bg-red-50/80 border border-red-200 rounded-2xl text-red-600 text-xs flex items-center gap-2">
          <AlertCircle size={15} className="shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      {actionSuccess && (
        <div className="p-3.5 bg-emerald-50/80 border border-emerald-200 rounded-2xl text-emerald-700 text-xs flex items-center gap-2">
          <Check size={15} className="shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* DELIVERY MANAGER MODE */}
      {providerMode === 'manager' ? (
        <div className="space-y-6">
          {/* Revenue HUD */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="glass-panel p-4 rounded-2xl">
              <span className="text-[10px] text-apple-400 uppercase font-mono block">Total Orders</span>
              <span className="text-xl font-bold text-apple-900 mt-1 block">{shipments.length}</span>
            </div>
            <div className="glass-panel p-4 rounded-2xl">
              <span className="text-[10px] text-apple-400 uppercase font-mono block">Awaiting Courier</span>
              <span className="text-xl font-bold text-apple-900 mt-1 block">{unassignedPool.length}</span>
            </div>
            <div className="glass-panel p-4 rounded-2xl">
              <span className="text-[10px] text-apple-400 uppercase font-mono block">Gross Volume</span>
              <span className="text-xl font-bold text-apple-900 mt-1 block">
                ${shipments.reduce((acc, s) => acc + parseFloat(s.delivery_fee || 0), 0).toFixed(2)}
              </span>
            </div>
            <div className="glass-panel p-4 rounded-2xl">
              <span className="text-[10px] text-apple-400 uppercase font-mono block">Provider Take (22%)</span>
              <span className="text-xl font-bold text-apple-900 mt-1 block">
                ${(shipments.reduce((acc, s) => acc + parseFloat(s.delivery_fee || 0), 0) * 0.22).toFixed(2)}
              </span>
            </div>
          </div>

          {/* Dispatch Queue */}
          <div className="glass-panel rounded-3xl p-6 shadow-glass">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-apple-900">
                Provider Dispatch Queue
              </h2>
              <span className="text-xs text-apple-400">
                {unassignedPool.length} unassigned
              </span>
            </div>

            <div className="space-y-2.5">
              {shipments.map((s) => (
                <div
                  key={s.id}
                  className="p-4 rounded-2xl bg-white/70 border border-black/[0.04] flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono text-apple-500 bg-apple-100 px-2 py-0.5 rounded">
                        {s.tracking_number}
                      </span>
                      <DeliveryStatusBadge status={s.status} size="sm" />
                      <span className="font-semibold text-apple-900">{s.package_title}</span>
                    </div>
                    <div className="text-[11px] text-apple-400 flex flex-wrap gap-3">
                      <span>Pickup: {s.pickup_address}</span>
                      <span>Dropoff: {s.dropoff_address}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <span className="text-[10px] text-apple-400 block">Total Fare</span>
                      <span className="font-semibold text-apple-900 font-mono">${s.delivery_fee}</span>
                    </div>

                    {!s.assigned_agent ? (
                      <button
                        onClick={() => handleClaimOrder(s.id)}
                        className="px-3.5 py-1.5 bg-black hover:bg-zinc-800 text-white font-medium rounded-xl transition text-xs active:scale-[0.98]"
                      >
                        Self-Assign Trip
                      </button>
                    ) : (
                      <span className="text-[11px] text-apple-500 bg-apple-100 px-2.5 py-1 rounded-xl">
                        Assigned: <b className="text-apple-900">{s.agent_name}</b>
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* DELIVERY AGENT MODE */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: My Trips & Open Pool */}
          <div className="lg:col-span-5 space-y-4">
            {/* Open Pool */}
            {unassignedPool.length > 0 && (
              <div className="glass-panel rounded-3xl p-4 shadow-glass space-y-3">
                <span className="text-xs font-semibold text-apple-900 block">
                  Available Open Trips ({unassignedPool.length})
                </span>
                <div className="space-y-2">
                  {unassignedPool.map((order) => (
                    <div
                      key={order.id}
                      className="p-3.5 rounded-2xl bg-white/80 border border-black/[0.04] flex items-center justify-between text-xs"
                    >
                      <div>
                        <span className="text-[10px] font-mono text-apple-400 block">{order.tracking_number}</span>
                        <span className="font-semibold text-apple-900 line-clamp-1">{order.package_title}</span>
                        <span className="text-[10px] text-apple-500 block mt-0.5">${order.delivery_fee} • {order.weight_kg}kg</span>
                      </div>
                      <button
                        onClick={() => handleClaimOrder(order.id)}
                        className="px-3 py-1.5 bg-black text-white hover:bg-zinc-800 font-medium rounded-xl text-xs transition"
                      >
                        Claim Trip
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* My Active Deliveries */}
            <div className="glass-panel rounded-3xl p-4 shadow-glass space-y-3">
              <span className="text-xs font-semibold text-apple-900 block">
                My Trips ({myAssignedDeliveries.length})
              </span>
              <div className="space-y-2">
                {myAssignedDeliveries.length === 0 ? (
                  <div className="text-center py-8 text-apple-400 text-xs">
                    No active trips assigned. Claim an open trip above!
                  </div>
                ) : (
                  myAssignedDeliveries.map((s) => {
                    const isSelected = selectedShipment?.id === s.id;
                    return (
                      <div
                        key={s.id}
                        onClick={() => setSelectedShipment(s)}
                        className={`p-3.5 rounded-2xl border transition cursor-pointer ${
                          isSelected
                            ? 'bg-white border-black/[0.15] shadow-glass ring-2 ring-black/[0.04]'
                            : 'glass-card'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] font-mono text-apple-400">{s.tracking_number}</span>
                          <DeliveryStatusBadge status={s.status} size="sm" />
                        </div>
                        <h4 className="text-xs font-semibold text-apple-900">{s.package_title}</h4>
                        <div className="mt-2 pt-2 border-t border-black/[0.04] flex items-center justify-between text-[11px] text-apple-500">
                          <span>{s.category}</span>
                          <span className="font-semibold text-apple-900 font-mono">${s.delivery_fee}</span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Active Navigation & Handover Terminal */}
          <div className="lg:col-span-7">
            {selectedShipment ? (
              <div className="glass-panel rounded-3xl p-6 shadow-glass space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-apple-700 bg-apple-100 border border-black/[0.04] px-2 py-0.5 rounded">
                        {selectedShipment.tracking_number}
                      </span>
                      <DeliveryStatusBadge status={selectedShipment.status} />
                    </div>
                    <h3 className="text-base font-semibold text-apple-900 mt-1">
                      {selectedShipment.package_title}
                    </h3>
                  </div>

                  {/* LIVE GPS BROADCAST TOGGLE */}
                  <button
                    onClick={toggleGpsSimulator}
                    disabled={selectedShipment.status === 'DELIVERED'}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-medium transition flex items-center gap-2 shadow-xs ${
                      isSimulatingGps
                        ? 'bg-black text-white animate-pulse'
                        : 'bg-white hover:bg-apple-100 text-apple-900 border border-black/[0.08]'
                    } disabled:opacity-40`}
                  >
                    {isSimulatingGps ? (
                      <>
                        <Pause size={13} />
                        <span>Broadcasting GPS Live</span>
                      </>
                    ) : (
                      <>
                        <Play size={13} />
                        <span>Broadcast GPS Route</span>
                      </>
                    )}
                  </button>
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
                  agentName={user.username}
                  vehicleType={user.agent_profile?.vehicle_type || 'Courier'}
                  height="340px"
                />

                {/* ACTION WORKFLOW BUTTONS */}
                <div className="space-y-3 pt-2 border-t border-black/[0.06]">
                  <span className="text-[11px] text-apple-400 uppercase font-mono tracking-wider block">
                    Execution Actions
                  </span>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <button
                      onClick={() => handleStatusTransition('PICKED_UP')}
                      disabled={updatingStatus || selectedShipment.status !== 'ASSIGNED_TO_AGENT'}
                      className={`p-3 rounded-2xl border text-center transition flex flex-col items-center justify-center ${
                        selectedShipment.status === 'ASSIGNED_TO_AGENT'
                          ? 'bg-black text-white font-semibold shadow-xs'
                          : 'bg-apple-100/60 text-apple-400 border-black/[0.04] opacity-50 cursor-not-allowed'
                      }`}
                    >
                      <Store size={15} className="mb-1" />
                      <span className="text-xs font-semibold">1. Collect Parcel</span>
                    </button>

                    <button
                      onClick={() => handleStatusTransition(selectedShipment.status === 'PICKED_UP' ? 'IN_TRANSIT' : 'OUT_FOR_DELIVERY')}
                      disabled={updatingStatus || !['PICKED_UP', 'IN_TRANSIT'].includes(selectedShipment.status)}
                      className={`p-3 rounded-2xl border text-center transition flex flex-col items-center justify-center ${
                        ['PICKED_UP', 'IN_TRANSIT'].includes(selectedShipment.status)
                          ? 'bg-black text-white font-semibold shadow-xs'
                          : 'bg-apple-100/60 text-apple-400 border-black/[0.04] opacity-50 cursor-not-allowed'
                      }`}
                    >
                      <Navigation size={15} className="mb-1" />
                      <span className="text-xs font-semibold">
                        {selectedShipment.status === 'PICKED_UP' ? '2. In Transit' : '2. Out for Delivery'}
                      </span>
                    </button>

                    <button
                      onClick={() => handleStatusTransition('DELIVERED')}
                      disabled={updatingStatus || !['IN_TRANSIT', 'OUT_FOR_DELIVERY'].includes(selectedShipment.status)}
                      className={`p-3 rounded-2xl border text-center transition flex flex-col items-center justify-center ${
                        ['IN_TRANSIT', 'OUT_FOR_DELIVERY'].includes(selectedShipment.status)
                          ? 'bg-black text-white font-semibold shadow-xs'
                          : 'bg-apple-100/60 text-apple-400 border-black/[0.04] opacity-50 cursor-not-allowed'
                      }`}
                    >
                      <Check size={15} className="mb-1" />
                      <span className="text-xs font-semibold">3. Handover PIN</span>
                    </button>
                  </div>

                  {/* Recipient PIN Verification Field */}
                  {['IN_TRANSIT', 'OUT_FOR_DELIVERY'].includes(selectedShipment.status) && (
                    <div className="p-3.5 bg-apple-100/70 rounded-2xl border border-black/[0.04] flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 text-xs text-apple-800">
                        <KeyRound size={15} className="text-apple-900" />
                        <span>Enter recipient's 4-digit PIN:</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          maxLength={4}
                          placeholder="PIN"
                          value={deliveryOtp}
                          onChange={(e) => setDeliveryOtp(e.target.value)}
                          className="w-24 text-center font-bold px-3 py-1.5 bg-white border border-black/[0.08] rounded-xl text-apple-900 focus:outline-none tracking-widest text-sm font-mono"
                        />
                        <button
                          onClick={() => handleStatusTransition('DELIVERED')}
                          disabled={updatingStatus || deliveryOtp.length !== 4}
                          className="px-3.5 py-1.5 bg-black text-white font-medium rounded-xl text-xs transition disabled:opacity-40"
                        >
                          Verify
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="glass-panel rounded-3xl p-12 text-center text-apple-400 text-xs">
                Select an assigned trip to initiate live navigation and execution.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
