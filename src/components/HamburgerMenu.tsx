'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import NotificationBell from './NotificationBell';
import ChatBell from './ChatBell';

interface HamburgerMenuProps {
  className?: string;
}

export default function HamburgerMenu({ className = '' }: HamburgerMenuProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [showMenu, setShowMenu] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [userId, setUserId] = useState<string>('');

  // Get user ID from localStorage
  useEffect(() => {
    const storedUserId = localStorage.getItem('user_id');
    if (storedUserId) {
      setUserId(storedUserId);
    }
  }, []);

  const [isNarrow, setIsNarrow] = useState(false); // very small: bells move into menu

  // Detect mobile (lg) and narrow (sm) for moving bells into menu
  useEffect(() => {
    const check = () => {
      const w = window.innerWidth;
      setIsMobile(w < 1024);
      setIsNarrow(w < 640); // sm breakpoint: hide bells, show Chats/Notifications in menu first
    };
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // Check if we're on the profile page (handle both /profile and /profile/)
  const isProfilePage = pathname === '/profile' || pathname === '/profile/';

  const handleNavigation = (path: string) => {
    router.push(path);
    setShowMenu(false);
  };

  return (
    <div className={`flex items-center gap-1.5 md:gap-3 ${className}`}>
      {/* Chat and Notification Bells — hidden on very small screens (moved into menu) */}
      {userId && !isNarrow && (
        <>
          <ChatBell userId={userId} />
          <NotificationBell userId={userId} />
        </>
      )}

      {/* Hamburger Menu Button — smaller on medium and below */}
      <div className="relative">
        <button
          className="p-1.5 md:p-2 cursor-pointer"
          onClick={() => setShowMenu(!showMenu)}
        >
          <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

      {/* Dropdown Menu */}
      {showMenu && (
        <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-50 border border-gray-200">
          {/* On very small screens: Chats and Notifications first (bells are hidden) */}
          {isNarrow && userId && (
            <>
              <button
                onClick={() => handleNavigation('/chats')}
                className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              >
                Chats
              </button>
              <button
                onClick={() => handleNavigation('/notifications')}
                className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              >
                Notifications
              </button>
              <div className="border-t border-gray-100 my-1" />
            </>
          )}

          {/* Desktop: Always show "My Profile" */}
          {!isMobile && (
            <button
              onClick={() => handleNavigation('/profile')}
              className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
            >
              My Profile
            </button>
          )}

          {/* Mobile: Toggle between "My Profile" and "Edit Profile" based on current page */}
          {isMobile && (
            <button
              onClick={() => handleNavigation(isProfilePage ? '/profile/edit' : '/profile')}
              className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
            >
              {isProfilePage ? 'Edit Profile' : 'My Profile'}
            </button>
          )}

          <button
            onClick={() => handleNavigation('/questions')}
            className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
          >
            All Questions
          </button>

          <button
            onClick={() => handleNavigation('/questions?filter=answered')}
            className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
          >
            My Answers
          </button>

          <button
            onClick={() => handleNavigation('/results')}
            className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
          >
            Results
          </button>

          <button
            onClick={() => handleNavigation('/matches')}
            className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
          >
            Matches
          </button>

          {/* Chats and Notifications — only when bells are visible (not narrow) */}
          {!isNarrow && (
            <>
              <button
                onClick={() => handleNavigation('/chats')}
                className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              >
                Chats
              </button>
              <button
                onClick={() => handleNavigation('/notifications')}
                className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              >
                Notifications
              </button>
            </>
          )}

          <button
            onClick={() => handleNavigation('/settings')}
            className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
          >
            Settings
          </button>

          <button
            onClick={() => {
              // Clear filter state on logout
              if (typeof window !== 'undefined') {
                sessionStorage.removeItem('results_page_filters');
                sessionStorage.removeItem('results_page_filters_applied');
                sessionStorage.removeItem('questions_page_filters');
              }
              handleNavigation('/auth/login');
            }}
            className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
          >
            Log out
          </button>
        </div>
      )}
      </div>
    </div>
  );
}
