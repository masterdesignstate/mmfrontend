'use client';

import { useState } from 'react';

interface NoteRevealProps {
  /** Whose note this is — used for the button label, e.g. "View Mia's note". */
  name?: string;
  note: string;
  className?: string;
}

const HEART_PATH =
  'M12 21s-7.5-4.9-10-9.2C.4 8.5 1.8 5 5 5c2 0 3.2 1.2 4 2.4C9.8 6.2 11 5 13 5c3.2 0 4.6 3.5 3 6.8C19.5 16.1 12 21 12 21z';

// Staggered hearts that float up and fan out when the note is revealed.
const BURST_HEARTS = [
  { dx: '-26px', delay: '0ms', size: 12 },
  { dx: '20px', delay: '40ms', size: 16 },
  { dx: '-8px', delay: '90ms', size: 10 },
  { dx: '30px', delay: '60ms', size: 12 },
  { dx: '-32px', delay: '120ms', size: 14 },
  { dx: '8px', delay: '150ms', size: 10 },
];

export default function NoteReveal({ name, note, className = '' }: NoteRevealProps) {
  const [revealed, setRevealed] = useState(false);
  const [bursting, setBursting] = useState(false);

  if (!(note || '').trim()) return null;

  const label = name ? `View ${name}'s note` : 'View note';

  const handleReveal = () => {
    if (revealed || bursting) return;
    setBursting(true);
    // Let the hearts play, then swap in the note.
    window.setTimeout(() => {
      setRevealed(true);
      setBursting(false);
    }, 750);
  };

  return (
    <div className={`mx-auto mt-3 flex w-full max-w-[692px] flex-col items-center ${className}`}>
      {!revealed ? (
        <button
          type="button"
          onClick={handleReveal}
          disabled={bursting}
          className="note-reveal-btn relative inline-flex cursor-pointer items-center gap-2 overflow-visible rounded-full border border-[#672DB7] bg-white px-4 py-2 text-sm font-semibold text-[#672DB7] shadow-sm transition-colors hover:bg-purple-50 disabled:cursor-default"
        >
          <svg className={`h-4 w-4 ${bursting ? 'note-heart-beat' : ''}`} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d={HEART_PATH} />
          </svg>
          <span>{label}</span>

          {bursting && (
            <span className="pointer-events-none absolute inset-0 overflow-visible" aria-hidden="true">
              {BURST_HEARTS.map((h, i) => (
                <svg
                  key={i}
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="note-float-heart absolute left-1/2 top-1/2 text-pink-500"
                  style={
                    {
                      width: h.size,
                      height: h.size,
                      marginLeft: -h.size / 2,
                      marginTop: -h.size / 2,
                      ['--dx' as string]: h.dx,
                      animationDelay: h.delay,
                    } as React.CSSProperties
                  }
                >
                  <path d={HEART_PATH} />
                </svg>
              ))}
            </span>
          )}
        </button>
      ) : (
        <div className="note-reveal-card w-full rounded-2xl border border-purple-100 bg-gradient-to-br from-purple-50 to-white p-4 shadow-sm">
          <div className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-[#672DB7]">
            <svg className="note-heart-pop h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d={HEART_PATH} />
            </svg>
            {name ? `${name}'s note` : 'Note'}
          </div>
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-800">{note}</p>
        </div>
      )}

      <style jsx>{`
        @keyframes noteFloatHeart {
          0% {
            opacity: 0;
            transform: translate(0, 0) scale(0.4);
          }
          25% {
            opacity: 1;
          }
          100% {
            opacity: 0;
            transform: translate(var(--dx, 0), -46px) scale(1.05);
          }
        }
        .note-float-heart {
          animation: noteFloatHeart 0.75s ease-out forwards;
        }
        @keyframes noteHeartBeat {
          0%,
          100% {
            transform: scale(1);
          }
          30% {
            transform: scale(1.35);
          }
          60% {
            transform: scale(0.92);
          }
        }
        .note-heart-beat {
          animation: noteHeartBeat 0.4s ease-in-out infinite;
        }
        @keyframes noteCardIn {
          from {
            opacity: 0;
            transform: translateY(8px) scale(0.97);
          }
          to {
            opacity: 1;
            transform: none;
          }
        }
        .note-reveal-card {
          animation: noteCardIn 0.38s cubic-bezier(0.16, 1, 0.3, 1);
        }
        @keyframes noteHeartPop {
          0% {
            transform: scale(0);
          }
          60% {
            transform: scale(1.3);
          }
          100% {
            transform: scale(1);
          }
        }
        .note-heart-pop {
          animation: noteHeartPop 0.45s ease-out 0.1s both;
        }
      `}</style>
    </div>
  );
}
