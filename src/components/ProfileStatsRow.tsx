'use client';

import React from 'react';
import ActivityStatus from '@/components/ActivityStatus';
import { formatLocation } from '@/utils/formatLocation';

interface ProfileStatsRowProps {
  fromLocation?: string | null;
  live?: string | null;
  heightCm?: number | null;
  isOnline?: boolean;
  lastActive?: string | null;
}

/** Height in feet and inches, e.g. `5'-3"`. */
export const formatHeight = (heightCm: number | null | undefined): string => {
  if (!heightCm) return `5'-3"`;

  const totalInches = Math.round(heightCm / 2.54);
  const feet = Math.floor(totalInches / 12);
  const inches = totalInches % 12;

  return `${feet}'-${inches}"`;
};

/**
 * The From / Live / Height / Activity row, shared by your own profile and everyone else's.
 *
 * It lived twice, and the two copies had drifted: only one of them handled narrow screens,
 * so the other spilled its values past the card edge on a phone.
 */
export default function ProfileStatsRow({
  fromLocation,
  live,
  heightCm,
  isOnline,
  lastActive,
}: ProfileStatsRowProps) {
  const cells: Array<{ label: string; content: React.ReactNode }> = [
    { label: 'From', content: formatLocation(fromLocation) || 'Austin' },
    { label: 'Live', content: formatLocation(live) || 'Austin' },
    { label: 'Height', content: formatHeight(heightCm) },
    {
      label: 'Activity',
      content: (
        <div className="flex min-w-0 items-center justify-center">
          <ActivityStatus isOnline={isOnline || false} lastActive={lastActive} />
        </div>
      ),
    },
  ];

  return (
    <div className="w-full max-w-xl mx-auto mb-4 rounded-2xl ring-1 ring-gray-200 bg-white px-4 py-2.5 shadow-sm">
      {/* Two columns on a phone: four 65px tracks cannot hold values like
          "Brownsville" or "10 months ago", which then spill past the card edge. */}
      <div className="grid grid-cols-2 gap-x-3 gap-y-2 sm:grid-cols-4 sm:gap-3">
        {cells.map(cell => (
          <div key={cell.label} className="min-w-0 text-center">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{cell.label}</h3>
            <div className="mt-1 truncate text-sm font-medium text-gray-900">{cell.content}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
