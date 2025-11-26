'use client';

import React from 'react';

interface ActivityStatusProps {
  isOnline: boolean;
  lastActive?: string | null;
}

/**
 * Format the last active time to a human-readable string
 * @param lastActive ISO date string of when user was last active
 * @returns Formatted string like "Active now" or "Last seen 2 hrs. ago"
 */
function formatLastActive(isOnline: boolean, lastActive?: string | null): string {
  if (isOnline) {
    return 'Active now';
  }

  if (!lastActive) {
    return 'Last seen recently';
  }

  const now = new Date();
  const lastActiveDate = new Date(lastActive);
  const diffMs = now.getTime() - lastActiveDate.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffWeeks = Math.floor(diffDays / 7);
  const diffMonths = Math.floor(diffDays / 30);

  if (diffMinutes < 1) {
    return 'Active now';
  } else if (diffMinutes < 60) {
    return `Last seen ${diffMinutes} min${diffMinutes !== 1 ? 's' : ''}. ago`;
  } else if (diffHours < 24) {
    return `Last seen ${diffHours} hr${diffHours !== 1 ? 's' : ''}. ago`;
  } else if (diffDays < 7) {
    return `Last seen ${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
  } else if (diffWeeks < 4) {
    return `Last seen ${diffWeeks} week${diffWeeks !== 1 ? 's' : ''} ago`;
  } else if (diffMonths < 12) {
    return `Last seen ${diffMonths} month${diffMonths !== 1 ? 's' : ''} ago`;
  } else {
    return 'Last seen over a year ago';
  }
}

export default function ActivityStatus({ isOnline, lastActive }: ActivityStatusProps) {
  const statusText = formatLastActive(isOnline, lastActive);
  const dotColor = isOnline ? '#10B981' : '#6B7280'; // Green for online, gray for offline

  return (
    <div className="flex items-center gap-2">
      {/* Status dot */}
      <div
        className="w-2 h-2 rounded-full"
        style={{ backgroundColor: dotColor }}
      />
      {/* Status text */}
      <span className="text-sm text-gray-600">
        {statusText}
      </span>
    </div>
  );
}
