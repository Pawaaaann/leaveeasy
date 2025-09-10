import { useState, useEffect } from "react";
import { onAuthStateChanged, signOut, signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { doc, setDoc, getDoc } from "firebase/firestore";
import type { User } from "@shared/schema";

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
    let isMounted = true;

    const initializeAuth = async () => {
      // Check for stored user profile immediately
      const storedUser = localStorage.getItem("userProfile");
      if (storedUser) {
        try {
          const userProfile = JSON.parse(storedUser);
          if (isMounted) {
            setAuthState({
              user: userProfile,
              isLoading: false,
              isAuthenticated: true,
            });
            return;
          }
        } catch (error) {
          console.error("Failed to parse stored user profile:", error);
          localStorage.removeItem("userProfile");
        }
      }

      // If no stored user, set loading to false
      if (isMounted) {
        setAuthState({
          user: null,
          isLoading: false,
          isAuthenticated: false,
        });
      }
    };

    // Initialize auth state immediately
    initializeAuth();

    // Set up Firebase auth listener for future changes
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!isMounted) return;

      if (firebaseUser) {
        // If Firebase user exists, check if we have local profile
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
        }
      } else {
        // Firebase user logged out, but preserve local session for development
        const storedUser = localStorage.getItem("userProfile");
        if (!storedUser) {
          setAuthState({
            user: null,
            isLoading: false,
            isAuthenticated: false,
          });
        }
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  const login = (user: User) => {
    console.log("Manual login called with user:", user.username, "role:", user.role);
    
    // Store in localStorage first
    localStorage.setItem("userProfile", JSON.stringify(user));
    
    // Update state immediately and synchronously
    setAuthState({
      user,
      isLoading: false,
      isAuthenticated: true,
    });
    
    console.log("Auth state updated after manual login");
  };

  const logout = async () => {
    try {
      // Clear local storage first
      localStorage.removeItem("userProfile");
      localStorage.removeItem("demoUser");
      localStorage.removeItem("registeredUsers");
      
      // Update auth state immediately
      setAuthState({
        user: null,
        isLoading: false,
        isAuthenticated: false,
      });
      
      // Try to sign out from Firebase (don't wait for it)
      signOut(auth).catch(error => {
        console.error("Firebase signout error:", error);
      });
      
    } catch (error) {
      console.error("Logout error:", error);
      // Ensure state is cleared even if something fails
      setAuthState({
        user: null,
        isLoading: false,
        isAuthenticated: false,
      });
    }
  };

  return {
    ...authState,
    login,
    logout,
  };
}
