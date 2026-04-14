import { EnvMap } from './envParser';

export interface EnvDiff {
  added: Record<string, string>;
  removed: Record<string, string>;
  changed: Record<string, { from: string; to: string }>;
  unchanged: Record<string, string>;
}

export interface CompareResult {
  hasDifferences: boolean;
  diff: EnvDiff;
  summary: {
    addedCount: number;
    removedCount: number;
    changedCount: number;
    unchangedCount: number;
  };
}

export function compareEnvMaps(base: EnvMap, target: EnvMap): CompareResult {
  const added: Record<string, string> = {};
  const removed: Record<string, string> = {};
  const changed: Record<string, { from: string; to: string }> = {};
  const unchanged: Record<string, string> = {};

  const baseKeys = new Set(Object.keys(base));
  const targetKeys = new Set(Object.keys(target));

  for (const key of targetKeys) {
    if (!baseKeys.has(key)) {
      added[key] = target[key];
    } else if (base[key] !== target[key]) {
      changed[key] = { from: base[key], to: target[key] };
    } else {
      unchanged[key] = base[key];
    }
  }

  for (const key of baseKeys) {
    if (!targetKeys.has(key)) {
      removed[key] = base[key];
    }
  }

  const diff: EnvDiff = { added, removed, changed, unchanged };

  return {
    hasDifferences:
      Object.keys(added).length > 0 ||
      Object.keys(removed).length > 0 ||
      Object.keys(changed).length > 0,
    diff,
    summary: {
      addedCount: Object.keys(added).length,
      removedCount: Object.keys(removed).length,
      changedCount: Object.keys(changed).length,
      unchangedCount: Object.keys(unchanged).length,
    },
  };
}

export function formatDiff(result: CompareResult, maskValues = false): string {
  const lines: string[] = [];
  const mask = (val: string) => (maskValues ? '***' : val);

  for (const [key, value] of Object.entries(result.diff.added)) {
    lines.push(`+ ${key}=${mask(value)}`);
  }

  for (const [key, value] of Object.entries(result.diff.removed)) {
    lines.push(`- ${key}=${mask(value)}`);
  }

  for (const [key, { from, to }] of Object.entries(result.diff.changed)) {
    lines.push(`~ ${key}: ${mask(from)} → ${mask(to)}`);
  }

  return lines.join('\n');
}
