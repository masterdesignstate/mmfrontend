'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import HamburgerMenu from '@/components/HamburgerMenu';
import NavLogo from '@/components/NavLogo';
import ProtectedPageGate from '@/components/ProtectedPageGate';
import { uploadToAzureBlob } from '@/utils/azureUpload';
import { renderWithHashtags } from '@/utils/hashtags';
import {
  apiService,
  MAX_POST_IMAGES,
  type FeedAudience,
  type FeedItem,
  type HashtagCategory,
  type Post,
  type PostComment,
  type PostRevision,
  type PostVisibility,
} from '@/services/api';

const AUDIENCE_OPTIONS: { value: FeedAudience; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'matches', label: 'Matches' },
  { value: 'approved', label: 'Approved' },
  { value: 'liked', label: 'Liked' },
];

const VISIBILITY_OPTIONS: { value: PostVisibility; label: string; description: string }[] = [
  { value: 'all', label: 'Everyone', description: 'Anyone can see this post.' },
  { value: 'approved', label: 'Approved', description: 'Only people you have approved.' },
  { value: 'liked', label: 'Liked', description: 'Only people you have liked.' },
  { value: 'matched', label: 'Matches', description: 'Only your mutual matches.' },
];

const visibilityLabel = (v: PostVisibility) => VISIBILITY_OPTIONS.find(o => o.value === v)?.label ?? 'Everyone';

// Curated default topics (always shown in the sidebar, in this order).
// Real post counts from the backend are merged in; topics with no posts
// still appear so users have starting points to explore.
const DEFAULT_TOPICS = [
  'music', 'movies', 'food', 'gaming', 'anime', 'animals', 'outdoors',
  'technology', 'art', 'books', 'memes', 'psychology', 'history', 'learning',
  'culture', 'videos', 'science', 'languages', 'philosophy', 'sports',
  'relationshipadvice', 'fitness', 'fashion', 'country', 'television', 'news',
  'sex', 'health', 'work', 'finance', 'shopping', 'religion', 'home', 'personality',
];

const DEFAULT_AVATAR = '/assets/usxr.png';

