'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { apiService, Conversation } from '@/services/api';
import HamburgerMenu from '@/components/HamburgerMenu';
import MandatoryQuestionsGate from '@/components/MandatoryQuestionsGate';

function ChatsPageContent() {
  const router = useRouter();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string>('');

  useEffect(() => {
    const userId = localStorage.getItem('user_id');
    if (!userId) {
      router.push('/auth/login');
      return;
    }
    setCurrentUserId(userId);
    fetchConversations(userId);
  }, [router]);

  const fetchConversations = async (userId: string) => {
    try {
      const response = await apiService.getConversations(userId);
      setConversations(response.results);
    } catch (error) {
      console.error('Error fetching conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const handleConversationClick = (conversationId: string) => {
    router.push(`/chats/${conversationId}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">Loading chats...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <Image
          src="/assets/mmlogox.png"
          alt="mm logo"
          width={32}
          height={32}
          className="object-contain"
        />
        <h1 className="text-lg font-semibold">Chats</h1>
        <HamburgerMenu />
      </div>

      {/* Conversations List */}
      <div className="max-w-2xl mx-auto">
        {conversations.length === 0 ? (
          <div className="text-center py-12 px-4">
            <div className="text-gray-400 mb-2">
              <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <h3 className="text-gray-600 font-medium mb-1">No conversations yet</h3>
            <p className="text-gray-500 text-sm">Start a conversation by visiting someone&apos;s profile</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200 bg-white">
            {conversations.map((conversation) => {
              const otherUser = conversation.other_participant;
              if (!otherUser) return null;

              return (
                <div
                  key={conversation.id}
                  onClick={() => handleConversationClick(conversation.id)}
                  className="flex items-center gap-3 p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  {/* Profile Photo */}
                  <div className="relative">
                    <div className="w-14 h-14 rounded-full overflow-hidden bg-gray-200">
                      {otherUser.profile_photo ? (
                        <Image
                          src={otherUser.profile_photo}
                          alt={otherUser.first_name || otherUser.username}
                          width={56}
                          height={56}
                          className="object-cover w-full h-full"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400">
                          <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                          </svg>
                        </div>
                      )}
                    </div>
                    {conversation.unread_count > 0 && (
                      <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-medium">
                        {conversation.unread_count > 9 ? '9+' : conversation.unread_count}
                      </div>
                    )}
                  </div>

                  {/* Conversation Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline">
                      <h3 className={`font-medium truncate ${conversation.unread_count > 0 ? 'text-black' : 'text-gray-900'}`}>
                        {otherUser.first_name || otherUser.username}
                      </h3>
                      {conversation.last_message && (
                        <span className="text-xs text-gray-500 ml-2 flex-shrink-0">
                          {formatTime(conversation.last_message.created_at)}
                        </span>
                      )}
                    </div>
                    {conversation.last_message ? (
                      <p className={`text-sm truncate ${conversation.unread_count > 0 ? 'text-gray-900 font-medium' : 'text-gray-500'}`}>
                        {conversation.last_message.sender_id === currentUserId ? 'You: ' : ''}
                        {conversation.last_message.content}
                      </p>
                    ) : (
                      <p className="text-sm text-gray-400 italic">No messages yet</p>
                    )}
                  </div>

                  {/* Arrow */}
                  <svg className="w-5 h-5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default function ChatsPage() {
  return (
    <MandatoryQuestionsGate>
      <ChatsPageContent />
    </MandatoryQuestionsGate>
  );
}
