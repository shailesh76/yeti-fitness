-- Phase 3 Sync Metadata Schema

CREATE TABLE IF NOT EXISTS sync_metadata (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  device_id text NOT NULL,
  last_synced_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, device_id)
);

CREATE TABLE IF NOT EXISTS sync_conflicts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name text NOT NULL,
  record_id uuid NOT NULL,
  local_data jsonb NOT NULL,
  server_data jsonb NOT NULL,
  resolution_status text DEFAULT 'pending',
  resolved_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS device_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  device_name text NOT NULL,
  last_active timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);
