'use client';

import React from 'react';
import Image from 'next/image';
import { useRestrictedStatus } from '@/hooks/useRestrictedStatus';

interface RestrictedUserGateProps {
  children: React.ReactNode;
}

export default function RestrictedUserGate({ children }: RestrictedUserGateProps) {
  const { isBanned, isLoading } = useRestrictedStatus();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-gray-400 text-sm">Loading...</div>
      </div>
    );
  }

  if (!isBanned) {
    return <>{children}</>;
  }

  return (
    <div className="relative min-h-screen">
      {/* Blurred page content as preview */}
      <div className="filter blur-sm brightness-75 pointer-events-none select-none" aria-hidden="true">
        {children}
      </div>

      {/* Overlay */}
      <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-8 text-center">
          {/* Logo */}
          <div className="flex justify-center mb-6">
            <Image
              src="/assets/mmlogox.png"
              alt="Matchmatical"
              width={64}
              height={64}
            />
          </div>

          {/* Ban icon */}
          <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
            </svg>
          </div>

          {/* Message */}
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            Account Restricted
          </h2>
          <p className="text-gray-600">
            Your account has been restricted for violating our Terms of Service.
          </p>
        </div>
      </div>
    </div>
  );
}
