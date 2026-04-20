import { FirebaseError } from "firebase/app";
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  type Unsubscribe,
  type User,
} from "firebase/auth";
import { create } from "zustand";

import { firebaseAuth } from "@/config/firebase";
import { upsertUserProfile } from "@/services/organizations";

type AuthState = {
  user: User | null;
  isInitializing: boolean;
  authError: string | null;
  initializeAuth: () => Unsubscribe;
  signInWithEmailPassword: (email: string, password: string) => Promise<void>;
  signUpWithEmailPassword: (name: string, email: string, password: string) => Promise<void>;
  signOutCurrentUser: () => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
  clearAuthError: () => void;
};

let authUnsubscribe: Unsubscribe | null = null;

function getAuthErrorMessage(error: unknown) {
  if (!(error instanceof FirebaseError)) {
    return "Something went wrong. Please try again.";
  }

  switch (error.code) {
    case "auth/invalid-email":
      return "Please enter a valid email address.";
    case "auth/missing-password":
    case "auth/invalid-credential":
      return "Invalid email or password.";
    case "auth/too-many-requests":
      return "Too many attempts. Please try again later.";
    case "auth/user-not-found":
      return "No account was found for this email.";
    case "auth/email-already-in-use":
      return "This email is already in use.";
    case "auth/weak-password":
      return "Password is too weak. Please choose a stronger password.";
    case "auth/operation-not-allowed":
      return "Email/password sign up is not enabled for this project.";
    default:
      return "Authentication failed. Please try again.";
  }
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isInitializing: true,
  authError: null,
  initializeAuth: () => {
    if (authUnsubscribe) {
      return authUnsubscribe;
    }

    const unsubscribe = onAuthStateChanged(
      firebaseAuth,
      (user) => {
        set({ user, isInitializing: false });
      },
      () => {
        set({ user: null, isInitializing: false, authError: "Unable to verify your session." });
      },
    );

    authUnsubscribe = () => {
      unsubscribe();
      authUnsubscribe = null;
    };

    return authUnsubscribe;
  },
  signInWithEmailPassword: async (email, password) => {
    set({ authError: null });

    try {
      await signInWithEmailAndPassword(firebaseAuth, email, password);
    } catch (error) {
      const message = getAuthErrorMessage(error);
      set({ authError: message });
      throw new Error(message);
    }
  },
  signUpWithEmailPassword: async (name, email, password) => {
    set({ authError: null });

    try {
      const credentials = await createUserWithEmailAndPassword(firebaseAuth, email, password);

      const displayName = name.trim();
      if (displayName) {
        await updateProfile(credentials.user, { displayName });
      }

      await upsertUserProfile(credentials.user, { defaultRole: "admin" });
    } catch (error) {
      const message = getAuthErrorMessage(error);
      set({ authError: message });
      throw new Error(message);
    }
  },
  signOutCurrentUser: async () => {
    set({ authError: null });

    try {
      await signOut(firebaseAuth);
    } catch (error) {
      const message = getAuthErrorMessage(error);
      set({ authError: message });
      throw new Error(message);
    }
  },
  sendPasswordReset: async (email) => {
    set({ authError: null });

    try {
      await sendPasswordResetEmail(firebaseAuth, email);
    } catch (error) {
      const message = getAuthErrorMessage(error);
      set({ authError: message });
      throw new Error(message);
    }
  },
  clearAuthError: () => {
    set({ authError: null });
  },
}));
