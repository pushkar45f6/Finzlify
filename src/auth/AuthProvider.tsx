import React, { createContext, useContext, useEffect, useState } from "react";

import * as SecureStore from "expo-secure-store";

import { Directory, File, Paths } from "expo-file-system";

import { ApiError, api } from "../api/client";

import type { Transaction } from "../data/finance";

import type { ProfilePreferences, UserProfile } from "./types";

const SESSION_KEY = "student-finance.session-token";

function makeOpaqueId(): string {
  const random = () => Math.floor(Math.random() * 16).toString(16);

  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(
    /[xy]/g,
    (character) => {
      const value = Math.floor(Math.random() * 16);

      return (
        character === "x" ? value : (value & 0x3) | 0x8
      ).toString(16);
    },
  );
}

function avatarFile(userId: string, reference: string): File | null {
  const match =
    /^local:([A-Za-z0-9-]{36})\.(jpg|jpeg|png|webp)$/.exec(reference);

  if (!match) return null;

  return new File(
    new Directory(Paths.document, "student-finance-avatars", userId),
    `${match[1]}.${match[2]}`,
  );
}

/**
 * Cloud Sync is always enabled.
 *
 * The server is the source of truth for financial data.
 * We intentionally do not support an offline/cloud-sync-off mode.
 */
async function restoreLocalProfile(profile: UserProfile): Promise<UserProfile> {
  const localFile = profile.profilePictureRef
    ? avatarFile(profile.id, profile.profilePictureRef)
    : null;

  return {
    ...profile,
    cloudSyncEnabled: true,
    profilePictureUri: localFile?.exists ? localFile.uri : null,
  };
}

type AuthContextValue = {
  user: UserProfile | null;
  loading: boolean;

  signIn(email: string, password: string): Promise<void>;
  register(
    email: string,
    password: string,
    displayName: string,
  ): Promise<void>;

  signOut(): Promise<void>;

  updateProfile(profile: ProfilePreferences): Promise<void>;

  /**
   * Kept for compatibility with existing callers.
   * Cloud Sync cannot be disabled.
   */
  setCloudSyncEnabled(enabled: boolean): Promise<void>;

  setProfilePicture(
    sourceUri: string | null,
    mimeType?: string | null,
  ): Promise<void>;

  getTransactions(): Promise<Transaction[]>;
  saveTransaction(transaction: Transaction): Promise<void>;
  deleteTransaction(id: string): Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({
  children,
}: {
  children: React.ReactNode;
}) {
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
          setUser(await restoreLocalProfile(session.user));
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

  async function saveAuth(result: {
    token: string;
    user: UserProfile;
  }) {
    await SecureStore.setItemAsync(SESSION_KEY, result.token, {
      keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    });

    setToken(result.token);
    setUser(await restoreLocalProfile(result.user));
  }

  async function signIn(email: string, password: string) {
    await saveAuth(await api.login(email, password));
  }

  async function register(
    email: string,
    password: string,
    displayName: string,
  ) {
    await saveAuth(await api.register(email, password, displayName));
  }

  async function signOut() {
    const activeToken = token;

    try {
      if (activeToken) {
        await api.logout(activeToken);
      }
    } finally {
      await SecureStore.deleteItemAsync(SESSION_KEY);

      setToken(null);
      setUser(null);
    }
  }

  async function updateProfile(profile: ProfilePreferences) {
    if (!token || !user) {
      throw new ApiError(401, "Authentication is required.");
    }

    /*
     * Cloud Sync is always on.
     *
     * Do not send cloudSyncEnabled to the backend from normal
     * profile updates. This prevents an old settings screen or
     * stale caller from switching it off.
     */
    const {
      cloudSyncEnabled: _ignoredCloudSyncEnabled,
      ...profileWithoutCloudSync
    } = profile as ProfilePreferences & {
      cloudSyncEnabled?: boolean;
    };

    const updated = await api.updateProfile(
      token,
      profileWithoutCloudSync as ProfilePreferences,
    );

    setUser((current) =>
      current
        ? {
            ...updated.user,
            cloudSyncEnabled: true,
            profilePictureUri:
              updated.user.profilePictureRef === current.profilePictureRef
                ? current.profilePictureUri
                : null,
          }
        : {
            ...updated.user,
            cloudSyncEnabled: true,
          },
    );
  }

  /**
   * Cloud Sync is permanently ON.
   *
   * This function remains in the context so existing components do not
   * break if they still reference it, but it never disables syncing.
   */
  async function setCloudSyncEnabled(_enabled: boolean) {
    if (!token || !user) {
      throw new ApiError(401, "Authentication is required.");
    }

    setUser((current) =>
      current
        ? {
            ...current,
            cloudSyncEnabled: true,
          }
        : current,
    );
  }

  async function setProfilePicture(
    sourceUri: string | null,
    mimeType?: string | null,
  ) {
    if (!user) {
      throw new ApiError(401, "Authentication is required.");
    }

    const previousReference = user.profilePictureRef;

    if (!sourceUri) {
      await updateProfile({
        profilePictureRef: null,
      });

      setUser((current) =>
        current
          ? {
              ...current,
              profilePictureRef: null,
              profilePictureUri: null,
              cloudSyncEnabled: true,
            }
          : current,
      );

      const previousFile = previousReference
        ? avatarFile(user.id, previousReference)
        : null;

      if (previousFile?.exists) {
        previousFile.delete();
      }

      return;
    }

    const extension =
      mimeType === "image/png"
        ? "png"
        : mimeType === "image/webp"
          ? "webp"
          : "jpg";

    const id = makeOpaqueId();

    const folder = new Directory(
      Paths.document,
      "student-finance-avatars",
      user.id,
    );

    folder.create({
      intermediates: true,
      idempotent: true,
    });

    const target = new File(folder, `${id}.${extension}`);

    try {
      await new File(sourceUri).copy(target);

      await updateProfile({
        profilePictureRef: `local:${id}.${extension}`,
      });

      setUser((current) =>
        current
          ? {
              ...current,
              profilePictureRef: `local:${id}.${extension}`,
              profilePictureUri: target.uri,
              cloudSyncEnabled: true,
            }
          : current,
      );
    } catch (error) {
      if (target.exists) {
        target.delete();
      }

      throw error;
    }

    const previousFile = previousReference
      ? avatarFile(user.id, previousReference)
      : null;

    if (previousFile?.exists) {
      previousFile.delete();
    }
  }

  async function getTransactions(): Promise<Transaction[]> {
    if (!token) {
      throw new ApiError(401, "Authentication is required.");
    }

    /*
     * IMPORTANT:
     * There is intentionally NO cloudSyncEnabled check here.
     *
     * Authenticated financial data always loads from the Worker/D1 API.
     */
    return (await api.transactions(token)).transactions;
  }

  async function saveTransaction(
    transaction: Transaction,
  ): Promise<void> {
    if (!token) {
      throw new ApiError(401, "Authentication is required.");
    }

    /*
     * Cloud Sync is always on, so authenticated users can always
     * create/update transactions.
     */
    await api.saveTransaction(token, transaction);
  }

  async function deleteTransaction(id: string): Promise<void> {
    if (!token) {
      throw new ApiError(401, "Authentication is required.");
    }

    /*
     * Cloud Sync is always on, so authenticated users can always
     * delete transactions.
     */
    await api.deleteTransaction(token, id);
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        signIn,
        register,
        signOut,
        updateProfile,
        setCloudSyncEnabled,
        setProfilePicture,
        getTransactions,
        saveTransaction,
        deleteTransaction,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider.");
  }

  return context;
}