'use client';

import { useState, useEffect } from 'react';
import { getApiUrl, API_ENDPOINTS } from '@/config/api';

interface Controls {
  id: number;
  adjust: number;
  exponent: number;
  ota: number;
  // Optional: a backend that predates the auto-updater migration omits these
  // entirely. Absent means "this deploy has no switches", NOT "switched off" --
  // see supportsAutoUpdaterToggles below.
  auto_updater_enabled?: boolean;
  auto_answer_required_enabled?: boolean;
  created_at: string;
  updated_at: string;
}

interface FormState {
  adjust: string;
  exponent: string;
  ota: string;
}

export default function ControlsPage() {
  const [controls, setControls] = useState<Controls | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  // Form state
  const [formData, setFormData] = useState<FormState>({
    adjust: '5.0',
    exponent: '2.0',
    ota: '0.5',
  });

  // Fetch current controls
  const fetchControls = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(getApiUrl(API_ENDPOINTS.CONTROLS_CURRENT), {
        credentials: 'omit',
      });
      if (!response.ok) {
        throw new Error('Failed to fetch controls');
      }

      const data = await response.json();
      setControls(data);
      setFormData({
        adjust: data.adjust?.toString() ?? '',
        exponent: data.exponent?.toString() ?? '',
        ota: data.ota?.toString() ?? '',
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load controls');
      console.error('Error fetching controls:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchControls();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const decimalPattern = /^(\d+)?(\.)?(\d+)?$/;

    if (value === '' || decimalPattern.test(value)) {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  // Whether the connected backend actually knows about the switches. An older
  // deploy omits the fields, and rendering that as "off" would wrongly imply the
  // background job is disabled when it is in fact running normally.
  const supportsAutoUpdaterToggles = !!controls && 'auto_updater_enabled' in controls;
  // Both fields default to True server-side, so treat a missing value as on.
  const autoUpdaterEnabled = controls?.auto_updater_enabled ?? true;
  const autoAnswerRequiredEnabled = controls?.auto_answer_required_enabled ?? true;

  // Kill switches apply immediately rather than going through the edit/Save
  // flow used by the numeric knobs -- when you're turning the background job
  // off you want it off now, not after a second click.
  const handleToggle = async (
    field: 'auto_updater_enabled' | 'auto_answer_required_enabled',
    value: boolean,
  ) => {
    if (!controls) return;

    const previous = controls;
    // Optimistic update so the switch responds instantly.
    setControls({ ...controls, [field]: value });
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(`${getApiUrl(API_ENDPOINTS.CONTROLS)}${controls.id}/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: value }),
      });

      if (!response.ok) {
        throw new Error('Failed to update setting');
      }

      const updatedData = await response.json();
      setControls(updatedData);
      setSuccess(
        field === 'auto_updater_enabled'
          ? `Auto updater ${value ? 'enabled' : 'disabled'}.`
          : `Required-question answering ${value ? 'enabled' : 'disabled'}.`,
      );
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setControls(previous); // Roll back so the UI can't claim a state the server rejected.
      setError(err instanceof Error ? err.message : 'Failed to update setting');
      console.error('Error toggling control:', err);
    }
  };

  const handleSave = async () => {
    if (!controls) return;

    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      const payload = {
        adjust: parseFloat(formData.adjust || '0'),
        exponent: parseFloat(formData.exponent || '0'),
        ota: parseFloat(formData.ota || '0'),
      };

      const response = await fetch(`${getApiUrl(API_ENDPOINTS.CONTROLS)}${controls.id}/`, {
        method: 'PATCH',

        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error('Failed to update controls');
      }

      const updatedData = await response.json();
      setControls(updatedData);
      setFormData({
        adjust: updatedData.adjust?.toString() ?? '',
        exponent: updatedData.exponent?.toString() ?? '',
        ota: updatedData.ota?.toString() ?? '',
      });
      setSuccess('Controls updated successfully!');
      setIsEditing(false);

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save controls');
      console.error('Error saving controls:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (controls) {
      setFormData({
        adjust: controls.adjust?.toString() ?? '',
        exponent: controls.exponent?.toString() ?? '',
        ota: controls.ota?.toString() ?? '',
      });
    }
    setIsEditing(false);
    setError(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="h-12 w-12 animate-spin rounded-full border-2 border-gray-200 border-t-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div>
        <h1 className="text-4xl font-semibold tracking-tight text-gray-900">App Controls</h1>
      </div>

      {error && (
        <div className="p-4 rounded-2xl border border-red-200/80 bg-red-50/80">
          <p className="text-sm font-medium text-red-700">{error}</p>
        </div>
      )}

      {success && (
        <div className="p-4 rounded-2xl border border-emerald-200/80 bg-emerald-50/90">
          <p className="text-sm font-medium text-emerald-700">{success}</p>
        </div>
      )}

      <div className="bg-white rounded-3xl border border-gray-200/60 shadow-[0_24px_60px_-32px_rgba(15,23,42,0.35)] overflow-hidden">
        <div className="px-6 py-6 border-b border-gray-100">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Control Values</h2>
              <p className="text-sm text-gray-500">Precision settings for compatibility scoring.</p>
            </div>
            {!isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                className="self-start inline-flex items-center gap-2 rounded-full border border-gray-200 px-4 py-2 text-sm font-medium text-gray-800 transition hover:border-gray-300 hover:bg-gray-50"
              >
                <span>Edit</span>
              </button>
            )}
          </div>
        </div>

        <div className="p-6 space-y-8">
          {/* Adjust Field */}
          <div>
            <label htmlFor="adjust" className="block text-xs font-semibold uppercase tracking-[0.14em] text-gray-500 mb-3">
              Adjust
            </label>
            {isEditing ? (
              <input
                type="text"
                id="adjust"
                name="adjust"
                value={formData.adjust}
                onChange={handleInputChange}
                step="0.1"
                inputMode="decimal"
                className="appearance-none w-full rounded-2xl border border-gray-200/90 bg-white px-4 py-3 text-base text-gray-900 shadow-sm transition focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
              />
            ) : (
              <div className="text-3xl font-light text-gray-900">{controls?.adjust}</div>
            )}
          </div>

          {/* Exponent Field */}
          <div>
            <label htmlFor="exponent" className="block text-xs font-semibold uppercase tracking-[0.14em] text-gray-500 mb-3">
              Exponent
            </label>
            {isEditing ? (
              <input
                type="text"
                id="exponent"
                name="exponent"
                value={formData.exponent}
                onChange={handleInputChange}
                step="0.1"
                inputMode="decimal"
                className="appearance-none w-full rounded-2xl border border-gray-200/90 bg-white px-4 py-3 text-base text-gray-900 shadow-sm transition focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
              />
            ) : (
              <div className="text-3xl font-light text-gray-900">{controls?.exponent}</div>
            )}
          </div>

          {/* OTA Field */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label htmlFor="ota" className="block text-xs font-semibold uppercase tracking-[0.14em] text-gray-500">
                OTA
              </label>
              <span className="text-xs font-medium text-gray-400">0.0 – 1.0</span>
            </div>
            {isEditing ? (
              <input
                type="text"
                id="ota"
                name="ota"
                value={formData.ota}
                onChange={handleInputChange}
                step="0.01"
                min="0"
                max="1"
                inputMode="decimal"
                className="appearance-none w-full rounded-2xl border border-gray-200/90 bg-white px-4 py-3 text-base text-gray-900 shadow-sm transition focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
              />
            ) : (
              <div className="text-3xl font-light text-gray-900">{controls?.ota}</div>
            )}
          </div>

          {/* Background job kill switches -- saved immediately, independent of the edit/Save flow above */}
          <div className="pt-6 border-t border-gray-100 space-y-5">
            <div>
              <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-500">
                Background Activity
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                Controls the scheduled job that simulates activity. Changes apply immediately.
              </p>
              {controls && !supportsAutoUpdaterToggles && (
                <p className="mt-2 text-xs font-medium text-amber-600">
                  This backend doesn&apos;t have the switches yet, so they can&apos;t be changed here.
                  The job is running with its defaults (both on). Deploy and run migrations to enable them.
                </p>
              )}
            </div>

            <div className="flex items-start justify-between gap-6">
              <div>
                <div className="text-sm font-medium text-gray-900">Auto updater</div>
                <p className="mt-0.5 text-sm text-gray-500">
                  Master switch. When off, the job does nothing at all.
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
                <input
                  type="checkbox"
                  checked={autoUpdaterEnabled}
                  onChange={(e) => handleToggle('auto_updater_enabled', e.target.checked)}
                  disabled={!supportsAutoUpdaterToggles}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:bg-gray-900 peer-focus:ring-2 peer-focus:ring-gray-900 peer-focus:ring-offset-2 peer-disabled:opacity-40 transition-colors"></div>
                <div className="absolute w-5 h-5 ml-0.5 bg-white rounded-full shadow transition-transform peer-checked:translate-x-5 pointer-events-none"></div>
              </label>
            </div>

            <div className="flex items-start justify-between gap-6">
              <div>
                <div className="text-sm font-medium text-gray-900">Answer required questions</div>
                <p className="mt-0.5 text-sm text-gray-500">
                  Auto-answers pending required questions for real (non-dummy) users. Simulated
                  accounts are never touched.
                </p>
                {supportsAutoUpdaterToggles && !autoUpdaterEnabled && (
                  <p className="mt-1 text-xs font-medium text-amber-600">
                    Inactive while the auto updater is off.
                  </p>
                )}
              </div>
              <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
                <input
                  type="checkbox"
                  checked={autoAnswerRequiredEnabled}
                  onChange={(e) => handleToggle('auto_answer_required_enabled', e.target.checked)}
                  disabled={!supportsAutoUpdaterToggles}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:bg-gray-900 peer-focus:ring-2 peer-focus:ring-gray-900 peer-focus:ring-offset-2 peer-disabled:opacity-40 transition-colors"></div>
                <div className="absolute w-5 h-5 ml-0.5 bg-white rounded-full shadow transition-transform peer-checked:translate-x-5 pointer-events-none"></div>
              </label>
            </div>
          </div>

          {/* Action Buttons (shown only when editing) */}
          {isEditing && (
            <div className="flex flex-wrap items-center gap-3 pt-6 border-t border-gray-100">
              <button
                onClick={handleSave}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-full bg-gray-900 px-6 py-2 text-sm font-medium text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-40"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
              <button
                onClick={handleCancel}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-6 py-2 text-sm font-medium text-gray-700 transition hover:border-gray-300 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Cancel
              </button>
            </div>
          )}
        </div>

        {/* Metadata */}
        {controls && (
          <div className="px-6 py-5 border-t border-gray-100 bg-white/60">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm text-gray-500">
              <div className="space-y-1">
                <span className="block text-xs font-semibold uppercase tracking-[0.12em] text-gray-400">
                  Created
                </span>
                <span className="text-gray-700">{new Date(controls.created_at).toLocaleString()}</span>
              </div>
              <div className="space-y-1">
                <span className="block text-xs font-semibold uppercase tracking-[0.12em] text-gray-400">
                  Last Updated
                </span>
                <span className="text-gray-700">{new Date(controls.updated_at).toLocaleString()}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
