/**
 * Env loading and canary-slug filtering for the canonical exercise importer.
 *
 * Extracted from the CLI so both can be tested without a Supabase client and
 * without running an import.
 */
import fs from 'fs';

/**
 * Parses a dotenv file.
 *
 * The previous inline loader split on '\n' and matched each line against
 * /^\s*([\w.-]+)\s*=\s*(.*)?$/. This repo's .env uses CRLF, so every line kept
 * a trailing '\r'. In JavaScript '.' never matches '\r' and '$' without the 'm'
 * flag asserts end-of-string, so the pattern failed on EVERY line and not one
 * variable was loaded — which is why a live import died on
 * "EXPO_PUBLIC_SUPABASE_URL or SUPABASE_URL must be set" even though the key is
 * on line 1. Splitting on /\r?\n/ is the fix; the BOM strip is defensive.
 */
export function parseEnvFile(contents: string): Record<string, string> {
  const out: Record<string, string> = {};
  const text = contents.replace(/^﻿/, '');
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?$/);
    if (!match) continue;
    let val = (match[2] ?? '').trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    out[match[1]] = val;
  }
  return out;
}

/**
 * Applies a .env file to process.env WITHOUT clobbering variables that are
 * already set: an explicit `VAR=... command` must win over the file, otherwise
 * there is no way to point a run at a different project.
 */
export function loadEnvFile(path: string, env: NodeJS.ProcessEnv = process.env): string[] {
  if (!fs.existsSync(path)) return [];
  const parsed = parseEnvFile(fs.readFileSync(path, 'utf-8'));
  const applied: string[] = [];
  for (const [key, value] of Object.entries(parsed)) {
    if (env[key] !== undefined && env[key] !== '') continue; // explicit env wins
    env[key] = value;
    applied.push(key);
  }
  return applied;
}

export interface SlugFilterResult {
  /** Slugs to import, de-duplicated and order-preserving. */
  slugs: string[];
  /** Fatal problems; a non-empty list must abort before any mutation. */
  errors: string[];
}

/**
 * Resolves --slug arguments into an exact, verified selection.
 *
 * Exact matching only. No fuzzy matching, no name matching, no prefix or
 * partial-spelling tolerance: a canary that silently widened its own scope
 * would defeat the point of running one. Every requested slug must be present
 * BOTH in the selected dataset and in the provenance manifest, and any slug
 * that is not resolves to a hard error rather than being skipped.
 */
export function resolveSlugFilter(
  argv: string[],
  datasetSlugs: Set<string>,
  manifestSlugs: Set<string>,
): SlugFilterResult {
  const requested: string[] = [];
  for (const arg of argv) {
    if (!arg.startsWith('--slug=')) continue;
    const value = arg.slice('--slug='.length);
    for (const part of value.split(',')) {
      const slug = part.trim();
      if (slug) requested.push(slug);
    }
  }

  const errors: string[] = [];
  const slugs: string[] = [];
  const seen = new Set<string>();
  for (const slug of requested) {
    if (seen.has(slug)) continue; // repeated --slug is not a duplicate write
    seen.add(slug);
    if (!manifestSlugs.has(slug)) {
      errors.push(`--slug=${slug} is not in the provenance manifest.`);
      continue;
    }
    if (!datasetSlugs.has(slug)) {
      errors.push(`--slug=${slug} is not present in the selected dataset file.`);
      continue;
    }
    slugs.push(slug);
  }
  return { slugs, errors };
}

/** Applies a resolved filter. An empty filter means "no filter" — full dataset. */
export function applySlugFilter<T extends { slug?: string }>(items: T[], slugs: string[]): T[] {
  if (slugs.length === 0) return items;
  const wanted = new Set(slugs);
  return items.filter((i) => i.slug !== undefined && wanted.has(i.slug));
}
