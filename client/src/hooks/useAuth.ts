import { useState, useEffect } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
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
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Get user role and details from Firestore
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
      } else {
        localStorage.removeItem("userProfile");
        setAuthState({
          user: null,
          isLoading: false,
          isAuthenticated: false,
        });
      }
    });

    return () => unsubscribe();
  }, []);

  const login = (user: User) => {
    localStorage.setItem("userProfile", JSON.stringify(user));
    setAuthState({
      user,
      isLoading: false,
      isAuthenticated: true,
    });
  };

  const logout = async () => {
    try {
      await signOut(auth);
      localStorage.removeItem("userProfile");
      setAuthState({
        user: null,
        isLoading: false,
        isAuthenticated: false,
      });
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  return {
    ...authState,
    login,
    logout,
  };
}
