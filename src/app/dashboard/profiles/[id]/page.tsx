'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { apiService, ApiUser, UserRestrictionHistory } from '@/services/api';
import { ReasonChip } from '@/components/ReasonChip';
import Image from 'next/image';

export default function ProfileDetailsPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const userId = params.id;
  const [user, setUser] = useState<ApiUser | null>(null);
  const [totalQuestionsAnswered, setTotalQuestionsAnswered] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        setError(null);
        const [userData, answers] = await Promise.all([
          apiService.getUser(userId),
          apiService.getUserAnswers(userId),
        ]);
        setUser(userData);
        setTotalQuestionsAnswered(answers.length);
      } catch (err) {
        console.error('Error fetching profile:', err);
        setError(err instanceof Error ? err.message : 'Failed to load profile');
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [userId]);

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'N/A';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return 'N/A';
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const year = d.getFullYear();
    return `${month}/${day}/${year}`;
  };

  const formatDateTime = (dateStr?: string | null) => {
    if (!dateStr) return 'N/A';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return 'N/A';
    return d.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const formatDuration = (history: Pick<UserRestrictionHistory, 'restriction_type' | 'duration_days'>) => {
    if (history.restriction_type === 'permanent') return 'Permanent';
    if (!history.duration_days) return 'N/A';
    return `${history.duration_days} day${history.duration_days === 1 ? '' : 's'}`;
  };

  const formatHistoryStatus = (history: UserRestrictionHistory) => {
    if (!history.ended_at && history.end_reason === 'active') return 'Active';
    if (history.end_reason === 'expired') return 'Expired';
    if (history.end_reason === 'removed') return 'Removed';
    if (history.end_reason === 'replaced') return 'Replaced';
    return history.end_reason || 'Ended';
  };

  const historyStatusClass = (history: UserRestrictionHistory) => {
    const status = formatHistoryStatus(history);
    if (status === 'Active') return 'bg-orange-100 text-orange-800';
    if (status === 'Expired') return 'bg-blue-100 text-blue-800';
    if (status === 'Removed') return 'bg-gray-100 text-gray-800';
    if (status === 'Replaced') return 'bg-purple-100 text-purple-800';
    return 'bg-gray-100 text-gray-800';
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
  const restrictionHistory = user.restriction_history || [];
  const activeRestriction = restrictionHistory.find((history) => !history.ended_at && history.end_reason === 'active');
  const currentRestrictionSummary = activeRestriction || (
    user.is_banned
      ? {
          restriction_type: user.restriction_type || 'temporary',
          duration_days: user.restriction_duration ?? null,
          reason: user.restriction_reason || '',
          reason_detail: user.restriction_reason_detail || '',
          restricted_at: user.restriction_date || '',
          expires_at: user.restriction_type === 'temporary' && user.restriction_date && user.restriction_duration
            ? new Date(new Date(user.restriction_date).getTime() + user.restriction_duration * 24 * 60 * 60 * 1000).toISOString()
            : null,
        }
      : null
  );

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
                <div className="w-24 h-24 rounded-full overflow-hidden">
                  <Image
                    src={user.profile_photo || '/assets/usxr.png'}
                    alt={displayName}
                    width={96}
                    height={96}
                    className="object-cover w-full h-full"
                  />
                </div>
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

          {/* Restriction History Card */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              <i className="fas fa-history mr-2"></i>
              Restriction History
            </h3>

            {currentRestrictionSummary && (
              <div className="mb-5 rounded-lg border border-orange-200 bg-orange-50 p-4">
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                        currentRestrictionSummary.restriction_type === 'permanent'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-orange-100 text-orange-800'
                      }`}>
                        {currentRestrictionSummary.restriction_type === 'permanent' ? 'Banned' : 'Restricted'}
                      </span>
                      {currentRestrictionSummary.reason && (
                        <ReasonChip
                          reason={currentRestrictionSummary.reason}
                          description={currentRestrictionSummary.reason_detail}
                        />
                      )}
                    </div>
                    <p className="text-sm text-gray-700">
                      Started {formatDateTime(currentRestrictionSummary.restricted_at)}
                    </p>
                    {currentRestrictionSummary.reason_detail && (
                      <p className="text-sm text-gray-600 mt-2">{currentRestrictionSummary.reason_detail}</p>
                    )}
                  </div>
                  <div className="text-sm text-gray-700 md:text-right">
                    <div className="font-medium">{formatDuration(currentRestrictionSummary)}</div>
                    <div>
                      {currentRestrictionSummary.restriction_type === 'permanent'
                        ? 'No automatic expiry'
                        : `Ends ${formatDateTime(currentRestrictionSummary.expires_at)}`}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {restrictionHistory.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Duration</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reason</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {restrictionHistory.map((history) => (
                      <tr key={history.id}>
                        <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">
                          <div>{formatDateTime(history.restricted_at)}</div>
                          {history.ended_at && (
                            <div className="text-xs text-gray-500">Ended {formatDateTime(history.ended_at)}</div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">
                          <div>{formatDuration(history)}</div>
                          {history.expires_at && (
                            <div className="text-xs text-gray-500">Expires {formatDateTime(history.expires_at)}</div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${historyStatusClass(history)}`}>
                            {formatHistoryStatus(history)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {history.reason ? (
                            <div className="space-y-2">
                              <ReasonChip reason={history.reason} description={history.reason_detail} />
                              {history.moderator_notes && (
                                <div className="text-xs text-gray-500">{history.moderator_notes}</div>
                              )}
                            </div>
                          ) : (
                            <span className="text-gray-400">N/A</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-gray-500 text-center py-4">No restriction history recorded</p>
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
                <span className="text-gray-600">Total Questions Answered</span>
                <span className="font-semibold">{totalQuestionsAnswered ?? user.questions_answered_count ?? 0}</span>
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
