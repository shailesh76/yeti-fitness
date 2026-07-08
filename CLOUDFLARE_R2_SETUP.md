# Cloudflare R2 Media Storage Setup Guide

This guide outlines the steps required to set up Cloudflare R2 and configure Supabase Edge Functions with the necessary secrets.

## 1. Cloudflare R2 Configuration

1. Log in to the [Cloudflare Dashboard](https://dash.cloudflare.com).
2. Navigate to **R2** in the sidebar.
3. Click **Create Bucket**.
4. Name the bucket `dude-media` and create it.
5. In the bucket settings, configure **Public Access**:
   - Enable the public R2 sub-domain (e.g., `pub-xxxx.r2.dev`) or connect a custom domain.
   - Note this URL as your `R2_PUBLIC_URL`.
   - Ensure the path prefix `exercises/` is publicly readable.

## 2. API Token Generation

1. In the R2 page, click **Manage R2 API Tokens** on the right side.
2. Click **Create API Token**.
3. Configure the token:
   - **Token name:** `supabase-r2-integration`
   - **Permissions:** `Object Read & Write`
   - **Scope:** Limit to `dude-media` bucket (recommended) or apply to all buckets.
4. Click **Create Token** and copy the following credentials:
   - **Access Key ID**
   - **Secret Access Key**
   - **Account ID** (found in the endpoint URL: `https://<account_id>.r2.cloudflarestorage.com`)

## 3. Set Supabase Secrets

Run the following commands using the Supabase CLI to configure secrets for the Edge Functions:

```bash
supabase secrets set R2_ACCESS_KEY_ID="your_access_key_id"
supabase secrets set R2_SECRET_ACCESS_KEY="your_secret_access_key"
supabase secrets set R2_ACCOUNT_ID="your_cloudflare_account_id"
supabase secrets set R2_BUCKET_NAME="dude-media"
supabase secrets set R2_PUBLIC_URL="https://pub-xxxx.r2.dev"
```
