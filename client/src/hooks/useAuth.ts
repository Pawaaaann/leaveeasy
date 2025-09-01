import { useState, useEffect } from "react";
import { onAuthStateChanged, signOut, signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { doc, setDoc, getDoc } from "firebase/firestore";
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
    // Check for stored user profile immediately for fast loading
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
          return true;
        } catch (error) {
          console.error("Failed to parse stored user profile:", error);
          localStorage.removeItem("userProfile");
        }
      }
      return false;
    };

    // Try to load stored user first for immediate feedback
    if (checkStoredUser()) {
      return;
    }

    // Set up Firebase auth listener
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
        // Only clear state if no stored user exists (for local development)
        if (!localStorage.getItem("userProfile")) {
          setAuthState({
            user: null,
            isLoading: false,
            isAuthenticated: false,
          });
        }
      }
    });

    // Set not loading after initial check
    setAuthState(prev => ({ ...prev, isLoading: false }));

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
      // Clear local storage first
      localStorage.removeItem("userProfile");
      localStorage.removeItem("demoUser");
      localStorage.removeItem("registeredUsers");
      
      // Update auth state
      setAuthState({
        user: null,
        isLoading: false,
        isAuthenticated: false,
      });
      
      // Try to sign out from Firebase if available
      await signOut(auth);
    } catch (error) {
      console.error("Logout error:", error);
      // Even if Firebase signout fails, we've already cleared local state
    }
  };

  return {
    ...authState,
    login,
    logout,
  };
}
