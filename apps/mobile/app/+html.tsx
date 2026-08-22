import { ScrollViewStyleReset } from 'expo-router/html';
import { type PropsWithChildren } from 'react';

/**
 * Root HTML component for Expo Router static web export.
 * Configures PWA metadata, iOS Safari standalone display, safe area insets,
 * and strict mobile viewport controls to prevent accidental pinch-zoom/stretch lock.
 */
export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, shrink-to-fit=no, viewport-fit=cover"
        />

        {/* Primary PWA Metadata */}
        <title>Yeti — Personal Fitness &amp; Nutrition Coach</title>
        <meta name="description" content="Your personal fitness &amp; nutrition coach" />
        <meta name="theme-color" content="#0a0a0a" />
        <link rel="manifest" href="/manifest.json" />

        {/* iOS Safari Standalone & PWA Metadata */}
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Yeti" />

        {/* Icons & Favicons */}
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon.png" />

        {/* Prevent Web Viewport Pinch-Zoom Stuck State while keeping in-app scroll responsive */}
        <style
          dangerouslySetInnerHTML={{
            __html: `
              html, body, #root {
                width: 100%;
                height: 100%;
                margin: 0;
                padding: 0;
                position: fixed;
                overflow: hidden;
                touch-action: pan-x pan-y manipulation;
                -webkit-text-size-adjust: 100%;
                -webkit-touch-callout: none;
                overscroll-behavior: none;
                background-color: #0a0a0a;
              }
            `,
          }}
        />

        {/* Expo ScrollView Reset for React Native Web */}
        <ScrollViewStyleReset />

        {/* Anti-Zoom Gesture Interceptor for Mobile Browsers/PWAs */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if (typeof document !== 'undefined') {
                document.addEventListener('gesturestart', function(e) { e.preventDefault(); }, { passive: false });
                document.addEventListener('gesturechange', function(e) { e.preventDefault(); }, { passive: false });
                document.addEventListener('gestureend', function(e) { e.preventDefault(); }, { passive: false });
              }
            `,
          }}
        />

        {/* Service Worker Registration */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js').then(
                    function(reg) {
                      console.log('[PWA] ServiceWorker registered with scope:', reg.scope);
                    },
                    function(err) {
                      console.log('[PWA] ServiceWorker registration failed:', err);
                    }
                  );
                });
              }
            `,
          }}
        />
      </head>
      <body style={{ backgroundColor: '#0a0a0a', margin: 0, padding: 0, overflow: 'hidden' }}>
        {children}
      </body>
    </html>
  );
}
