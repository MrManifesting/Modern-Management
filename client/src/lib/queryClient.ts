/**
 * Utility functions for making API requests using React Query
 */
import { QueryClient, QueryFunction } from '@tanstack/react-query';

// Create a client with default query function
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      queryFn: async ({ queryKey }) => {
        const [endpoint] = queryKey as string[];
        
        try {
          const response = await fetch(endpoint, {
            credentials: 'include',
          });

          if (!response.ok) {
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('text/html')) {
              throw new Error(`Authentication required or server error for ${endpoint}`);
            }
            
            const error = await response.json().catch(() => ({ message: "Request failed" }));
            throw new Error(error.message || "Request failed");
          }

          const contentType = response.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            return await response.json();
          } else {
            throw new Error(`Invalid response format from ${endpoint}`);
          }
        } catch (error: any) {
          throw error;
        }
      },
    },
  },
});

interface QueryFnOptions {
  on401?: "throw" | "returnNull";
}

/**
 * Creates a query function for React Query
 * @param options Options for the query function
 * @returns A query function for React Query
 */
export function getQueryFn(options: QueryFnOptions = {}): QueryFunction {
  return async ({ queryKey }) => {
    const [endpoint] = queryKey as string[];

    try {
      const response = await fetch(endpoint, {
        credentials: 'include', // Include cookies for authentication
      });

      if (response.status === 401 && options.on401 === "returnNull") {
        return { success: false, user: null };
      }

      if (!response.ok) {
        // Check if response is HTML (common when auth redirects occur)
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('text/html')) {
          console.error(`API returned HTML instead of JSON for ${endpoint}. This usually means authentication failed or server error.`);
          throw new Error(`Authentication required or server error for ${endpoint}`);
        }
        
        const error = await response.json().catch(() => ({ message: "Request failed" }));
        throw new Error(error.message || "Request failed");
      }

      // Check if response is JSON before parsing
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        return await response.json();
      } else {
        console.error(`API returned non-JSON response for ${endpoint}:`, contentType);
        throw new Error(`Invalid response format from ${endpoint}`);
      }
    } catch (error: any) {
      if (error.message === "Failed to fetch" && options.on401 === "returnNull") {
        return { success: false, user: null };
      }
      
      // Handle JSON parsing errors specifically
      if (error.message.includes('Unexpected token') && error.message.includes('<')) {
        console.error(`JSON parsing failed for ${endpoint}. Server returned HTML instead of JSON.`);
        throw new Error(`Authentication required or server error for ${endpoint}`);
      }
      
      throw error;
    }
  };
}

/**
 * Makes an API request to the specified endpoint (returns full Response object)
 * @param method The HTTP method to use for the request
 * @param endpoint The API endpoint to request
 * @param data Optional data to send with the request
 * @param isFormData Optional flag to indicate if data is FormData
 * @returns The Response object from fetch
 */
export const apiRequest = async (
  method: string, 
  endpoint: string, 
  data?: any, 
  isFormData: boolean = false,
  sendBodyWithDelete: boolean = false
): Promise<Response> => {
  const headers: HeadersInit = {};

  if (!isFormData) {
    headers['Content-Type'] = 'application/json';
  }

  const options: RequestInit = {
    method,
    headers,
    credentials: 'include', // Include cookies for auth
  };

  if (data) {
    // For DELETE requests, ensure we allow the body to be sent when explicitly requested
    if (method === 'DELETE' && !sendBodyWithDelete) {
      // Convert body to query params for DELETE without body
      const params = new URLSearchParams();
      Object.entries(data).forEach(([key, value]) => {
        if (Array.isArray(value)) {
          value.forEach(v => params.append(`${key}[]`, v.toString()));
        } else {
          params.append(key, value.toString());
        }
      });

      // Append query params to endpoint
      endpoint = `${endpoint}?${params.toString()}`;
    } else {
      // For other methods or DELETE with body explicitly enabled
      if (isFormData) {
        // Don't set Content-Type for FormData, let the browser set it with boundary
        options.body = data;
      } else {
        options.body = JSON.stringify(data);
      }
    }
  }

  return fetch(endpoint, options);
};

/**
 * Simplified API request function that directly returns the JSON result (used in multiple components)
 * @param endpoint The API endpoint to request
 * @param options Optional fetch options
 * @returns The JSON response data
 */
export async function apiRequestSimple<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
  // Ensure credentials are included for all requests
  const fetchOptions = { 
    ...options,
    credentials: 'include' // Include cookies for authentication
  };
  
  const response = await fetch(endpoint, fetchOptions);

  if (!response.ok) {
    // Check if response is HTML (common when auth redirects occur)
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('text/html')) {
      console.error(`API returned HTML instead of JSON for ${endpoint}. Status: ${response.status}`);
      throw new Error(`Authentication required or server error for ${endpoint}`);
    }
    
    const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
    throw new Error(errorData.message || 'Request failed');
  }

  // Check if response is JSON before parsing
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    return await response.json() as T;
  } else {
    console.error(`API returned non-JSON response for ${endpoint}:`, contentType);
    throw new Error(`Invalid response format from ${endpoint}`);
  }
}