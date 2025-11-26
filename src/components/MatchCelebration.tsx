'use client';

import React from 'react';
import Image from 'next/image';
import ConfettiExplosion from 'react-confetti-explosion';

interface MatchCelebrationProps {
  show: boolean;
  onClose: () => void;
  onChat?: () => void;
  matchedUserId?: string;
  currentUserPhoto?: string;
  matchedUserPhoto?: string;
  matchedUserName?: string;
  showModal?: boolean; // If false, only show confetti without modal
}

export default function MatchCelebration({
  show,
  onClose,
  onChat,
  matchedUserId,
  currentUserPhoto,
  matchedUserPhoto,
  matchedUserName,
  showModal = true,
}: MatchCelebrationProps) {
  if (!show) return null;

  return (
    <>
      {/* Confetti Animation - centered on screen */}
      {show && (
        <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-[100] pointer-events-none">
          <ConfettiExplosion
            force={0.8}
            duration={3500}
            particleCount={300}
            width={2000}
            colors={['#A855F7', '#8B5CF6', '#7C3AED', '#672DB7', '#5B21B6', '#DDA0DD']}
          />
        </div>
      )}

      {/* Modal Overlay with fade-in animation */}
      {showModal && (
        <div
          className="fixed inset-0 flex items-center justify-center z-[99] animate-fadeIn"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.85)' }}
          onClick={onClose}
        >
          <div
            className="bg-white rounded-[32px] shadow-2xl w-full max-w-md mx-4 p-10 text-center animate-scaleIn"
            onClick={(e) => e.stopPropagation()}
          >
            {/* It's a Match! Heading with animation */}
            <h1 className="text-5xl font-bold mb-8 animate-bounceIn" style={{
              background: 'linear-gradient(135deg, #A855F7 0%, #7C3AED 50%, #672DB7 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text'
            }}>
              It&apos;s a Match!
            </h1>

            {/* User Photos with animations */}
            {(currentUserPhoto || matchedUserPhoto) && (
              <div className="flex justify-center items-center gap-6 mb-8">
                {currentUserPhoto && (
                  <div className="relative animate-slideInLeft">
                    <div className="w-32 h-32 rounded-full overflow-hidden border-4 shadow-xl animate-glow" style={{ borderColor: '#7C3AED' }}>
                      <Image
                        src={currentUserPhoto}
                        alt="You"
                        width={128}
                        height={128}
                        className="object-cover w-full h-full"
                      />
                    </div>
                  </div>
                )}

                {/* Heart Icon Between Photos with pulse animation */}
                {currentUserPhoto && matchedUserPhoto && (
                  <div className="relative z-10 animate-heartBeat">
                    <Image
                      src="/assets/purpleheart.png"
                      alt="Match"
                      width={56}
                      height={56}
                    />
                  </div>
                )}

                {matchedUserPhoto && (
                  <div className="relative animate-slideInRight">
                    <div className="w-32 h-32 rounded-full overflow-hidden border-4 shadow-xl animate-glow" style={{ borderColor: '#A855F7' }}>
                      <Image
                        src={matchedUserPhoto}
                        alt={matchedUserName || 'Match'}
                        width={128}
                        height={128}
                        className="object-cover w-full h-full"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Message with fade-in */}
            <p className="text-lg text-gray-700 mb-8 animate-fadeInUp">
              {matchedUserName
                ? `You and ${matchedUserName} have liked each other!`
                : 'You both liked each other!'}
            </p>

            {/* Action Buttons with staggered animation */}
            <div className="flex flex-col gap-3">
              {onChat && (
                <button
                  onClick={onChat}
                  className="w-full py-4 text-base font-semibold text-white rounded-full hover:scale-105 active:scale-95 transition-all shadow-lg animate-fadeInUp"
                  style={{
                    background: 'linear-gradient(135deg, #A855F7 0%, #7C3AED 50%, #672DB7 100%)',
                    animationDelay: '0.1s'
                  }}
                >
                  Chat
                </button>
              )}
              <button
                onClick={onClose}
                className="w-full py-4 text-base font-semibold text-gray-700 bg-gray-100 rounded-full hover:bg-gray-200 hover:scale-105 active:scale-95 transition-all animate-fadeInUp"
                style={{ animationDelay: onChat ? '0.2s' : '0.1s' }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CSS Animations */}
      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes scaleIn {
          from {
            opacity: 0;
            transform: scale(0.8);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        @keyframes bounceIn {
          0% {
            opacity: 0;
            transform: scale(0.3);
          }
          50% {
            opacity: 1;
            transform: scale(1.05);
          }
          70% {
            transform: scale(0.9);
          }
          100% {
            transform: scale(1);
          }
        }

        @keyframes slideInLeft {
          from {
            opacity: 0;
            transform: translateX(-100px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        @keyframes slideInRight {
          from {
            opacity: 0;
            transform: translateX(100px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        @keyframes heartBeat {
          0%, 100% {
            transform: scale(1);
          }
          10%, 30% {
            transform: scale(1.3);
          }
          20%, 40% {
            transform: scale(1.1);
          }
        }

        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes glow {
          0%, 100% {
            box-shadow: 0 0 20px rgba(124, 58, 237, 0.5);
          }
          50% {
            box-shadow: 0 0 30px rgba(124, 58, 237, 0.8), 0 0 40px rgba(168, 85, 247, 0.6);
          }
        }

        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }

        .animate-scaleIn {
          animation: scaleIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        .animate-bounceIn {
          animation: bounceIn 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        .animate-slideInLeft {
          animation: slideInLeft 0.5s ease-out;
        }

        .animate-slideInRight {
          animation: slideInRight 0.5s ease-out;
        }

        .animate-heartBeat {
          animation: heartBeat 1.5s ease-in-out infinite;
        }

        .animate-fadeInUp {
          animation: fadeInUp 0.5s ease-out backwards;
        }

        .animate-glow {
          animation: glow 2s ease-in-out infinite;
        }
      `}</style>
    </>
  );
}
