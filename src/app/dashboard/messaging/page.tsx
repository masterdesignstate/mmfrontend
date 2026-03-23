'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { apiService, Conversation } from '@/services/api';

export default function MessagingPage() {
  const router = useRouter();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [adminId, setAdminId] = useState<string>('');

  // Broadcast state
  const [broadcastContent, setBroadcastContent] = useState('');
  const [broadcasting, setBroadcasting] = useState(false);
  const [broadcastResult, setBroadcastResult] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    const userId = localStorage.getItem('user_id');
    if (!userId) {
      router.push('/auth/login');
      return;
    }
    setAdminId(userId);
    fetchConversations(userId);
  }, [router]);

  const fetchConversations = async (userId: string) => {
    try {
      const response = await apiService.getAdminConversations(userId);
      setConversations(response.results);
    } catch (error) {
      console.error('Error fetching admin conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBroadcast = async () => {
    if (!broadcastContent.trim() || !adminId) return;
    setShowConfirm(false);
    setBroadcasting(true);
    setBroadcastResult(null);

    try {
      const result = await apiService.broadcastMessage(adminId, broadcastContent.trim());
      setBroadcastResult({ type: 'success', message: `Sent to ${result.sent_count} users` });
      setBroadcastContent('');
      fetchConversations(adminId);
    } catch (error) {
      console.error('Broadcast error:', error);
      setBroadcastResult({ type: 'error', message: 'Failed to send broadcast' });
    } finally {
      setBroadcasting(false);
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'now';
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 7) return `${diffDays}d`;
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-semibold tracking-tight mb-8">Messaging</h1>

      {/* Broadcast Section */}
      <div className="mb-10">
        <h2 className="text-xs font-medium uppercase tracking-wider text-gray-400 mb-3">Broadcast</h2>
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <textarea
            value={broadcastContent}
            onChange={(e) => {
              setBroadcastContent(e.target.value);
              setBroadcastResult(null);
            }}
            placeholder="Write a message to all users..."
            className="w-full border-0 bg-transparent text-[15px] text-gray-900 placeholder-gray-400 resize-none h-28 focus:outline-none focus:ring-0"
            disabled={broadcasting}
          />
          <div className="flex items-center justify-between pt-3 border-t border-gray-100">
            <div className="min-h-[20px]">
              {broadcastResult && (
                <span className={`text-sm ${broadcastResult.type === 'success' ? 'text-green-600' : 'text-red-500'}`}>
                  {broadcastResult.message}
                </span>
              )}
            </div>
            <button
              onClick={() => setShowConfirm(true)}
              disabled={!broadcastContent.trim() || broadcasting}
              className="px-5 py-2 bg-[#672DB7] text-white text-sm font-medium rounded-full hover:bg-[#5a27a0] cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              {broadcasting ? (
                <span className="flex items-center gap-2">
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Sending...
                </span>
              ) : 'Send to All'}
            </button>
          </div>
        </div>
      </div>

      {/* Confirmation Modal Overlay */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowConfirm(false)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="text-center mb-5">
              <div className="w-12 h-12 bg-purple-50 rounded-full flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6 text-[#672DB7]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Send to all users?</h3>
              <p className="text-sm text-gray-500 mt-1">This message will be delivered to every active user on the platform.</p>
            </div>
            <div className="flex flex-col gap-2">
              <button
                onClick={handleBroadcast}
                className="w-full py-2.5 bg-[#672DB7] text-white text-sm font-medium rounded-xl hover:bg-[#5a27a0] transition-colors"
              >
                Send Message
              </button>
              <button
                onClick={() => setShowConfirm(false)}
                className="w-full py-2.5 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Conversations Section */}
      <div>
        <h2 className="text-xs font-medium uppercase tracking-wider text-gray-400 mb-3">Conversations</h2>

        {loading ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
            <div className="w-8 h-8 border-2 border-gray-200 border-t-[#672DB7] rounded-full animate-spin mx-auto" />
          </div>
        ) : conversations.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
            <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <p className="text-sm text-gray-500">No conversations yet</p>
            <p className="text-xs text-gray-400 mt-1">Send a broadcast to start messaging users</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            {conversations.map((conversation, index) => {
              const otherUser = conversation.other_participant;
              if (!otherUser) return null;

              return (
                <div
                  key={conversation.id}
                  onClick={() => router.push(`/dashboard/messaging/${conversation.id}`)}
                  className={`flex items-center gap-3.5 px-4 py-3.5 hover:bg-gray-50 cursor-pointer transition-colors ${
                    index > 0 ? 'border-t border-gray-50' : ''
                  }`}
                >
                  {/* Profile Photo */}
                  <div className="relative flex-shrink-0">
                    <div className="w-11 h-11 rounded-full overflow-hidden bg-gray-100">
                      <Image
                        src={otherUser.profile_photo || '/assets/usxr.png'}
                        alt={otherUser.first_name || otherUser.username}
                        width={44}
                        height={44}
                        className="object-cover w-full h-full"
                      />
                    </div>
                    {conversation.unread_count > 0 && (
                      <div className="absolute -top-0.5 -right-0.5 bg-[#672DB7] text-white text-[10px] rounded-full w-[18px] h-[18px] flex items-center justify-center font-semibold">
                        {conversation.unread_count > 9 ? '9+' : conversation.unread_count}
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center">
                      <h3 className={`text-[15px] truncate ${conversation.unread_count > 0 ? 'font-semibold text-gray-900' : 'font-medium text-gray-800'}`}>
                        {otherUser.first_name || otherUser.username}
                        {otherUser.last_name ? ` ${otherUser.last_name}` : ''}
                      </h3>
                      <div className="flex items-center gap-1.5 ml-3 flex-shrink-0">
                        {conversation.last_message && (
                          <span className="text-xs text-gray-400">
                            {formatTime(conversation.last_message.created_at)}
                          </span>
                        )}
                        <svg className="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </div>
                    {conversation.last_message ? (
                      <p className={`text-sm truncate ${conversation.unread_count > 0 ? 'text-gray-700' : 'text-gray-400'}`}>
                        {conversation.last_message.sender_id === adminId ? 'You: ' : ''}
                        {conversation.last_message.content}
                      </p>
                    ) : (
                      <p className="text-sm text-gray-300">No messages yet</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
