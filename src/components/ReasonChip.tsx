import InfoTip from '@/components/InfoTip';
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
    // Tap-to-open rather than hover: the reason behind a restriction is exactly the sort of
    // thing someone reaches for on a phone, where a hover tooltip never appears.
    return (
      <InfoTip
        label={`Why: ${label}`}
        placement="top"
        align="center"
        panelClassName="w-max max-w-xs text-center"
        triggerClassName={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${color}`}
        trigger={label}
      >
        {description}
      </InfoTip>
    );
  }

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${color}`}>
      {label}
    </span>
  );
}
