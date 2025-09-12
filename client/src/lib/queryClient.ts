import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { auth } from "./firebase";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

async function getAuthHeaders(): Promise<Record<string, string>> {
  try {
    const user = auth.currentUser;
    if (user) {
      // Get Firebase ID token for authenticated user
      const idToken = await user.getIdToken();
      return {
        "Authorization": `Bearer ${idToken}`,
      };
    }
  } catch (error) {
    console.error("Failed to get Firebase ID token:", error);
  }
  
  return {};
}

// API base URL configuration for different environments  
const API_BASE_URL = import.meta.env.PROD
  ? (import.meta.env.VITE_API_URL || 'https://leave-management-backend.onrender.com')
  : '';

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const authHeaders = await getAuthHeaders();
  const headers = {
    ...(data ? { "Content-Type": "application/json" } : {}),
    ...authHeaders,
  };

  // In production, prefix with API base URL if it's a relative API path
  const finalUrl = import.meta.env.PROD && url.startsWith('/api')
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
    const authHeaders = await getAuthHeaders();
    const queryUrl = queryKey.join("/") as string;
    
    // In production, prefix with API base URL if it's a relative API path
    const finalUrl = import.meta.env.PROD && queryUrl.startsWith('/api')
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
