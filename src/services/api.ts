// Type definitions for API responses
import { API_BASE_URL as CONFIG_API_BASE_URL } from '@/config/api';

export interface UserPicture {
  id: string;
  image_url: string;
  order: number;
  created_at?: string;
}

export const MAX_USER_PICTURES = 5;
export const MAX_PROFILE_PROMPTS = 6;
export const MAX_WRITTEN_PROFILE_PROMPTS = 3;
export const MAX_VOICE_PROFILE_PROMPTS = 1;
export const MAX_VIDEO_PROFILE_PROMPTS = 1;
export const MAX_POLL_PROFILE_PROMPTS = 1;
export const MAX_WRITTEN_PROMPT_CHARS = 150;
export const MAX_PROMPT_MEDIA_SECONDS = 30;
export const MAX_POLL_COMMENT_CHARS = 200;

export type ProfilePromptType = 'written' | 'voice' | 'video' | 'poll';

export interface PromptTemplate {
  id: string;
  text: string;
  category: string;
  is_active: boolean;
  order: number;
  created_at?: string;
}

export interface PromptPollVote {
  id: string;
  prompt: string;
  voter: {
    id: string;
    username: string;
    first_name?: string;
    last_name?: string;
    profile_photo?: string | null;
  };
  selected_option_index: number;
  selected_option_text: string;
  comment: string;
  created_at: string;
  updated_at: string;
}

export interface UserProfilePrompt {
  id: string;
  user: string;
  template: PromptTemplate;
  prompt_type: ProfilePromptType;
  order: number;
  written_answer: string;
  media_url: string;
  media_duration_seconds?: string | number | null;
  poll_options: string[];
  is_active: boolean;
  viewer_vote?: PromptPollVote | null;
  poll_votes?: PromptPollVote[];
  created_at?: string;
  updated_at?: string;
}

export interface ProfilePromptPayload {
  template_id: string;
  prompt_type: ProfilePromptType;
  written_answer?: string;
  media_url?: string;
  media_duration_seconds?: number | null;
  poll_options?: string[];
}

// ----- Feed -----
export const MAX_POST_IMAGES = 5;

export interface PostImageData {
  id: string;
  image_url: string;
  order: number;
}

export interface ReactionSummary {
  like: number;
  dislike: number;
}

export interface FeedAuthor {
  id: string;
  username: string;
  first_name?: string;
  last_name?: string;
  profile_photo?: string | null;
  pictures?: UserPicture[];
}

export type PostVisibility = 'all' | 'approved' | 'liked' | 'matched';

export interface Post {
  id: string;
  author: FeedAuthor;
  body: string;
  visibility: PostVisibility;
  created_at: string;
  updated_at: string;
  edited_count: number;
  images: PostImageData[];
  hashtags: string[];
  reaction_summary: ReactionSummary;
  viewer_reaction: 'like' | 'dislike' | null;
  comment_count: number;
  is_own: boolean;
}

export interface HashtagCategory {
  tag: string;
  count: number;
}

export interface PostComment {
  id: string;
  post: string;
  author: FeedAuthor;
  body: string;
  created_at: string;
  updated_at: string;
  is_deleted?: boolean;
  post_preview?: {
    id: string;
    body: string;
    created_at: string;
    author: FeedAuthor;
  };
}

export interface PostRevision {
  id: string;
  body: string;
  edited_at: string;
}

export interface FeedActivity {
  id: string;
  user: FeedAuthor;
  kind: 'bio_updated' | 'photo_added' | 'question_answered';
  payload: Record<string, unknown>;
  created_at: string;
}

export type FeedAudience = 'all' | 'matches' | 'approved' | 'liked';

export interface FeedItem {
  kind: 'post' | 'bio_updated' | 'photo_added' | 'question_answered';
  created_at: string;
  post?: Post;
  activity?: FeedActivity;
}

export interface FeedResponse {
  results: FeedItem[];
  has_next: boolean;
  page: number;
  audience: FeedAudience;
}

export type FeedVisibility = 'none' | 'all' | 'approved' | 'liked' | 'matched';

export interface UserRestrictionHistory {
  id: string;
  restriction_type: string;
  duration_days?: number | null;
  reason?: string;
  reason_detail?: string;
  restricted_at: string;
  expires_at?: string | null;
  ended_at?: string | null;
  end_reason?: 'active' | 'expired' | 'removed' | 'replaced' | string;
  moderator_notes?: string;
}

export interface ApiUser {
  id: string;
  username: string;
  first_name: string;
  last_name: string;
  email: string;
  profile_photo?: string;
  age?: number;
  city?: string;
  bio?: string;
  live?: string;
  date_joined?: string;
  is_banned?: boolean;
  restriction_type?: string;
  restriction_duration?: number;
  restriction_reason?: string;
  restriction_reason_detail?: string;
  restriction_date?: string;
  questions_answered_count?: number;
  is_online?: boolean;
  is_admin?: boolean;
  last_active?: string | null;
  has_pending_reports?: boolean;
  mandatory_questions_complete?: boolean;
  require_answers_for_likes?: boolean;
  share_answers?: FeedVisibility;
  feed_visibility_bio?: FeedVisibility;
  feed_visibility_photo?: FeedVisibility;
  feed_visibility_question?: FeedVisibility;
  importance_exclusion_values?: number[];
  pictures?: UserPicture[];
  profile_prompts?: UserProfilePrompt[];
  restriction_history?: UserRestrictionHistory[];
  question_answers?: {
    male?: number | null;
    female?: number | null;
    friend?: number | null;
    hookup?: number | null;
    date?: number | null;
    partner?: number | null;
  };
}

