'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { apiService, ApiUser } from '@/services/api';
import Image from 'next/image';

export default function ProfileDetailsPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [user, setUser] = useState<ApiUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        setError(null);
        const userData = await apiService.getUser(params.id);
        setUser(userData);
      } catch (err) {
        console.error('Error fetching profile:', err);
        setError(err instanceof Error ? err.message : 'Failed to load profile');
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [params.id]);

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'N/A';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return 'N/A';
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const year = d.getFullYear();
    return `${month}/${day}/${year}`;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center">
          <i className="fas fa-spinner fa-spin text-4xl text-[#672DB7] mb-4"></i>
          <p className="text-gray-600">Loading profile details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center">
          <i className="fas fa-exclamation-triangle text-4xl text-red-500 mb-4"></i>
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={() => router.back()}
            className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center">
          <i className="fas fa-user-slash text-4xl text-gray-400 mb-4"></i>
          <p className="text-gray-600">Profile not found</p>
          <button
            onClick={() => router.back()}
            className="mt-4 px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const displayName = `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.username;
  const questionAnswers = user.question_answers || {};

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => router.back()}
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <i className="fas fa-arrow-left text-lg"></i>
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Profile Details</h1>
            <p className="text-gray-600">Viewing profile for {displayName}</p>
          </div>
        </div>
        <div className="flex space-x-2">
          {user.is_banned && (
            <span className="px-3 py-2 bg-red-100 text-red-800 rounded-lg text-sm font-medium">
              <i className="fas fa-ban mr-2"></i>
              Restricted
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Profile Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Info Card */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-start space-x-6">
              <div className="flex-shrink-0">
                {user.profile_photo ? (
                  <div className="w-24 h-24 rounded-full overflow-hidden">
                    <Image
                      src={user.profile_photo}
                      alt={displayName}
                      width={96}
                      height={96}
                      className="object-cover w-full h-full"
                    />
                  </div>
                ) : (
                  <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[#672DB7] to-[#8b5cf6] flex items-center justify-center text-white text-3xl font-bold">
                    {displayName.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-2">
                  <h2 className="text-2xl font-bold text-gray-900">{displayName}</h2>
                </div>
                <p className="text-gray-600 mb-2">@{user.username}</p>
                {user.bio && (
                  <p className="text-gray-700 mb-4 text-sm">{user.bio}</p>
                )}
                <div className="flex items-center space-x-4 text-sm text-gray-600">
                  {user.live && (
                    <span><i className="fas fa-map-marker-alt mr-1"></i>{user.live}</span>
                  )}
                  {user.age && (
                    <span><i className="fas fa-birthday-cake mr-1"></i>{user.age} years old</span>
                  )}
                  {user.email && (
                    <span><i className="fas fa-envelope mr-1"></i>{user.email}</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Question Answers Card */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              <i className="fas fa-question-circle mr-2"></i>
              Question Answers
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {questionAnswers.male !== undefined && questionAnswers.male !== null && (
                <div className="p-3 bg-gray-50 rounded-lg">
                  <div className="text-sm text-gray-600">Male</div>
                  <div className="text-lg font-semibold text-gray-900">{questionAnswers.male}</div>
                </div>
              )}
              {questionAnswers.female !== undefined && questionAnswers.female !== null && (
                <div className="p-3 bg-gray-50 rounded-lg">
                  <div className="text-sm text-gray-600">Female</div>
                  <div className="text-lg font-semibold text-gray-900">{questionAnswers.female}</div>
                </div>
              )}
              {questionAnswers.friend !== undefined && questionAnswers.friend !== null && (
                <div className="p-3 bg-gray-50 rounded-lg">
                  <div className="text-sm text-gray-600">Friend</div>
                  <div className="text-lg font-semibold text-gray-900">{questionAnswers.friend}</div>
                </div>
              )}
              {questionAnswers.hookup !== undefined && questionAnswers.hookup !== null && (
                <div className="p-3 bg-gray-50 rounded-lg">
                  <div className="text-sm text-gray-600">Hookup</div>
                  <div className="text-lg font-semibold text-gray-900">{questionAnswers.hookup}</div>
                </div>
              )}
              {questionAnswers.date !== undefined && questionAnswers.date !== null && (
                <div className="p-3 bg-gray-50 rounded-lg">
                  <div className="text-sm text-gray-600">Date</div>
                  <div className="text-lg font-semibold text-gray-900">{questionAnswers.date}</div>
                </div>
              )}
              {questionAnswers.partner !== undefined && questionAnswers.partner !== null && (
                <div className="p-3 bg-gray-50 rounded-lg">
                  <div className="text-sm text-gray-600">Partner</div>
                  <div className="text-lg font-semibold text-gray-900">{questionAnswers.partner}</div>
                </div>
              )}
            </div>
            {Object.keys(questionAnswers).length === 0 && (
              <p className="text-gray-500 text-center py-4">No question answers available</p>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Profile Stats */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              <i className="fas fa-chart-bar mr-2"></i>
              Profile Stats
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Questions Answered</span>
                <span className="font-semibold">{user.questions_answered_count || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Created</span>
                <span className="font-semibold">{formatDate(user.date_joined)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Username</span>
                <span className="font-semibold text-sm">{user.username}</span>
              </div>
              {user.city && (
                <div className="flex justify-between">
                  <span className="text-gray-600">City</span>
                  <span className="font-semibold text-sm">{user.city}</span>
                </div>
              )}
              {user.is_banned && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Status</span>
                  <span className="font-semibold text-red-600">Restricted</span>
                </div>
              )}
            </div>
          </div>

          {/* Account Info */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              <i className="fas fa-info-circle mr-2"></i>
              Account Information
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">User ID</span>
                <span className="font-mono text-xs text-gray-900 break-all">{user.id}</span>
              </div>
              {user.email && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Email</span>
                  <span className="text-gray-900">{user.email}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}