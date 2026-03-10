'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useUserGateStatus } from '@/hooks/useUserGateStatus';

interface ProtectedPageGateProps {
  children: React.ReactNode;
  checkOnboarding?: boolean;
}

export default function ProtectedPageGate({ children, checkOnboarding = true }: ProtectedPageGateProps) {
  const router = useRouter();
  const { isBanned, isOnboardingComplete, isLoading, userId } = useUserGateStatus();

  // Redirect to login if no userId (after loading completes)
  if (!isLoading && !userId) {
    router.push('/auth/login');
    return null;
  }

  // Ban overlay takes priority (wait for data to load so we don't flash onboarding first)
  if (!isLoading && isBanned) {
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

  // Onboarding overlay (only after loading completes and only if checkOnboarding is true)
  if (checkOnboarding && !isLoading && !isOnboardingComplete) {
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

            {/* Lock icon */}
            <div className="w-16 h-16 mx-auto mb-4 bg-purple-100 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-[#672DB7]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>

            {/* Message */}
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              Complete Your Profile
            </h2>
            <p className="text-gray-600 mb-6">
              You need to answer all mandatory questions before you can access this page. This helps us find better matches for you.
            </p>

            {/* CTA Button */}
            <button
              onClick={() => router.push('/auth/relationship')}
              className="w-full py-3 bg-[#672DB7] text-white font-semibold rounded-xl hover:bg-[#5624A0] transition-colors duration-200 cursor-pointer"
            >
              Continue Onboarding
            </button>

            {/* Secondary link */}
            <button
              onClick={() => router.push('/profile')}
              className="mt-3 text-sm text-gray-500 hover:text-gray-700 cursor-pointer"
            >
              Go to my profile
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Default: render children immediately — no loading gate
  return <>{children}</>;
}
