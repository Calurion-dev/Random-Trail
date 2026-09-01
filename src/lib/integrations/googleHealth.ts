// Placeholder for Google Health / Google Fit integration
// Requires OAuth2 + Google Fitness API. Not feasible client-only without backend.

export interface GoogleHealthConfig {
  clientId?: string;
  accessToken?: string;
}

export async function syncToGoogleHealth(_gpxContent: string, _config: GoogleHealthConfig): Promise<void> {
  throw new Error(
    'Synchronisation Google Health non configurée : exportez le GPX et importez-le manuellement dans Google Fit / Health Connect.'
  );
}
