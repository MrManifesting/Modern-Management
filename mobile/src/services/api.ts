import Constants from 'expo-constants';

const getApiBaseUrl = (): string => {
  const extraApiUrl = Constants.expoConfig?.extra?.apiUrl;
  if (extraApiUrl) return extraApiUrl;
  
  if (__DEV__) {
    return 'http://localhost:5000';
  }
  
  return Constants.expoConfig?.extra?.productionApiUrl || '';
};

const API_BASE_URL = getApiBaseUrl();

interface FetchOptions extends RequestInit {
  params?: Record<string, string>;
}

class ApiService {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(endpoint: string, options: FetchOptions = {}): Promise<T> {
    const { params, ...fetchOptions } = options;
    
    let url = `${this.baseUrl}${endpoint}`;
    if (params) {
      const searchParams = new URLSearchParams(params);
      url += `?${searchParams.toString()}`;
    }

    try {
      const response = await fetch(url, {
        ...fetchOptions,
        headers: {
          'Content-Type': 'application/json',
          ...fetchOptions.headers,
        },
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        throw new Error(`API Error: ${response.status} - ${errorText}`);
      }

      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        return response.json();
      }
      
      return {} as T;
    } catch (error) {
      if (error instanceof TypeError && error.message === 'Network request failed') {
        throw new Error('Unable to connect to server. Please check your network connection.');
      }
      throw error;
    }
  }

  async get<T>(endpoint: string, params?: Record<string, string>): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET', params });
  }

  async post<T>(endpoint: string, data?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async put<T>(endpoint: string, data?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }

  async graphql<T>(query: string, variables?: Record<string, unknown>): Promise<T> {
    return this.request<T>('/graphql', {
      method: 'POST',
      body: JSON.stringify({ query, variables }),
    });
  }
}

export const api = new ApiService(API_BASE_URL);

export const inventoryApi = {
  getItems: () => api.get<any[]>('/api/items'),
  getItem: (id: number) => api.get<any>(`/api/items/${id}`),
  createItem: (data: any) => api.post<any>('/api/items', data),
  updateItem: (id: number, data: any) => api.put<any>(`/api/items/${id}`, data),
  deleteItem: (id: number) => api.delete<void>(`/api/items/${id}`),
};

export const productsApi = {
  getProducts: () => api.get<any[]>('/api/shopify/products'),
};

export const ordersApi = {
  getOrders: () => api.get<any[]>('/api/items').then(items => 
    items.filter((item: any) => item.orderNumber || item.status)
  ),
};

export const statsApi = {
  getStats: () => api.get<any>('/api/stats'),
  getHealth: () => api.get<any>('/api/health'),
};
