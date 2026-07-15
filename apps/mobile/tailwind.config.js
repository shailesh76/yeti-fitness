/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}", "./screens/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // Primary
        primary:           '#00E676',
        primaryDark:       '#00B359',
        primaryLight:      '#6FFFB9',

        // Backgrounds — 4-level depth stack (mirrors designSystem.ts)
        background:        '#000000',
        surface:           '#0A0A0A',
        surfaceElevated:   '#141414',
        surfaceHighlight:  '#1E1E1E',
        surfaceBorder:     '#2A2A2A',

        // Text
        textPrimary:       '#FFFFFF',
        textSecondary:     '#A0A0A0',
        textMuted:         '#666666',

        // Accents
        accentBlue:        '#00D4FF',
        accentPurple:      '#A855F7',
        accentOrange:      '#F97316',

        // Status
        success:           '#10B981',
        warning:           '#F59E0B',
        error:             '#EF4444',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
    },
  },
  plugins: [],
}
