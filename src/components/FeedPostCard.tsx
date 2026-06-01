'use client';

import React, { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { renderWithHashtags } from '@/utils/hashtags';
import { apiService, type Post, type PostComment, type PostRevision, type PostVisibility } from '@/services/api';

const VISIBILITY_OPTIONS: { value: PostVisibility; label: string; description: string }[] = [
  { value: 'all', label: 'Everyone', description: 'Anyone can see this post.' },
  { value: 'approved', label: 'Approved', description: 'Only people you have approved.' },
  { value: 'liked', label: 'Liked', description: 'Only people you have liked.' },
  { value: 'matched', label: 'Matched', description: 'Only your mutual matches.' },
];

export const DEFAULT_AVATAR = '/assets/usxr.png';

export function formatRelative(iso: string): string {
  if (!iso) return '';
  const t = new Date(iso).getTime();
  const diff = Math.max(0, Date.now() - t);
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
}

export const visibilityLabel = (v: PostVisibility) => VISIBILITY_OPTIONS.find(o => o.value === v)?.label ?? 'Everyone';

function CommentThread({ post, viewerId }: { post: Post; viewerId: string }) {
  const [comments, setComments] = useState<PostComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [body, setBody] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    apiService.getPostComments(post.id).then((c) => { setComments(c); setLoading(false); }).catch(() => setLoading(false));
  }, [post.id]);

  const submit = async () => {
    const trimmed = body.trim();
    if (!trimmed) return;
    setSubmitting(true);
    try {
      const c = await apiService.createComment(post.id, trimmed, viewerId);
      setComments((prev) => [...prev, c]);
      setBody('');
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const remove = async (id: string) => {
    if (!confirm('Delete this comment?')) return;
    try {
      await apiService.deleteComment(id, viewerId);
      setComments((prev) => prev.filter((c) => c.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="border-t border-gray-100 mt-3 pt-3">
      {loading ? (
        <div className="text-xs text-gray-400">Loading comments...</div>
      ) : (
        <>
          {comments.length === 0 && <div className="text-xs text-gray-400 mb-2">No comments yet.</div>}
          <div className="space-y-2">
            {comments.map((c) => (
              <div key={c.id} className="flex items-start gap-2">
                <Image src={c.author.profile_photo || DEFAULT_AVATAR} alt={c.author.username} width={24} height={24} className="rounded-full object-cover w-6 h-6 mt-0.5" />
                <div className="flex-1">
                  <div className="text-xs">
                    <Link href={`/profile/${c.author.id}`} className="font-semibold text-gray-900 hover:underline">
                      {c.author.first_name || c.author.username}
                    </Link>
                    <span className="text-gray-400 ml-2">{formatRelative(c.created_at)}</span>
                    {c.author.id === viewerId && (
                      <button onClick={() => remove(c.id)} className="text-gray-400 hover:text-red-500 ml-2">delete</button>
                    )}
                  </div>
                  <div className="text-sm text-gray-800 whitespace-pre-wrap">{renderWithHashtags(c.body)}</div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
      <div className="flex items-end gap-2 mt-3">
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Write a comment..."
          rows={1}
          className="flex-1 resize-none rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
          maxLength={1000}
        />
        <button
          type="button"
          onClick={submit}
          disabled={submitting || !body.trim()}
          className="px-3 py-2 rounded-lg bg-purple-600 text-white text-sm font-semibold disabled:opacity-50"
        >
          Send
        </button>
      </div>
    </div>
  );
}

function RevisionsModal({ post, viewerId, onClose }: { post: Post; viewerId: string; onClose: () => void }) {
  const [revs, setRevs] = useState<PostRevision[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    apiService.getPostRevisions(post.id, viewerId).then((r) => { setRevs(r); setLoading(false); }).catch(() => setLoading(false));
  }, [post.id, viewerId]);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl max-w-lg w-full max-h-[80vh] overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold">Edit history</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-900 text-xl leading-none">x</button>
        </div>
        <div className="text-xs text-gray-500 mb-4">Newest revision first. The current body is shown on the post.</div>
        {loading && <div className="text-sm text-gray-400">Loading...</div>}
        {!loading && revs.length === 0 && <div className="text-sm text-gray-400">No prior versions.</div>}
        <ul className="space-y-3">
          {revs.map((r) => (
            <li key={r.id} className="border border-gray-100 rounded-lg p-3">
              <div className="text-xs text-gray-500 mb-1">{new Date(r.edited_at).toLocaleString()}</div>
              <div className="text-sm text-gray-800 whitespace-pre-wrap">{r.body}</div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default function FeedPostCard({
  post,
  viewerId,
  onUpdated,
  onDeleted,
}: {
  post: Post;
  viewerId: string;
  onUpdated: (p: Post) => void;
  onDeleted: (id: string) => void;
}) {
  const [showComments, setShowComments] = useState(false);
  const [showRevs, setShowRevs] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editBody, setEditBody] = useState(post.body);
  const [savingEdit, setSavingEdit] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [menuOpen]);

  const react = async (kind: 'like' | 'dislike') => {
    try {
      const updated = await apiService.reactToPost(post.id, kind, viewerId);
      onUpdated(updated);
    } catch (err) {
      console.error(err);
    }
  };

  const saveEdit = async () => {
    setSavingEdit(true);
    try {
      const updated = await apiService.updatePost(post.id, { body: editBody.trim() }, viewerId);
      onUpdated(updated);
      setEditing(false);
    } catch (err) {
      console.error(err);
    } finally {
      setSavingEdit(false);
    }
  };

  const changeVisibility = async (v: PostVisibility) => {
    try {
      const updated = await apiService.updatePost(post.id, { visibility: v }, viewerId);
      onUpdated(updated);
    } catch (err) {
      console.error(err);
    }
  };

  const remove = async () => {
    if (!confirm('Delete this post?')) return;
    try {
      await apiService.deletePost(post.id, viewerId);
      onDeleted(post.id);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <article className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-200 p-4 mb-4">
      <header className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <Link href={`/profile/${post.author.id}`} className="shrink-0">
            <Image src={post.author.profile_photo || DEFAULT_AVATAR} alt={post.author.username} width={40} height={40} className="rounded-full object-cover w-10 h-10" />
          </Link>
          <div className="min-w-0">
            <Link href={`/profile/${post.author.id}`} className="block font-semibold text-gray-900 truncate hover:underline">
              {post.author.first_name || post.author.username}
            </Link>
            <div className="text-xs text-gray-500">
              {formatRelative(post.created_at)}
              {post.edited_count > 0 && (
                <button className="ml-2 underline hover:text-[#672DB7]" onClick={() => setShowRevs(true)}>
                  edited
                </button>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {post.is_own && (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#672DB7] bg-purple-50 ring-1 ring-purple-200 rounded-full px-2 py-0.5" title={`Visible to: ${visibilityLabel(post.visibility)}`}>
              <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 15a3 3 0 100-6 3 3 0 000 6z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.46 12C3.73 7.94 7.52 5 12 5s8.27 2.94 9.54 7c-1.27 4.06-5.06 7-9.54 7s-8.27-2.94-9.54-7z" />
              </svg>
              {visibilityLabel(post.visibility)}
            </span>
          )}
          {post.is_own && (
            <div className="relative" ref={menuRef}>
              <button onClick={() => setMenuOpen((v) => !v)} className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center" aria-label="Post menu">
                <svg className="w-5 h-5 text-gray-500" fill="currentColor" viewBox="0 0 20 20"><circle cx="4" cy="10" r="2" /><circle cx="10" cy="10" r="2" /><circle cx="16" cy="10" r="2" /></svg>
              </button>
              {menuOpen && (
                <div className="absolute right-0 mt-1 bg-white shadow-lg ring-1 ring-gray-200 rounded-lg py-1 w-44 z-10">
                  <button onClick={() => { setEditing(true); setMenuOpen(false); }} className="block w-full text-left px-3 py-2 text-sm hover:bg-gray-50">Edit text</button>
                  <div className="border-t border-gray-100 my-1" />
                  <div className="px-3 py-1 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Visibility</div>
                  {VISIBILITY_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => { setMenuOpen(false); if (opt.value !== post.visibility) changeVisibility(opt.value); }}
                      className={`flex items-center justify-between w-full text-left px-3 py-2 text-sm hover:bg-gray-50 ${opt.value === post.visibility ? 'font-semibold text-[#672DB7]' : 'text-gray-700'}`}
                    >
                      <span>{opt.label}</span>
                      {opt.value === post.visibility && (
                        <svg className="w-3.5 h-3.5 text-[#672DB7]" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </button>
                  ))}
                  <div className="border-t border-gray-100 my-1" />
                  <button onClick={() => { setMenuOpen(false); remove(); }} className="block w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50">Delete</button>
                </div>
              )}
            </div>
          )}
        </div>
      </header>

      {editing ? (
        <div>
          <textarea value={editBody} onChange={(e) => setEditBody(e.target.value)} rows={3} maxLength={2000}
            className="w-full resize-none rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
          <div className="flex justify-end gap-2 mt-2">
            <button onClick={() => { setEditing(false); setEditBody(post.body); }} className="px-3 py-1.5 text-sm rounded-lg ring-1 ring-gray-200 hover:bg-gray-50">Cancel</button>
            <button onClick={saveEdit} disabled={savingEdit || !editBody.trim()} className="px-3 py-1.5 text-sm rounded-lg bg-purple-600 text-white disabled:opacity-50">
              {savingEdit ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      ) : (
        <div className="text-gray-900 text-base whitespace-pre-wrap mb-3">{renderWithHashtags(post.body)}</div>
      )}

      {post.images.length > 0 && (
        <div className="flex overflow-x-auto snap-x snap-mandatory rounded-xl bg-gray-100 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden mb-3">
          {post.images.map((img) => (
            <div key={img.id} className="relative shrink-0 w-full snap-center" style={{ aspectRatio: '4 / 3' }}>
              <Image src={img.image_url} alt="" fill className="object-cover" />
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center gap-1 text-sm">
        <button
          onClick={() => react('like')}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full ring-1 transition ${
            post.viewer_reaction === 'like'
              ? 'bg-purple-50 ring-purple-300 text-[#672DB7]'
              : 'ring-gray-200 hover:bg-gray-50 text-gray-700'
          }`}
          aria-label="Like"
        >
          <svg className="w-4 h-4" fill={post.viewer_reaction === 'like' ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M14 9V5a3 3 0 00-3-3l-4 9v11h11.28a2 2 0 002-1.7l1.38-9a2 2 0 00-2-2.3zM7 22H4a2 2 0 01-2-2v-7a2 2 0 012-2h3" />
          </svg>
          <span className="tabular-nums">{post.reaction_summary.like}</span>
        </button>
        <button
          onClick={() => react('dislike')}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full ring-1 transition ${
            post.viewer_reaction === 'dislike'
              ? 'bg-gray-100 ring-gray-400 text-gray-900'
              : 'ring-gray-200 hover:bg-gray-50 text-gray-700'
          }`}
          aria-label="Dislike"
        >
          <svg className="w-4 h-4" fill={post.viewer_reaction === 'dislike' ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 15v4a3 3 0 003 3l4-9V2H5.72a2 2 0 00-2 1.7l-1.38 9a2 2 0 002 2.3zm7-13h2.67A2.31 2.31 0 0122 4v7a2.31 2.31 0 01-2.33 2H17" />
          </svg>
          <span className="tabular-nums">{post.reaction_summary.dislike}</span>
        </button>
        <button
          onClick={() => setShowComments((v) => !v)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full ring-1 ring-gray-200 hover:bg-gray-50 text-gray-700"
          aria-label="Toggle comments"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
          </svg>
          <span className="tabular-nums">{post.comment_count}</span>
        </button>
      </div>

      {showComments && <CommentThread post={post} viewerId={viewerId} />}
      {showRevs && <RevisionsModal post={post} viewerId={viewerId} onClose={() => setShowRevs(false)} />}
    </article>
  );
}
