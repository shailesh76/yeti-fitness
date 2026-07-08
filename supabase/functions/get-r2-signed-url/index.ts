import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { S3Client, GetObjectCommand } from "https://esm.sh/@aws-sdk/client-s3@3.535.0"
import { getSignedUrl } from "https://esm.sh/@aws-sdk/s3-request-presigner@3.535.0"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 1. Authenticate user
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing Authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      })
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser()
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized user session" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      })
    }

    // 2. Parse request payload
    const { filePath, key, expiresIn } = await req.json()
    const finalPath = filePath || key
    if (!finalPath) {
      return new Response(JSON.stringify({ error: "Missing required parameter (filePath or key)" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      })
    }

    // 3. Authorization Checks (Path Restrictions)
    let isAuthorized = false

    if (finalPath.startsWith('exercises/')) {
      // Anyone authenticated can view exercise media (or they are public anyway)
      isAuthorized = true
    } else if (finalPath.startsWith('progress-photos/') || finalPath.startsWith('food-scans/')) {
      const parts = finalPath.split('/')
      const pathUserId = parts[1]

      if (pathUserId === user.id) {
        // Owner is authorized
        isAuthorized = true
      } else {
        // Check if the caller is the coach for this user
        const { data: plans, error: planError } = await supabaseClient
          .from('workout_plans')
          .select('id')
          .eq('coach_id', user.id)
          .eq('user_id', pathUserId)
          .limit(1)

        if (!planError && plans && plans.length > 0) {
          isAuthorized = true
        }
      }
    }

    if (!isAuthorized) {
      return new Response(JSON.stringify({ error: "Forbidden: You do not have permission to access this file" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      })
    }

    // 4. Initialize R2/S3 Client
    const accessKeyId = Deno.env.get("R2_ACCESS_KEY_ID")
    const secretAccessKey = Deno.env.get("R2_SECRET_ACCESS_KEY")
    const accountId = Deno.env.get("R2_ACCOUNT_ID")
    const bucketName = Deno.env.get("R2_BUCKET_NAME")

    if (!accessKeyId || !secretAccessKey || !accountId || !bucketName) {
      return new Response(JSON.stringify({ error: "R2 credentials are not configured on the server" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      })
    }

    const s3Client = new S3Client({
      region: "auto",
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    })

    // 5. Generate Signed URL
    const command = new GetObjectCommand({
      Bucket: bucketName,
      Key: finalPath,
    })

    // Default expiration to 1 hour (3600 seconds) if not specified
    const expiry = expiresIn || 3600
    const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: expiry })

    return new Response(JSON.stringify({ success: true, url: signedUrl }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    })

  } catch (error) {
    console.error("Error in get-r2-signed-url:", error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    })
  }
})
