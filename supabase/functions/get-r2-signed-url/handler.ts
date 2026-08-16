/// <reference lib="dom" />
// @ts-ignore Deno requires the explicit extension; dashboard tests import this module directly.
import { authorizeAndSignPhoto, canAccessAthlete, isSupportedMethod, parseAthleteId, parseCanonicalObjectKey, parseExpiresIn, parseJsonBody, type UserRole } from './security.ts'

export interface SignedUrlCaller { id: string; role: UserRole }
export interface PhotoMetadata { id: string; photo_key: string; notes: string | null; created_at: string }
export interface SignedUrlDependencies {
  authenticate(req: Request): Promise<SignedUrlCaller | null>
  isAssigned(coachId: string, athleteId: string): Promise<boolean>
  listPhotos(athleteId: string): Promise<PhotoMetadata[]>
  sign(key: string, expiresIn: number): Promise<string>
}

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}
const json = (body: unknown, status = 200, extra: Record<string, string> = {}) => new Response(JSON.stringify(body), {
  status,
  headers: { ...cors, 'Content-Type': 'application/json', ...extra },
})

export function createGetR2SignedUrlHandler(deps: SignedUrlDependencies) {
  return async (req: Request): Promise<Response> => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
    if (!isSupportedMethod(req.method)) return json({ error: 'Method not allowed' }, 405, { Allow: 'POST, OPTIONS' })

    let caller: SignedUrlCaller | null
    try { caller = await deps.authenticate(req) } catch { caller = null }
    if (!caller) return json({ error: 'Unauthorized user session' }, 401)

    let body: Record<string, unknown>
    let expiry: number
    try {
      body = parseJsonBody(await req.json())
      expiry = parseExpiresIn(body.expiresIn)
    } catch (error) {
      return json({ error: error instanceof Error ? error.message : 'Invalid request' }, 400)
    }

    if (body.action === 'list-progress-photos') {
      let athleteId: string
      try { athleteId = parseAthleteId(body.userId) }
      catch (error) { return json({ error: error instanceof Error ? error.message : 'Invalid athlete' }, 400) }

      const assigned = caller.role === 'coach' ? await deps.isAssigned(caller.id, athleteId) : false
      if (!canAccessAthlete(caller.id, caller.role, athleteId, assigned)) return json({ error: 'Forbidden' }, 403)

      const rows = await deps.listPhotos(athleteId)
      const photos = await Promise.all(rows.map(async (photo) => {
        try {
          const url = await authorizeAndSignPhoto({ callerId: caller.id, role: caller.role, requestedAthleteId: athleteId, assigned, key: photo.photo_key, expiresIn: expiry, sign: deps.sign })
          return { id: photo.id, photoKey: photo.photo_key, notes: photo.notes, createdAt: photo.created_at, url, error: null }
        } catch {
          return { id: photo.id, photoKey: photo.photo_key, notes: photo.notes, createdAt: photo.created_at, url: null, error: 'Media unavailable' }
        }
      }))
      return json({ success: true, photos })
    }

    let parsed: ReturnType<typeof parseCanonicalObjectKey>
    try { parsed = parseCanonicalObjectKey(body.filePath ?? body.key) }
    catch (error) { return json({ error: error instanceof Error ? error.message : 'Invalid object key' }, 400) }

    if (parsed.namespace !== 'exercises' && parsed.athleteId) {
      const assigned = caller.role === 'coach' ? await deps.isAssigned(caller.id, parsed.athleteId) : false
      if (!canAccessAthlete(caller.id, caller.role, parsed.athleteId, assigned)) return json({ error: 'Forbidden' }, 403)
    }
    try { return json({ success: true, url: await deps.sign(parsed.key, expiry) }) }
    catch { return json({ error: 'Could not sign media' }, 500) }
  }
}
