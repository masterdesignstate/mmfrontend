'use client';

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { apiService, RestrictedWord } from '@/services/api';

const PAGE_SIZE = 25;

type WordForm = Pick<RestrictedWord, 'word' | 'severity' | 'is_active'>;

const emptyForm: WordForm = {
  word: '',
  severity: 'high',
  is_active: true,
};

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function getAdminId() {
  const adminId = localStorage.getItem('user_id');
  if (!adminId || localStorage.getItem('is_admin') !== 'true') {
    throw new Error('Your admin session has expired. Please sign in again.');
  }
  return adminId;
}

export default function RestrictedTextPage() {
  const [words, setWords] = useState<RestrictedWord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [form, setForm] = useState<WordForm>(emptyForm);
  const [editing, setEditing] = useState<RestrictedWord | null>(null);
  const [deleting, setDeleting] = useState<RestrictedWord | null>(null);
  const [showForm, setShowForm] = useState(false);

  const loadWords = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setWords(await apiService.getRestrictedWords(getAdminId()));
    } catch (loadError) {
      setError(errorMessage(loadError, 'Unable to load restricted words.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadWords();
  }, [loadWords]);

  const filteredWords = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return words;
    return words.filter((item) => item.word.includes(query));
  }, [search, words]);

  const totalPages = Math.max(1, Math.ceil(filteredWords.length / PAGE_SIZE));
  const visibleWords = filteredWords.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => {
    setPage((current) => Math.min(current, totalPages));
  }, [totalPages]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setShowForm(true);
    setError(null);
  };

  const openEdit = (item: RestrictedWord) => {
    setEditing(item);
    setForm({ word: item.word, severity: item.severity, is_active: item.is_active });
    setShowForm(true);
    setError(null);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditing(null);
    setForm(emptyForm);
  };

  const saveWord = async (event: FormEvent) => {
    event.preventDefault();
    const normalizedWord = form.word.trim().toLowerCase();
    if (!normalizedWord) return;

    setSaving(true);
    setError(null);
    try {
      const adminId = getAdminId();
      const payload = { ...form, word: normalizedWord };
      if (editing) {
        const updated = await apiService.updateRestrictedWord(adminId, editing.id, payload);
        setWords((current) => current.map((item) => item.id === updated.id ? updated : item));
      } else {
        const created = await apiService.createRestrictedWord(adminId, payload);
        setWords((current) => [...current, created].sort((a, b) => a.word.localeCompare(b.word)));
      }
      closeForm();
    } catch (saveError) {
      setError(errorMessage(saveError, 'Unable to save the restricted word.'));
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (item: RestrictedWord) => {
    setError(null);
    try {
      const updated = await apiService.updateRestrictedWord(
        getAdminId(),
        item.id,
        { is_active: !item.is_active }
      );
      setWords((current) => current.map((word) => word.id === updated.id ? updated : word));
    } catch (toggleError) {
      setError(errorMessage(toggleError, 'Unable to update the restricted word.'));
    }
  };

  const deleteWord = async () => {
    if (!deleting) return;
    setSaving(true);
    setError(null);
    try {
      await apiService.deleteRestrictedWord(getAdminId(), deleting.id);
      setWords((current) => current.filter((item) => item.id !== deleting.id));
      setDeleting(null);
    } catch (deleteError) {
      setError(errorMessage(deleteError, 'Unable to delete the restricted word.'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <p className="py-16 text-center text-gray-600">Loading restricted words…</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Restricted Words</h1>
          <p className="mt-2 text-gray-600">Manage words blocked in user-generated content.</p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="rounded-lg bg-[#672DB7] px-4 py-2 font-medium text-white hover:bg-[#5a2a9e]"
        >
          Add restricted word
        </button>
      </div>

      {error && (
        <div role="alert" className="flex items-center justify-between gap-4 rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">
          <span>{error}</span>
          <button type="button" onClick={() => void loadWords()} className="font-semibold underline">
            Try again
          </button>
        </div>
      )}

      <div className="rounded-lg bg-white p-4 shadow">
        <label htmlFor="restricted-word-search" className="mb-2 block text-sm font-medium text-gray-700">
          Search restricted words
        </label>
        <input
          id="restricted-word-search"
          type="search"
          value={search}
          onChange={(event) => { setSearch(event.target.value); setPage(1); }}
          placeholder="Search by word"
          className="w-full max-w-md rounded-lg border border-gray-300 px-3 py-2 focus:border-[#672DB7] focus:outline-none focus:ring-2 focus:ring-purple-200"
        />
      </div>

      <div className="overflow-hidden rounded-lg bg-white shadow">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">Word</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">Severity</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">Status</th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {visibleWords.map((item) => (
                <tr key={item.id}>
                  <td className="px-6 py-4 font-medium text-gray-900">{item.word}</td>
                  <td className="px-6 py-4 capitalize text-gray-700">{item.severity}</td>
                  <td className="px-6 py-4">
                    <button
                      type="button"
                      onClick={() => void toggleActive(item)}
                      aria-label={`${item.is_active ? 'Deactivate' : 'Activate'} ${item.word}`}
                      className={`rounded-full px-3 py-1 text-sm font-medium ${item.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-700'}`}
                    >
                      {item.is_active ? 'Active' : 'Inactive'}
                    </button>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-3">
                      <button type="button" onClick={() => openEdit(item)} className="font-medium text-blue-700 hover:underline">
                        Edit <span className="sr-only">{item.word}</span>
                      </button>
                      <button type="button" onClick={() => setDeleting(item)} className="font-medium text-red-700 hover:underline">
                        Delete <span className="sr-only">{item.word}</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {visibleWords.length === 0 && (
          <p className="p-10 text-center text-gray-600">No restricted words match your search.</p>
        )}

        <div className="flex items-center justify-between border-t border-gray-200 px-6 py-4 text-sm text-gray-700">
          <span>{filteredWords.length} word{filteredWords.length === 1 ? '' : 's'}</span>
          <div className="flex items-center gap-3">
            <button type="button" disabled={page === 1} onClick={() => setPage((current) => current - 1)} className="rounded border px-3 py-1 disabled:opacity-40">
              Previous
            </button>
            <span>Page {page} of {totalPages}</span>
            <button type="button" disabled={page === totalPages} onClick={() => setPage((current) => current + 1)} className="rounded border px-3 py-1 disabled:opacity-40">
              Next
            </button>
          </div>
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="presentation">
          <form onSubmit={saveWord} role="dialog" aria-modal="true" aria-labelledby="word-form-title" className="w-full max-w-md space-y-5 rounded-xl bg-white p-6 shadow-xl">
            <h2 id="word-form-title" className="text-xl font-semibold text-gray-900">{editing ? 'Edit restricted word' : 'Add restricted word'}</h2>
            <div>
              <label htmlFor="restricted-word" className="mb-1 block text-sm font-medium text-gray-700">Word or phrase</label>
              <input id="restricted-word" required maxLength={100} autoFocus value={form.word} onChange={(event) => setForm((current) => ({ ...current, word: event.target.value }))} className="w-full rounded-lg border border-gray-300 px-3 py-2" />
            </div>
            <div>
              <label htmlFor="restricted-severity" className="mb-1 block text-sm font-medium text-gray-700">Severity</label>
              <select id="restricted-severity" value={form.severity} onChange={(event) => setForm((current) => ({ ...current, severity: event.target.value as RestrictedWord['severity'] }))} className="w-full rounded-lg border border-gray-300 px-3 py-2">
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" checked={form.is_active} onChange={(event) => setForm((current) => ({ ...current, is_active: event.target.checked }))} />
              Active immediately
            </label>
            <div className="flex justify-end gap-3">
              <button type="button" disabled={saving} onClick={closeForm} className="rounded-lg border border-gray-300 px-4 py-2">Cancel</button>
              <button type="submit" disabled={saving || !form.word.trim()} className="rounded-lg bg-[#672DB7] px-4 py-2 text-white disabled:opacity-50">{saving ? 'Saving…' : 'Save'}</button>
            </div>
          </form>
        </div>
      )}

      {deleting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="presentation">
          <div role="alertdialog" aria-modal="true" aria-labelledby="delete-word-title" className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h2 id="delete-word-title" className="text-xl font-semibold text-gray-900">Delete restricted word?</h2>
            <p className="mt-3 text-gray-600">“{deleting.word}” will no longer be checked by the content filter.</p>
            <div className="mt-6 flex justify-end gap-3">
              <button type="button" disabled={saving} onClick={() => setDeleting(null)} className="rounded-lg border border-gray-300 px-4 py-2">Cancel</button>
              <button type="button" disabled={saving} onClick={() => void deleteWord()} className="rounded-lg bg-red-600 px-4 py-2 text-white disabled:opacity-50">{saving ? 'Deleting…' : 'Delete'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
