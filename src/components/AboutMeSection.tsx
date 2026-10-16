'use client';

import Link from 'next/link';
import { useLayoutEffect, useRef, useState } from 'react';

const COLLAPSED_CLAMP = 'line-clamp-6';

/**
 * The profile's "About Me" card (stored as `User.bio`).
 *
 * About Me runs to 3000 characters, so long text is clamped to six lines behind "Read more"
 * to keep the sections below it in reach. Line breaks are kept as typed.
 */
export default function AboutMeSection({ text, isOwner = false }: { text?: string | null; isOwner?: boolean }) {
  const body = (text || '').trim();
  const [expanded, setExpanded] = useState(false);
  const [overflows, setOverflows] = useState(false);
  const bodyRef = useRef<HTMLParagraphElement>(null);

  useLayoutEffect(() => {
    const el = bodyRef.current;
    if (!el || expanded) return;
    setOverflows(el.scrollHeight > el.clientHeight + 1);
  }, [body, expanded]);

  if (!body && !isOwner) return null;

  return (
    <section className="w-full max-w-xl mx-auto mb-4 rounded-2xl ring-1 ring-gray-200 bg-white px-4 py-3 shadow-sm">
      <div className="mb-1.5 flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-gray-900">About Me</h2>
        {isOwner && (
          <Link href="/profile/edit" className="text-xs font-medium text-[#672DB7] hover:underline">
            {body ? 'Edit' : 'Add'}
          </Link>
        )}
      </div>
      {body ? (
        <>
          <p
            ref={bodyRef}
            className={`whitespace-pre-line break-words text-sm leading-relaxed text-gray-800 ${expanded ? '' : COLLAPSED_CLAMP}`}
          >
            {body}
          </p>
          {(overflows || expanded) && (
            <button
              type="button"
              onClick={() => setExpanded(value => !value)}
              className="mt-1 text-xs font-semibold text-[#672DB7] hover:underline"
            >
              {expanded ? 'Show less' : 'Read more'}
            </button>
          )}
        </>
      ) : (
        <p className="text-sm text-gray-500">Tell people a little about yourself.</p>
      )}
    </section>
  );
}
