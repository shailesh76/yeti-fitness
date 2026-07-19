'use client';

import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';

// Next.js App Router's root-level error boundary — catches errors that escape
// even the root layout. Mirrors the mobile app's ErrorBoundary (apps/mobile/app/_layout.tsx):
// same system_errors insert shape, so admin-dashboard crashes are no longer
// invisible the way they were before (there was no error boundary at all here).
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Uncaught rendering exception:', error);

    const logErrorAsync = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        const { error: dbErr } = await supabase.from('system_errors').insert({
          user_id: user?.id ?? null,
          error_type: 'COMPONENT_CRASH',
          message: error?.message || String(error),
          stack_trace: error?.stack || error?.digest || null,
          platform: 'coach-dashboard-web',
          app_version: '1.0.0-beta',
        });
        if (dbErr) {
          console.error('Failed to write to system_errors table:', dbErr);
        }
      } catch (err) {
        console.error('Error inserting system error:', err);
      }
    };

    logErrorAsync();
  }, [error]);

  return (
    <html>
      <body>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh',
            backgroundColor: '#0a0d0a',
            padding: 24,
            fontFamily: 'system-ui, sans-serif',
          }}
        >
          <h1
            style={{
              color: '#ff3b30',
              fontSize: 18,
              fontWeight: 900,
              textTransform: 'uppercase',
              marginBottom: 12,
            }}
          >
            Application Error
          </h1>
          <p
            style={{
              color: '#8e8e93',
              fontSize: 13,
              textAlign: 'center',
              marginBottom: 24,
              lineHeight: '20px',
              maxWidth: 400,
            }}
          >
            An unexpected error occurred. You can try again, or refresh the page.
          </p>
          <button
            onClick={reset}
            style={{
              backgroundColor: '#39FF6A',
              color: '#000',
              fontWeight: 900,
              textTransform: 'uppercase',
              letterSpacing: 0.5,
              fontSize: 13,
              padding: '12px 24px',
              borderRadius: 12,
              border: 'none',
              cursor: 'pointer',
            }}
          >
            Try Again
          </button>
        </div>
      </body>
    </html>
  );
}
