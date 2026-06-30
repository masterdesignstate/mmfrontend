'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { API_ENDPOINTS, getApiUrl } from '@/config/api';

export default function CheckEmailPage() {
  const searchParams = useSearchParams();
  const email = searchParams.get('email') || '';
  const [debugVerificationUrl, setDebugVerificationUrl] = useState(searchParams.get('debug_verification_url') || '');
  const [statusMessage, setStatusMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleResend = async () => {
    if (!email || loading) return;
    setLoading(true);
    setError('');
    setStatusMessage('');

    try {
      const response = await fetch(getApiUrl(API_ENDPOINTS.RESEND_VERIFICATION_EMAIL), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || 'Could not send a new verification link.');
        return;
      }
      if (data.verification_url) {
        const url = new URL(window.location.href);
        url.searchParams.set('debug_verification_url', data.verification_url);
        window.history.replaceState({}, '', url.toString());
        setDebugVerificationUrl(data.verification_url);
      } else {
        const url = new URL(window.location.href);
        url.searchParams.delete('debug_verification_url');
        window.history.replaceState({}, '', url.toString());
        setDebugVerificationUrl('');
      }
      setStatusMessage(data.message || 'A new verification link has been sent.');
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="flex justify-between items-center px-6 py-4">
        <Image
          src="/assets/mmlogox.png"
          alt="Logo"
          width={40}
          height={40}
          className="w-10 h-10"
        />
      </div>

      <div className="flex justify-center items-center px-6 py-8">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-lg border border-gray-200 shadow-lg p-8">
            <h1 className="text-2xl font-semibold text-gray-900 mb-3 text-center">
              Check your email
            </h1>
            <p className="text-sm text-gray-600 text-center mb-6">
              {debugVerificationUrl
                ? 'Email delivery is in local fallback mode. Use the development link below to finish setting up your account.'
                : `We sent a verification link${email ? ` to ${email}` : ''}. Open it to finish setting up your account.`}
            </p>

            {statusMessage && (
              <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-800 rounded">
                {statusMessage}
              </div>
            )}

            {error && (
              <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
                {error}
              </div>
            )}

            {debugVerificationUrl && (
              <div className="mb-4 p-3 bg-purple-50 border border-purple-200 text-purple-900 rounded text-sm break-words">
                Development verification link:{' '}
                <Link href={debugVerificationUrl} className="underline font-medium">
                  open link
                </Link>
              </div>
            )}

            <button
              type="button"
              onClick={handleResend}
              disabled={!email || loading}
              className="w-full bg-[#672DB7] text-white py-3 px-4 rounded-md font-medium hover:bg-[#5a2a9e] transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {loading ? 'Sending...' : 'Resend verification email'}
            </button>

            <div className="mt-6 text-center">
              <Link href="/auth/login" className="text-sm text-[#672DB7] hover:underline font-medium">
                Back to login
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
