import { createContext, ReactNode, useContext } from "react";
import {
  useQuery,
  useMutation,
  UseMutationResult,
} from "@tanstack/react-query";
import { User, insertUserSchema } from "@shared/schema";
import { getQueryFn, apiRequest, queryClient } from "../lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { z } from "zod";

type AuthContextType = {
  user: User | null;
  isLoading: boolean;
  error: Error | null;
  loginMutation: UseMutationResult<LoginResponse, Error, LoginData>;
  logoutMutation: UseMutationResult<LogoutResponse, Error, void>;
  registerMutation: UseMutationResult<RegisterResponse, Error, RegisterData>;
};

// Login data schema
export const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

export type LoginData = z.infer<typeof loginSchema>;

// Register data schema 
export const registerSchema = insertUserSchema.extend({
  confirmPassword: z.string().min(1, "Confirm password is required")
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export type RegisterData = z.infer<typeof registerSchema>;

// Response type interfaces
interface LoginResponse {
  success: boolean;
  user: User;
  message?: string;
  redirectTo?: string;
}

interface LogoutResponse {
  success: boolean;
  message: string;
}

interface RegisterResponse {
  success: boolean;
  user: User;
  message?: string;
}

export const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  
  const {
    data: result,
    error,
    isLoading,
  } = useQuery({
    queryKey: ["/api/user"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnMount: true,
    refetchInterval: false
  });

  // Safely extract user data with proper null checking
  const user = result && result.authenticated === true ? result : null;

  const loginMutation = useMutation<LoginResponse, Error, LoginData>({
    mutationFn: async (credentials: LoginData) => {
      const res = await apiRequest("POST", "/api/login", credentials);
      return await res.json();
    },
    onSuccess: (data: LoginResponse) => {
      if (data.success && data.user) {
        // Update the cache with user data
        queryClient.setQueryData(["/api/user"], { 
          success: true, 
          user: data.user 
        });
        
        // Invalidate the user query to trigger a refetch
        queryClient.invalidateQueries({ queryKey: ["/api/user"] });
        
        // Show success message
        toast({
          title: "Login successful",
          description: "Welcome back!",
          variant: "default",
        });
        
        console.log("Login successful in auth hook. User data received:", data.user.username);
        // Navigation handled in auth-page.tsx component
      } else {
        // Handle unexpected response format
        console.error("Login response missing user data:", data);
        toast({
          title: "Login error",
          description: "Unexpected server response",
          variant: "destructive",
        });
      }
    },
    onError: (error: Error) => {
      console.error("Login error:", error);
      toast({
        title: "Login failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const registerMutation = useMutation<RegisterResponse, Error, RegisterData>({
    mutationFn: async (userData: RegisterData) => {
      // Remove confirmPassword as it's not in the API schema
      const { confirmPassword, ...apiData } = userData;
      const res = await apiRequest("POST", "/api/register", apiData);
      return await res.json();
    },
    onSuccess: (data: RegisterResponse) => {
      queryClient.setQueryData(["/api/user"], { 
        success: true, 
        user: data.user 
      });
      toast({
        title: "Registration successful",
        description: "Your account has been created.",
        variant: "default",
      });
      
      console.log("Registration successful. User data received:", data.user?.username);
      
      // Force navigation to main dashboard
      window.location.href = "/products-inventory";
    },
    onError: (error: Error) => {
      toast({
        title: "Registration failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const logoutMutation = useMutation<LogoutResponse, Error, void>({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/logout");
      return await res.json();
    },
    onSuccess: () => {
      queryClient.setQueryData(["/api/user"], null);
      toast({
        title: "Logged out",
        description: "You have been logged out successfully.",
        variant: "default",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Logout failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        error,
        loginMutation,
        logoutMutation,
        registerMutation,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  // Bypass all authentication checks and return a default authenticated user
  return {
    user: {
      id: "1",
      username: "admin",
      role: "admin",
      email: "admin@goldstandardinventory.com",
      firstName: "Admin",
      lastName: "User"
    },
    isLoading: false,
    error: null,
    loginMutation: {
      mutate: () => {},
      isPending: false,
      isSuccess: true,
      isError: false,
      data: null,
      error: null,
      reset: () => {},
    },
    logoutMutation: {
      mutate: () => {},
      isPending: false,
      isSuccess: false,
      isError: false,
      data: null,
      error: null,
      reset: () => {},
    },
    registerMutation: {
      mutate: () => {},
      isPending: false,
      isSuccess: false,
      isError: false,
      data: null,
      error: null,
      reset: () => {},
    }
  };
}