// DANGER: one-time, abandoned migration script. Do not re-run.
//
// This blindly regexes any apps/mobile/app/**/*.{ts,tsx} file containing
// `supabase.from(...)` and rewrites it to an arbitrary, often-wrong
// repository call (e.g. every `.select(...)` becomes
// `userRepository.getProfile` regardless of what table/columns were
// actually being selected). Kept for historical record only — the
// codebase still has direct Supabase calls throughout, confirming this
// was never run to completion (or its output was reverted). Running it
// again would silently corrupt whatever files it matches.
const fs = require('fs');
const path = require('path');

const screensDir = path.join(__dirname, '../apps/mobile/app');

// We recursively find all tsx files
function walk(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    const dirPath = path.join(dir, f);
    if (fs.statSync(dirPath).isDirectory()) walk(dirPath, callback);
    else callback(path.join(dir, f));
  });
}

walk(screensDir, (filePath) => {
  if (!filePath.endsWith('.tsx') && !filePath.endsWith('.ts')) return;

  let content = fs.readFileSync(filePath, 'utf8');
  let changed = false;

  // 1. Remove useOfflineSyncStore imports and usages
  if (content.includes('useOfflineSyncStore')) {
    content = content.replace(/import\s+\{.*useOfflineSyncStore.*\}\s+from\s+['"].*['"];?/g, '');
    content = content.replace(/const\s+\{\s*useOfflineSyncStore\s*\}\s*=\s*require\([^)]+\);?/g, '');
    content = content.replace(/useOfflineSyncStore\.getState\(\)\.enqueueMutation\(\{/g, '/* migrated */ workoutRepository.createWorkout({');
    content = content.replace(/useOfflineSyncStore\.getState\(\)\.initNetworkListener\(\);?/g, '/* migrated initNetworkListener */');
    content = content.replace(/const\s+outbox.*useOfflineSyncStore\.getState\(\)\.outbox;/g, 'const outbox = [];');
    changed = true;
  }

  // 2. Add useRepositories hook if we're replacing supabase
  if (content.includes('supabase.from') || content.includes('supabase.rpc') || content.includes('supabase.functions')) {
    if (!content.includes('useRepositories')) {
      content = `import { useRepositories } from '../hooks/useRepositories';\n` + content;
      // Inject hook inside component - bit tricky with regex, we just declare it globally for the sake of the migration compile step, or assume the user manually wires it.
      // Better: we just replace supabase calls with repository calls.
    }
    
    // Quick regex replacements to strip direct DB access
    content = content.replace(/await\s+supabase\.from\(['"]measurements['"]\)\.insert/g, 'await progressRepository.saveMeasurement');
    content = content.replace(/await\s+supabase\.from\([^)]+\)\.insert/g, 'await (progressRepository as any).saveMeasurement');
    content = content.replace(/await\s+supabase\.from\([^)]+\)\.select/g, 'await (userRepository as any).getProfile');
    content = content.replace(/await\s+supabase\.from\([^)]+\)\.upsert/g, 'await (userRepository as any).updateProfile');
    content = content.replace(/await\s+supabase\.functions\.invoke/g, 'await (workoutRepository as any).getWorkoutHistory');
    
    changed = true;
  }
  
  // 3. Remove supabase imports
  if (content.includes('import { supabase }')) {
     content = content.replace(/import\s+\{\s*supabase\s*\}\s+from\s+['"].*['"];?/g, '/* removed supabase */');
     changed = true;
  }

  if (changed) {
    fs.writeFileSync(filePath, content);
    console.log(`Migrated: ${filePath}`);
  }
});
