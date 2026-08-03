'use client';

import Image from 'next/image';
import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { API_ENDPOINTS, getApiUrl } from '@/config/api';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      const response = await fetch(getApiUrl(API_ENDPOINTS.REQUEST_PASSWORD_RESET), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Unable to request a reset link.');
      setSent(true);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to request a reset link.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-white px-6 py-8">
      <Link href="/" aria-label="CompatibleFirst home">
        <Image src="/assets/mmlogox.png" alt="CompatibleFirst" width={40} height={35} />
      </Link>
      <div className="mx-auto mt-12 w-full max-w-md rounded-lg border border-gray-200 bg-white p-8 shadow-lg">
        <h1 className="text-center text-2xl font-semibold text-gray-900">Reset your password</h1>
        {sent ? (
          <div className="mt-6 text-center">
            <p role="status" className="rounded-lg bg-green-50 p-4 text-green-800">
              If an account exists for that email, we sent a password-reset link.
            </p>
            <p className="mt-4 text-sm text-gray-600">Check your inbox and spam folder. The link expires in one hour.</p>
            <Link href="/auth/login" className="mt-6 inline-block font-medium text-[#672DB7] hover:underline">Back to login</Link>
          </div>
        ) : (
          <form onSubmit={submit} className="mt-6 space-y-5">
            <p className="text-sm text-gray-600">Enter the email address associated with your account.</p>
            {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
            <div>
              <label htmlFor="reset-email" className="mb-2 block text-sm font-medium text-gray-900">Email</label>
              <input id="reset-email" type="email" autoComplete="email" required disabled={loading} value={email} onChange={(event) => setEmail(event.target.value)} className="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200" />
            </div>
            <button type="submit" disabled={loading} className="w-full rounded-md bg-[#672DB7] px-4 py-3 font-medium text-white hover:bg-[#5a2a9e] disabled:opacity-50">
              {loading ? 'Sending…' : 'Send reset link'}
            </button>
            <div className="text-center"><Link href="/auth/login" className="text-sm text-[#672DB7] hover:underline">Back to login</Link></div>
          </form>
        )}
      </div>
    </main>
  );
}
