import React, { useEffect, useRef, useState } from 'react';
import { Navigation, MapPin, Store, Compass, RefreshCw, ZoomIn, ZoomOut } from 'lucide-react';

export const LiveTrackingMap = ({
  pickup = { lat: 37.7749, lng: -122.4194, address: 'Pickup Location' },
  dropoff = { lat: 37.7833, lng: -122.4067, address: 'Dropoff Destination' },
  current = { lat: 37.7795, lng: -122.4135 },
  agentName = 'Driver',
  vehicleType = 'Courier',
  height = '420px',
  interactive = true
}) => {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const driverMarkerRef = useRef(null);
  const polylineRef = useRef(null);
  const [mapError, setMapError] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const initMap = async () => {
      try {
        if (!window.L) {
          const L = await import('leaflet');
          window.L = L.default || L;
        }

        const L = window.L;
        if (!mapContainerRef.current || mapInstanceRef.current) return;

        const createDivIcon = (htmlContent, size = [34, 34]) => {
          return L.divIcon({
            html: htmlContent,
            className: 'apple-map-marker',
            iconSize: size,
            iconAnchor: [size[0] / 2, size[1] / 2],
            popupAnchor: [0, -size[1] / 2]
          });
        };

        // Apple Light Pickup Marker
        const pickupHtml = `
          <div style="background:#ffffff; color:#1d1d1f; border:1.5px solid rgba(0,0,0,0.12); border-radius:10px; width:32px; height:32px; display:flex; align-items:center; justify-content:center; box-shadow:0 4px 12px rgba(0,0,0,0.08);">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7"/><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4"/><path d="M2 7h20"/></svg>
          </div>
        `;

        // Apple Light Dropoff Destination Pin
        const dropoffHtml = `
          <div style="background:#000000; color:#ffffff; border:1.5px solid #000000; border-radius:10px; width:32px; height:32px; display:flex; align-items:center; justify-content:center; box-shadow:0 4px 14px rgba(0,0,0,0.2);">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
          </div>
        `;

        // Apple Driver Marker with Frosted Ring
        const driverHtml = `
          <div class="pulse-apple-driver" style="background:#1d1d1f; color:#ffffff; border-radius:50%; width:38px; height:38px; display:flex; align-items:center; justify-content:center; box-shadow:0 6px 18px rgba(0,0,0,0.25); border:2.5px solid #ffffff; cursor:pointer;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="3 11 22 2 13 21 11 13 3 11"/></svg>
          </div>
        `;

        const map = L.map(mapContainerRef.current, {
          center: [current.lat, current.lng],
          zoom: 14,
          zoomControl: false,
          scrollWheelZoom: interactive,
          dragging: interactive
        });

        // CartoDB Positron / OpenStreetMap (Free, No API Key Required)
        const tileLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
          maxZoom: 19,
          subdomains: 'abcd'
        });

        tileLayer.on('tileerror', () => {
          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
        });

        tileLayer.addTo(map);

        // Add Markers
        L.marker([pickup.lat, pickup.lng], {
          icon: createDivIcon(pickupHtml)
        })
          .addTo(map)
          .bindPopup(`<div style="font-family:-apple-system,sans-serif; font-size:12px; color:#1d1d1f;"><b>Pickup:</b><br/>${pickup.address}</div>`);

        L.marker([dropoff.lat, dropoff.lng], {
          icon: createDivIcon(dropoffHtml)
        })
          .addTo(map)
          .bindPopup(`<div style="font-family:-apple-system,sans-serif; font-size:12px; color:#1d1d1f;"><b>Dropoff:</b><br/>${dropoff.address}</div>`);

        const driverMarker = L.marker([current.lat, current.lng], {
          icon: createDivIcon(driverHtml, [38, 38]),
          zIndexOffset: 1000
        })
          .addTo(map)
          .bindPopup(`<div style="font-family:-apple-system,sans-serif; font-size:12px; color:#1d1d1f;"><b>Courier:</b> ${agentName}<br/><b>Vehicle:</b> ${vehicleType}</div>`);

        driverMarkerRef.current = driverMarker;

        // Route Polyline
        const routePoints = [
          [pickup.lat, pickup.lng],
          [current.lat, current.lng],
          [dropoff.lat, dropoff.lng]
        ];

        const polyline = L.polyline(routePoints, {
          color: '#1d1d1f',
          weight: 3.5,
          opacity: 0.85,
          dashArray: '6, 8',
          lineCap: 'round'
        }).addTo(map);

        polylineRef.current = polyline;

        const bounds = L.latLngBounds(routePoints);
        map.fitBounds(bounds, { padding: [40, 40] });

        mapInstanceRef.current = map;
      } catch (err) {
        console.warn('Map initialization error:', err);
        if (isMounted) setMapError(true);
      }
    };

    initMap();

    return () => {
      isMounted = false;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Live GPS movement update
  useEffect(() => {
    if (mapInstanceRef.current && window.L && driverMarkerRef.current) {
      const newPos = [current.lat, current.lng];
      driverMarkerRef.current.setLatLng(newPos);

      if (polylineRef.current) {
        polylineRef.current.setLatLngs([
          [pickup.lat, pickup.lng],
          newPos,
          [dropoff.lat, dropoff.lng]
        ]);
      }
    }
  }, [current.lat, current.lng, pickup.lat, pickup.lng, dropoff.lat, dropoff.lng]);

  const handleRecenter = () => {
    if (mapInstanceRef.current && window.L) {
      const L = window.L;
      const bounds = L.latLngBounds([
        [pickup.lat, pickup.lng],
        [current.lat, current.lng],
        [dropoff.lat, dropoff.lng]
      ]);
      mapInstanceRef.current.fitBounds(bounds, { padding: [35, 35] });
    }
  };

  const handleZoom = (delta) => {
    if (mapInstanceRef.current) {
      if (delta > 0) mapInstanceRef.current.zoomIn();
      else mapInstanceRef.current.zoomOut();
    }
  };

  return (
    <div className="relative rounded-2xl overflow-hidden border border-black/[0.08] bg-apple-50 shadow-glass" style={{ height }}>
      {!mapError ? (
        <div ref={mapContainerRef} className="w-full h-full" />
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center bg-apple-100 text-apple-900 p-6 relative">
          <div className="flex items-center gap-1.5 mb-3 bg-white px-3 py-1 rounded-full text-xs border border-black/[0.06] shadow-xs">
            <Compass className="animate-spin text-apple-700" size={13} />
            <span className="font-medium">Active Vector Route</span>
          </div>
          <p className="text-xs text-apple-500 font-mono">
            {current.lat.toFixed(4)}, {current.lng.toFixed(4)} • Driver: {agentName}
          </p>
        </div>
      )}

      {/* Floating Frosted Glass Controls */}
      <div className="absolute top-3 right-3 z-[400] flex flex-col gap-1.5">
        <button
          onClick={handleRecenter}
          title="Recenter Route"
          className="p-2 glass-panel hover:bg-white text-apple-700 hover:text-black rounded-xl transition shadow-glass"
        >
          <RefreshCw size={13} />
        </button>
        <button
          onClick={() => handleZoom(1)}
          title="Zoom In"
          className="p-2 glass-panel hover:bg-white text-apple-700 hover:text-black rounded-xl transition shadow-glass"
        >
          <ZoomIn size={13} />
        </button>
        <button
          onClick={() => handleZoom(-1)}
          title="Zoom Out"
          className="p-2 glass-panel hover:bg-white text-apple-700 hover:text-black rounded-xl transition shadow-glass"
        >
          <ZoomOut size={13} />
        </button>
      </div>

      {/* Floating Telemetry Pill */}
      <div className="absolute bottom-3 left-3 z-[400] glass-panel px-3 py-1.5 rounded-full shadow-glass flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
        <span className="text-xs font-semibold text-apple-900">
          Live GPS
        </span>
        <span className="text-[10px] text-apple-400 font-mono">
          ({current.lat.toFixed(4)}, {current.lng.toFixed(4)})
        </span>
      </div>
    </div>
  );
};
