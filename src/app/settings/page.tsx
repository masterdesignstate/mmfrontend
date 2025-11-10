'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { apiService } from '@/services/api';
import HamburgerMenu from '@/components/HamburgerMenu';

export default function SettingsPage() {
  const router = useRouter();
  const [currentEmail, setCurrentEmail] = useState('');
  const [showEditEmail, setShowEditEmail] = useState(false);
  const [showEditPassword, setShowEditPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Email change form state
  const [emailForm, setEmailForm] = useState({
    new_email: '',
    current_password: '',
  });

  // Password change form state
  const [passwordForm, setPasswordForm] = useState({
    current_password: '',
    new_password: '',
    confirm_password: '',
  });

  // Load current user email
  useEffect(() => {
    const userId = localStorage.getItem('user_id');
    const userEmail = localStorage.getItem('user_email');

    if (userEmail) {
      setCurrentEmail(userEmail);
    } else if (userId) {
      // Fetch user data if email not in localStorage
      apiService.getUser(userId).then(user => {
        setCurrentEmail(user.email);
        localStorage.setItem('user_email', user.email);
      }).catch(err => {
        console.error('Error loading user data:', err);
      });
    }
  }, []);

  const handleEmailChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const response = await apiService.changeEmail({
        current_email: currentEmail,
        current_password: emailForm.current_password,
        new_email: emailForm.new_email,
      });

      if (response.success) {
        setMessage({ type: 'success', text: response.message });
        setCurrentEmail(response.email || emailForm.new_email);
        localStorage.setItem('user_email', response.email || emailForm.new_email);
        setEmailForm({ new_email: '', current_password: '' });
        setShowEditEmail(false);
      }
    } catch (error: unknown) {
      const err = error as { message?: string };
      setMessage({
        type: 'error',
        text: err.message || 'Failed to change email. Please check your password and try again.'
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    // Client-side validation
    if (passwordForm.new_password !== passwordForm.confirm_password) {
      setMessage({ type: 'error', text: 'New passwords do not match' });
      setLoading(false);
      return;
    }

    if (passwordForm.new_password.length < 8) {
      setMessage({ type: 'error', text: 'Password must be at least 8 characters long' });
      setLoading(false);
      return;
    }

    try {
      const response = await apiService.changePassword({
        current_email: currentEmail,
        current_password: passwordForm.current_password,
        new_password: passwordForm.new_password,
        confirm_password: passwordForm.confirm_password,
      });

      if (response.success) {
        setMessage({ type: 'success', text: response.message });
        setPasswordForm({ current_password: '', new_password: '', confirm_password: '' });
        setShowEditPassword(false);
      }
    } catch (error: unknown) {
      const err = error as { message?: string };
      setMessage({
        type: 'error',
        text: err.message || 'Failed to change password. Please check your current password and try again.'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center">
          <Image
            src="/assets/mmlogox.png"
            alt="Logo"
            width={32}
            height={32}
            className="mr-2"
          />
        </div>
        <HamburgerMenu />
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Settings</h1>

        {/* Message Display */}
        {message && (
          <div className={`mb-6 p-4 rounded-md ${
            message.type === 'success'
              ? 'bg-green-50 text-green-800 border border-green-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}>
            <div className="flex items-center">
              <i className={`fas ${message.type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'} mr-2`}></i>
              <span>{message.text}</span>
            </div>
          </div>
        )}

        {/* Account Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Account</h2>
          </div>

          {/* Email Section */}
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <h3 className="text-sm font-medium text-gray-900 mb-1">Email</h3>
                <p className="text-sm text-gray-600">{currentEmail}</p>
              </div>
              <button
                onClick={() => setShowEditEmail(!showEditEmail)}
                className="text-[#672DB7] hover:text-[#5624A0] font-medium text-sm"
              >
                {showEditEmail ? 'Cancel' : 'Edit'}
              </button>
            </div>

            {/* Email Edit Form - Only shown when editing */}
            {showEditEmail && (
              <form onSubmit={handleEmailChange} className="mt-4 pt-4 border-t border-gray-100">
                <div className="mb-4">
                  <label htmlFor="new_email" className="block text-sm font-medium text-gray-700 mb-2">
                    New Email
                  </label>
                  <input
                    type="email"
                    id="new_email"
                    value={emailForm.new_email}
                    onChange={(e) => setEmailForm({ ...emailForm, new_email: e.target.value })}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-[#672DB7] focus:border-[#672DB7]"
                    placeholder="Enter new email address"
                  />
                </div>

                <div className="mb-4">
                  <label htmlFor="email_current_password" className="block text-sm font-medium text-gray-700 mb-2">
                    Current Password
                  </label>
                  <input
                    type="password"
                    id="email_current_password"
                    value={emailForm.current_password}
                    onChange={(e) => setEmailForm({ ...emailForm, current_password: e.target.value })}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-[#672DB7] focus:border-[#672DB7]"
                    placeholder="Enter current password to confirm"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2 bg-[#672DB7] text-white rounded-md hover:bg-[#5624A0] transition-colors duration-200 disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {loading ? 'Updating...' : 'Update Email'}
                </button>
              </form>
            )}
          </div>

          {/* Password Section */}
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <h3 className="text-sm font-medium text-gray-900 mb-1">Password</h3>
                <p className="text-sm text-gray-600">••••••••</p>
              </div>
              <button
                onClick={() => setShowEditPassword(!showEditPassword)}
                className="text-[#672DB7] hover:text-[#5624A0] font-medium text-sm"
              >
                {showEditPassword ? 'Cancel' : 'Edit'}
              </button>
            </div>

            {/* Password Edit Form - Only shown when editing */}
            {showEditPassword && (
              <form onSubmit={handlePasswordChange} className="mt-4 pt-4 border-t border-gray-100">
                <div className="mb-4">
                  <label htmlFor="password_current_password" className="block text-sm font-medium text-gray-700 mb-2">
                    Current Password
                  </label>
                  <input
                    type="password"
                    id="password_current_password"
                    value={passwordForm.current_password}
                    onChange={(e) => setPasswordForm({ ...passwordForm, current_password: e.target.value })}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-[#672DB7] focus:border-[#672DB7]"
                    placeholder="Enter current password"
                  />
                </div>

                <div className="mb-4">
                  <label htmlFor="new_password" className="block text-sm font-medium text-gray-700 mb-2">
                    New Password
                  </label>
                  <input
                    type="password"
                    id="new_password"
                    value={passwordForm.new_password}
                    onChange={(e) => setPasswordForm({ ...passwordForm, new_password: e.target.value })}
                    required
                    minLength={8}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-[#672DB7] focus:border-[#672DB7]"
                    placeholder="Enter new password (min 8 characters)"
                  />
                </div>

                <div className="mb-4">
                  <label htmlFor="confirm_password" className="block text-sm font-medium text-gray-700 mb-2">
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    id="confirm_password"
                    value={passwordForm.confirm_password}
                    onChange={(e) => setPasswordForm({ ...passwordForm, confirm_password: e.target.value })}
                    required
                    minLength={8}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-[#672DB7] focus:border-[#672DB7]"
                    placeholder="Confirm new password"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2 bg-[#672DB7] text-white rounded-md hover:bg-[#5624A0] transition-colors duration-200 disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {loading ? 'Updating...' : 'Update Password'}
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Terms of Service Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Terms of Service</h2>
          <p className="text-gray-600 mb-4">
            By using this matchmaking platform, you agree to our terms of service and privacy policy.
          </p>
          <a
            href="/terms"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center text-[#672DB7] hover:text-[#5624A0] font-medium"
          >
            <span>View Terms of Service</span>
            <i className="fas fa-external-link-alt ml-2 text-sm"></i>
          </a>
        </div>
      </div>
    </div>
  );
}
