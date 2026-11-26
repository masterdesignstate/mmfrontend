const key = (profileId: string) => `results_profile_search_${profileId}`;

export function rememberProfileSearchGrant(profileId: string, grant: string) {
  sessionStorage.setItem(key(profileId), grant);
}

export function readProfileSearchGrant(profileId: string): string | undefined {
  return sessionStorage.getItem(key(profileId)) ?? undefined;
}
