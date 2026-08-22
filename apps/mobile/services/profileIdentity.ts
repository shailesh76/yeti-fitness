type AuthIdentity = {
  user_metadata?: Record<string, unknown> | null;
};

function cleanName(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const name = value.trim().replace(/\s+/g, ' ');
  return name && name.toLowerCase() !== 'athlete' && name.toLowerCase() !== 'dude athlete'
    ? name
    : null;
}

export function getAuthDisplayName(user?: AuthIdentity | null): string | null {
  const metadata = user?.user_metadata || {};
  const direct = cleanName(metadata.full_name) || cleanName(metadata.name);
  if (direct) return direct;

  const combined = [cleanName(metadata.given_name), cleanName(metadata.family_name)]
    .filter(Boolean)
    .join(' ');
  return cleanName(combined);
}

export function resolveProfileDisplayName(
  profileName: unknown,
  user?: AuthIdentity | null,
  cachedName?: unknown,
): string {
  return cleanName(profileName) || getAuthDisplayName(user) || cleanName(cachedName) || 'Athlete';
}

export function shouldPreserveOnboardingTargets(targets: { locked?: boolean; mode?: string } | null): boolean {
  return !!targets && (targets.locked === true || targets.mode === 'MANUAL');
}
