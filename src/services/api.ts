// Type definitions for API responses
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
}

export interface UserAnswer {
  id: string;
  user: ApiUser;
  question: Question;
  me_answer: number;
  looking_for_answer: number;
  me_multiplier: number;
  looking_for_multiplier: number;
}

export interface Question {
  id: string;
  text: string;
  question_type: string;
  is_required_for_match: boolean;
}

export interface CompatibilityResult {
  overall_compatibility: number;
  compatible_with_me: number;
  im_compatible_with: number;
  mutual_questions_count: number;
}

interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

const API_BASE_URL = 'http://localhost:9090/api';

console.log('API_BASE_URL:', API_BASE_URL);

class ApiService {
  private async request(endpoint: string, method: string, data?: Record<string, unknown>): Promise<unknown> {
    const url = `${API_BASE_URL}${endpoint}`;
    const options: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    if (data) {
      options.body = JSON.stringify(data);
    }

    const response = await fetch(url, options);
    
    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }

    return response.json();
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
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        
        console.log('Fetch completed!');
        console.log('Response URL:', response.url);
        console.log('Response status:', response.status);
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
    return this.fetchAllPages<unknown>('/picture-moderation/queue/');
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

  async searchUsers(query: string): Promise<ApiUser[]> {
    if (!query || query.trim().length < 2) {
      return [];
    }
    
    try {
      const response = await this.request(`/users/search/?q=${encodeURIComponent(query)}`, 'GET') as { results: ApiUser[] };
      return response.results || [];
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
          },
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

  async getQuestions(): Promise<Question[]> {
    return this.fetchAllPages<Question>('/questions/');
  }

  async calculateCompatibility(user1Id: string, user2Id: string): Promise<CompatibilityResult> {
    return this.request('/compatibilities/calculate/', 'POST', {
      user1_id: user1Id,
      user2_id: user2Id
    }) as Promise<CompatibilityResult>;
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