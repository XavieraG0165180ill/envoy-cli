import * as fs from 'fs';
import * as path from 'path';
import { parseEnvContent } from './envParser';

export interface ResolveOptions {
  baseEnv?: string;
  overrides?: Record<string, string>;
  interpolate?: boolean;
}

/**
 * Resolve variable references within an env map (e.g. FOO=${BAR})
 */
export function interpolateValues(env: Map<string, string>): Map<string, string> {
  const resolved = new Map<string, string>();
  for (const [key, value] of env) {
    resolved.set(key, resolveValue(value, env));
  }
  return resolved;
}

function resolveValue(value: string, env: Map<string, string>, depth = 0): string {
  if (depth > 10) return value; // prevent infinite recursion
  return value.replace(/\$\{([^}]+)\}/g, (_, name) => {
    const ref = env.get(name);
    if (ref === undefined) return '';
    return resolveValue(ref, env, depth + 1);
  });
}

/**
 * Merge base env file with overrides and optionally interpolate.
 */
export function resolveEnv(
  base: Map<string, string>,
  options: ResolveOptions = {}
): Map<string, string> {
  let merged = new Map(base);

  if (options.baseEnv) {
    const content = fs.readFileSync(options.baseEnv, 'utf-8');
    const parsed = parseEnvContent(content);
    for (const [k, v] of parsed) {
      if (!merged.has(k)) merged.set(k, v);
    }
  }

  if (options.overrides) {
    for (const [k, v] of Object.entries(options.overrides)) {
      merged.set(k, v);
    }
  }

  if (options.interpolate !== false) {
    merged = interpolateValues(merged);
  }

  return merged;
}
