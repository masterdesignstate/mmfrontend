export const REPORT_REASONS: Record<string, { label: string; color: string }> = {
  fake_profile: { label: 'Fake Profile', color: 'bg-purple-100 text-purple-800' },
  inappropriate_photos: { label: 'Inappropriate Photos', color: 'bg-pink-100 text-pink-800' },
  harassment: { label: 'Harassment', color: 'bg-red-100 text-red-800' },
  spam: { label: 'Spam', color: 'bg-yellow-100 text-yellow-800' },
  offensive_language: { label: 'Offensive Language', color: 'bg-orange-100 text-orange-800' },
  scam_fraud: { label: 'Scam / Fraud', color: 'bg-rose-100 text-rose-800' },
  underage_user: { label: 'Underage User', color: 'bg-red-200 text-red-900' },
  other: { label: 'Other', color: 'bg-gray-100 text-gray-800' },
  admin_restriction: { label: 'Admin Restriction', color: 'bg-gray-100 text-gray-800' },
};

// User-facing reasons (excludes admin_restriction)
export const USER_REPORT_REASONS = Object.entries(REPORT_REASONS)
  .filter(([key]) => key !== 'admin_restriction')
  .map(([key, val]) => ({ key, label: val.label }));
