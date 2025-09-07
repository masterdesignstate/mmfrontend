'use client';

import Image from 'next/image';
import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getApiUrl, API_ENDPOINTS } from '@/config/api';

export default function PersonalDetailsPage() {
  const [formData, setFormData] = useState({
    fullName: '',
    username: '',
    tagline: '',
    dateOfBirth: '',
    height: '',
    from: '',
    live: 'Austin',
    bio: ''
  });
  const [userCredentials, setUserCredentials] = useState({
    user_id: '',
    email: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  // Extract user data from URL parameters
  useEffect(() => {
    const user_id = searchParams.get('user_id');
    const email = searchParams.get('email');
    
    if (!user_id || !email) {
      // If no user data provided, redirect back to signup
      router.push('/auth/register');
      return;
    }
    
    setUserCredentials({ user_id, email });
  }, [searchParams, router]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    // Special handling for height field
    if (name === 'height') {
      // Only allow numbers and limit to 3 digits
      const numericValue = value.replace(/\D/g, '').slice(0, 3);
      
      if (numericValue.length === 3) {
        // Auto-format to feet and inches
        const feet = parseInt(numericValue[0]);
        const inches = parseInt(numericValue.slice(1));
        
        // Validate the input
        if (feet >= 4 && feet <= 7 && inches >= 0 && inches <= 11) {
          const formattedHeight = `${feet}' ${inches.toString().padStart(2, '0')}"`;
          setFormData(prev => ({
            ...prev,
            [name]: formattedHeight
          }));
          return;
        }
      }
      
      // If not complete or invalid, just store the raw input
      setFormData(prev => ({
        ...prev,
        [name]: numericValue
      }));
      return;
    }
    
    // Special handling for date of birth field
    if (name === 'dateOfBirth') {
      // Remove all non-numeric characters
      const numericValue = value.replace(/\D/g, '');
      
      // Limit to 8 digits (MMDDYYYY)
      const limitedValue = numericValue.slice(0, 8);
      
      // Always format as much as we can
      let formattedDate = '';
      
      if (limitedValue.length >= 1) {
        formattedDate = limitedValue.slice(0, 2); // Month
      }
      
      if (limitedValue.length >= 3) {
        formattedDate += '/' + limitedValue.slice(2, 4); // Day
      }
      
      if (limitedValue.length >= 5) {
        formattedDate += '/' + limitedValue.slice(4, 8); // Year
      }
      
      setFormData(prev => ({
        ...prev,
        [name]: formattedDate
      }));
      return;
    }
    
    // Handle other fields normally
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Ensure credentials are loaded
    if (!userCredentials.email || !userCredentials.user_id) {
      setError('Account information not loaded. Please try again.');
      return;
    }

    // Basic validation
    if (!formData.fullName || !formData.username || !formData.dateOfBirth || !formData.from || !formData.live) {
      setError('Please fill in all required fields');
      return;
    }

    // Validate date of birth format (MM/DD/YYYY)
    const dateRegex = /^\d{2}\/\d{2}\/\d{4}$/;
    if (!dateRegex.test(formData.dateOfBirth)) {
      setError('Please enter a valid date in MM/DD/YYYY format');
      return;
    }

    // Validate date values
    const [month, day, year] = formData.dateOfBirth.split('/').map(Number);
    if (month < 1 || month > 12 || day < 1 || day > 31 || year < 1900 || year > new Date().getFullYear()) {
      setError('Please enter a valid date');
      return;
    }

    setLoading(true);

    // Convert MM/DD/YYYY to YYYY-MM-DD for backend
    const backendDateFormat = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
    
    console.log('📅 Date conversion:', {
      original: formData.dateOfBirth,
      converted: backendDateFormat
    });

    // Prepare user data for API call
    const userData = {
      user_id: userCredentials.user_id,
      full_name: formData.fullName,
      username: formData.username,
      tagline: formData.tagline,
      date_of_birth: backendDateFormat,
      height: formData.height,
      from: formData.from,
      live: formData.live,
      bio: formData.bio
    };

    try {
      // Make API call to update personal details
      const apiUrl = getApiUrl(API_ENDPOINTS.PERSONAL_DETAILS);
      console.log('🌐 Making API call to:', apiUrl);
      console.log('📤 Request data:', userData);
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData)
      });

      const data = await response.json();

      if (response.ok) {
        // Redirect to add photo page with user_id
        const params = new URLSearchParams({
          user_id: userCredentials.user_id
        });
        router.push(`/auth/add-photo?${params.toString()}`);
      } else {
        setError(data.error || 'Failed to save personal details');
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
          <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex justify-center items-center px-6 py-8">
        <div className="w-full max-w-md">
          {/* Form Card */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-lg p-8">
            <h1 className="text-2xl font-semibold text-gray-900 mb-6 text-center">
              Finish creating account
            </h1>

            {error && (
              <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4" style={{ opacity: userCredentials.email ? 1 : 0.6 }}>
              {/* Full Name Field */}
              <div>
                <label htmlFor="fullName" className="block text-sm font-medium text-gray-900 mb-2">
                  Full Name
                </label>
                <input
                  type="text"
                  id="fullName"
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 bg-white placeholder-gray-400"
                  placeholder="Enter your full name"
                  required
                  disabled={loading}
                />
              </div>

              {/* Username Field */}
              <div>
                <label htmlFor="username" className="block text-sm font-medium text-gray-900 mb-2">
                  Username
                </label>
                <input
                  type="text"
                  id="username"
                  name="username"
                  value={formData.username}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 bg-white placeholder-gray-400"
                  placeholder="Enter username"
                  required
                  disabled={loading}
                />
              </div>

              {/* Tagline Field */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label htmlFor="tagline" className="block text-sm font-medium text-gray-900">
                    Tag line
                  </label>
                  <div className="flex items-center gap-2">
                    <div className="relative group">
                      <svg className="w-4 h-4 text-purple-600 cursor-pointer" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {/* Tooltip */}
                      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10">
                        A short, catchy phrase that describes you or what you&apos;re looking for
                        <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
                      </div>
                    </div>
                    <span className="text-xs text-gray-500">{formData.tagline.length}/40</span>
                  </div>
                </div>
                <input
                  type="text"
                  id="tagline"
                  name="tagline"
                  value={formData.tagline}
                  onChange={handleInputChange}
                  maxLength={40}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 bg-white placeholder-gray-400"
                  placeholder="Write a short tagline"
                  disabled={loading}
                />
              </div>

              {/* Date of Birth Field */}
              <div>
                <label htmlFor="dateOfBirth" className="block text-sm font-medium text-gray-900 mb-2">
                  Date of Birth
                </label>
                <input
                  type="text"
                  id="dateOfBirth"
                  name="dateOfBirth"
                  value={formData.dateOfBirth}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 bg-white placeholder-gray-400"
                  placeholder="MM/DD/YYYY"
                  maxLength={10}
                  required
                  disabled={loading}
                />
         
              </div>

              {/* Height Field */}
              <div>
                <label htmlFor="height" className="block text-sm font-medium text-gray-900 mb-2">
                  Height (Optional)
                </label>
                <input
                  type="text"
                  id="height"
                  name="height"
                  value={formData.height}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 bg-white placeholder-gray-400"
                  placeholder="Enter 511 for 5' 11&quot;"
                  maxLength={3}
                  disabled={loading}
                />
             
              </div>

              {/* From Field */}
              <div>
                <label htmlFor="from" className="block text-sm font-medium text-gray-900 mb-2">
                  From
                </label>
                <input
                  type="text"
                  id="from"
                  name="from"
                  value={formData.from}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 bg-white placeholder-gray-400"
                  placeholder="Where are you originally from?"
                  required
                  disabled={loading}
                />
              </div>

              {/* Live Field */}
              <div>
                <label htmlFor="live" className="block text-sm font-medium text-gray-900 mb-2">
                  Live
                </label>
                <select
                  id="live"
                  name="live"
                  value={formData.live}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 bg-white"
                  disabled={loading}
                >
                  <option value="Austin">Austin</option>
                  <option value="Cedar Park">Cedar Park</option>
                  <option value="Georgetown">Georgetown</option>
                  <option value="Hutto">Hutto</option>
                  <option value="Kyle">Kyle</option>
                  <option value="Leander">Leander</option>
                  <option value="Manor">Manor</option>
                  <option value="Pflugerville">Pflugerville</option>
                  <option value="Round Rock">Round Rock</option>
                  <option value="San Marcos">San Marcos</option>
                </select>
              </div>

              {/* Bio Field */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label htmlFor="bio" className="block text-sm font-medium text-gray-900">
                    Bio
                  </label>
                  <span className="text-xs text-gray-500">{formData.bio.length}/160</span>
                </div>
                <textarea
                  id="bio"
                  name="bio"
                  value={formData.bio}
                  onChange={handleInputChange}
                  maxLength={160}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 bg-white placeholder-gray-400 resize-none"
                  placeholder="Tell us about yourself..."
                  disabled={loading}
                />
              </div>

              {/* Continue Button */}
              <button
                type="submit"
                disabled={loading || !userCredentials.email}
                className="w-full bg-[#672DB7] text-white py-3 px-4 rounded-md font-medium hover:bg-[#5a2a9e] transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed mt-6 cursor-pointer"
              >
                {loading ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    Saving...
                  </div>
                ) : (
                  'Continue'
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
