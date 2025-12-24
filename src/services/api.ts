// Type definitions for API responses
import { API_BASE_URL as CONFIG_API_BASE_URL } from '@/config/api';

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
  questions_answered_count?: number;
  is_online?: boolean;
  last_active?: string | null;
  question_answers?: {
    male?: number;
    female?: number;
    friend?: number;
    hookup?: number;
    date?: number;
    partner?: number;
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
  // Legacy fields kept for backwards compatibility
  me_multiplier?: number;
  looking_for_multiplier?: number;
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
  overall_compatibility: number;
  compatible_with_me: number;
  im_compatible_with: number;
  mutual_questions_count: number;
}

export interface Notification {
  id: string;
  recipient: ApiUser;
  sender: ApiUser;
  notification_type: 'approve' | 'like' | 'match' | 'note';
  note?: string;
  is_read: boolean;
  created_at: string;
  related_user_result?: string;
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

interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

const API_BASE_URL = CONFIG_API_BASE_URL;


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
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
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
    return this.fetchAllPages<ApiUser>('/users/restricted/');
  }

  async getReportedUsers(): Promise<unknown[]> {
    return this.fetchAllPages<unknown>('/reports/reported_users/');
  }

  async restrictUser(userId: string, data: Record<string, unknown>): Promise<unknown> {
    return this.request(`/users/${userId}/restrict/`, 'POST', data);
  }

  async removeRestriction(userId: string): Promise<unknown> {
    return this.request(`/users/${userId}/remove_restriction/`, 'POST');
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

  async resolveReport(reportId: string, action: string): Promise<unknown> {
    return this.request(`/reports/${reportId}/resolve/`, 'POST', { action });
  }

  // Calculation methods
  async getUsers(): Promise<ApiUser[]> {
    return this.fetchAllPages<ApiUser>('/users/');
  }

  async getUser(userId: string): Promise<ApiUser> {
    return this.request(`/users/${userId}/`, 'GET') as Promise<ApiUser>;
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
    page?: number;
    page_size?: number;
    tags?: string[];
    user_id?: string;
  }): Promise<{ results: Array<{ user: ApiUser; compatibility: CompatibilityResult; missing_required?: boolean; compatibility_non_required?: CompatibilityResult }>; count: number; total_count: number; page: number; page_size: number; has_next: boolean }> {
    const queryParams = new URLSearchParams();

    if (params.compatibility_type) queryParams.append('compatibility_type', params.compatibility_type);
    if (params.min_compatibility !== undefined) queryParams.append('min_compatibility', params.min_compatibility.toString());
    if (params.max_compatibility !== undefined) queryParams.append('max_compatibility', params.max_compatibility.toString());
    if (params.min_age !== undefined) queryParams.append('min_age', params.min_age.toString());
    if (params.max_age !== undefined) queryParams.append('max_age', params.max_age.toString());
    if (params.min_distance !== undefined) queryParams.append('min_distance', params.min_distance.toString());
    if (params.max_distance !== undefined) queryParams.append('max_distance', params.max_distance.toString());
    if (params.required_only !== undefined) queryParams.append('required_only', params.required_only.toString());
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

  async getQuestion(id: string, skipUserAnswers: boolean = true): Promise<Question> {
    // For edit operations, skip user_answers to improve performance
    const endpoint = skipUserAnswers 
      ? `/questions/${id}/?skip_user_answers=true`
      : `/questions/${id}/`;
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
    const { answers, ...questionPayload } = questionData;
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
}

export const apiService = new ApiService(); 
