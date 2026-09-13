/**
 * Google Auth helper stub
 * Note: Authentication and storage are managed via Google Apps Script Web App
 * with access control handled directly by Google Apps Script ("Execute as: Me").
 * No Firebase or Database is used.
 */

export const initGoogleAuth = (
  onAuthSuccess?: (user: any, token: string) => void,
  onAuthFailure?: () => void
) => {
  return () => {};
};

export const googleSignIn = async () => {
  return null;
};

export const googleSignOut = async () => {
  return;
};

export const getCurrentGoogleUser = () => {
  return null;
};

export const getAccessToken = () => {
  return null;
};
