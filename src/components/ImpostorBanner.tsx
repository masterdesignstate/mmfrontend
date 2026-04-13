'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { apiService } from '@/services/api';

export function ImpostorBanner() {
  const [isImpostor, setIsImpostor] = useState(false);
  const [targetName, setTargetName] = useState('');
  const [exitError, setExitError] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setIsImpostor(localStorage.getItem('is_impostor') === 'true');
    setTargetName(localStorage.getItem('impostor_target_name') || 'Unknown User');
  }, [pathname]);

  const handleExit = async () => {
    const adminUserId = localStorage.getItem('impostor_admin_user_id');
    if (!adminUserId) {
      // No admin ID saved — just clean up and go back
      localStorage.removeItem('is_impostor');
      localStorage.removeItem('impostor_admin_user_id');
      localStorage.removeItem('impostor_target_name');
      window.location.href = '/dashboard/profiles';
      return;
    }

    try {
      await apiService.impostorExit(adminUserId);
      // Only restore admin state after backend confirms session switch
      localStorage.setItem('user_id', adminUserId);
      localStorage.setItem('is_admin', 'true');
      localStorage.removeItem('is_impostor');
      localStorage.removeItem('impostor_admin_user_id');
      localStorage.removeItem('impostor_target_name');
      window.location.href = '/dashboard/profiles';
    } catch (err) {
      console.error('Impostor exit API call failed:', err);
      setExitError(true);
    }
  };

  // Don't render on dashboard pages — admin can use the dashboard freely
  if (!isImpostor || pathname?.startsWith('/dashboard')) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[9999] bg-amber-500 text-white text-center py-2 px-4 text-sm font-medium shadow-md">
      <i className="fas fa-user-secret mr-2"></i>
      Impostor Mode — Viewing as <strong>{targetName}</strong>
      <button
        onClick={handleExit}
        className="ml-4 underline hover:no-underline font-bold cursor-pointer"
      >
        Exit Impostor Mode
      </button>
      {exitError && (
        <span className="ml-4 text-red-200 font-semibold">
          Exit failed — try again or refresh the page
        </span>
      )}
    </div>
  );
}
