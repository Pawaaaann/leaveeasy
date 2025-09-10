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

interface StoredUserSession {
  user: User;
  sessionId: string;
  expiresAt: number;
}

// Session duration: 24 hours
const SESSION_DURATION = 24 * 60 * 60 * 1000;

// Generate a unique session ID
const generateSessionId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

// Validate stored session
const isValidSession = (session: StoredUserSession): boolean => {
  return (
    session.expiresAt > Date.now() && 
    !!session.sessionId && 
    !!session.user &&
    typeof session.user === 'object' &&
    !!session.user.id &&
    !!session.user.role
  );
};

export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isLoading: true,
    isAuthenticated: false,
  });

  useEffect(() => {
    let isMounted = true;

    const initializeAuth = async () => {
      // Check for stored user session with validation
      const storedSession = localStorage.getItem("userSession");
      if (storedSession) {
        try {
          const session: StoredUserSession = JSON.parse(storedSession);
          
          // Validate the session
          if (isValidSession(session)) {
            console.log("Valid session found for user:", session.user.username);
            if (isMounted) {
              setAuthState({
                user: session.user,
                isLoading: false,
                isAuthenticated: true,
              });
              return;
            }
          } else {
            console.log("Invalid or expired session found, clearing localStorage");
            // Clear invalid session data
            localStorage.removeItem("userSession");
            localStorage.removeItem("userProfile"); // Clear old format too
            localStorage.removeItem("demoUser");
            localStorage.removeItem("registeredUsers");
          }
        } catch (error) {
          console.error("Failed to parse stored user session:", error);
          // Clear corrupted session data
          localStorage.removeItem("userSession");
          localStorage.removeItem("userProfile");
          localStorage.removeItem("demoUser");
          localStorage.removeItem("registeredUsers");
        }
      }

      // If no valid stored session, set loading to false
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
        // If Firebase user exists, check if we have valid local session
        const storedSession = localStorage.getItem("userSession");
        if (storedSession) {
          try {
            const session: StoredUserSession = JSON.parse(storedSession);
            if (isValidSession(session)) {
              setAuthState({
                user: session.user,
                isLoading: false,
                isAuthenticated: true,
              });
            } else {
              // Clear invalid session
              localStorage.removeItem("userSession");
              localStorage.removeItem("userProfile");
              setAuthState({
                user: null,
                isLoading: false,
                isAuthenticated: false,
              });
            }
          } catch (error) {
            console.error("Failed to parse stored user session:", error);
            localStorage.removeItem("userSession");
            localStorage.removeItem("userProfile");
            setAuthState({
              user: null,
              isLoading: false,
              isAuthenticated: false,
            });
          }
        }
      } else {
        // Firebase user logged out, check if we have valid local session for development
        const storedSession = localStorage.getItem("userSession");
        if (storedSession) {
          try {
            const session: StoredUserSession = JSON.parse(storedSession);
            if (!isValidSession(session)) {
              localStorage.removeItem("userSession");
              localStorage.removeItem("userProfile");
              setAuthState({
                user: null,
                isLoading: false,
                isAuthenticated: false,
              });
            }
          } catch (error) {
            localStorage.removeItem("userSession");
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
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  const login = (user: User) => {
    console.log("Manual login called with user:", user.username, "role:", user.role);
    
    // Create a new session with expiration
    const sessionId = generateSessionId();
    const session: StoredUserSession = {
      user,
      sessionId,
      expiresAt: Date.now() + SESSION_DURATION,
    };
    
    // Clear any old session data first
    localStorage.removeItem("userProfile"); // Remove old format
    localStorage.removeItem("demoUser");
    localStorage.removeItem("registeredUsers");
    
    // Store the new session
    localStorage.setItem("userSession", JSON.stringify(session));
    
    // Update state immediately and synchronously
    setAuthState({
      user,
      isLoading: false,
      isAuthenticated: true,
    });
    
    console.log("New session created with ID:", sessionId, "expires at:", new Date(session.expiresAt));
  };

  const logout = async () => {
    try {
      console.log("Logging out user, clearing all session data");
      
      // Clear all session data from localStorage
      localStorage.removeItem("userSession");
      localStorage.removeItem("userProfile"); // Clear old format too
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
      localStorage.removeItem("userSession");
      localStorage.removeItem("userProfile");
      localStorage.removeItem("demoUser");
      localStorage.removeItem("registeredUsers");
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
