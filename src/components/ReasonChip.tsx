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

export function ReasonChip({ reason, description }: { reason: string; description?: string }) {
  const key = normalizeReason(reason);
  const config = REPORT_REASONS[key];
  const label = config?.label || reason;
  const color = config?.color || 'bg-gray-100 text-gray-800';

  if (description) {
    return (
      <span className="relative group inline-flex">
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap cursor-default ${color}`}>
          {label}
        </span>
        <span className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-normal max-w-xs z-10 text-center">
          {description}
          <span className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></span>
        </span>
      </span>
    );
  }

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${color}`}>
      {label}
    </span>
  );
}
