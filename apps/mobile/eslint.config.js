const expoConfig = require('eslint-config-expo/flat');
const { defineConfig } = require('eslint/config');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*'],
  },
  {
    // One-off Node/CommonJS utility scripts (seeding, R2 migration) — not part
    // of the React Native app bundle, so they need Node globals the base
    // Expo/RN config doesn't provide.
    files: ['scripts/**/*.js'],
    languageOptions: {
      globals: {
        __dirname: 'readonly',
        Buffer: 'readonly',
      },
    },
  },
  {
    // eslint-plugin-react-hooks v5's "recommended" preset added a family of
    // new React-Compiler-readiness rules that assume the app will run through
    // the React Compiler, which this project does not use. Across this
    // codebase they flag long-standing, intentional patterns that don't cause
    // real bugs without the compiler (Math.random() for visual randomization,
    // useRef() for a stable per-instance id, setState inside effects, etc.).
    // Fixing all of them properly means non-trivial behavioral refactoring
    // across ~15 files — real work, but a separate task from "add a lint
    // gate" and riskier to rush. Kept as warnings so they still surface for
    // awareness without blocking CI on a rule set that doesn't apply yet.
    rules: {
      'react-hooks/purity': 'warn',
      'react-hooks/refs': 'warn',
      'react-hooks/immutability': 'warn',
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/use-memo': 'warn',
    },
  },
]);
