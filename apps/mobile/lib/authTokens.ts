/**
 * Supabase's implicit auth flow returns access/refresh tokens in the URL
 * FRAGMENT (`#access_token=...`) for both password-recovery and OAuth
 * callback links. expo-router's useLocalSearchParams does not parse the
 * fragment, so deep-link screens (reset-password, oauth-callback) extract it
 * manually with this helper — matching Supabase's documented pattern for Expo.
 */
export interface AuthUrlTokens {
  access_token: string;
  refresh_token: string;
  type: string | null;
}

export function parseAuthTokensFromUrl(url: string | null): AuthUrlTokens | null {
  if (!url) return null;
  const hashIndex = url.indexOf('#');
  const queryIndex = url.indexOf('?');
  const paramsStr = hashIndex >= 0 ? url.slice(hashIndex + 1) : (queryIndex >= 0 ? url.slice(queryIndex + 1) : '');
  if (!paramsStr) return null;

  const params = new URLSearchParams(paramsStr);
  const access_token = params.get('access_token');
  const refresh_token = params.get('refresh_token');
  if (!access_token || !refresh_token) return null;

  return { access_token, refresh_token, type: params.get('type') };
}
