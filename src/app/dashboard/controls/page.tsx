'use client';

import { useState, useEffect } from 'react';
import { getApiUrl, API_ENDPOINTS } from '@/config/api';

interface Controls {
  id: number;
  adjust: number;
  exponent: number;
  ota: number;
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
        credentials: 'include',
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
        credentials: 'include',
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
