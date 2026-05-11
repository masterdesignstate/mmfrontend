import React from 'react';

const HASHTAG_RE = /(#[\p{L}\p{N}_-]{1,64})/gu;

/**
 * Render `body` as React nodes with `#hashtag` tokens highlighted.
 * Visual only — not clickable. Preserves whitespace/newlines via whitespace-pre-wrap on parent.
 */
export function renderWithHashtags(body: string): React.ReactNode {
  if (!body) return null;
  const parts = body.split(HASHTAG_RE);
  return parts.map((part, idx) => {
    if (HASHTAG_RE.test(part)) {
      // Reset lastIndex because of the global flag
      HASHTAG_RE.lastIndex = 0;
      return (
        <span key={idx} className="text-[#672DB7] font-semibold">
          {part}
        </span>
      );
    }
    return <React.Fragment key={idx}>{part}</React.Fragment>;
  });
}
