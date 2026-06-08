'use client';

import { useMemo, useState } from 'react';
import { apiService, type PromptPollVote, type UserProfilePrompt } from '@/services/api';

type ProfilePromptCardsProps = {
  prompts?: UserProfilePrompt[];
  ownerId: string;
  viewerId?: string | null;
  isOwner?: boolean;
  likeDisabled?: boolean;
  likeDisabledLabel?: string;
  onVoted?: () => void;
};

export default function ProfilePromptCards({
  prompts = [],
  viewerId,
  isOwner = false,
  onVoted,
}: ProfilePromptCardsProps) {
  const sortedPrompts = useMemo(
    () => [...prompts].filter(prompt => prompt.is_active !== false).sort((a, b) => a.order - b.order),
    [prompts]
  );
  const [selectedOptions, setSelectedOptions] = useState<Record<string, number>>({});
  const [comments, setComments] = useState<Record<string, string>>({});
  const [localVotes, setLocalVotes] = useState<Record<string, PromptPollVote>>({});
  const [submittingPromptId, setSubmittingPromptId] = useState<string | null>(null);
  const [errorByPrompt, setErrorByPrompt] = useState<Record<string, string>>({});

  if (sortedPrompts.length === 0) {
    return null;
  }

  const submitVote = async (prompt: UserProfilePrompt) => {
    if (!viewerId) return;
    const selected = selectedOptions[prompt.id];
    if (selected === undefined) {
      setErrorByPrompt(prev => ({ ...prev, [prompt.id]: 'Choose an option first.' }));
      return;
    }

    setSubmittingPromptId(prompt.id);
    setErrorByPrompt(prev => ({ ...prev, [prompt.id]: '' }));
    try {
      const vote = await apiService.voteOnPromptPoll(prompt.id, {
        voter_id: viewerId,
        selected_option_index: selected,
        comment: comments[prompt.id]?.trim() || '',
      });
      setLocalVotes(prev => ({ ...prev, [prompt.id]: vote }));
      setComments(prev => ({ ...prev, [prompt.id]: '' }));
      onVoted?.();
    } catch (error) {
      setErrorByPrompt(prev => ({
        ...prev,
        [prompt.id]: error instanceof Error ? error.message : 'Could not submit vote.',
      }));
    } finally {
      setSubmittingPromptId(null);
    }
  };

  return (
    <div className="w-full max-w-xl mx-auto mb-4 space-y-3">
      {sortedPrompts.map((prompt) => {
        const promptText = prompt.template?.text || 'Prompt';
        const viewerVote = localVotes[prompt.id] || prompt.viewer_vote || null;
        const selected = selectedOptions[prompt.id] ?? viewerVote?.selected_option_index;
        const isSubmitting = submittingPromptId === prompt.id;

        return (
          <div key={prompt.id} className="rounded-2xl ring-1 ring-gray-200 bg-white px-4 py-3 shadow-sm">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-[#672DB7] mb-1">
              {prompt.prompt_type === 'poll' ? 'Prompt Poll' : `${prompt.prompt_type} Prompt`}
            </div>
            <h3 className="text-sm font-semibold text-gray-900 mb-2">{promptText}</h3>

            {prompt.prompt_type === 'written' && (
              <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">{prompt.written_answer}</p>
            )}

            {prompt.prompt_type === 'voice' && prompt.media_url && (
              <audio controls src={prompt.media_url} className="w-full mt-2" />
            )}

            {prompt.prompt_type === 'video' && prompt.media_url && (
              <video
                controls
                src={prompt.media_url}
                className="mt-2 max-h-[320px] w-auto max-w-full mx-auto rounded-xl bg-black object-contain sm:max-h-[360px]"
              />
            )}

            {prompt.prompt_type === 'poll' && (
              <div className="space-y-2">
                {(prompt.poll_options || []).map((option, index) => {
                  const isSelected = selected === index;
                  return (
                    <button
                      key={`${prompt.id}-${option}-${index}`}
                      type="button"
                      disabled={isSubmitting}
                      onClick={() => setSelectedOptions(prev => ({ ...prev, [prompt.id]: index }))}
                      className={`w-full rounded-xl border px-3 py-2 text-left text-sm transition-colors ${
                        isSelected
                          ? 'border-[#672DB7] bg-purple-50 text-[#672DB7]'
                          : 'border-gray-200 text-gray-800 hover:border-gray-300'
                      } ${isSubmitting ? 'cursor-wait opacity-70' : 'cursor-pointer'}`}
                    >
                      {option}
                    </button>
                  );
                })}

                {viewerId && (
                  <>
                    <textarea
                      value={comments[prompt.id] || ''}
                      onChange={(event) => setComments(prev => ({ ...prev, [prompt.id]: event.target.value.slice(0, 200) }))}
                      maxLength={200}
                      rows={2}
                      placeholder="Add a comment"
                      className="w-full resize-none rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#672DB7]"
                    />
                    <button
                      type="button"
                      onClick={() => submitVote(prompt)}
                      disabled={isSubmitting}
                      className="w-full rounded-full bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isSubmitting ? 'Sending...' : viewerVote ? 'Update vote' : 'Vote'}
                    </button>
                  </>
                )}

                {viewerVote && (
                  <p className="text-xs font-medium text-[#672DB7]">
                    Vote sent: {viewerVote.selected_option_text || prompt.poll_options?.[viewerVote.selected_option_index]}
                  </p>
                )}

                {isOwner && (prompt.poll_votes?.length ?? 0) > 0 && (
                  <div className="mt-3 border-t border-gray-100 pt-3 space-y-2">
                    <p className="text-xs font-semibold text-gray-500">{prompt.poll_votes?.length} response{prompt.poll_votes?.length === 1 ? '' : 's'}</p>
                    {prompt.poll_votes?.slice(0, 5).map((vote) => (
                      <div key={vote.id} className="rounded-xl bg-gray-50 px-3 py-2">
                        <p className="text-xs font-semibold text-gray-900">
                          {vote.voter.first_name || vote.voter.username}: {vote.selected_option_text}
                        </p>
                        {vote.comment && <p className="mt-1 text-xs text-gray-600">{vote.comment}</p>}
                      </div>
                    ))}
                  </div>
                )}

                {errorByPrompt[prompt.id] && (
                  <p className="text-xs text-red-600">{errorByPrompt[prompt.id]}</p>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
