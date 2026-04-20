import { EnvMap } from './envParser';

/**
 * Supported transformation operations for environment variable values.
 */
export type TransformOp =
  | 'uppercase'
  | 'lowercase'
  | 'trim'
  | 'base64encode'
  | 'base64decode'
  | 'urlencode'
  | 'urldecode'
  | 'mask'
  | 'prefix'
  | 'suffix'
  | 'replace';

export interface TransformRule {
  op: TransformOp;
  /** Keys to apply the transform to; if omitted, applies to all keys */
  keys?: string[];
  /** Extra argument (e.g. prefix string, suffix string, or "find:replacement" for replace) */
  arg?: string;
}

export interface TransformResult {
  key: string;
  original: string;
  transformed: string;
  op: TransformOp;
}

/**
 * Apply a single transform operation to a string value.
 */
export function applyTransform(value: string, rule: TransformRule): string {
  switch (rule.op) {
    case 'uppercase':
      return value.toUpperCase();

    case 'lowercase':
      return value.toLowerCase();

    case 'trim':
      return value.trim();

    case 'base64encode':
      return Buffer.from(value, 'utf8').toString('base64');

    case 'base64decode':
      return Buffer.from(value, 'base64').toString('utf8');

    case 'urlencode':
      return encodeURIComponent(value);

    case 'urldecode':
      return decodeURIComponent(value);

    case 'mask': {
      const visibleChars = 4;
      if (value.length <= visibleChars) return '*'.repeat(value.length);
      return '*'.repeat(value.length - visibleChars) + value.slice(-visibleChars);
    }

    case 'prefix':
      return `${rule.arg ?? ''}${value}`;

    case 'suffix':
      return `${value}${rule.arg ?? ''}`;

    case 'replace': {
      if (!rule.arg) return value;
      const separatorIdx = rule.arg.indexOf(':');
      if (separatorIdx === -1) return value;
      const find = rule.arg.slice(0, separatorIdx);
      const replacement = rule.arg.slice(separatorIdx + 1);
      return value.split(find).join(replacement);
    }

    default:
      return value;
  }
}

/**
 * Apply a list of transform rules to an EnvMap.
 * Returns the transformed map and a log of all changes made.
 */
export function transformEnvMap(
  envMap: EnvMap,
  rules: TransformRule[]
): { result: EnvMap; changes: TransformResult[] } {
  const result: EnvMap = new Map(envMap);
  const changes: TransformResult[] = [];

  for (const rule of rules) {
    const targetKeys =
      rule.keys && rule.keys.length > 0
        ? rule.keys.filter((k) => result.has(k))
        : Array.from(result.keys());

    for (const key of targetKeys) {
      const original = result.get(key) ?? '';
      const transformed = applyTransform(original, rule);

      if (transformed !== original) {
        result.set(key, transformed);
        changes.push({ key, original, transformed, op: rule.op });
      }
    }
  }

  return { result, changes };
}

/**
 * Parse a transform rule from a compact string descriptor.
 * Format: "op" or "op:arg" or "op[KEY1,KEY2]:arg"
 *
 * Examples:
 *   "uppercase"                → { op: 'uppercase' }
 *   "prefix:PROD_"             → { op: 'prefix', arg: 'PROD_' }
 *   "replace[DB_URL]:old:new"  → { op: 'replace', keys: ['DB_URL'], arg: 'old:new' }
 */
export function parseTransformDescriptor(descriptor: string): TransformRule {
  const keyMatch = descriptor.match(/^([a-z64]+)\[([^\]]+)\](?::(.+))?$/);
  if (keyMatch) {
    const [, op, keyList, arg] = keyMatch;
    return {
      op: op as TransformOp,
      keys: keyList.split(',').map((k) => k.trim()),
      ...(arg !== undefined ? { arg } : {}),
    };
  }

  const simpleMatch = descriptor.match(/^([a-z64]+)(?::(.+))?$/);
  if (simpleMatch) {
    const [, op, arg] = simpleMatch;
    return {
      op: op as TransformOp,
      ...(arg !== undefined ? { arg } : {}),
    };
  }

  throw new Error(`Invalid transform descriptor: "${descriptor}"`);
}
