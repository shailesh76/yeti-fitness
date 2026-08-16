import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { S3Client, GetObjectCommand } from "https://esm.sh/@aws-sdk/client-s3@3.535.0"
import { getSignedUrl } from "https://esm.sh/@aws-sdk/s3-request-presigner@3.535.0"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8"
import { createGetR2SignedUrlHandler } from './handler.ts'

const url = Deno.env.get('SUPABASE_URL') ?? ''
const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const service = createClient(url, serviceKey, { auth: { persistSession: false } })

function r2Client() {
  const accessKeyId = Deno.env.get('R2_ACCESS_KEY_ID')
  const secretAccessKey = Deno.env.get('R2_SECRET_ACCESS_KEY')
  const accountId = Deno.env.get('R2_ACCOUNT_ID')
  const bucketName = Deno.env.get('R2_BUCKET_NAME')
  if (!accessKeyId || !secretAccessKey || !accountId || !bucketName) throw new Error('R2 credentials are not configured')
  return {
    bucketName,
    client: new S3Client({ region: 'auto', endpoint: `https://${accountId}.r2.cloudflarestorage.com`, credentials: { accessKeyId, secretAccessKey } }),
  }
}

serve(createGetR2SignedUrlHandler({
  async authenticate(req) {
    const authHeader = req.headers.get('Authorization') ?? req.headers.get('authorization')
    if (!authHeader) return null
    const token = authHeader.replace(/^Bearer\s+/i, '')
    const authClient = createClient(url, anonKey, { global: { headers: { Authorization: authHeader } } })
    const { data: { user }, error } = await authClient.auth.getUser(token || undefined)
    if (error || !user) return null
    const { data: profile, error: profileError } = await service.from('profiles').select('role').eq('id', user.id).maybeSingle()
    if (profileError || !profile?.role) return null
    return { id: user.id, role: profile.role }
  },
  async isAssigned(coachId, athleteId) {
    const { data, error } = await service.from('coach_clients').select('athlete_id').eq('coach_id', coachId).eq('athlete_id', athleteId).maybeSingle()
    return !error && Boolean(data)
  },
  async listPhotos(athleteId) {
    const { data, error } = await service.from('progress_photos').select('id, photo_key, notes, created_at').eq('user_id', athleteId).order('created_at', { ascending: false })
    if (error) throw error
    return data ?? []
  },
  async sign(key, expiresIn) {
    const { client, bucketName } = r2Client()
    return getSignedUrl(client, new GetObjectCommand({ Bucket: bucketName, Key: key }), { expiresIn })
  },
}))
