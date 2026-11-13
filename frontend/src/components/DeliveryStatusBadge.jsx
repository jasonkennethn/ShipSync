import React from 'react';
import { 
  Package, 
  UserCheck, 
  Truck, 
  Navigation, 
  MapPin, 
  Check, 
  X 
} from 'lucide-react';

export const DeliveryStatusBadge = ({ status, size = 'md' }) => {
  const configs = {
    ORDER_PLACED: {
      label: 'Order Placed',
      className: 'bg-apple-100 text-apple-800 border-black/[0.06]',
      dotColor: 'bg-apple-400',
      icon: Package,
    },
    ASSIGNED_TO_AGENT: {
      label: 'Agent Assigned',
      className: 'bg-zinc-100 text-zinc-800 border-zinc-200/80',
      dotColor: 'bg-zinc-600',
      icon: UserCheck,
    },
    PICKED_UP: {
      label: 'Collected',
      className: 'bg-zinc-100 text-zinc-900 border-zinc-300',
      dotColor: 'bg-zinc-800',
      icon: Truck,
    },
    IN_TRANSIT: {
      label: 'In Transit',
      className: 'bg-apple-100 text-apple-900 border-black/[0.1] shadow-xs animate-pulse font-semibold',
      dotColor: 'bg-apple-900',
      icon: Navigation,
    },
    OUT_FOR_DELIVERY: {
      label: 'Out for Delivery',
      className: 'bg-black text-white border-black font-semibold',
      dotColor: 'bg-emerald-400',
      icon: MapPin,
    },
    DELIVERED: {
      label: 'Delivered',
      className: 'bg-emerald-50 text-emerald-800 border-emerald-200 font-semibold',
      dotColor: 'bg-emerald-600',
      icon: Check,
    },
    CANCELLED: {
      label: 'Cancelled',
      className: 'bg-red-50 text-red-700 border-red-200',
      dotColor: 'bg-red-500',
      icon: X,
    },
  };

  const config = configs[status] || {
    label: status || 'Unknown',
    className: 'bg-apple-100 text-apple-600 border-black/[0.04]',
    dotColor: 'bg-apple-400',
    icon: Package,
  };

  const Icon = config.icon;
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs';
  const iconSizes = size === 'sm' ? 11 : 12;

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border transition font-medium ${config.className} ${sizeClasses}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${config.dotColor}`} />
      <Icon size={iconSizes} />
      <span>{config.label}</span>
    </span>
  );
};