function formatRelative(iso: string): string {
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

// =================== Title dropdown ===================
function FeedTitleDropdown({ audience, setAudience }: { audience: FeedAudience; setAudience: (a: FeedAudience) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);
  const currentLabel = AUDIENCE_OPTIONS.find((o) => o.value === audience)?.label || 'All';
  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-gray-100 text-lg font-semibold text-gray-900"
      >
        <span>Feed</span>
        <span className="text-gray-400">·</span>
        <span className="text-[#672DB7]">{currentLabel}</span>
        <svg className={`w-4 h-4 text-gray-500 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div className="absolute left-1/2 -translate-x-1/2 mt-1 bg-white shadow-lg ring-1 ring-gray-200 rounded-xl py-1 w-44 z-40">
          {AUDIENCE_OPTIONS.map((opt) => {
            const active = opt.value === audience;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => { setAudience(opt.value); setOpen(false); }}
                className={`flex items-center justify-between w-full px-3 py-2 text-sm text-left ${
                  active ? 'bg-purple-50 font-semibold text-[#672DB7]' : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <span>{opt.label}</span>
                {active && (
                  <svg className="w-4 h-4 text-[#672DB7]" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// =================== Composer ===================
function PostComposer({ viewerId, onPosted }: { viewerId: string; onPosted: (p: Post) => void }) {
  const [body, setBody] = useState('');
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string>('');
  const [visibility, setVisibility] = useState<PostVisibility>('all');
  const [visMenuOpen, setVisMenuOpen] = useState(false);
  const visRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!visMenuOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (!visRef.current?.contains(e.target as Node)) setVisMenuOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [visMenuOpen]);

  const onPickImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (imageUrls.length >= MAX_POST_IMAGES) {
      setError(`Up to ${MAX_POST_IMAGES} images per post.`);
      return;
    }
    setError('');
    setUploading(true);
    setProgress(0);
    try {
      const url = await uploadToAzureBlob(file, viewerId, (p) => setProgress(p));
      setImageUrls((prev) => [...prev, url]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  const removeImage = (idx: number) => setImageUrls((prev) => prev.filter((_, i) => i !== idx));

  const submit = async () => {
    const trimmed = body.trim();
    if (!trimmed && imageUrls.length === 0) {
      setError('Write something or attach an image.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const post = await apiService.createPost(trimmed, imageUrls, visibility, viewerId);
      onPosted(post);
      setBody('');
      setImageUrls([]);
      setVisibility('all');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not post.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-200 p-4 mb-6">
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Share something with the community… use #hashtags to highlight topics."
        className="w-full resize-none rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
        rows={3}
        maxLength={2000}
      />
      {imageUrls.length > 0 && (
        <div className="grid grid-cols-5 gap-2 mt-3">
          {imageUrls.map((url, i) => (
            <div key={url} className="relative aspect-square rounded-lg overflow-hidden bg-gray-100">
              <Image src={url} alt={`Attachment ${i + 1}`} fill className="object-cover" />
              <button
                type="button"
                onClick={() => removeImage(i)}
                className="absolute top-1 right-1 w-6 h-6 bg-black/70 hover:bg-black text-white rounded-full flex items-center justify-center text-xs"
                aria-label="Remove image"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
      {error && <div className="mt-2 text-sm text-red-600">{error}</div>}
      <div className="flex items-center justify-between mt-3 gap-2 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <input id="post-image-input" type="file" accept="image/*" onChange={onPickImage} className="hidden" disabled={uploading || submitting || imageUrls.length >= MAX_POST_IMAGES} />
          <label
            htmlFor="post-image-input"
            className={`inline-flex items-center gap-2 text-sm font-medium px-3 py-2 rounded-lg ring-1 ring-gray-200 cursor-pointer ${
              imageUrls.length >= MAX_POST_IMAGES || uploading
                ? 'opacity-50 cursor-not-allowed'
                : 'hover:bg-gray-50'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
            </svg>
            {uploading ? `${progress}%` : `Add photo (${imageUrls.length}/${MAX_POST_IMAGES})`}
          </label>

          {/* Visibility picker */}
          <div className="relative" ref={visRef}>
            <button
              type="button"
              onClick={() => setVisMenuOpen(v => !v)}
              className="inline-flex items-center gap-1.5 text-sm font-medium px-3 py-2 rounded-lg ring-1 ring-gray-200 hover:bg-gray-50"
              aria-haspopup="menu"
            >
              <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 15a3 3 0 100-6 3 3 0 000 6z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.46 12C3.73 7.94 7.52 5 12 5s8.27 2.94 9.54 7c-1.27 4.06-5.06 7-9.54 7s-8.27-2.94-9.54-7z" />
              </svg>
              <span>{visibilityLabel(visibility)}</span>
              <svg className={`w-3.5 h-3.5 text-gray-500 transition-transform ${visMenuOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {visMenuOpen && (
              <div className="absolute left-0 mt-1 bg-white shadow-lg ring-1 ring-gray-200 rounded-xl py-1 w-56 z-30">
                {VISIBILITY_OPTIONS.map(opt => {
                  const active = opt.value === visibility;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => { setVisibility(opt.value); setVisMenuOpen(false); }}
                      className={`block w-full text-left px-3 py-2 text-sm ${active ? 'bg-purple-50' : 'hover:bg-gray-50'}`}
                    >
                      <div className={`font-semibold ${active ? 'text-[#672DB7]' : 'text-gray-900'}`}>{opt.label}</div>
                      <div className="text-xs text-gray-500">{opt.description}</div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={submit}
          disabled={submitting || uploading || (!body.trim() && imageUrls.length === 0)}
          className="px-5 py-2 rounded-lg bg-[#672DB7] text-white text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? 'Posting…' : 'Post'}
        </button>
      </div>
    </div>
  );
}

// =================== Comment thread ===================
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
        <div className="text-xs text-gray-400">Loading comments…</div>
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
          placeholder="Write a comment…"
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

// =================== Revision history modal ===================
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
          <button onClick={onClose} className="text-gray-500 hover:text-gray-900 text-xl leading-none">×</button>
        </div>
        <div className="text-xs text-gray-500 mb-4">Newest revision first. The current body is shown on the post.</div>
        {loading && <div className="text-sm text-gray-400">Loading…</div>}
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

// =================== Post card ===================
function PostCard({ post, viewerId, onUpdated, onDeleted }: { post: Post; viewerId: string; onUpdated: (p: Post) => void; onDeleted: (id: string) => void }) {
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
              {savingEdit ? 'Saving…' : 'Save'}
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

// =================== Activity card ===================
function ActivityCard({ item }: { item: FeedItem }) {
  const a = item.activity!;
  let body: React.ReactNode = null;
  let verb = '';
  if (a.kind === 'bio_updated') {
    verb = 'updated their bio';
    const snippet = String((a.payload as { snippet?: string }).snippet || '');
    if (snippet) body = <blockquote className="mt-1.5 text-sm text-gray-600 italic border-l-2 border-purple-200 pl-3">“{snippet}”</blockquote>;
  } else if (a.kind === 'photo_added') {
    verb = 'added a new photo';
    const url = String((a.payload as { image_url?: string }).image_url || '');
    if (url) body = <div className="mt-2 relative w-24 h-24 rounded-lg overflow-hidden bg-gray-100"><Image src={url} alt="New photo" fill className="object-cover" /></div>;
  } else if (a.kind === 'question_answered') {
    verb = 'answered a question';
    const text = String((a.payload as { question_text?: string }).question_text || '');
    if (text) body = <blockquote className="mt-1.5 text-sm text-gray-600 italic border-l-2 border-purple-200 pl-3">{text}</blockquote>;
  }
  return (
    <article className="bg-gray-50/70 rounded-xl ring-1 ring-gray-200 p-3 mb-4">
      <div className="flex items-start gap-3">
        <Link href={`/profile/${a.user.id}`} className="shrink-0">
          <Image src={a.user.profile_photo || DEFAULT_AVATAR} alt={a.user.username} width={32} height={32} className="rounded-full object-cover w-8 h-8" />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="text-sm text-gray-700">
            <Link href={`/profile/${a.user.id}`} className="font-semibold text-gray-900 hover:underline">
              {a.user.first_name || a.user.username}
            </Link>{' '}
            <span>{verb}</span>
            <span className="text-gray-400 ml-2 text-xs">{formatRelative(a.created_at)}</span>
          </div>
          {body}
        </div>
      </div>
    </article>
  );
}

// =================== Main page ===================
function FeedPageContent() {
  const router = useRouter();
  const [audience, setAudience] = useState<FeedAudience>('all');
  const [items, setItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasNext, setHasNext] = useState(false);
  const [error, setError] = useState<string>('');
  const [viewerId, setViewerId] = useState<string>('');

  // Search + category filter
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState(''); // debounced
  const [activeHashtag, setActiveHashtag] = useState<string>(''); // active category
  const [categories, setCategories] = useState<HashtagCategory[]>([]);

  useEffect(() => {
    setViewerId(localStorage.getItem('user_id') || '');
  }, []);

  // Debounce search input → searchQuery (300ms)
  useEffect(() => {
    const t = setTimeout(() => setSearchQuery(searchInput.trim()), 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  // Load categories (top hashtags) once viewer is known + when filter context changes
  useEffect(() => {
    if (!viewerId) return;
    apiService.getFeedHashtags(viewerId).then(setCategories).catch(() => setCategories([]));
  }, [viewerId]);

  const fetchPage = useCallback(async (aud: FeedAudience, pageNum: number, append: boolean, q: string, hashtag: string) => {
    if (!viewerId) return;
    setLoading(true);
    setError('');
    try {
      const data = await apiService.getFeed({ audience: aud, page: pageNum, viewerId, q, hashtag });
      setItems((prev) => append ? [...prev, ...data.results] : data.results);
      setHasNext(data.has_next);
      setPage(pageNum);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load feed.');
    } finally {
      setLoading(false);
    }
  }, [viewerId]);

  useEffect(() => {
    if (viewerId) fetchPage(audience, 1, false, searchQuery, activeHashtag);
  }, [audience, viewerId, searchQuery, activeHashtag, fetchPage]);

  const onPosted = (post: Post) => {
    setItems((prev) => [{ kind: 'post', created_at: post.created_at, post }, ...prev]);
  };
  const onUpdated = (post: Post) => {
    setItems((prev) => prev.map((it) => (it.kind === 'post' && it.post && it.post.id === post.id) ? { ...it, post } : it));
  };
  const onDeleted = (postId: string) => {
    setItems((prev) => prev.filter((it) => !(it.kind === 'post' && it.post && it.post.id === postId)));
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header — logo absolute left, hamburger absolute right, search + audience centered */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-gray-200">
        <div className="flex items-center py-2 sm:py-3 pl-[52px] pr-[52px] sm:pl-14 sm:pr-14 relative">
          <div className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2">
            <NavLogo />
          </div>
          <div className="flex items-center gap-2 w-full max-w-2xl mx-auto min-w-0">
            <div className="relative flex-1 min-w-0">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="search"
                placeholder="Search posts"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="block w-full pl-9 pr-8 py-2 sm:py-2.5 text-sm border border-gray-300 rounded-full bg-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500"
              />
              {searchInput && (
                <button
                  type="button"
                  onClick={() => setSearchInput('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-lg leading-none"
                  aria-label="Clear search"
                >
                  ×
                </button>
              )}
            </div>
            <FeedTitleDropdown audience={audience} setAudience={setAudience} />
          </div>
          <div className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2">
            <HamburgerMenu />
          </div>
        </div>
      </header>

      {/* Layout: optional sidebar on lg+, feed in center */}
      <div className="max-w-7xl mx-auto px-4 py-6 lg:flex lg:gap-6 lg:items-start">
        {/* Topics sidebar — desktop only */}
        <aside className="hidden lg:block w-72 shrink-0 sticky top-[72px] self-start">
          <TopicsSidebar
            categories={categories}
            activeHashtag={activeHashtag}
            onPick={(tag) => setActiveHashtag(tag === activeHashtag ? '' : tag)}
          />
        </aside>

        <main className="flex-1 min-w-0 max-w-2xl mx-auto lg:mx-0">
        {viewerId && <PostComposer viewerId={viewerId} onPosted={onPosted} />}

        {/* Mobile categories — horizontal scroll, hidden on lg+ */}
        <div className="lg:hidden mb-4 -mx-4 px-4 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          <div className="inline-flex items-center gap-2">
            {activeHashtag && (
              <button
                type="button"
                onClick={() => setActiveHashtag('')}
                className="inline-flex items-center gap-1.5 text-sm font-semibold px-3 py-1.5 rounded-full bg-[#672DB7] text-white whitespace-nowrap"
              >
                <span>#{activeHashtag}</span>
                <span aria-hidden="true">×</span>
              </button>
            )}
            {(() => {
              const countMap = new Map(categories.map(c => [c.tag, c.count]));
              const defaultSet = new Set(DEFAULT_TOPICS);
              const merged = [
                ...DEFAULT_TOPICS.map(tag => ({ tag, count: countMap.get(tag) ?? 0 })),
                ...categories.filter(c => !defaultSet.has(c.tag)),
              ];
              return merged
                .filter(c => c.tag !== activeHashtag)
                .map(c => (
                  <button
                    key={c.tag}
                    type="button"
                    onClick={() => setActiveHashtag(c.tag)}
                    className="inline-flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-full bg-white ring-1 ring-gray-200 hover:ring-purple-300 text-gray-700 whitespace-nowrap"
                  >
                    <span className="text-[#672DB7] font-semibold">#{c.tag}</span>
                    {c.count > 0 && <span className="text-xs text-gray-400 tabular-nums">{c.count}</span>}
                  </button>
                ));
            })()}
          </div>
        </div>

        {(searchQuery || activeHashtag) && (
          <div className="mb-3 text-xs text-gray-500">
            {searchQuery && <>Searching for <strong>“{searchQuery}”</strong>{activeHashtag && ' · '}</>}
            {activeHashtag && <>Filtered by <strong>#{activeHashtag}</strong></>}
            {' · '}
            <button onClick={() => { setSearchInput(''); setActiveHashtag(''); }} className="text-[#672DB7] hover:underline">clear</button>
          </div>
        )}

        {error && <div className="mb-3 text-sm text-red-600">{error}</div>}

        {loading && items.length === 0 ? (
          <div className="text-center text-gray-500 py-10">Loading…</div>
        ) : items.length === 0 ? (
          <div className="text-center text-gray-500 py-10">Nothing here yet.</div>
        ) : (
          <>
            {items.map((it, i) => {
              if (it.kind === 'post' && it.post) {
                return <PostCard key={`p-${it.post.id}-${i}`} post={it.post} viewerId={viewerId} onUpdated={onUpdated} onDeleted={onDeleted} />;
              }
              return <ActivityCard key={`a-${it.activity?.id}-${i}`} item={it} />;
            })}
            {hasNext && (
              <div className="flex justify-center mt-4">
                <button
                  onClick={() => fetchPage(audience, page + 1, true, searchQuery, activeHashtag)}
                  disabled={loading}
                  className="px-5 py-2 rounded-full bg-gray-100 text-gray-700 hover:bg-gray-200 text-sm font-medium"
                >
                  {loading ? 'Loading…' : 'Show more'}
                </button>
              </div>
            )}
          </>
        )}
        </main>
      </div>
    </div>
  );
}

function TopicsSidebar({ categories, activeHashtag, onPick }: {
  categories: HashtagCategory[];
  activeHashtag: string;
  onPick: (tag: string) => void;
}) {
  // Build the displayed topic list: curated defaults first (always shown),
  // followed by any extra backend-popular hashtags not in the defaults.
  const countMap = new Map(categories.map(c => [c.tag, c.count]));
  const defaultEntries = DEFAULT_TOPICS.map(tag => ({ tag, count: countMap.get(tag) ?? 0 }));
  const defaultSet = new Set(DEFAULT_TOPICS);
  const extras = categories.filter(c => !defaultSet.has(c.tag));
  const list = [...defaultEntries, ...extras];

  return (
    <div className="rounded-2xl bg-white ring-1 ring-gray-200 p-5 shadow-sm">
      <h2 className="text-lg font-semibold text-gray-900 mb-3">Topics</h2>
      <ul className="flex flex-col gap-1.5 max-h-[calc(100vh-160px)] overflow-y-auto pr-1">
        {list.map((c) => {
          const active = c.tag === activeHashtag;
          return (
            <li key={c.tag}>
              <button
                type="button"
                onClick={() => onPick(c.tag)}
                className={`w-full inline-flex items-center justify-between gap-3 px-3 py-2 rounded-full text-sm transition ${
                  active
                    ? 'bg-[#672DB7] text-white font-semibold'
                    : 'bg-gray-50 hover:bg-purple-50/50 text-gray-800'
                }`}
              >
                <span className={active ? '' : 'text-[#672DB7] font-semibold'}>#{c.tag}</span>
                <span className={`text-xs tabular-nums ${active ? 'text-white/80' : 'text-gray-400'}`}>
                  {c.count} {c.count === 1 ? 'post' : 'posts'}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export default function FeedPage() {
  return (
    <ProtectedPageGate>
      <FeedPageContent />
    </ProtectedPageGate>
  );
}