export interface UserAnswer {
  id: string;
  user: ApiUser;
  question: Question;
  me_answer: number;
  me_open_to_all?: boolean;
  me_importance: number;
  me_share?: boolean;
  looking_for_answer: number;
  looking_for_open_to_all?: boolean;
  looking_for_importance: number;
  looking_for_share?: boolean;
  excluded_answer_values?: number[];
  // Legacy: is_required_for_me is no longer on UserAnswer; use UserRequiredQuestion / getRequiredQuestionIds
  me_multiplier?: number;
  looking_for_multiplier?: number;
}

/** List item from GET /user-required-questions/ */
export interface UserRequiredQuestionItem {
  id: number;
  user: string;
  question: string;
  question_id: string;
  created_at?: string;
}

export interface Question {
  id: string;
  question_name?: string;
  question_number?: number;
  group_number?: number;
  group_name?: string;
  group_name_text?: string;
  question_type?: 'basic' | 'four' | 'grouped' | 'double' | 'triple';
  text: string;
  tags: Array<{ id: number; name: string }>;
  answers: Array<{ id: string; value: string; answer_text: string; order: number }>;
  is_required_for_match: boolean;
  is_approved: boolean;
  skip_me: boolean;
  skip_looking_for: boolean;
  open_to_all_me: boolean;
  open_to_all_looking_for: boolean;
  is_group: boolean;
  created_at: string;
  updated_at: string;
}

export interface QuestionMetadata {
  distinct_question_numbers: number[];
  total_question_groups: number;
  answer_counts: Record<number, number>;
}

export interface CompatibilityResult {
  // Regular compatibility scores
  overall_compatibility: number;
  compatible_with_me: number;
  im_compatible_with: number;
  mutual_questions_count: number;
  // Required compatibility scores
  required_overall_compatibility?: number;
  required_compatible_with_me?: number;
  required_im_compatible_with?: number;
  /** Their Required: compatibility calculated only on the other user's required questions */
  their_required_compatibility?: number;
  my_required_overall_compatibility?: number;
  my_required_compatible_with_me?: number;
  my_required_im_compatible_with?: number;
  their_required_overall_compatibility?: number;
  their_required_compatible_with_me?: number;
  their_required_im_compatible_with?: number;
  required_mutual_questions_count?: number;
  required_completeness_ratio?: number;
}

export interface Notification {
  id: string;
  recipient: ApiUser;
  sender: ApiUser;
  notification_type: 'approve' | 'like' | 'match' | 'note' | 'prompt_poll';
  note?: string;
  is_read: boolean;
  created_at: string;
  related_user_result?: string;
  related_prompt_poll_vote?: PromptPollVote;
}

export interface Message {
  id: string;
  conversation?: string;
  sender: ApiUser;
  receiver: ApiUser;
  content: string;
  is_read: boolean;
  created_at: string;
}

export interface LastMessage {
  id: string;
  content: string;
  sender_id: string;
  created_at: string;
  is_read: boolean;
}

export interface Conversation {
  id: string;
  participant1: ApiUser;
  participant2: ApiUser;
  other_participant?: ApiUser;
  last_message?: LastMessage;
  unread_count: number;
  created_at: string;
  updated_at: string;
}

export interface BroadcastMessage {
  content: string;
  recipient_count: number;
  sent_at: string;
}

interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

const API_BASE_URL = CONFIG_API_BASE_URL;

type ApiErrorPayload = {
  error?: unknown;
  message?: unknown;
  detail?: unknown;
  non_field_errors?: unknown;
};

function stringifyApiErrorValue(value: unknown): string | null {
  if (!value) return null;
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) {
    const parts = value
      .map((item) => stringifyApiErrorValue(item))
      .filter((item): item is string => Boolean(item));
    return parts.length > 0 ? parts.join(', ') : null;
  }
  if (typeof value === 'object') {
    const parts = Object.values(value)
      .map((item) => stringifyApiErrorValue(item))
      .filter((item): item is string => Boolean(item));
    return parts.length > 0 ? parts.join(', ') : null;
  }
  return String(value);
}

async function getApiErrorMessage(response: Response): Promise<string> {
  const fallback = `API request failed: ${response.status} ${response.statusText}`;
  const contentType = response.headers.get('content-type') || '';

  try {
    if (contentType.includes('application/json')) {
      const payload = await response.json() as ApiErrorPayload;
      return (
        stringifyApiErrorValue(payload.message) ||
        stringifyApiErrorValue(payload.error) ||
        stringifyApiErrorValue(payload.detail) ||
        stringifyApiErrorValue(payload.non_field_errors) ||
        fallback
      );
    }

    const text = await response.text();
    return text.trim() || fallback;
  } catch {
    return fallback;
  }
}


