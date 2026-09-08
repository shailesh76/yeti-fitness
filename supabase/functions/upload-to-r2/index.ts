import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { DeleteObjectCommand, PutObjectCommand, S3Client } from 'https://esm.sh/@aws-sdk/client-s3@3.535.0';
import { createAnonClient, createServiceRoleClient } from '../_shared/supabaseClient.ts';
import { createUploadToR2Handler, type MediaRow } from './handler.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function r2Config() {
  const accessKeyId = Deno.env.get('R2_ACCESS_KEY_ID');
  const secretAccessKey = Deno.env.get('R2_SECRET_ACCESS_KEY');
  const accountId = Deno.env.get('R2_ACCOUNT_ID');
  const bucketName = Deno.env.get('R2_BUCKET_NAME');
  const publicUrl = Deno.env.get('R2_PUBLIC_URL') ?? null;
  if (!accessKeyId || !secretAccessKey || !accountId || !bucketName) {
    throw new Error('R2 credentials are not configured on the server');
  }
  return {
    bucketName,
    publicUrl,
    client: new S3Client({
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId, secretAccessKey },
    }),
  };
}

const service = createServiceRoleClient();
const r2 = r2Config();

const handler = createUploadToR2Handler({
  async authenticate(req) {
    const authHeader = req.headers.get('Authorization') ?? req.headers.get('authorization');
    if (!authHeader) return null;
    const client = createAnonClient(authHeader);
    const { data: { user }, error } = await client.auth.getUser();
    if (error || !user) return null;
    const { data: profile, error: profileError } = await service.from('profiles').select('role').eq('id', user.id).maybeSingle();
    if (profileError || !profile?.role) return null;
    return { id: user.id, role: profile.role };
  },
  async getExercise(exerciseId) {
    const { data, error } = await service.from('exercises').select('id, source_type, created_by_coach_id').eq('id', exerciseId).maybeSingle();
    if (error) throw error;
    return data;
  },
  async getMedia(mediaId) {
    const { data, error } = await service.from('exercise_media').select('id, exercise_id, media_type, file_format, r2_bucket, r2_key, url, is_primary, media_status, idempotency_actor_id, idempotency_fingerprint').eq('id', mediaId).maybeSingle();
    if (error) throw error;
    return data as MediaRow | null;
  },
  async putObject(key, bytes, contentType) {
    await r2.client.send(new PutObjectCommand({ Bucket: r2.bucketName, Key: key, Body: bytes, ContentType: contentType }));
  },
  async deleteObject(key) {
    await r2.client.send(new DeleteObjectCommand({ Bucket: r2.bucketName, Key: key }));
  },
  async insertMedia(row) {
    const { data, error } = await service.from('exercise_media').insert(row).select().single();
    if (error) throw error;
    return data as MediaRow;
  },
  async updateMedia(mediaId, values) {
    const { data, error } = await service.from('exercise_media').update(values).eq('id', mediaId).select().single();
    if (error) throw error;
    return data as MediaRow;
  },
  async deleteMedia(mediaId) {
    const { error } = await service.from('exercise_media').delete().eq('id', mediaId);
    if (error) throw error;
  },
  publicUrl(key) {
    return r2.publicUrl ? `${r2.publicUrl.replace(/\/$/, '')}/${key}` : null;
  },
  bucketName: r2.bucketName,
  randomUUID: () => crypto.randomUUID(),
});

serve(async (req) => {
  try {
    const response = await handler(req);
    return new Response(response.body, { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error) {
    console.error('Error in upload-to-r2:', error instanceof Error ? error.message : 'Unknown error');
    return new Response(JSON.stringify({ error: 'Exercise media request failed.' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
