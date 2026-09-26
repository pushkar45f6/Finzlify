export type UserProfile = {
  id: string;
  email: string;
  displayName: string;
  currencyCode: string;
  timezone: string;
};

export type AuthResult = {
  token: string;
  expiresAt: string;
  user: UserProfile;
};