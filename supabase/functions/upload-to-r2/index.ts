import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { S3Client, PutObjectCommand } from "https://esm.sh/@aws-sdk/client-s3@3.535.0"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight options request
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
    const { file, filePath, fileName, folder, contentType } = await req.json()
    if (!file || (!filePath && (!folder || !fileName)) || !contentType) {
      return new Response(JSON.stringify({ error: "Missing required parameters (file, filePath/fileName/folder, contentType)" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      })
    }

    let finalPath = filePath
    if (!finalPath) {
      if (folder === 'progress-photos' || folder === 'food-scans') {
        finalPath = `${folder}/${user.id}/${fileName}`
      } else {
        finalPath = `${folder}/${fileName}`
      }
    }

    // 3. Authorization Checks (Path Restrictions)
    if (finalPath.startsWith('progress-photos/') || finalPath.startsWith('food-scans/')) {
      const parts = finalPath.split('/')
      const pathUserId = parts[1]
      if (pathUserId !== user.id) {
        return new Response(JSON.stringify({ error: "Forbidden: You cannot upload to another user's directory" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        })
      }
    } else if (!finalPath.startsWith('exercises/')) {
      // Any other path is forbidden for security
      return new Response(JSON.stringify({ error: "Forbidden: Invalid upload path" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      })
    }

    // Decode base64 file data
    let cleanFile = file
    if (cleanFile.includes("base64,")) {
      cleanFile = cleanFile.substring(cleanFile.indexOf("base64,") + 7)
    }
    cleanFile = cleanFile.replace(/\s/g, "")
    const binaryData = Uint8Array.from(atob(cleanFile), c => c.charCodeAt(0))

    // 4. Initialize R2/S3 Client
    const accessKeyId = Deno.env.get("R2_ACCESS_KEY_ID")
    const secretAccessKey = Deno.env.get("R2_SECRET_ACCESS_KEY")
    const accountId = Deno.env.get("R2_ACCOUNT_ID")
    const bucketName = Deno.env.get("R2_BUCKET_NAME")
    const publicUrl = Deno.env.get("R2_PUBLIC_URL")

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

    // 5. Upload Object to R2
    const uploadParams = {
      Bucket: bucketName,
      Key: finalPath,
      Body: binaryData,
      ContentType: contentType,
    }

    await s3Client.send(new PutObjectCommand(uploadParams))

    // 6. Respond with URL
    // If it's an exercise asset, we return the direct public R2 URL.
    // If it's a private asset, we return the path so the client can query a signed URL.
    let url = ""
    if (finalPath.startsWith('exercises/') && publicUrl) {
      url = `${publicUrl.replace(/\/$/, '')}/${finalPath}`
    } else {
      url = finalPath // Client will get signed URL on demand
    }

    return new Response(JSON.stringify({ success: true, url, key: finalPath }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    })

  } catch (error) {
    console.error("Error in upload-to-r2:", error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    })
  }
})
