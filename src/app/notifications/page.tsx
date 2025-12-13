'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { apiService, Notification } from '@/services/api';
import HamburgerMenu from '@/components/HamburgerMenu';

export default function NotificationsPage() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string>('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  // Get user ID from localStorage
  useEffect(() => {
    const storedUserId = localStorage.getItem('user_id');
    if (storedUserId) {
      setUserId(storedUserId);
    } else {
      router.push('/auth/login');
    }
  }, [router]);

  // Fetch notifications
  const fetchNotifications = async (pageNum: number, append: boolean = false) => {
    if (!userId) return;

    if (append) {
      setLoadingMore(true);
    } else {
      setLoading(true);
    }

    try {
      const response = await apiService.getNotifications(userId, pageNum, 20);

      // Debug: Log notification types to see if likes are being returned
      console.log('📬 Notifications fetched:', {
        total: response.results.length,
        types: response.results.map(n => n.notification_type),
        likes: response.results.filter(n => n.notification_type === 'like').length
      });

      if (append) {
        setNotifications(prev => [...prev, ...response.results]);
      } else {
        setNotifications(response.results);
      }

      setHasMore(response.next !== null);
      setPage(pageNum);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    if (userId) {
      fetchNotifications(1);
    }
  }, [userId]);

  // Mark notification as read and navigate to profile
  const handleNotificationClick = async (notification: Notification) => {
    try {
      if (!notification.is_read) {
        await apiService.markNotificationRead(notification.id);
        setNotifications(prev =>
          prev.map(n => (n.id === notification.id ? { ...n, is_read: true } : n))
        );
      }

      // Navigate to profile for all notifications
        router.push(`/profile/${notification.sender.id}`);
    } catch (error) {
      console.error('Error handling notification click:', error);
      // Still navigate to profile even if something fails
      router.push(`/profile/${notification.sender.id}`);
    }
  };

  // Mark all as read
  const handleMarkAllRead = async () => {
    try {
      await apiService.markAllNotificationsRead(userId);
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  // Load more notifications
  const handleLoadMore = () => {
    if (hasMore && !loadingMore) {
      fetchNotifications(page + 1, true);
    }
  };

  // Format time ago
  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)} days ago`;
    return `${Math.floor(seconds / 604800)} weeks ago`;
  };

  // Get notification text
  const getNotificationText = (notification: Notification) => {
    const senderName = notification.sender.first_name || notification.sender.username;
    switch (notification.notification_type) {
      case 'approve':
        return `${senderName} approved you`;
      case 'like':
        return `${senderName} liked you`;
      case 'match':
        return `You matched with ${senderName}!`;
      case 'note':
        return notification.note 
          ? `${senderName} sent a note: ${notification.note}`
          : `${senderName} sent a note`;
      default:
        return `${senderName} interacted with you`;
    }
  };

  // Get notification icon
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'approve':
        return '✓';
      case 'like':
        return '❤️';
      case 'match':
        return '🎉';
      case 'note':
        return '💌';
      default:
        return '🔔';
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="relative flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center">
          <Image
            src="/assets/mmlogox.png"
            alt="Logo"
            width={32}
            height={32}
          />
        </div>

        <h1 className="text-lg font-semibold text-gray-900">Notifications</h1>

        <HamburgerMenu />
      </div>

      {/* Main Content */}
      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Mark all as read button */}
        {notifications.some(n => !n.is_read) && (
          <div className="flex justify-end mb-4">
            <button
              onClick={handleMarkAllRead}
              className="text-sm text-[#672DB7] hover:underline font-medium"
            >
              Mark all as read
            </button>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="text-gray-500">Loading notifications...</div>
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <svg className="w-16 h-16 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            <p className="text-gray-500 text-lg">No notifications yet</p>
            <p className="text-gray-400 text-sm mt-1">When someone approves, likes, or matches with you, you&apos;ll see it here</p>
          </div>
        ) : (
          <div className="space-y-2">
            {notifications.map(notification => (
              <div
                key={notification.id}
                onClick={() => handleNotificationClick(notification)}
                className={`p-4 rounded-lg border cursor-pointer transition-all hover:shadow-md ${
                  !notification.is_read
                    ? 'bg-purple-50 border-purple-200'
                    : 'bg-white border-gray-200 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center gap-4">
                  {/* Sender's profile photo */}
                  <div className="flex-shrink-0 relative">
                    {notification.sender.profile_photo ? (
                      <img
                        src={notification.sender.profile_photo}
                        alt={notification.sender.first_name}
                        className="w-14 h-14 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-14 h-14 rounded-full bg-gray-300 flex items-center justify-center text-gray-600 text-lg font-medium">
                        {notification.sender.first_name?.[0] || notification.sender.username?.[0] || '?'}
                      </div>
                    )}
                    {/* Green dot indicator if user is online */}
                    {notification.sender.is_online && (
                      <div className="absolute bottom-0 right-0 w-4 h-4 bg-green-500 rounded-full border-2 border-white"></div>
                    )}
                  </div>

                  {/* Notification content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{getNotificationIcon(notification.notification_type)}</span>
                      <p className="text-base font-medium text-gray-900">
                        {getNotificationText(notification)}
                      </p>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                      {getTimeAgo(notification.created_at)}
                    </p>
                  </div>

                  {/* Unread indicator */}
                  {!notification.is_read && (
                    <div className="flex-shrink-0">
                      <div className="w-3 h-3 bg-[#672DB7] rounded-full"></div>
                    </div>
                  )}

                  {/* Arrow icon */}
                  <div className="flex-shrink-0 text-gray-400">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </div>
            ))}

            {/* Load more button */}
            {hasMore && (
              <div className="flex justify-center pt-4">
                <button
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                  className="px-6 py-2 bg-gray-100 text-gray-700 rounded-full hover:bg-gray-200 transition-colors disabled:opacity-50"
                >
                  {loadingMore ? 'Loading...' : 'Load more'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
