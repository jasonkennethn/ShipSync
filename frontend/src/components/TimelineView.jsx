import React from 'react';
import { Check } from 'lucide-react';

export const TimelineView = ({ timeline = [], currentStatus }) => {
  const allStages = [
    { key: 'ORDER_PLACED', label: 'Order Registered', desc: 'Dispatched to provider network' },
    { key: 'ASSIGNED_TO_AGENT', label: 'Agent Assigned', desc: 'Courier assigned by dispatcher' },
    { key: 'PICKED_UP', label: 'Collected from Sender', desc: 'Parcel in driver possession' },
    { key: 'IN_TRANSIT', label: 'In Transit', desc: 'Navigating urban corridor' },
    { key: 'OUT_FOR_DELIVERY', label: 'Arrived in Zone', desc: 'Approaching destination' },
    { key: 'DELIVERED', label: 'Handover Completed', desc: 'Verified with security PIN' }
  ];

  const stageOrder = ['ORDER_PLACED', 'ASSIGNED_TO_AGENT', 'PICKED_UP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED'];
  const currentIndex = stageOrder.indexOf(currentStatus);

  return (
    <div className="py-2">
      <div className="relative pl-5 space-y-4 before:absolute before:left-1.5 before:top-2 before:bottom-2 before:w-[1.5px] before:bg-apple-200">
        {allStages.map((stage, idx) => {
          const isPassed = currentIndex >= idx;
          const isCurrent = currentIndex === idx;
          const matchingTimeline = timeline.find(t => t.status === stage.key);

          return (
            <div key={stage.key} className="relative group">
              {/* Dot */}
              <div
                className={`absolute -left-5 top-1 w-3.5 h-3.5 rounded-full flex items-center justify-center transition-all ${
                  isPassed
                    ? 'bg-black text-white'
                    : 'bg-white border-2 border-apple-300'
                } ${isCurrent ? 'ring-4 ring-black/10 scale-110' : ''}`}
              >
                {isPassed && <Check size={8} strokeWidth={3.5} />}
              </div>

              {/* Content */}
              <div>
                <div className="flex items-center justify-between">
                  <h4 className={`text-xs font-semibold ${isPassed ? 'text-apple-900' : 'text-apple-400'}`}>
                    {stage.label}
                  </h4>
                  {matchingTimeline && (
                    <span className="text-[10px] font-mono text-apple-400">
                      {new Date(matchingTimeline.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-apple-500 mt-0.5">
                  {matchingTimeline ? matchingTimeline.description : stage.desc}
                </p>
                {matchingTimeline && matchingTimeline.updated_by_name && (
                  <span className="inline-block mt-1 text-[10px] text-apple-500 bg-apple-100 border border-black/[0.04] px-1.5 py-0.2 rounded">
                    by {matchingTimeline.updated_by_name}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
