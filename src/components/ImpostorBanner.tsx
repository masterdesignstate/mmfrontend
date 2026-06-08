'use client';

import { useState, useEffect, useRef, type PointerEvent } from 'react';
import { usePathname } from 'next/navigation';
import { apiService } from '@/services/api';

type BannerPosition = {
  x: number;
  y: number;
};

const POSITION_KEY = 'impostor_banner_position';

const clampPosition = (x: number, y: number, width: number, height: number): BannerPosition => {
  if (typeof window === 'undefined') {
    return { x, y };
  }

  const margin = 12;
  return {
    x: Math.min(Math.max(margin, x), window.innerWidth - width - margin),
    y: Math.min(Math.max(margin, y), window.innerHeight - height - margin),
  };
};

export function ImpostorBanner() {
  const [isImpostor, setIsImpostor] = useState(false);
  const [targetName, setTargetName] = useState('');
  const [exitError, setExitError] = useState(false);
  const [position, setPosition] = useState<BannerPosition | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const positionRef = useRef<BannerPosition | null>(null);
  const dragRef = useRef<{
    pointerId: number;
    offsetX: number;
    offsetY: number;
    width: number;
    height: number;
  } | null>(null);
  const pathname = usePathname();

  useEffect(() => {
    positionRef.current = position;
  }, [position]);

  useEffect(() => {
    setIsImpostor(localStorage.getItem('is_impostor') === 'true');
    setTargetName(localStorage.getItem('impostor_target_name') || 'Unknown User');
    const savedPosition = sessionStorage.getItem(POSITION_KEY);
    if (savedPosition) {
      try {
        const parsed = JSON.parse(savedPosition) as BannerPosition;
        if (typeof parsed.x === 'number' && typeof parsed.y === 'number') {
          setPosition(parsed);
        }
      } catch {
        sessionStorage.removeItem(POSITION_KEY);
      }
    }
  }, [pathname]);

  useEffect(() => {
    if (!position || typeof window === 'undefined') return;

    const handleResize = () => {
      const width = dragRef.current?.width ?? 320;
      const height = dragRef.current?.height ?? 56;
      const nextPosition = clampPosition(position.x, position.y, width, height);
      if (nextPosition.x !== position.x || nextPosition.y !== position.y) {
        positionRef.current = nextPosition;
        setPosition(nextPosition);
        sessionStorage.setItem(POSITION_KEY, JSON.stringify(nextPosition));
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [position]);

  const clearSessionFilters = () => {
    sessionStorage.removeItem('results_page_filters');
    sessionStorage.removeItem('results_page_filters_applied');
    sessionStorage.removeItem('questions_page_filters');
    sessionStorage.removeItem('questions_current_page');
  };

  const handleExit = async () => {
    const adminUserId = localStorage.getItem('impostor_admin_user_id');
    if (!adminUserId) {
      // No admin ID saved — just clean up and go back
      localStorage.removeItem('is_impostor');
      localStorage.removeItem('impostor_admin_user_id');
      localStorage.removeItem('impostor_target_name');
      clearSessionFilters();
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
      clearSessionFilters();
      window.location.href = '/dashboard/profiles';
    } catch (err) {
      console.error('Impostor exit API call failed:', err);
      setExitError(true);
    }
  };

  // Don't render on dashboard pages — admin can use the dashboard freely
  if (!isImpostor || pathname?.startsWith('/dashboard')) return null;

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if ((event.target as HTMLElement).closest('button')) return;

    const rect = event.currentTarget.getBoundingClientRect();
    dragRef.current = {
      pointerId: event.pointerId,
      offsetX: event.clientX - rect.left,
      offsetY: event.clientY - rect.top,
      width: rect.width,
      height: rect.height,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    positionRef.current = { x: rect.left, y: rect.top };
    setIsDragging(true);
    setPosition({ x: rect.left, y: rect.top });
  };

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;

    const nextPosition = clampPosition(
      event.clientX - drag.offsetX,
      event.clientY - drag.offsetY,
      drag.width,
      drag.height
    );
    positionRef.current = nextPosition;
    setPosition(nextPosition);
  };

  const handlePointerUp = (event: PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;

    dragRef.current = null;
    setIsDragging(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    if (positionRef.current) {
      sessionStorage.setItem(POSITION_KEY, JSON.stringify(positionRef.current));
    }
  };

  return (
    <div
      className={`pointer-events-none fixed z-[9999] ${position ? '' : 'inset-x-3 bottom-3 flex justify-center sm:inset-x-auto sm:right-5 sm:bottom-5'}`}
      style={position ? { left: position.x, top: position.y } : undefined}
    >
      <div
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className={`pointer-events-auto w-full max-w-[340px] touch-none select-none rounded-full border border-white/15 bg-[#101014]/90 text-white shadow-[0_12px_36px_rgba(0,0,0,0.26)] backdrop-blur-xl sm:w-[340px] ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
      >
        <div className="flex items-center gap-2 px-3 py-2">
          <i className="fas fa-grip-lines text-[11px] text-white/35"></i>
          <i className="fas fa-user-secret text-xs text-[#BFA7FF]"></i>
          <p className="min-w-0 flex-1 truncate text-xs font-semibold">
            Impostor: <span className="text-white/85">{targetName}</span>
          </p>
          {exitError && (
            <span className="shrink-0 text-[11px] font-semibold text-red-200">
              Exit failed
            </span>
          )}
          <button
            onClick={handleExit}
            className="shrink-0 rounded-full bg-white/10 px-3 py-1 text-[11px] font-bold text-white transition hover:bg-white/20 cursor-pointer"
          >
            Exit
          </button>
        </div>
      </div>
    </div>
  );
}
