'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { API_ENDPOINTS, getApiUrl } from '@/config/api';

type VerifyState = 'loading' | 'success' | 'error';

export default function VerifyEmailPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [state, setState] = useState<VerifyState>('loading');
  const [message, setMessage] = useState('Verifying your email...');
  const token = searchParams.get('token');

  useEffect(() => {
    const verify = async () => {
      if (!token) {
        setState('error');
        setMessage('This verification link is missing a token.');
        return;
      }

      try {
        const response = await fetch(getApiUrl(API_ENDPOINTS.VERIFY_EMAIL), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        });
        const data = await response.json();

        if (!response.ok) {
          setState('error');
          setMessage(data.error || 'This verification link is invalid or expired.');
          return;
        }

        if (data.user_id) {
          localStorage.setItem('user_id', data.user_id);
        }
        if (data.email) {
          localStorage.setItem('user_email', data.email);
        }

        setState('success');
        setMessage('Email verified. Redirecting...');

        const params = new URLSearchParams();
        if (data.user_id) params.set('user_id', data.user_id);
        if (data.email) params.set('email', data.email);
        router.replace(`/auth/personal-details?${params.toString()}`);
      } catch {
        setState('error');
        setMessage('Network error. Please try opening the verification link again.');
      }
    };

    verify();
  }, [router, token]);

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
          <div className="bg-white rounded-lg border border-gray-200 shadow-lg p-8 text-center">
            <h1 className="text-2xl font-semibold text-gray-900 mb-3">
              {state === 'success' ? 'Email verified' : state === 'error' ? 'Verification failed' : 'Verifying email'}
            </h1>
            <p className="text-sm text-gray-600 mb-6">{message}</p>

            {state === 'loading' && (
              <div className="mx-auto animate-spin rounded-full h-8 w-8 border-b-2 border-[#672DB7]" />
            )}

            {state === 'error' && (
              <div className="space-y-3">
                <Link
                  href="/auth/login"
                  className="block w-full bg-[#672DB7] text-white py-3 px-4 rounded-md font-medium hover:bg-[#5a2a9e] transition-colors duration-200"
                >
                  Back to login
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
