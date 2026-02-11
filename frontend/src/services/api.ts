import axios, { AxiosInstance } from 'axios';

// Use /api for production (nginx proxy) or localhost for development
const API_BASE_URL = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:3000' : '/api');

// Create axios instance with default config
const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'X-User-Id': 'demo-user', // TODO: Replace with actual auth token
  },
  timeout: 10000,
});

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // Extract error message from response
    const message =
      error.response?.data?.error?.message ||
      error.message ||
      'An unexpected error occurred';

    // Re-throw with formatted error
    return Promise.reject(new Error(message));
  }
);

export interface Website {
  id: number;
  userId: string;
  websiteName: string;
  websiteTitle: string;
  htmlContent: string;
  status: 'pending' | 'provisioned' | 'failed';
  podIpAddress: string | null;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateWebsiteRequest {
  websiteName: string;
  websiteTitle: string;
  htmlContent: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  count?: number;
}

// API methods
export const websiteApi = {
  /**
   * Create a new website request
   */
  async createWebsite(data: CreateWebsiteRequest): Promise<Website> {
    const response = await apiClient.post<ApiResponse<Website>>('/websites', data);
    return response.data.data;
  },

  /**
   * Get all websites for the current user
   */
  async listWebsites(): Promise<Website[]> {
    const response = await apiClient.get<ApiResponse<Website[]>>('/websites');
    return response.data.data;
  },

  /**
   * Get a single website by ID
   */
  async getWebsite(id: number): Promise<Website> {
    const response = await apiClient.get<ApiResponse<Website>>(`/websites/${id}`);
    return response.data.data;
  },
};

export default apiClient;
