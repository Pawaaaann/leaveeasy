import { useState, useEffect } from "react";
import type { User } from "@shared/firebaseSchema";

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isLoading: true,
    isAuthenticated: false,
  });

  useEffect(() => {
    // Simple local storage authentication
    const checkStoredUser = () => {
      const storedUser = localStorage.getItem("userProfile");
      if (storedUser) {
        try {
          const userProfile = JSON.parse(storedUser);
          setAuthState({
            user: userProfile,
            isLoading: false,
            isAuthenticated: true,
          });
        } catch (error) {
          console.error("Failed to parse stored user profile:", error);
          localStorage.removeItem("userProfile");
          setAuthState({
            user: null,
            isLoading: false,
            isAuthenticated: false,
          });
        }
      } else {
        setAuthState({
          user: null,
          isLoading: false,
          isAuthenticated: false,
        });
      }
    };

    // Load stored user on mount
    checkStoredUser();
  }, []);

  const login = (user: User) => {
    localStorage.setItem("userProfile", JSON.stringify(user));
    setAuthState({
      user,
      isLoading: false,
      isAuthenticated: true,
    });
  };

  const logout = () => {
    // Clear local storage
    localStorage.removeItem("userProfile");
    localStorage.removeItem("demoUser");
    localStorage.removeItem("registeredUsers");
    
    // Update auth state
    setAuthState({
      user: null,
      isLoading: false,
      isAuthenticated: false,
    });
  };

  return {
    ...authState,
    login,
    logout,
  };
}
