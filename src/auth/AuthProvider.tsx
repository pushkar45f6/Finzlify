import React, { createContext, useContext, useEffect, useState } from "react";
import * as SecureStore from "expo-secure-store";
import { ApiError, api } from "../api/client";
import type { UserProfile } from "./types";

const SESSION_KEY = "student-finance.session-token";

type AuthContextValue = {
  user: UserProfile | null;
  loading: boolean;
  signIn(email: string, password: string): Promise<void>;
  register(email: string, password: string, displayName: string): Promise<void>;
  signOut(): Promise<void>;
  updateProfile(profile: Partial<Pick<UserProfile, "displayName" | "currencyCode" | "timezone">>): Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    void (async () => {
      const storedToken = await SecureStore.getItemAsync(SESSION_KEY);
      if (!storedToken) {
        if (active) setLoading(false);
        return;
      }

      try {
        const session = await api.currentSession(storedToken);
        if (active) {
          setToken(storedToken);
          setUser(session.user);
        }
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) {
          await SecureStore.deleteItemAsync(SESSION_KEY);
        }
      } finally {
        if (active) setLoading(false);
      }
    })().catch(() => {
      if (active) setLoading(false);
    });

    return () => {
      active = false;
    };
  }, []);

  async function saveAuth(result: { token: string; user: UserProfile }) {
    await SecureStore.setItemAsync(SESSION_KEY, result.token, {
      keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    });
    setToken(result.token);
    setUser(result.user);
  }

  async function signIn(email: string, password: string) {
    await saveAuth(await api.login(email, password));
  }

  async function register(email: string, password: string, displayName: string) {
    await saveAuth(await api.register(email, password, displayName));
  }

  async function signOut() {
    const activeToken = token;
    try {
      if (activeToken) await api.logout(activeToken);
    } finally {
      await SecureStore.deleteItemAsync(SESSION_KEY);
      setToken(null);
      setUser(null);
    }
  }

  async function updateProfile(profile: Partial<Pick<UserProfile, "displayName" | "currencyCode" | "timezone">>) {
    if (!token) throw new ApiError(401, "Authentication is required.");
    const updated = await api.updateProfile(token, profile);
    setUser(updated.user);
  }

  return (
    <AuthContext.Provider value={{ user, loading, signIn, register, signOut, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider.");
  return context;
}