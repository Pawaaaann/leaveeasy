import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

function getAuthHeaders(): Record<string, string> {
  // Check the new session format first
  const userSession = localStorage.getItem("userSession");
  if (userSession) {
    try {
      const session = JSON.parse(userSession);
      if (session.user && session.user.id && session.user.role) {
        return {
          "x-user-id": session.user.id,
          "x-user-role": session.user.role,
        };
      }
    } catch (error) {
      console.error("Failed to parse user session for auth headers:", error);
    }
  }
  
  // Fallback to old format for compatibility
  const userProfile = localStorage.getItem("userProfile");
  if (userProfile) {
    try {
      const user = JSON.parse(userProfile);
      if (user.id && user.role) {
        return {
          "x-user-id": user.id,
          "x-user-role": user.role,
        };
      }
    } catch (error) {
      console.error("Failed to parse user profile for auth headers:", error);
    }
  }
  
  return {};
}

// API base URL configuration for different environments  
const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? (process.env.REACT_APP_API_URL || 'https://leave-management-backend.onrender.com')
  : '';

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const authHeaders = getAuthHeaders();
  const headers = {
    ...(data ? { "Content-Type": "application/json" } : {}),
    ...authHeaders,
  };

  // In production, prefix with API base URL if it's a relative API path
  const finalUrl = process.env.NODE_ENV === 'production' && url.startsWith('/api')
    ? `${API_BASE_URL}${url}`
    : url;

  const res = await fetch(finalUrl, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const authHeaders = getAuthHeaders();
    const queryUrl = queryKey.join("/") as string;
    
    // In production, prefix with API base URL if it's a relative API path
    const finalUrl = process.env.NODE_ENV === 'production' && queryUrl.startsWith('/api')
      ? `${API_BASE_URL}${queryUrl}`
      : queryUrl;
    
    const res = await fetch(finalUrl, {
      headers: authHeaders,
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
