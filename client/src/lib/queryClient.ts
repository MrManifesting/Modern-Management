/**
 * Utility functions for making API requests using React Query
 */
import { QueryClient, QueryFunction } from '@tanstack/react-query';

// Create a client
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
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
      const response = await fetch(endpoint);
      
      if (response.status === 401 && options.on401 === "returnNull") {
        return { success: false, user: null };
      }
      
      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: "Request failed" }));
        throw new Error(error.message || "Request failed");
      }
      
      return await response.json();
    } catch (error: any) {
      if (error.message === "Failed to fetch" && options.on401 === "returnNull") {
        return { success: false, user: null };
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
 * @returns The Response object from fetch
 */
export async function apiRequest(method: string, endpoint: string, data?: any) {
  const options: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
  };

  if (data && method !== 'GET') {
    options.body = JSON.stringify(data);
  }

  const response = await fetch(endpoint, options);

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
    throw new Error(errorData.message || 'Request failed');
  }

  return response;
}

/**
 * Simplified API request function that directly returns the JSON result (used in multiple components)
 * @param endpoint The API endpoint to request
 * @param options Optional fetch options
 * @returns The JSON response data
 */
export async function apiRequestSimple<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(endpoint, options);
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
    throw new Error(errorData.message || 'Request failed');
  }
  
  return await response.json() as T;
}