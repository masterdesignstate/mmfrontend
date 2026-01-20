'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { apiService, Conversation } from '@/services/api';
import HamburgerMenu from '@/components/HamburgerMenu';

export default function MatchesPage() {
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
    fetchMatches(userId);
  }, [router]);

  const fetchMatches = async (userId: string) => {
    try {
      const response = await apiService.getConversations(userId);
      setConversations(response.results);
    } catch (error) {
      console.error('Error fetching matches:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMatchClick = (conversationId: string) => {
    router.push(`/chats/${conversationId}`);
  };

  // Split conversations into "Your Turn" and "Their Turn"
  const yourTurn = conversations.filter((conversation) => {
    // Your turn = last message was sent by the other person (you need to respond)
    if (!conversation.last_message) return false;
    return conversation.last_message.sender_id !== currentUserId;
  });

  const theirTurn = conversations.filter((conversation) => {
    // Their turn = last message was sent by you (waiting for their response) OR no messages yet
    if (!conversation.last_message) return true;
    return conversation.last_message.sender_id === currentUserId;
  });

  const renderMatchItem = (conversation: Conversation) => {
    const otherUser = conversation.other_participant;
    if (!otherUser) return null;

    const displayName = otherUser.first_name || otherUser.username;
    const hasMessages = conversation.last_message !== undefined && conversation.last_message !== null;

    return (
      <div
        key={conversation.id}
        onClick={() => handleMatchClick(conversation.id)}
        className="flex items-center gap-4 p-4 hover:bg-gray-50 cursor-pointer transition-colors"
      >
        {/* Profile Photo */}
        <div className="relative flex-shrink-0">
          <div className="w-16 h-16 rounded-full overflow-hidden bg-gradient-to-b from-orange-400 to-orange-600">
            {otherUser.profile_photo ? (
              <Image
                src={otherUser.profile_photo}
                alt={displayName}
                width={64}
                height={64}
                className="object-cover w-full h-full"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-white text-2xl font-bold">
                {displayName.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          {conversation.unread_count > 0 && (
            <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center font-medium">
              {conversation.unread_count > 9 ? '9+' : conversation.unread_count}
            </div>
          )}
        </div>

        {/* Name and Message */}
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-gray-900 text-lg mb-1 truncate">
            {displayName}
          </h3>
          {hasMessages ? (
            <p className="text-sm text-gray-600 truncate">
              {conversation.last_message?.content}
            </p>
          ) : (
            <p className="text-sm font-bold text-[#672DB7]">
              Start a chat with {displayName}
            </p>
          )}
        </div>

        {/* Arrow */}
        <svg className="w-5 h-5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#672DB7] mx-auto mb-4"></div>
          <p className="text-gray-600">Loading matches...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <Image
          src="/assets/mmlogox.png"
          alt="mm logo"
          width={32}
          height={32}
          className="object-contain"
        />
        <h1 className="text-lg font-semibold text-gray-900">Matches</h1>
        <HamburgerMenu />
      </div>

      {/* Matches List */}
      <div className="max-w-2xl mx-auto">
        {conversations.length === 0 ? (
          <div className="text-center py-12 px-4">
            <div className="text-gray-400 mb-2">
              <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            </div>
            <h3 className="text-gray-600 font-medium mb-1">No matches yet</h3>
            <p className="text-gray-500 text-sm">Keep swiping to find your match!</p>
          </div>
        ) : (
          <div className="bg-white">
            {/* Your Turn Section */}
            {yourTurn.length > 0 && (
              <div className="border-b border-gray-200">
                <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
                  <h2 className="text-sm font-semibold text-gray-700">
                    Your Turn ({yourTurn.length})
                  </h2>
                </div>
                <div className="divide-y divide-gray-200">
                  {yourTurn.map(renderMatchItem)}
                </div>
              </div>
            )}

            {/* Their Turn Section */}
            {theirTurn.length > 0 && (
              <div>
                <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
                  <h2 className="text-sm font-semibold text-gray-700">
                    Their Turn ({theirTurn.length})
                  </h2>
                </div>
                <div className="divide-y divide-gray-200">
                  {theirTurn.map(renderMatchItem)}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
