import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PROTECTED_PREFIXES = ['/dashboard', '/plans'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Only gate protected routes
  const isProtected = PROTECTED_PREFIXES.some((prefix) =>
    pathname.startsWith(prefix)
  );
  if (!isProtected) return NextResponse.next();

  console.log(`[Middleware] Processing request for: ${pathname}`);

  // Build a response we can mutate with refreshed cookies
  let response = NextResponse.next({ request });

  console.log(`[Middleware] Creating server client...`);
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://drkurkhsmjuixccdblrl.supabase.co',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRya3Vya2hzbWp1aXhjY2RibHJsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI0NjUwNjYsImV4cCI6MjA5ODA0MTA2Nn0.pb7ee-RwIDgLJQ91RihHUgPycg22ZnAwQwD5smRuMx8',
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  try {
    console.log(`[Middleware] Fetching authenticated user...`);
    const {
      data: { user },
      error: userErr
    } = await supabase.auth.getUser();

    if (userErr) {
      console.log(`[Middleware] getUser error: ${userErr.message}`);
    }

    console.log(`[Middleware] User state: ${user ? `Logged in (${user.email})` : 'Not logged in'}`);

    if (!user) {
      console.log(`[Middleware] No user found, redirecting to /login`);
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = '/login';
      return NextResponse.redirect(loginUrl);
    }

    console.log(`[Middleware] Querying profile for user ID: ${user.id}`);
    const { data: profile, error: profileErr } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileErr) {
      console.log(`[Middleware] Profile fetch error: ${profileErr.message}`);
    }
    console.log(`[Middleware] Profile role: ${profile?.role}`);

    if (profile?.role !== 'coach') {
      console.log(`[Middleware] User is not a coach (role: ${profile?.role}), signing out & redirecting`);
      await supabase.auth.signOut();
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = '/login';
      loginUrl.searchParams.set('error', 'unauthorized');
      return NextResponse.redirect(loginUrl);
    }

    console.log(`[Middleware] Access granted to Coach!`);
  } catch (err: any) {
    console.error(`[Middleware] Unhandled exception:`, err);
  }

  return response;
}

export const config = {
  matcher: ['/dashboard/:path*', '/plans/:path*'],
};
