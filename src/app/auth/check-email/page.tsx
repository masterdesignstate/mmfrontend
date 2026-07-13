'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { API_ENDPOINTS, getApiUrl } from '@/config/api';

export default function CheckEmailPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const email = searchParams.get('email') || '';
  const [verificationCode, setVerificationCode] = useState('');
  const [debugVerificationCode, setDebugVerificationCode] = useState(searchParams.get('debug_verification_code') || '');
  const [statusMessage, setStatusMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  const handleCodeChange = (value: string) => {
    setVerificationCode(value.replace(/\D/g, '').slice(0, 6));
  };

  const handleVerify = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!email || loading) return;

    setLoading(true);
    setError('');
    setStatusMessage('');

    try {
      const response = await fetch(getApiUrl(API_ENDPOINTS.VERIFY_EMAIL), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code: verificationCode }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || 'Could not verify that code.');
        return;
      }

      if (data.user_id) {
        localStorage.setItem('user_id', data.user_id);
      }
      localStorage.setItem('user_email', data.email || email);

      const params = new URLSearchParams({
        user_id: data.user_id,
        email: data.email || email,
      });
      router.push(`/auth/personal-details?${params.toString()}`);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!email || resending) return;
    setResending(true);
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
        setError(data.error || 'Could not send a new verification code.');
        return;
      }
      if (data.verification_code) {
        const url = new URL(window.location.href);
        url.searchParams.set('debug_verification_code', data.verification_code);
        window.history.replaceState({}, '', url.toString());
        setDebugVerificationCode(data.verification_code);
      } else {
        const url = new URL(window.location.href);
        url.searchParams.delete('debug_verification_code');
        window.history.replaceState({}, '', url.toString());
        setDebugVerificationCode('');
      }
      setStatusMessage(data.message || 'A new verification code has been sent.');
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setResending(false);
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
              Verify your email
            </h1>
            <p className="text-sm text-gray-600 text-center mb-6">
              {debugVerificationCode
                ? 'Email delivery is in local fallback mode. Use the development code below to finish setting up your account.'
                : `Enter the 6-digit code we sent${email ? ` to ${email}` : ''}.`}
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

            {debugVerificationCode && (
              <div className="mb-4 p-3 bg-purple-50 border border-purple-200 text-purple-900 rounded text-sm text-center">
                Development verification code:{' '}
                <span className="font-semibold tracking-[0.35em]">{debugVerificationCode}</span>
              </div>
            )}

            <form onSubmit={handleVerify} className="space-y-4">
              <div>
                <label htmlFor="verification-code" className="sr-only">
                  Verification code
                </label>
                <input
                  id="verification-code"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  value={verificationCode}
                  onChange={(event) => handleCodeChange(event.target.value)}
                  placeholder="000000"
                  className="w-full rounded-md border border-gray-300 px-4 py-3 text-center text-2xl font-semibold tracking-[0.35em] text-gray-900 focus:border-[#672DB7] focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <button
                type="submit"
                disabled={!email || loading || verificationCode.length !== 6}
                className="w-full bg-[#672DB7] text-white py-3 px-4 rounded-md font-medium hover:bg-[#5a2a9e] transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {loading ? 'Verifying...' : 'Verify email'}
              </button>
            </form>

            <button
              type="button"
              onClick={handleResend}
              disabled={!email || resending}
              className="mt-3 w-full border border-gray-300 bg-white text-gray-900 py-3 px-4 rounded-md font-medium hover:bg-gray-50 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {resending ? 'Sending...' : 'Resend code'}
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
