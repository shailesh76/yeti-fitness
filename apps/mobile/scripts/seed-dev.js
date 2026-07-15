const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase URL or Anon Key. Pass via --env-file=.env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function createUser(email, password, profileData) {
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error && error.message !== 'User already registered') {
    console.error(`Error creating ${email}:`, error.message);
    return null;
  }

  // Sign in to get the actual user id (signUp may return null user if email confirm is on)
  const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({ email, password });
  if (signInErr) {
    console.error(`Could not sign in as ${email}:`, signInErr.message);
    return null;
  }
  const user = signInData.user;

  await supabase.from('profiles').upsert({ id: user.id, ...profileData });
  return user;
}

async function seed() {
  console.log('\n🌱 Seeding dev data with two-coach RLS isolation test...\n');

  // ── Coach A ──────────────────────────────────────────────────────────
  console.log('Creating Coach A: coach-a@dude.com');
  const coachA = await createUser('coach-a@dude.com', 'password123', {
    role: 'coach',
    full_name: 'Coach Alpha',
  });

  // ── Coach B ──────────────────────────────────────────────────────────
  console.log('Creating Coach B: coach-b@dude.com');
  const coachB = await createUser('coach-b@dude.com', 'password123', {
    role: 'coach',
    full_name: 'Coach Beta',
  });

  // ── Athlete 1 (belongs to Coach A) ───────────────────────────────────
  console.log('Creating Athlete 1: athlete-1@dude.com  →  Coach A');
  const athlete1 = await createUser('athlete-1@dude.com', 'password123', {
    role: 'athlete',
    full_name: 'Alice Athlete',
    daily_calorie_target: 2200,
    weight_kg: 65,
    height_cm: 170,
  });

  // ── Athlete 2 (belongs to Coach B) ───────────────────────────────────
  console.log('Creating Athlete 2: athlete-2@dude.com  →  Coach B');
  const athlete2 = await createUser('athlete-2@dude.com', 'password123', {
    role: 'athlete',
    full_name: 'Bob Athlete',
    daily_calorie_target: 2800,
    weight_kg: 80,
    height_cm: 180,
  });

  if (!coachA || !coachB || !athlete1 || !athlete2) {
    console.error('Could not create all users. Aborting link step.');
    return;
  }

  // ── Link Coach A → Athlete 1 only ────────────────────────────────────
  console.log('\nLinking coach_clients...');
  await supabase.auth.signInWithPassword({ email: 'coach-a@dude.com', password: 'password123' });
  await supabase.from('coach_clients').upsert(
    { coach_id: coachA.id, athlete_id: athlete1.id },
    { onConflict: 'coach_id,athlete_id' }
  );

  // ── Link Coach B → Athlete 2 only ────────────────────────────────────
  await supabase.auth.signInWithPassword({ email: 'coach-b@dude.com', password: 'password123' });
  await supabase.from('coach_clients').upsert(
    { coach_id: coachB.id, athlete_id: athlete2.id },
    { onConflict: 'coach_id,athlete_id' }
  );

  // ── RLS isolation test ────────────────────────────────────────────────
  console.log('\n🔒 Running RLS isolation test...');

  // Sign in as Coach A and query coach_clients
  await supabase.auth.signInWithPassword({ email: 'coach-a@dude.com', password: 'password123' });
  const { data: coachAClients, error: errA } = await supabase
    .from('coach_clients')
    .select('athlete_id');

  const coachAAthleteIds = (coachAClients || []).map((r) => r.athlete_id);
  const coachASeesAthlete2 = coachAAthleteIds.includes(athlete2.id);

  console.log(`  Coach A sees athletes: [${coachAAthleteIds.join(', ')}]`);
  console.log(`  Coach A can see Athlete 2 (Coach B's client): ${coachASeesAthlete2}`);

  if (coachASeesAthlete2) {
    console.error('  ❌ RLS FAIL — Coach A can see Coach B\'s client. Fix the coach_clients RLS policy.');
  } else if (coachAAthleteIds.includes(athlete1.id)) {
    console.log('  ✅ RLS PASS — Coach A sees only their own client (Athlete 1).');
  } else {
    console.warn('  ⚠️  Coach A returned zero clients (RLS may be blocking, or coach_clients row was not inserted).');
  }

  // Sign in as Coach B and query coach_clients
  await supabase.auth.signInWithPassword({ email: 'coach-b@dude.com', password: 'password123' });
  const { data: coachBClients, error: errB } = await supabase
    .from('coach_clients')
    .select('athlete_id');

  const coachBAthleteIds = (coachBClients || []).map((r) => r.athlete_id);
  const coachBSeesAthlete1 = coachBAthleteIds.includes(athlete1.id);

  console.log(`  Coach B sees athletes: [${coachBAthleteIds.join(', ')}]`);
  console.log(`  Coach B can see Athlete 1 (Coach A's client): ${coachBSeesAthlete1}`);

  if (coachBSeesAthlete1) {
    console.error('  ❌ RLS FAIL — Coach B can see Coach A\'s client. Fix the coach_clients RLS policy.');
  } else if (coachBAthleteIds.includes(athlete2.id)) {
    console.log('  ✅ RLS PASS — Coach B sees only their own client (Athlete 2).');
  } else {
    console.warn('  ⚠️  Coach B returned zero clients.');
  }

  console.log('\n📋 Credentials:');
  console.log('  Coach A:    coach-a@dude.com  /  password123');
  console.log('  Coach B:    coach-b@dude.com  /  password123');
  console.log('  Athlete 1:  athlete-1@dude.com  /  password123  (Coach A)');
  console.log('  Athlete 2:  athlete-2@dude.com  /  password123  (Coach B)');
}

seed().catch((e) => {
  console.error('Seed failed:', e);
  process.exit(1);
});
