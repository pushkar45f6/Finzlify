export type ThemePreference = "system" | "light" | "dark";

export type UserProfile = {
  id: string;
  email: string;
  displayName: string;
  currencyCode: string;
  timezone: string;
  theme: ThemePreference;
  notificationsEnabled: boolean;
  cloudSyncEnabled: boolean;
  profilePictureRef: string | null;
  profilePictureUri?: string | null;
  monthlyBudget: number;
};

export type ProfilePreferences = Partial<Pick<UserProfile,
  "displayName" | "currencyCode" | "timezone" | "theme" | "notificationsEnabled" | "cloudSyncEnabled" | "profilePictureRef" | "monthlyBudget"
>>;

export type AuthResult = {
  token: string;
  expiresAt: string;
  user: UserProfile;
};