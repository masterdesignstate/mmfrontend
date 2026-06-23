'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { apiService, type ApiUser, type FeedVisibility } from '@/services/api';
import HamburgerMenu from '@/components/HamburgerMenu';
import NavLogo from '@/components/NavLogo';
import ProtectedPageGate from '@/components/ProtectedPageGate';
import ExclusionControl from '@/components/ExclusionControl';
import { DEFAULT_EXCLUSION_VALUES, normalizeExcludedValues } from '@/utils/exclusionValues';
import posthog from 'posthog-js';

function SettingsPageContent() {
  const router = useRouter();
  const [currentEmail, setCurrentEmail] = useState('');
  const [showEditEmail, setShowEditEmail] = useState(false);
  const [showEditPassword, setShowEditPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [requireAnswersForLikes, setRequireAnswersForLikes] = useState(false);
  const [savingPrivacy, setSavingPrivacy] = useState(false);
  const [answerVis, setAnswerVis] = useState<FeedVisibility>('none');
  const [savingShareAnswers, setSavingShareAnswers] = useState(false);
  const [bioVis, setBioVis] = useState<FeedVisibility>('all');
  const [photoVis, setPhotoVis] = useState<FeedVisibility>('all');
  const [questionVis, setQuestionVis] = useState<FeedVisibility>('all');
  const [savingFeedVisibility, setSavingFeedVisibility] = useState(false);
  const [importanceExclusionValues, setImportanceExclusionValues] = useState<number[]>([]);
  const [savingImportanceExclusion, setSavingImportanceExclusion] = useState(false);

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
    // Load privacy setting + feed visibility settings
    if (userId) {
      apiService.getUser(userId).then(user => {
        setRequireAnswersForLikes(!!user.require_answers_for_likes);
        setAnswerVis((user.share_answers ?? 'none') as FeedVisibility);
        setBioVis((user.feed_visibility_bio ?? 'all') as FeedVisibility);
        setPhotoVis((user.feed_visibility_photo ?? 'all') as FeedVisibility);
        setQuestionVis((user.feed_visibility_question ?? 'all') as FeedVisibility);
        setImportanceExclusionValues(normalizeExcludedValues(user.importance_exclusion_values, DEFAULT_EXCLUSION_VALUES));
      }).catch(err => {
        console.error('Error loading privacy settings:', err);
      });
    }
  }, []);

  const handleToggleRequireAnswersForLikes = async () => {
    const userId = localStorage.getItem('user_id');
    if (!userId || savingPrivacy) return;
    const next = !requireAnswersForLikes;
    setRequireAnswersForLikes(next); // optimistic
    setSavingPrivacy(true);
    try {
      await apiService.updateUser(userId, { require_answers_for_likes: next });
      posthog.capture('privacy_require_answers_for_likes_toggled', { value: next });
    } catch (error) {
      console.error('Error updating privacy setting:', error);
      setRequireAnswersForLikes(!next); // revert
      setMessage({ type: 'error', text: 'Could not update privacy setting. Please try again.' });
    } finally {
      setSavingPrivacy(false);
    }
  };

  const handleChangeShareAnswersVisibility = async (next: FeedVisibility) => {
    const userId = localStorage.getItem('user_id');
    if (!userId || savingShareAnswers || next === answerVis) return;
    const prev = answerVis;
    setAnswerVis(next);
    setSavingShareAnswers(true);
    try {
      await apiService.updateUser(userId, { share_answers: next });
      posthog.capture('privacy_share_answers_visibility_changed', { value: next });
    } catch (error) {
      console.error('Error updating answer sharing setting:', error);
      setAnswerVis(prev);
      setMessage({ type: 'error', text: 'Could not update answer sharing. Please try again.' });
    } finally {
      setSavingShareAnswers(false);
    }
  };

  const handleChangeFeedVisibility = async (
    field: 'feed_visibility_bio' | 'feed_visibility_photo' | 'feed_visibility_question',
    next: FeedVisibility,
    setter: (v: FeedVisibility) => void,
    prev: FeedVisibility,
  ) => {
    const userId = localStorage.getItem('user_id');
    if (!userId || savingFeedVisibility || next === prev) return;
    setter(next); // optimistic
    setSavingFeedVisibility(true);
    try {
      const patch: Partial<ApiUser> = { [field]: next };
      await apiService.updateUser(userId, patch);
      posthog.capture('feed_visibility_changed', { field, value: next });
    } catch (error) {
      console.error('Error updating feed visibility:', error);
      setter(prev); // revert
      setMessage({ type: 'error', text: 'Could not update feed visibility. Please try again.' });
    } finally {
      setSavingFeedVisibility(false);
    }
  };

  const handleChangeImportanceExclusion = async (values: number[]) => {
    const userId = localStorage.getItem('user_id');
    if (!userId || savingImportanceExclusion) return;

    const next = normalizeExcludedValues(values, DEFAULT_EXCLUSION_VALUES);
    const prev = importanceExclusionValues;
    setImportanceExclusionValues(next);
    setSavingImportanceExclusion(true);
    try {
      await apiService.updateUser(userId, { importance_exclusion_values: next });
      posthog.capture('importance_exclusion_values_changed', { values: next });
    } catch (error) {
      console.error('Error updating importance exclusion:', error);
      setImportanceExclusionValues(prev);
      setMessage({ type: 'error', text: 'Could not update importance exclusion. Please try again.' });
    } finally {
      setSavingImportanceExclusion(false);
    }
  };

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
        posthog.capture('email_changed');
        setMessage({ type: 'success', text: response.message });
        setCurrentEmail(response.email || emailForm.new_email);
        localStorage.setItem('user_email', response.email || emailForm.new_email);
        setEmailForm({ new_email: '', current_password: '' });
        setShowEditEmail(false);
      }
    } catch (error: unknown) {
      const err = error as { message?: string };
      posthog.captureException(error as Error);
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
        posthog.capture('password_changed');
        setMessage({ type: 'success', text: response.message });
        setPasswordForm({ current_password: '', new_password: '', confirm_password: '' });
        setShowEditPassword(false);
      }
    } catch (error: unknown) {
      const err = error as { message?: string };
      posthog.captureException(error as Error);
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
          <NavLogo />
        </div>
        <HamburgerMenu />
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-5">Settings</h1>

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
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-4">
          <div className="px-5 py-3 border-b border-gray-200">
            <h2 className="text-base font-semibold text-gray-900">Account</h2>
          </div>

          {/* Email Section */}
          <div className="px-5 py-3 border-b border-gray-200">
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
          <div className="px-5 py-3">
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

        {/* Answer Privacy Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-4">
          <div className="px-5 py-3 border-b border-gray-200">
            <h2 className="text-base font-semibold text-gray-900">Answer Privacy</h2>
          </div>
          <div className="px-5 py-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1">
                <h3 className="text-sm font-medium text-gray-900">Show Them on answers you share.</h3>
              </div>
              <select
                value={answerVis}
                onChange={(e) => handleChangeShareAnswersVisibility(e.target.value as FeedVisibility)}
                disabled={savingShareAnswers}
                className="border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-900 bg-white focus:ring-[#672DB7] focus:border-[#672DB7] cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                aria-label="Who can see Them on answers you share"
              >
                <option value="none">None</option>
                <option value="all">Everyone</option>
                <option value="approved">Approved</option>
                <option value="liked">Liked</option>
                <option value="matched">Matched</option>
              </select>
            </div>
          </div>
        </div>

        {/* Required Questions Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-4">
          <div className="px-5 py-3 border-b border-gray-200">
            <h2 className="text-base font-semibold text-gray-900">Required Questions</h2>
          </div>
          <div className="px-5 py-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <h3 className="text-sm font-medium text-gray-900">Only allow people to like you after they&apos;ve answered all of your required questions.</h3>
              </div>
              <button
                type="button"
                onClick={handleToggleRequireAnswersForLikes}
                disabled={savingPrivacy}
                className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed shrink-0 mt-0.5"
                style={{ backgroundColor: requireAnswersForLikes ? '#672DB7' : '#ADADAD' }}
                aria-pressed={requireAnswersForLikes}
                aria-label="Require answered required questions for likes"
              >
                <span
                  className="inline-block h-5 w-5 transform rounded-full bg-white transition-transform shadow"
                  style={{ transform: requireAnswersForLikes ? 'translateX(20px)' : 'translateX(2px)' }}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Importance Exclusion Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-4">
          <div className="px-5 py-3 border-b border-gray-200">
            <h2 className="text-base font-semibold text-gray-900">Importance Exclusion</h2>
          </div>
          <div className="px-5 py-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <h3 className="text-sm font-medium text-gray-900">
                  For questions where your Them importance is 5, hide people whose Them importance is one of these values.
                </h3>
              </div>
              <ExclusionControl
                values={importanceExclusionValues}
                onChange={handleChangeImportanceExclusion}
                allowedValues={DEFAULT_EXCLUSION_VALUES}
                buttonLabel="Importance"
                title="Importance Exclusion"
                ariaLabel="Exclude importance values"
                helpText="Hide people from your results when your Them importance is 5 for a question and their Them importance for that same question is one of these values."
                disabled={savingImportanceExclusion}
                className="shrink-0"
              />
            </div>
          </div>
        </div>

        {/* Feed Visibility Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-4">
          <div className="px-5 py-3 border-b border-gray-200">
            <h2 className="text-base font-semibold text-gray-900">Feed Visibility</h2>
          </div>
          <div className="px-5 py-4 space-y-3">
            {([
              { label: 'Bio Updates', field: 'feed_visibility_bio' as const, value: bioVis, set: setBioVis },
              { label: 'Photo Updates', field: 'feed_visibility_photo' as const, value: photoVis, set: setPhotoVis },
              { label: 'Questions Answered', field: 'feed_visibility_question' as const, value: questionVis, set: setQuestionVis },
            ]).map(row => (
              <div key={row.field} className="flex items-center justify-between gap-4">
                <h3 className="text-sm font-medium text-gray-900">{row.label}</h3>
                <select
                  value={row.value}
                  onChange={(e) => handleChangeFeedVisibility(row.field, e.target.value as FeedVisibility, row.set, row.value)}
                  disabled={savingFeedVisibility}
                  className="border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-900 bg-white focus:ring-[#672DB7] focus:border-[#672DB7] cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                  aria-label={`Who can see your ${row.label.toLowerCase()}`}
                >
                  <option value="none">None</option>
                  <option value="all">Everyone</option>
                  <option value="approved">Approved</option>
                  <option value="liked">Liked</option>
                  <option value="matched">Matched</option>
                </select>
              </div>
            ))}
          </div>
        </div>

        {/* Contact Admin Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 px-5 py-4 mb-4">
          <h2 className="text-base font-semibold text-gray-900 mb-1">Contact Admin</h2>
          <p className="text-sm text-gray-600 mb-3">
            Have a question or need help? Send a message to the admin team.
          </p>
          <button
            onClick={async () => {
              try {
                const userId = localStorage.getItem('user_id');
                if (!userId) return;
                const admin = await apiService.getAdminUser();
                const conversation = await apiService.createOrGetConversation(userId, admin.id);
                router.push(`/chats/${conversation.id}`);
              } catch (error) {
                console.error('Error contacting admin:', error);
                setMessage({ type: 'error', text: 'Unable to reach admin. Please try again later.' });
              }
            }}
            className="inline-flex items-center px-4 py-2 bg-[#672DB7] text-white rounded-md hover:bg-[#5624A0] transition-colors duration-200 text-sm font-medium cursor-pointer"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            Message Admin
          </button>
        </div>

        {/* Terms of Service Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 px-5 py-4">
          <h2 className="text-base font-semibold text-gray-900 mb-2">Terms of Service</h2>
          <p className="text-sm text-gray-600 mb-3">
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

export default function SettingsPage() {
  return (
    <ProtectedPageGate>
      <SettingsPageContent />
    </ProtectedPageGate>
  );
}