class ApiService {
  private async request(endpoint: string, method: string, data?: Record<string, unknown>): Promise<unknown> {
    const url = `${API_BASE_URL}${endpoint}`;
    const headers: HeadersInit = {};

    if (method !== 'GET' || data) {
      headers['Content-Type'] = 'application/json';
    }

    const options: RequestInit = {
      method,
      headers
    };

    if (data) {
      options.body = JSON.stringify(data);
    }

    const response = await fetch(url, options);
    
    if (!response.ok) {
      const error = new Error(await getApiErrorMessage(response));
      (error as Error & { status?: number }).status = response.status;
      throw error;
    }

    // Handle 204 No Content responses (no body)
    if (response.status === 204) {
      return null;
    }

    // Check if response has content before parsing JSON
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      const text = await response.text();
      return text ? JSON.parse(text) : null;
    }

    return null;
  }

  // Helper method to fetch all pages
  private async fetchAllPages<T>(endpoint: string): Promise<T[]> {
    let allResults: T[] = [];
    let page = 1;
    const pageSize = 100; // Request more items per page
    
    console.log('=== fetchAllPages DEBUG ===');
    console.log('API_BASE_URL:', API_BASE_URL);
    console.log('endpoint:', endpoint);
    
    while (true) {
      // Properly construct URL with pagination parameters
      const separator = endpoint.includes('?') ? '&' : '?';
      const url = `${API_BASE_URL}${endpoint}${separator}page=${page}&page_size=${pageSize}`;
      
      console.log('=== FETCH ATTEMPT ===');
      console.log(`Constructing URL: "${API_BASE_URL}" + "${endpoint}" + "${separator}page=${page}&page_size=${pageSize}"`);
      console.log(`Final URL: "${url}"`);
      console.log('About to fetch from:', url);
      
      try {
        console.log('Calling fetch...');
        const response = await fetch(url, {
          method: 'GET'
        });
        
        console.log('Fetch completed!');
        console.log('Response URL:', response.url);
        console.log('Response status :', response.status);
        console.log('Response statusText:', response.statusText);
        
        if (!response.ok) {
          console.error('=== RESPONSE ERROR ===');
          console.error('Expected URL:', url);
          console.error('Actual response URL:', response.url);
          console.error('Status:', response.status, response.statusText);
          throw new Error(`API request failed: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json() as PaginatedResponse<T>;
        allResults = allResults.concat(data.results);
        
        console.log(`Page ${page}: got ${data.results.length} items, total: ${allResults.length}`);
        console.log('Has next page:', !!data.next);
        
        // If there's no next page, we're done
        if (!data.next) {
          console.log('No next page found, stopping pagination');
          break;
        }
        
        page++;
      } catch (error) {
        console.error('=== FETCH ERROR ===');
        console.error('Error:', error);
        console.error('URL that failed:', url);
        throw error;
      }
    }
    
    console.log(`=== FETCH COMPLETE ===`);
    console.log(`Fetched ${allResults.length} total items from ${endpoint}`);
    return allResults;
  }

  // Dashboard methods
  async getRestrictedUsers(): Promise<ApiUser[]> {
    return this.request('/users/restricted/', 'GET') as Promise<ApiUser[]>;
  }

  async getReportedUsers(): Promise<unknown[]> {
    return this.request('/reports/reported_users/', 'GET') as Promise<unknown[]>;
  }

  async restrictUser(userId: string, data: Record<string, unknown>): Promise<unknown> {
    return this.request(`/users/${userId}/restrict/`, 'POST', data);
  }

  async removeRestriction(userId: string, data?: { description?: string }): Promise<unknown> {
    return this.request(`/users/${userId}/remove_restriction/`, 'POST', data);
  }

  async impostorLogin(adminUserId: string, targetUserId: string): Promise<Record<string, unknown>> {
    return this.request('/auth/impostor-login/', 'POST', { admin_user_id: adminUserId, target_user_id: targetUserId }) as Promise<Record<string, unknown>>;
  }

  async impostorExit(adminUserId: string): Promise<Record<string, unknown>> {
    return this.request('/auth/impostor-exit/', 'POST', { admin_user_id: adminUserId }) as Promise<Record<string, unknown>>;
  }

  async getPictureModerationQueue(): Promise<unknown[]> {
    // The /queue/ endpoint returns a plain array, not a paginated response
    return this.request('/picture-moderation/queue/', 'GET') as Promise<unknown[]>;
  }

  async approvePicture(moderationId: string): Promise<unknown> {
    return this.request(`/picture-moderation/${moderationId}/approve/`, 'POST');
  }

  async rejectPicture(moderationId: string, reason?: string): Promise<unknown> {
    return this.request(`/picture-moderation/${moderationId}/reject/`, 'POST', { reason });
  }

  async getRestrictedText(): Promise<unknown[]> {
    return this.fetchAllPages<unknown>('/questions/restricted_text/');
  }

  async createRestrictedWord(data: Record<string, unknown>): Promise<unknown> {
    return this.request('/questions/restricted_text/', 'POST', data);
  }

  async updateRestrictedWord(wordId: string, data: Record<string, unknown>): Promise<unknown> {
    return this.request(`/questions/restricted_text/${wordId}/`, 'PUT', data);
  }

  async deleteRestrictedWord(wordId: string): Promise<unknown> {
    return this.request(`/questions/restricted_text/${wordId}/`, 'DELETE');
  }

  async resolveReport(reportId: string, action: string, duration?: number): Promise<unknown> {
    const data: Record<string, unknown> = { action };
    if (duration !== undefined) data.duration = duration;
    return this.request(`/reports/${reportId}/resolve/`, 'POST', data);
  }

  // Calculation methods
  async getUsers(): Promise<ApiUser[]> {
    return this.fetchAllPages<ApiUser>('/users/');
  }

  async getAdminProfiles(): Promise<ApiUser[]> {
    return this.request('/users/admin_profiles/', 'GET') as Promise<ApiUser[]>;
  }

  async getUser(userId: string): Promise<ApiUser> {
    return this.request(`/users/${userId}/`, 'GET') as Promise<ApiUser>;
  }

  async updateUser(userId: string, patch: Partial<ApiUser>): Promise<ApiUser> {
    return this.request(`/users/${userId}/`, 'PATCH', patch) as Promise<ApiUser>;
  }

  // ----- Picture gallery -----
  async getUserPictures(userId: string): Promise<UserPicture[]> {
    return this.request(`/users/${userId}/pictures/`, 'GET') as Promise<UserPicture[]>;
  }

  async addUserPicture(userId: string, imageUrl: string): Promise<UserPicture> {
    return this.request(`/users/${userId}/pictures/`, 'POST', { image_url: imageUrl }) as Promise<UserPicture>;
  }

  async deleteUserPicture(userId: string, pictureId: string): Promise<void> {
    await this.request(`/users/${userId}/pictures/${pictureId}/`, 'DELETE');
  }

  async reorderUserPictures(userId: string, orderedIds: string[]): Promise<UserPicture[]> {
    return this.request(`/users/${userId}/pictures/reorder/`, 'POST', { order: orderedIds }) as Promise<UserPicture[]>;
  }

  // ----- Profile prompts -----
  async getPromptTemplates(): Promise<PromptTemplate[]> {
    return this.fetchAllPages<PromptTemplate>('/prompt-templates/');
  }

  async getUserProfilePrompts(
    userId: string,
    options?: { viewerId?: string; includeVotes?: boolean }
  ): Promise<UserProfilePrompt[]> {
    const params = new URLSearchParams({ user_id: userId });
    if (options?.viewerId) params.set('viewer_id', options.viewerId);
    if (options?.includeVotes) {
      params.set('include_votes', 'true');
      params.set('owner_id', userId);
    }
    return this.fetchAllPages<UserProfilePrompt>(`/profile-prompts/?${params.toString()}`);
  }

  async replaceUserProfilePrompts(userId: string, prompts: ProfilePromptPayload[]): Promise<UserProfilePrompt[]> {
    return this.request('/profile-prompts/replace-set/', 'POST', { user_id: userId, editor_id: userId, prompts }) as Promise<UserProfilePrompt[]>;
  }

  async voteOnPromptPoll(
    promptId: string,
    data: { voter_id: string; selected_option_index: number; comment?: string }
  ): Promise<PromptPollVote> {
    const response = await fetch(`${API_BASE_URL}/profile-prompts/${promptId}/vote/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      let payload: { error?: string; message?: string } | null = null;
      try {
        payload = await response.json();
      } catch {
        payload = null;
      }
      const error = new Error(payload?.message || payload?.error || `API request failed: ${response.status} ${response.statusText}`);
      (error as Error & { status?: number; code?: string }).status = response.status;
      (error as Error & { status?: number; code?: string }).code = payload?.error;
      throw error;
    }

    return response.json() as Promise<PromptPollVote>;
  }

  async getCompatibleUsers(params: {
    compatibility_type?: string;
    min_compatibility?: number;
    max_compatibility?: number;
    min_age?: number;
    max_age?: number;
    min_distance?: number;
    max_distance?: number;
    required_only?: boolean;
    required_scope?: 'my' | 'their';
    filter_required?: boolean;
    filter_pending?: boolean;
    filter_their_required?: boolean;
    filter_their_pending?: boolean;
    page?: number;
    page_size?: number;
    sort?: string;
    tags?: string[];
    user_id?: string;
    search?: string;
    search_field?: 'name' | 'username' | 'live' | 'bio';
  }): Promise<{ results: Array<{ user: ApiUser; compatibility: CompatibilityResult; missing_required?: boolean; their_missing_required?: boolean; compatibility_non_required?: CompatibilityResult }>; count: number; total_count: number; page: number; page_size: number; has_next: boolean }> {
    const queryParams = new URLSearchParams();

    if (params.compatibility_type) queryParams.append('compatibility_type', params.compatibility_type);
    if (params.min_compatibility !== undefined) queryParams.append('min_compatibility', params.min_compatibility.toString());
    if (params.max_compatibility !== undefined) queryParams.append('max_compatibility', params.max_compatibility.toString());
    if (params.min_age !== undefined) queryParams.append('min_age', params.min_age.toString());
    if (params.max_age !== undefined) queryParams.append('max_age', params.max_age.toString());
    if (params.min_distance !== undefined) queryParams.append('min_distance', params.min_distance.toString());
    if (params.max_distance !== undefined) queryParams.append('max_distance', params.max_distance.toString());
    if (params.required_only !== undefined) queryParams.append('required_only', params.required_only.toString());
    if (params.required_scope) queryParams.append('required_scope', params.required_scope);
    if (params.sort) queryParams.append('sort', params.sort);
    if (params.filter_required !== undefined) queryParams.append('filter_required', params.filter_required.toString());
    if (params.filter_pending !== undefined) queryParams.append('filter_pending', params.filter_pending.toString());
    if (params.filter_their_required !== undefined) queryParams.append('filter_their_required', params.filter_their_required.toString());
    if (params.filter_their_pending !== undefined) queryParams.append('filter_their_pending', params.filter_their_pending.toString());
    if (params.page) queryParams.append('page', params.page.toString());
    if (params.page_size) queryParams.append('page_size', params.page_size.toString());

    // Add tag parameters
    if (params.tags && params.tags.length > 0) {
      params.tags.forEach(tag => queryParams.append('tags', tag));
    }

    // Add user_id parameter
    if (params.user_id) {
      queryParams.append('user_id', params.user_id);
    }

    // Add search parameters
    if (params.search) {
      queryParams.append('search', params.search);
    }
    if (params.search_field) {
      queryParams.append('search_field', params.search_field);
    }

    return this.request(`/users/compatible/?${queryParams.toString()}`, 'GET') as Promise<{
      results: Array<{ user: ApiUser; compatibility: CompatibilityResult }>;
      count: number;
      total_count: number;
      page: number;
      page_size: number;
      has_next: boolean;
    }>;
  }

  async searchUsers(query: string, limit = 10): Promise<ApiUser[]> {
    if (!query || query.trim().length < 2) {
      return [];
    }
    
    try {
      const response = await this.request(
        `/users/search/?q=${encodeURIComponent(query)}&limit=${limit}`,
        'GET'
      ) as { results: ApiUser[] };
      const results = response.results || [];
      return limit > 0 ? results.slice(0, limit) : results;
    } catch (error) {
      console.error('Error searching users:', error);
      return [];
    }
  }

  async getUserAnswers(userId: string): Promise<UserAnswer[]> {
    // For user answers, we need to handle the user parameter separately
    // because the endpoint already has query parameters
    let allResults: UserAnswer[] = [];
    let page = 1;
    const pageSize = 100;
    const maxPages = 10; // Safety limit
    
    console.log('=== getUserAnswers DEBUG ===');
    console.log('userId:', userId);
    
    while (page <= maxPages) {
      const url = `${API_BASE_URL}/answers/?user=${userId}&page=${page}&page_size=${pageSize}`;
      
      console.log('=== USER ANSWERS FETCH ATTEMPT ===');
      console.log(`Page ${page}/${maxPages} - Final URL: "${url}"`);
      console.log('Calling fetch...');
      
      try {
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          }
        });
        
        console.log('Fetch completed!');
        console.log('Response URL:', response.url);
        console.log('Response status:', response.status);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch user answers: ${response.status}`);
        }
        
        const data = await response.json() as PaginatedResponse<UserAnswer>;
        allResults = allResults.concat(data.results);
        
        console.log(`Page ${page}: got ${data.results.length} answers, total: ${allResults.length}`);
        console.log('Has next page:', !!data.next);
        
        // Stop if there's no next page
        if (!data.next) {
          console.log('No next page found, stopping pagination');
          break;
        }
        
        page++;
      } catch (error) {
        console.error('Error fetching user answers:', error);
        throw error;
      }
    }

    if (page > maxPages) {
      console.warn(`=== SAFETY LIMIT REACHED ===`);
      console.warn(`Stopped at ${maxPages} pages for user answers`);
    }
    
    console.log('=== USER ANSWERS FETCH COMPLETE ===');
    console.log(`Fetched ${allResults.length} total answers for user ${userId}`);
    return allResults;
  }

  async getQuestions(includeUnapproved: boolean = false): Promise<Question[]> {
    const endpoint = includeUnapproved ? '/questions/?include_unapproved=true' : '/questions/';
    return this.fetchAllPages<Question>(endpoint);
  }

  /** Fetch question IDs the user has marked as required (UserRequiredQuestion). */
  async getRequiredQuestionIds(userId: string): Promise<string[]> {
    const allResults: UserRequiredQuestionItem[] = [];
    let url: string | null = `/user-required-questions/?user=${encodeURIComponent(userId)}&page_size=200`;
    while (url) {
      const data = await this.request(url, 'GET') as {
        results?: UserRequiredQuestionItem[];
        next?: string | null;
      };
      const results = data.results ?? [];
      allResults.push(...results);
      // next is a full URL — extract the path portion for the request helper
      if (data.next) {
        try {
          const parsed = new URL(data.next);
          url = parsed.pathname.replace(/^\/api/, '') + parsed.search;
        } catch {
          url = null;
        }
      } else {
        url = null;
      }
    }
    return allResults.map((r) => r.question_id);
  }

  async getQuestion(id: string, skipUserAnswers: boolean = true, includeUnapproved: boolean = false): Promise<Question> {
    // For edit operations, skip user_answers to improve performance
    // includeUnapproved=true allows dashboard to load draft/unapproved questions for editing
    const params = new URLSearchParams();
    if (skipUserAnswers) params.set('skip_user_answers', 'true');
    if (includeUnapproved) params.set('include_unapproved', 'true');
    const query = params.toString();
    const endpoint = query ? `/questions/${id}/?${query}` : `/questions/${id}/`;
    return this.request(endpoint, 'GET') as Promise<Question>;
  }

  async createQuestion(questionData: {
    text: string;
    question_name?: string;
    question_number?: number;
    group_number?: number;
    group_name?: string;
    tags: string[];
    question_type?: string;
    is_required_for_match?: boolean;
    is_approved?: boolean;
    skip_me?: boolean;
    skip_looking_for?: boolean;
    open_to_all_me?: boolean;
    open_to_all_looking_for?: boolean;
    value_label_1?: string;
    value_label_5?: string;
    answers: Array<{ value: string; answer: string }>;
  }): Promise<Question> {
    // Remove answers from the data sent to backend since Question model doesn't have answers field
    // Backend expects value_label_1 and value_label_5 instead
    const { answers: omittedAnswers, ...questionPayload } = questionData;
    void omittedAnswers;
    return this.request('/questions/', 'POST', questionPayload) as Promise<Question>;
  }

  async updateQuestion(id: string, questionData: {
    text: string;
    question_name?: string;
    question_number?: number;
    group_number?: number;
    group_name?: string;
    tags: string[];
    question_type?: string;
    is_required_for_match?: boolean;
    is_approved?: boolean;
    skip_me?: boolean;
    skip_looking_for?: boolean;
    open_to_all_me?: boolean;
    open_to_all_looking_for?: boolean;
    answers?: Array<{ value: string; answer: string }>;
  }): Promise<Question> {
    return this.request(`/questions/${id}/`, 'PUT', questionData) as Promise<Question>;
  }

  async deleteQuestion(id: string): Promise<void> {
    return this.request(`/questions/${id}/delete/`, 'DELETE') as Promise<void>;
  }

  async approveQuestion(id: string): Promise<Question> {
    return this.request(`/questions/${id}/approve/`, 'POST') as Promise<Question>;
  }

  async rejectQuestion(id: string): Promise<Question> {
    return this.request(`/questions/${id}/reject/`, 'POST') as Promise<Question>;
  }

  async toggleQuestionApproval(id: string, isApproved: boolean): Promise<Question> {
    return this.request(`/questions/${id}/`, 'PATCH', { is_approved: isApproved }) as Promise<Question>;
  }

  async getQuestionMetadata(): Promise<QuestionMetadata> {
    return this.request('/questions/metadata/', 'GET') as Promise<QuestionMetadata>;
  }

  async calculateCompatibility(user1Id: string, user2Id: string): Promise<CompatibilityResult> {
    return this.request('/compatibilities/calculate/', 'POST', {
      user1_id: user1Id,
      user2_id: user2Id
    }) as Promise<CompatibilityResult>;
  }

  async getDashboardStats(): Promise<{
    total_users: number;
    daily_active_users: number;
    weekly_active_users: number;
    monthly_active_users: number;
    new_users_this_year: number;
    total_matches: number;
    total_likes: number;
    total_approves: number;
  }> {
    return this.request('/stats/dashboard/', 'GET') as Promise<{
      total_users: number;
      daily_active_users: number;
      weekly_active_users: number;
      monthly_active_users: number;
      new_users_this_year: number;
      total_matches: number;
      total_likes: number;
      total_approves: number;
    }>;
  }

  async getTimeseriesData(
    periodOrStartDate?: number | string,
    endDate?: string
  ): Promise<{
    period: number;
    start_date: string;
    end_date: string;
    data: Array<{
      date: string;
      users: number;
      approves: number;
      likes: number;
      matches: number;
      new_users: number;
    }>;
  }> {
    let url = '/stats/timeseries/';

    if (typeof periodOrStartDate === 'string' && endDate) {
      // Use date range
      url += `?start_date=${periodOrStartDate}&end_date=${endDate}`;
    } else if (typeof periodOrStartDate === 'number') {
      // Use period
      url += `?period=${periodOrStartDate}`;
    } else {
      // Default to 30 days
      url += '?period=30';
    }

    return this.request(url, 'GET') as Promise<{
      period: number;
      start_date: string;
      end_date: string;
      data: Array<{
        date: string;
        users: number;
        approves: number;
        likes: number;
        matches: number;
        new_users: number;
      }>;
    }>;
  }

  // Settings methods
  async changeEmail(data: { current_email: string; current_password: string; new_email: string }): Promise<{
    success: boolean;
    message: string;
    email?: string;
    error?: string;
  }> {
    try {
      return await this.request('/users/change_email/', 'POST', data) as {
        success: boolean;
        message: string;
        email?: string;
      };
    } catch (error) {
      console.error('Error changing email:', error);
      throw error;
    }
  }

  async changePassword(data: {
    current_email: string;
    current_password: string;
    new_password: string;
    confirm_password: string;
  }): Promise<{
    success: boolean;
    message: string;
    error?: string;
  }> {
    try {
      return await this.request('/users/change_password/', 'POST', data) as {
        success: boolean;
        message: string;
      };
    } catch (error) {
      console.error('Error changing password:', error);
      throw error;
    }
  }

  // Notification methods
  async getNotifications(userId: string, page = 1, pageSize = 20): Promise<PaginatedResponse<Notification>> {
    const url = `/notifications/?user_id=${userId}&page=${page}&page_size=${pageSize}`;
    return this.request(url, 'GET') as Promise<PaginatedResponse<Notification>>;
  }

  async getUnreadNotificationCount(userId: string): Promise<{ count: number }> {
    return this.request(`/notifications/unread_count/?user_id=${userId}`, 'GET') as Promise<{ count: number }>;
  }

  async markNotificationRead(notificationId: string): Promise<Notification> {
    return this.request(`/notifications/${notificationId}/mark_read/`, 'POST') as Promise<Notification>;
  }

  async markAllNotificationsRead(userId: string): Promise<{ status: string }> {
    return this.request(`/notifications/mark_all_read/?user_id=${userId}`, 'POST') as Promise<{ status: string }>;
  }

  async deleteNotification(notificationId: string): Promise<void> {
    return this.request(`/notifications/${notificationId}/`, 'DELETE') as Promise<void>;
  }

  // Conversation/Chat methods
  async getConversations(userId: string, page = 1, pageSize = 20): Promise<PaginatedResponse<Conversation>> {
    const url = `/conversations/?user_id=${userId}&page=${page}&page_size=${pageSize}`;
    return this.request(url, 'GET') as Promise<PaginatedResponse<Conversation>>;
  }

  async getConversation(conversationId: string, userId: string): Promise<Conversation> {
    return this.request(`/conversations/${conversationId}/?user_id=${userId}`, 'GET') as Promise<Conversation>;
  }

  async createOrGetConversation(userId: string, otherUserId: string): Promise<Conversation> {
    return this.request('/conversations/', 'POST', {
      user_id: userId,
      other_user_id: otherUserId
    }) as Promise<Conversation>;
  }

  async getMessages(conversationId: string, page = 1, pageSize = 50): Promise<{
    results: Message[];
    count: number;
    page: number;
    page_size: number;
    has_more: boolean;
  }> {
    const url = `/conversations/${conversationId}/messages/?page=${page}&page_size=${pageSize}`;
    return this.request(url, 'GET') as Promise<{
      results: Message[];
      count: number;
      page: number;
      page_size: number;
      has_more: boolean;
    }>;
  }

  async sendMessage(conversationId: string, senderId: string, content: string): Promise<Message> {
    return this.request(`/conversations/${conversationId}/send_message/`, 'POST', {
      sender_id: senderId,
      content: content
    }) as Promise<Message>;
  }

  async markMessagesRead(conversationId: string, userId: string): Promise<{ marked_read: number }> {
    return this.request(`/conversations/${conversationId}/mark_messages_read/`, 'POST', {
      user_id: userId
    }) as Promise<{ marked_read: number }>;
  }

  async getUnreadMessageCount(userId: string): Promise<{ count: number }> {
    return this.request(`/conversations/unread_count/?user_id=${userId}`, 'GET') as Promise<{ count: number }>;
  }

  async broadcastMessage(senderId: string, content: string): Promise<{ sent_count: number }> {
    return this.request('/conversations/broadcast/', 'POST', {
      sender_id: senderId,
      content: content
    }) as Promise<{ sent_count: number }>;
  }

  async getBroadcastHistory(userId: string, page = 1, pageSize = 10): Promise<{ results: BroadcastMessage[]; count: number; next: boolean }> {
    return this.request(`/conversations/broadcast_history/?user_id=${userId}&page=${page}&page_size=${pageSize}`, 'GET') as Promise<{ results: BroadcastMessage[]; count: number; next: boolean }>;
  }

  async getAdminConversations(userId: string, page = 1, pageSize = 20): Promise<PaginatedResponse<Conversation>> {
    const url = `/conversations/admin_conversations/?user_id=${userId}&page=${page}&page_size=${pageSize}`;
    return this.request(url, 'GET') as Promise<PaginatedResponse<Conversation>>;
  }

  async getAdminUser(): Promise<{ id: string; first_name: string }> {
    return this.request('/users/get_admin/', 'GET') as Promise<{ id: string; first_name: string }>;
  }

  // Generic CRUD operations
  async get(endpoint: string): Promise<unknown> {
    return this.request(endpoint, 'GET');
  }

  async post(endpoint: string, data: Record<string, unknown>): Promise<unknown> {
    return this.request(endpoint, 'POST', data);
  }

  async put(endpoint: string, data: Record<string, unknown>): Promise<unknown> {
    return this.request(endpoint, 'PUT', data);
  }

  async delete(endpoint: string): Promise<unknown> {
    return this.request(endpoint, 'DELETE');
  }

  // ----- Feed -----
  async getFeed(opts: {
    audience?: FeedAudience;
    page?: number;
    pageSize?: number;
    viewerId?: string;
    q?: string;
    hashtag?: string;
    authorId?: string;
  } = {}): Promise<FeedResponse> {
    const { audience = 'all', page = 1, pageSize = 20, viewerId, q, hashtag, authorId } = opts;
    const qs = new URLSearchParams({ audience, page: String(page), page_size: String(pageSize) });
    if (viewerId) qs.set('user_id', viewerId);
    if (q && q.trim()) qs.set('q', q.trim());
    if (hashtag && hashtag.trim()) qs.set('hashtag', hashtag.trim().toLowerCase().replace(/^#/, ''));
    if (authorId) qs.set('author_id', authorId);
    return this.request(`/feed/?${qs.toString()}`, 'GET') as Promise<FeedResponse>;
  }

  async getProfilePosts(profileUserId: string, viewerId: string, page = 1, pageSize = 20): Promise<FeedResponse> {
    return this.getFeed({ authorId: profileUserId, viewerId, page, pageSize });
  }

  async getFeedHashtags(viewerId?: string, limit = 20): Promise<HashtagCategory[]> {
    const qs = new URLSearchParams({ limit: String(limit) });
    if (viewerId) qs.set('user_id', viewerId);
    return this.request(`/feed/hashtags/?${qs.toString()}`, 'GET') as Promise<HashtagCategory[]>;
  }

  async createPost(body: string, imageUrls: string[], visibility: PostVisibility = 'all', viewerId?: string): Promise<Post> {
    const payload: Record<string, unknown> = { body, image_urls: imageUrls, visibility };
    if (viewerId) payload.user_id = viewerId;
    return this.request('/posts/', 'POST', payload) as Promise<Post>;
  }

  async updatePost(postId: string, patch: { body?: string; visibility?: PostVisibility }, viewerId?: string): Promise<Post> {
    const payload: Record<string, unknown> = { ...patch };
    if (viewerId) payload.user_id = viewerId;
    return this.request(`/posts/${postId}/`, 'PATCH', payload) as Promise<Post>;
  }

  async deletePost(postId: string, viewerId?: string): Promise<void> {
    const url = viewerId ? `/posts/${postId}/?user_id=${viewerId}` : `/posts/${postId}/`;
    await this.request(url, 'DELETE');
  }

  async reactToPost(postId: string, kind: 'like' | 'dislike', viewerId?: string): Promise<Post> {
    const payload: Record<string, unknown> = { kind };
    if (viewerId) payload.user_id = viewerId;
    return this.request(`/posts/${postId}/react/`, 'POST', payload) as Promise<Post>;
  }

  async getPostRevisions(postId: string, viewerId?: string): Promise<PostRevision[]> {
    const url = viewerId ? `/posts/${postId}/revisions/?user_id=${viewerId}` : `/posts/${postId}/revisions/`;
    return this.request(url, 'GET') as Promise<PostRevision[]>;
  }

  async getPostComments(postId: string): Promise<PostComment[]> {
    return this.request(`/comments/?post=${postId}`, 'GET') as Promise<PostComment[]>;
  }

  async getProfileComments(profileUserId: string, viewerId: string): Promise<PostComment[]> {
    return this.request(`/comments/?author_id=${profileUserId}&user_id=${viewerId}`, 'GET') as Promise<PostComment[]>;
  }

  async createComment(postId: string, body: string, viewerId?: string): Promise<PostComment> {
    const payload: Record<string, unknown> = { post: postId, body };
    if (viewerId) payload.user_id = viewerId;
    return this.request('/comments/', 'POST', payload) as Promise<PostComment>;
  }

  async updateComment(commentId: string, body: string, viewerId?: string): Promise<PostComment> {
    const payload: Record<string, unknown> = { body };
    if (viewerId) payload.user_id = viewerId;
    return this.request(`/comments/${commentId}/`, 'PATCH', payload) as Promise<PostComment>;
  }

  async deleteComment(commentId: string, viewerId?: string): Promise<void> {
    const url = viewerId ? `/comments/${commentId}/?user_id=${viewerId}` : `/comments/${commentId}/`;
    await this.request(url, 'DELETE');
  }
}

export const apiService = new ApiService(); 
