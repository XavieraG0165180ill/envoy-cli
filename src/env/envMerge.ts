import { EnvMap } from './envParser';

export type MergeStrategy = 'ours' | 'theirs' | 'interactive';

export interface MergeConflict {
  key: string;
  baseValue: string | undefined;
  oursValue: string | undefined;
  theirsValue: string | undefined;
}

export interface MergeResult {
  merged: EnvMap;
  conflicts: MergeConflict[];
}

/**
 * Performs a three-way merge of env maps.
 * base: common ancestor, ours: local version, theirs: remote version
 */
export function mergeEnvMaps(
  base: EnvMap,
  ours: EnvMap,
  theirs: EnvMap,
  strategy: MergeStrategy = 'ours'
): MergeResult {
  const allKeys = new Set([
    ...Object.keys(base),
    ...Object.keys(ours),
    ...Object.keys(theirs),
  ]);

  const merged: EnvMap = {};
  const conflicts: MergeConflict[] = [];

  for (const key of allKeys) {
    const baseVal = base[key];
    const oursVal = ours[key];
    const theirsVal = theirs[key];

    const oursChanged = oursVal !== baseVal;
    const theirsChanged = theirsVal !== baseVal;

    if (!oursChanged && !theirsChanged) {
      // No changes on either side — keep base (or skip if deleted)
      if (baseVal !== undefined) merged[key] = baseVal;
    } else if (oursChanged && !theirsChanged) {
      // Only we changed it
      if (oursVal !== undefined) merged[key] = oursVal;
    } else if (!oursChanged && theirsChanged) {
      // Only they changed it
      if (theirsVal !== undefined) merged[key] = theirsVal;
    } else if (oursVal === theirsVal) {
      // Both changed to the same value
      if (oursVal !== undefined) merged[key] = oursVal;
    } else {
      // True conflict
      conflicts.push({ key, baseValue: baseVal, oursValue: oursVal, theirsValue: theirsVal });
      if (strategy === 'ours') {
        if (oursVal !== undefined) merged[key] = oursVal;
      } else if (strategy === 'theirs') {
        if (theirsVal !== undefined) merged[key] = theirsVal;
      }
      // 'interactive' leaves conflict keys out of merged — caller resolves
    }
  }

  return { merged, conflicts };
}

/**
 * Resolves a single conflict by picking a side or providing a custom value.
 */
export function resolveConflict(
  merged: EnvMap,
  conflict: MergeConflict,
  resolution: 'ours' | 'theirs' | 'custom',
  customValue?: string
): EnvMap {
  const result = { ...merged };
  if (resolution === 'ours' && conflict.oursValue !== undefined) {
    result[conflict.key] = conflict.oursValue;
  } else if (resolution === 'theirs' && conflict.theirsValue !== undefined) {
    result[conflict.key] = conflict.theirsValue;
  } else if (resolution === 'custom' && customValue !== undefined) {
    result[conflict.key] = customValue;
  }
  return result;
}
