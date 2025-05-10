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
  const response = await fetch(endpoint, options);

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
    throw new Error(errorData.message || 'Request failed');
  }

  return await response.json() as T;
}