import { compareEnvMaps, formatDiff } from '../envCompare';

describe('compareEnvMaps', () => {
  it('should detect added keys', () => {
    const base = { FOO: 'bar' };
    const target = { FOO: 'bar', NEW_KEY: 'new_value' };
    const result = compareEnvMaps(base, target);
    expect(result.hasDifferences).toBe(true);
    expect(result.diff.added).toEqual({ NEW_KEY: 'new_value' });
    expect(result.summary.addedCount).toBe(1);
  });

  it('should detect removed keys', () => {
    const base = { FOO: 'bar', OLD_KEY: 'old_value' };
    const target = { FOO: 'bar' };
    const result = compareEnvMaps(base, target);
    expect(result.hasDifferences).toBe(true);
    expect(result.diff.removed).toEqual({ OLD_KEY: 'old_value' });
    expect(result.summary.removedCount).toBe(1);
  });

  it('should detect changed values', () => {
    const base = { FOO: 'bar' };
    const target = { FOO: 'baz' };
    const result = compareEnvMaps(base, target);
    expect(result.hasDifferences).toBe(true);
    expect(result.diff.changed).toEqual({ FOO: { from: 'bar', to: 'baz' } });
    expect(result.summary.changedCount).toBe(1);
  });

  it('should detect unchanged keys', () => {
    const base = { FOO: 'bar', SAME: 'value' };
    const target = { FOO: 'baz', SAME: 'value' };
    const result = compareEnvMaps(base, target);
    expect(result.diff.unchanged).toEqual({ SAME: 'value' });
    expect(result.summary.unchangedCount).toBe(1);
  });

  it('should return no differences for identical maps', () => {
    const base = { FOO: 'bar', BAZ: 'qux' };
    const target = { FOO: 'bar', BAZ: 'qux' };
    const result = compareEnvMaps(base, target);
    expect(result.hasDifferences).toBe(false);
    expect(result.summary.addedCount).toBe(0);
    expect(result.summary.removedCount).toBe(0);
    expect(result.summary.changedCount).toBe(0);
    expect(result.summary.unchangedCount).toBe(2);
  });

  it('should handle empty maps', () => {
    const result = compareEnvMaps({}, {});
    expect(result.hasDifferences).toBe(false);
  });
});

describe('formatDiff', () => {
  it('should format added, removed, and changed keys', () => {
    const base = { OLD: 'v1', SAME: 'x', CHANGED: 'a' };
    const target = { NEW: 'v2', SAME: 'x', CHANGED: 'b' };
    const result = formatDiff(compareEnvMaps(base, target));
    expect(result).toContain('+ NEW=v2');
    expect(result).toContain('- OLD=v1');
    expect(result).toContain('~ CHANGED: a → b');
  });

  it('should mask values when maskValues is true', () => {
    const base = { FOO: 'secret' };
    const target = { FOO: 'other_secret' };
    const result = formatDiff(compareEnvMaps(base, target), true);
    expect(result).toContain('***');
    expect(result).not.toContain('secret');
  });

  it('should return empty string when no differences', () => {
    const base = { FOO: 'bar' };
    const target = { FOO: 'bar' };
    const result = formatDiff(compareEnvMaps(base, target));
    expect(result).toBe('');
  });
});
