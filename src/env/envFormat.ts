import { EnvMap } from './envParser';

export type FormatStyle = 'upper' | 'lower' | 'trim' | 'quote' | 'unquote';

export interface FormatOptions {
  keys?: FormatStyle[];
  values?: FormatStyle[];
}

function applyStyle(str: string, styles: FormatStyle[]): string {
  return styles.reduce((s, style) => {
    switch (style) {
      case 'upper': return s.toUpperCase();
      case 'lower': return s.toLowerCase();
      case 'trim': return s.trim();
      case 'quote': return s.startsWith('"') ? s : `"${s}"`;
      case 'unquote': return s.replace(/^"|"$/g, '');
      default: return s;
    }
  }, str);
}

export function formatEnvMap(env: EnvMap, options: FormatOptions): EnvMap {
  const result: EnvMap = new Map();
  for (const [key, value] of env.entries()) {
    const newKey = options.keys ? applyStyle(key, options.keys) : key;
    const newValue = options.values ? applyStyle(value, options.values) : value;
    result.set(newKey, newValue);
  }
  return result;
}

export function sortEnvMap(env: EnvMap): EnvMap {
  const sorted = new Map([...env.entries()].sort(([a], [b]) => a.localeCompare(b)));
  return sorted;
}

export function deduplicateEnvMap(env: EnvMap): { result: EnvMap; removed: string[] } {
  // EnvMap is already a Map so keys are unique; this deduplicates by value
  const seen = new Set<string>();
  const result: EnvMap = new Map();
  const removed: string[] = [];
  for (const [key, value] of env.entries()) {
    if (!seen.has(key)) {
      seen.add(key);
      result.set(key, value);
    } else {
      removed.push(key);
    }
  }
  return { result, removed };
}
