'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';

const sidebarItems = [
  { name: 'Overview', href: '/dashboard', icon: 'fas fa-chart-bar' },
  { name: 'List of Profiles', href: '/dashboard/profiles', icon: 'fas fa-users' },
  { name: 'Profile', href: '/dashboard/profile', icon: 'fas fa-user' },
  { name: 'List of Questions', href: '/dashboard/questions', icon: 'fas fa-question-circle' },
  { name: 'Question', href: '/dashboard/question', icon: 'fas fa-question' },
  { name: 'Create Question', href: '/dashboard/questions/create', icon: 'fas fa-plus-circle' },
  { name: 'Individual Calculation', href: '/dashboard/calculation', icon: 'fas fa-calculator' },
  { name: 'Picture Moderation Queue', href: '/dashboard/picture-moderation', icon: 'fas fa-images' },
  // { name: 'Restricted Users', href: '/dashboard/restricted-users', icon: 'fas fa-ban' },
  // { name: 'Reported Users', href: '/dashboard/reported-users', icon: 'fas fa-exclamation-triangle' },
  { name: 'Restricted Text', href: '/dashboard/restricted-text', icon: 'fas fa-shield-alt' },
  { name: 'Controls', href: '/dashboard/controls', icon: 'fas fa-sliders-h' },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = () => {
    // Get user_id before clearing it, so we can clear user-specific data
    const currentUserId = localStorage.getItem('user_id');
    
    // Clear ALL user-related data on logout
    localStorage.removeItem('user_id');
    localStorage.removeItem('is_admin');
    localStorage.removeItem('user_email');
    
    // Clear user-specific celebrated matches (but keep them if user logs back in with same ID)
    // Actually, we want to KEEP celebrated matches so they don't see the popup again
    // So we're NOT clearing celebrated_matches_${currentUserId}
    
    // Clear all profile caches and filter state from sessionStorage
    Object.keys(sessionStorage).forEach(key => {
      if (key.startsWith('profile_')) {
        sessionStorage.removeItem(key);
        sessionStorage.removeItem(`${key}_timestamp`);
      }
    });
    // Clear filter state
    sessionStorage.removeItem('results_page_filters');
    sessionStorage.removeItem('results_page_filters_applied');
    sessionStorage.removeItem('questions_page_filters');
    console.log('🧹 Cleared all user data on logout (kept celebrated matches)');
    
    // Redirect to login page
    router.push('/auth/login');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="flex justify-between items-center px-6 py-4">
          {/* Logo and Dashboard Label */}
          <div className="flex items-center">
            <Image
              src="/assets/mmlogox.png"
              alt="Logo"
              width={32}
              height={32}
              className="w-8 h-8"
            />
            <span className="ml-3 text-lg font-semibold text-gray-900">Dashboard</span>
          </div>
          
          {/* Right side - Log out button and hamburger menu (no bells in dashboard) */}
          <div className="flex items-center gap-3">
            {/* Log Out Button */}
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 hover:text-gray-900 transition-colors duration-200"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              <span className="hidden sm:inline">Log out</span>
            </button>

            {/* Hamburger Menu (Mobile) */}
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      <div className="flex">
        {/* Sidebar */}
        <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 lg:static lg:inset-0 transition-transform duration-300 ease-in-out`}>
          <nav className="pt-6">
            <div className="px-4 space-y-2">
              {sidebarItems.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`flex items-center px-4 py-3 text-sm font-medium rounded-md transition-colors duration-200 ${
                      isActive
                        ? 'bg-[#672DB7] text-white'
                        : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                    }`}
                  >
                    <i className={`${item.icon} mr-3 w-4 h-4`} aria-hidden="true"></i>
                    {item.name}
                  </Link>
                );
              })}
            </div>
          </nav>
        </div>

        {/* Main content */}
        <div className="flex-1 lg:ml-0">
          <div className="p-6">
            {children}
          </div>
        </div>
      </div>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-gray-600 bg-opacity-75 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
} 
