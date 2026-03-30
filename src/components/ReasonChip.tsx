import { REPORT_REASONS } from '@/config/reportReasons';

// Map legacy free-text values to category keys
const LEGACY_MAP: Record<string, string> = {
  'Restricted by admin': 'admin_restriction',
  'Permanently banned by admin': 'admin_restriction',
};

function normalizeReason(reason: string): string {
  if (REPORT_REASONS[reason]) return reason;
  if (LEGACY_MAP[reason]) return LEGACY_MAP[reason];
  // Handle "Reported: ..." prefixed values
  if (reason.startsWith('Reported: ') || reason.startsWith('Permanently banned due to report: ')) {
    return 'other';
  }
  return reason;
}

export function ReasonChip({ reason }: { reason: string }) {
  const key = normalizeReason(reason);
  const config = REPORT_REASONS[key];
  const label = config?.label || reason;
  const color = config?.color || 'bg-gray-100 text-gray-800';

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${color}`}>
      {label}
    </span>
  );
}
