// Placeholder for Strava integration
// Real integration requires OAuth2: client_id, client_secret, redirect_uri,
// and server-side token exchange. In a client-only PWA, you would need a backend proxy
// or use Strava's manual GPX upload as fallback.

export interface StravaConfig {
  clientId?: string;
  accessToken?: string;
}

export async function uploadToStrava(_gpxContent: string, _config: StravaConfig): Promise<void> {
  throw new Error(
    'Synchronisation Strava non configurée : cette version utilise un export GPX manuel. Configurez OAuth Strava et un proxy backend pour activer l’upload automatique.'
  );
}

export function getStravaAuthUrl(clientId: string, redirectUri: string): string {
  return `https://www.strava.com/oauth/authorize?client_id=${clientId}&response_type=code&redirect_uri=${encodeURIComponent(redirectUri)}&approval_prompt=force&scope=activity:write`;
}
