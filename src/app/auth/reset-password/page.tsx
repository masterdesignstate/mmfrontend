'use client';

import Image from 'next/image';
import Link from 'next/link';
import { FormEvent, Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { API_ENDPOINTS, getApiUrl } from '@/config/api';

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const uid = searchParams.get('uid') || '';
  const token = searchParams.get('token') || '';
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [complete, setComplete] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    if (password !== confirmation) {
      setError('Passwords do not match.');
      return;
    }
    setLoading(true);
    try {
      const response = await fetch(getApiUrl(API_ENDPOINTS.CONFIRM_PASSWORD_RESET), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid, token, new_password: password }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Unable to reset your password.');
      setComplete(true);
    } catch (resetError) {
      setError(resetError instanceof Error ? resetError.message : 'Unable to reset your password.');
    } finally {
      setLoading(false);
    }
  };

  if (!uid || !token) {
    return (
      <div className="text-center">
        <p role="alert" className="rounded-lg bg-red-50 p-4 text-red-700">This password-reset link is incomplete.</p>
        <Link href="/auth/forgot-password" className="mt-6 inline-block font-medium text-[#672DB7] hover:underline">Request a new link</Link>
      </div>
    );
  }

  if (complete) {
    return (
      <div className="text-center">
        <p role="status" className="rounded-lg bg-green-50 p-4 text-green-800">Your password has been reset successfully.</p>
        <Link href="/auth/login" className="mt-6 inline-block rounded-md bg-[#672DB7] px-5 py-3 font-medium text-white hover:bg-[#5a2a9e]">Continue to login</Link>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      <div>
        <label htmlFor="new-password" className="mb-2 block text-sm font-medium text-gray-900">New password</label>
        <input id="new-password" type="password" autoComplete="new-password" minLength={8} required disabled={loading} value={password} onChange={(event) => setPassword(event.target.value)} className="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200" />
      </div>
      <div>
        <label htmlFor="confirm-password" className="mb-2 block text-sm font-medium text-gray-900">Confirm new password</label>
        <input id="confirm-password" type="password" autoComplete="new-password" minLength={8} required disabled={loading} value={confirmation} onChange={(event) => setConfirmation(event.target.value)} className="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200" />
      </div>
      <button type="submit" disabled={loading} className="w-full rounded-md bg-[#672DB7] px-4 py-3 font-medium text-white hover:bg-[#5a2a9e] disabled:opacity-50">{loading ? 'Resetting…' : 'Reset password'}</button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <main className="min-h-screen bg-white px-6 py-8">
      <Link href="/" aria-label="CompatibleFirst home">
        <Image src="/assets/mmlogox.png" alt="CompatibleFirst" width={40} height={35} />
      </Link>
      <div className="mx-auto mt-12 w-full max-w-md rounded-lg border border-gray-200 bg-white p-8 shadow-lg">
        <h1 className="mb-6 text-center text-2xl font-semibold text-gray-900">Choose a new password</h1>
        <Suspense fallback={<p className="text-center text-gray-600">Loading…</p>}>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </main>
  );
}
