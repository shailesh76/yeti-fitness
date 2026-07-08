console.log("SUPABASE_SERVICE_ROLE_KEY present:", !!process.env.SUPABASE_SERVICE_ROLE_KEY);
if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.log("Key starts with:", process.env.SUPABASE_SERVICE_ROLE_KEY.substring(0, 10));
}
