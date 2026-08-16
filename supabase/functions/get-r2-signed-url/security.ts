export type UserRole = 'athlete' | 'coach' | 'admin' | string | null

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const SAFE_SEGMENT = /^[A-Za-z0-9._-]+$/

export function isSupportedMethod(method: string) {
  return method === 'POST' || method === 'OPTIONS'
}

export function parseExpiresIn(value: unknown): number {
  if (value === undefined) return 3600
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 1 || value > 3600) {
    throw new Error('expiresIn must be an integer between 1 and 3600')
  }
  return value
}

export function parseJsonBody(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Request body must be a JSON object')
  return value as Record<string, unknown>
}

export function parseCanonicalObjectKey(key: unknown) {
  if (typeof key !== 'string' || key.length === 0 || key !== key.trim()) throw new Error('Invalid object key')
  if (key.includes('%') || key.includes('\\') || key.includes('//')) throw new Error('Object key is not canonical')
  const parts = key.split('/')
  if (parts.some((part) => !part || part === '.' || part === '..' || !SAFE_SEGMENT.test(part))) {
    throw new Error('Object key is not canonical')
  }

  const namespace = parts[0]
  if (namespace === 'progress-photos' || namespace === 'food-scans') {
    if (parts.length !== 3 || !UUID.test(parts[1]) || parts[2] === '.' || parts[2] === '..') {
      throw new Error('Invalid private object key')
    }
    return { key, namespace, athleteId: parts[1] }
  }
  if (namespace === 'exercises' && parts.length >= 2) return { key, namespace, athleteId: null }
  throw new Error('Object key namespace is not allowed')
}

export function parseAthleteId(value: unknown): string {
  if (typeof value !== 'string' || !UUID.test(value)) throw new Error('A valid athlete UUID is required')
  return value
}

export function canAccessAthlete(callerId: string, role: UserRole, athleteId: string, assigned: boolean) {
  if (callerId === athleteId) return true
  if (role === 'admin') return true
  return role === 'coach' && assigned
}

export async function authorizeAndSignPhoto(input: {
  callerId: string
  role: UserRole
  requestedAthleteId: string
  assigned: boolean
  key: unknown
  expiresIn?: unknown
  sign: (key: string, expiresIn: number) => Promise<string>
}) {
  const athleteId = parseAthleteId(input.requestedAthleteId)
  const parsed = parseCanonicalObjectKey(input.key)
  if (parsed.namespace !== 'progress-photos' || parsed.athleteId !== athleteId) throw new Error('Photo key does not belong to requested athlete')
  if (!canAccessAthlete(input.callerId, input.role, athleteId, input.assigned)) throw new Error('Forbidden')
  return input.sign(parsed.key, parseExpiresIn(input.expiresIn))
}
