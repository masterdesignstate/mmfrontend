'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';

export default function LoadingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState(0);

  const messages = [
    'Analyzing your preferences',
    'Finding compatible matches',
    'Personalizing your experience',
    'Almost ready'
  ];

  useEffect(() => {
    const userId = searchParams.get('user_id');

    // Save userId to localStorage so profile page can fetch the correct user
    if (userId) {
      localStorage.setItem('user_id', userId);
      sessionStorage.setItem('show_loading_page', 'true');
    }

    // Minimum display time: 5 seconds
    const startTime = Date.now();
    const minDisplayTime = 5000;

    // Simulate progress from 0 to 100%
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 95) {
          return 95;
        }
        return prev + 0.5;
      });
    }, 25);

    // Change message every 600ms
    const messageInterval = setInterval(() => {
      setMessage(prev => (prev + 1) % messages.length);
    }, 600);

    // Wait for at least 5 seconds, then navigate
    const navigateTimeout = setTimeout(() => {
      clearInterval(progressInterval);
      clearInterval(messageInterval);
      
      // Check if profile is ready (flag was cleared)
      const profileReady = !sessionStorage.getItem('show_loading_page');
      
      if (profileReady || true) { // Always navigate after minimum time
        if (userId) {
          router.push(`/profile?user_id=${userId}`);
        } else {
          router.push('/profile');
        }
      }
    }, minDisplayTime);

    return () => {
      clearInterval(progressInterval);
      clearInterval(messageInterval);
      clearTimeout(navigateTimeout);
    };
  }, [router, searchParams, messages.length]);

  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="max-w-md w-full px-6">
        {/* Logo centered */}
        <div className="flex justify-center mb-16">
          <Image
            src="/assets/mmlogox.png"
            alt="Matchmatical"
            width={120}
            height={120}
            priority
          />
        </div>

        {/* Message with fade transition */}
        <div className="text-center mb-12 min-h-[40px]">
          <p className="text-xl text-gray-700 font-medium" key={message}>
            {messages[message]}
          </p>
        </div>

        {/* Progress indicator - minimalistic dots */}
        <div className="flex justify-center gap-2 mb-8">
          <div className="w-1.5 h-1.5 bg-gray-400 rounded-full transition-all duration-300" style={{ 
            opacity: progress > 25 ? 1 : 0.3,
            transform: progress > 25 ? 'scale(1.2)' : 'scale(1)'
          }}></div>
          <div className="w-1.5 h-1.5 bg-gray-400 rounded-full transition-all duration-300" style={{ 
            opacity: progress > 50 ? 1 : 0.3,
            transform: progress > 50 ? 'scale(1.2)' : 'scale(1)'
          }}></div>
          <div className="w-1.5 h-1.5 bg-gray-400 rounded-full transition-all duration-300" style={{ 
            opacity: progress > 75 ? 1 : 0.3,
            transform: progress > 75 ? 'scale(1.2)' : 'scale(1)'
          }}></div>
          <div className="w-1.5 h-1.5 bg-gray-400 rounded-full transition-all duration-300" style={{ 
            opacity: progress > 90 ? 1 : 0.3,
            transform: progress > 90 ? 'scale(1.2)' : 'scale(1)'
          }}></div>
        </div>

        {/* Minimal progress bar */}
        <div className="w-full bg-gray-100 rounded-full h-0.5 overflow-hidden">
          <div
            className="h-full bg-[#672DB7] rounded-full transition-all duration-200 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
}
