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

    return () => unsubscribe();
  }, []);

  const login = (user: User) => {
    console.log("Manual login called with user:", user.username, "role:", user.role);
    localStorage.setItem("userProfile", JSON.stringify(user));
    
    // Use React's state updater to ensure immediate update
    setAuthState(prevState => ({
      user,
      isLoading: false,
      isAuthenticated: true,
    }));
    
    console.log("Auth state updated after manual login");
    
    // Force a re-render by triggering a state change
    setTimeout(() => {
      setAuthState(prevState => ({ ...prevState }));
    }, 0);
  };

  const logout = async () => {
    try {
      // Update auth state first to immediately trigger re-render
      setAuthState({
        user: null,
        isLoading: false,
        isAuthenticated: false,
      });
      
      // Clear local storage
      localStorage.removeItem("userProfile");
      localStorage.removeItem("demoUser");
      localStorage.removeItem("registeredUsers");
      
      // Try to sign out from Firebase
      await signOut(auth);
      
      // Force another state update to ensure the change is captured
      setTimeout(() => {
        setAuthState({
          user: null,
          isLoading: false,
          isAuthenticated: false,
        });
      }, 0);
    } catch (error) {
      console.error("Logout error:", error);
      // Ensure state is cleared even if Firebase signout fails
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
