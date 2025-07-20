'use client';

import Image from 'next/image';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Check for admin credentials
    if (email === 'atomsable@gmail.com' || email === 'admin@matchmatical.com') {
      if (password === '12345678') {
        // Simulate API call delay
        setTimeout(() => {
          setLoading(false);
          router.push('/dashboard');
        }, 1000);
        return;
      }
    }

    // If credentials are wrong
    setTimeout(() => {
      setLoading(false);
      setError('Invalid email or password');
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="flex justify-between items-center px-6 py-4">
        {/* Logo */}
        <div className="flex items-center">
          <Image
            src="/assets/mmlogox.png"
            alt="Logo"
            width={40}
            height={40}
            className="w-10 h-10"
          />
        </div>
        
        {/* Right side icons */}
        <div className="flex items-center space-x-4">
          {/* Bell icon with notification dot */}
          <div className="relative">
            <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.5 3.75a6 6 0 0 1 6 6v3.75l1.5 1.5H3.75l1.5-1.5V9.75a6 6 0 0 1 6-6Z" />
            </svg>
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full"></div>
          </div>
          
          {/* Hamburger menu */}
          <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex justify-center items-center px-4 py-8">
        <div className="w-full max-w-md">
          {/* Form Card */}
          <div className="bg-white rounded-lg shadow-lg p-8">
            <h1 className="text-2xl font-semibold text-gray-900 mb-6 text-center">
              Login
            </h1>

            {error && (
              <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Email Field */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="Enter your email"
                  required
                  disabled={loading}
                />
              </div>

              {/* Password Field */}
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                  Password
                </label>
                <input
                  type="password"
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="Enter your password"
                  required
                  disabled={loading}
                />
              </div>

              {/* Continue Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#672DB7] text-white py-3 px-4 rounded-md font-medium hover:bg-[#5a2a9e] transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    Logging in...
                  </div>
                ) : (
                  'Continue'
                )}
              </button>
            </form>

            {/* Additional Links */}
            <div className="mt-6 text-center">
              <a href="/auth/forgot-password" className="text-sm text-[#672DB7] hover:underline">
                Forgot password?
              </a>
            </div>
            
            <div className="mt-4 text-center">
              <span className="text-sm text-gray-600">
                Don't have an account?{' '}
                <a href="/auth/register" className="text-[#672DB7] hover:underline font-medium">
                  Sign up
                </a>
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 