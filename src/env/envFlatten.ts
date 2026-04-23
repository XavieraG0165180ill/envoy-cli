import { EnvMap } from './envParser';

export type FlattenStyle = 'underscore' | 'dot';

export interface FlattenOptions {
  prefix?: string;
  style?: FlattenStyle;
  uppercase?: boolean;
}

/**
 * Flatten a nested JSON-like object into a flat EnvMap.
 * Keys are joined using the chosen separator style.
 */
export function flattenObject(
  obj: Record<string, unknown>,
  options: FlattenOptions = {}
): EnvMap {
  const { prefix = '', style = 'underscore', uppercase = true } = options;
  const separator = style === 'dot' ? '.' : '_';
  const result: EnvMap = new Map();

  function recurse(current: unknown, path: string): void {
    if (current === null || current === undefined) {
      result.set(uppercase ? path.toUpperCase() : path, '');
    } else if (typeof current === 'object' && !Array.isArray(current)) {
      for (const [key, value] of Object.entries(current as Record<string, unknown>)) {
        const newPath = path ? `${path}${separator}${key}` : key;
        recurse(value, newPath);
      }
    } else if (Array.isArray(current)) {
      current.forEach((item, index) => {
        const newPath = `${path}${separator}${index}`;
        recurse(item, newPath);
      });
    } else {
      const finalKey = uppercase ? path.toUpperCase() : path;
      result.set(finalKey, String(current));
    }
  }

  recurse(obj, prefix);
  return result;
}

/**
 * Unflatten a flat EnvMap back into a nested object.
 * Only supports underscore-separated keys.
 */
export function unflattenEnvMap(
  envMap: EnvMap,
  style: FlattenStyle = 'underscore'
): Record<string, unknown> {
  const separator = style === 'dot' ? '.' : '_';
  const result: Record<string, unknown> = {};

  for (const [key, value] of envMap.entries()) {
    const parts = key.toLowerCase().split(separator);
    let current: Record<string, unknown> = result;
    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      if (!(part in current) || typeof current[part] !== 'object') {
        current[part] = {};
      }
      current = current[part] as Record<string, unknown>;
    }
    current[parts[parts.length - 1]] = value;
  }

  return result;
}
