'use client';

import Image from 'next/image';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { getApiUrl, API_ENDPOINTS } from '@/config/api';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Make API call to authenticate user
      const apiUrl = getApiUrl(API_ENDPOINTS.LOGIN);
      console.log('🌐 Making API call to:', apiUrl);
      console.log('📤 Request data:', { email, password });
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email,
          password: password
        })
      });

      const data = await response.json();

      if (response.ok) {
        // Login successful
        console.log('✅ Login successful:', data);
        
        // For the specific test user, skip onboarding and go directly to dashboard
        if (email === 'g') {
          console.log('🎯 Test user detected, redirecting directly to dashboard');
          router.push('/dashboard');
        } else {
          // For other users, check onboarding status
          try {
            const onboardingResponse = await fetch(getApiUrl(API_ENDPOINTS.ONBOARDING_STATUS), {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ email })
            });

            if (onboardingResponse.ok) {
              const onboardingData = await onboardingResponse.json();
              console.log('🔍 Onboarding status:', onboardingData);
              
              // Redirect based on onboarding step with user_id if needed
              if (onboardingData.step === 'add_photo') {
                const params = new URLSearchParams({
                  user_id: onboardingData.user_id
                });
                router.push(`/auth/add-photo?${params.toString()}`);
              } else {
                router.push(onboardingData.step_url);
              }
            } else {
              console.log('⚠️ Could not check onboarding status, redirecting to dashboard');
              router.push('/dashboard');
            }
          } catch (error) {
            console.log('⚠️ Error checking onboarding status, redirecting to dashboard');
            router.push('/dashboard');
          }
        }
      } else {
        setError(data.error || 'Invalid email or password');
      }
    } catch (error) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
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
          {/* Hamburger menu */}
          <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex justify-center items-center px-6 py-8">
        <div className="w-full max-w-md">
          {/* Form Card */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-lg p-8">
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
                <label htmlFor="email" className="block text-sm font-medium text-gray-900 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 bg-white placeholder-gray-400"
                  placeholder="Enter your email"
                  required
                  disabled={loading}
                />
              </div>

              {/* Password Field */}
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-900 mb-2">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    id="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 bg-white placeholder-gray-400"
                    placeholder="Enter your password"
                    required
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
                    disabled={loading}
                  >
                    {showPassword ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.5 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
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
                Don&apos;t have an account?{' '}
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