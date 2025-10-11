'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';

interface HamburgerMenuProps {
  className?: string;
}

export default function HamburgerMenu({ className = '' }: HamburgerMenuProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [showMenu, setShowMenu] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Detect if we're on mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024); // lg breakpoint
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Check if we're on the profile page (handle both /profile and /profile/)
  const isProfilePage = pathname === '/profile' || pathname === '/profile/';

  const handleNavigation = (path: string) => {
    router.push(path);
    setShowMenu(false);
  };

  return (
    <div className={`relative ${className}`}>
      <button
        className="p-2 cursor-pointer"
        onClick={() => setShowMenu(!showMenu)}
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {/* Dropdown Menu */}
      {showMenu && (
        <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-50 border border-gray-200">
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
            onClick={() => handleNavigation('/questions?filter=submitted')}
            className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
          >
            My Questions
          </button>

          <button
            onClick={() => handleNavigation('/results')}
            className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
          >
            Results
          </button>

          {/* Matches - Only show on mobile when on profile page (desktop has it in sidebar) */}
          {isMobile && isProfilePage && (
            <button
              onClick={() => handleNavigation('/matches')}
              className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
            >
              Matches
            </button>
          )}

          <button
            onClick={() => handleNavigation('/chat')}
            className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
          >
            Chat
          </button>

          <button
            onClick={() => handleNavigation('/settings')}
            className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
          >
            Settings
          </button>
        </div>
      )}
    </div>
  );
}
