import { mergeEnvMaps, resolveConflict, MergeConflict } from '../envMerge';

describe('mergeEnvMaps', () => {
  const base = { KEY_A: 'a', KEY_B: 'b', KEY_C: 'c' };

  it('keeps unchanged keys from base', () => {
    const { merged, conflicts } = mergeEnvMaps(base, base, base);
    expect(merged).toEqual(base);
    expect(conflicts).toHaveLength(0);
  });

  it('applies our changes when only we changed a key', () => {
    const ours = { ...base, KEY_A: 'a-ours' };
    const { merged, conflicts } = mergeEnvMaps(base, ours, base);
    expect(merged.KEY_A).toBe('a-ours');
    expect(conflicts).toHaveLength(0);
  });

  it('applies their changes when only they changed a key', () => {
    const theirs = { ...base, KEY_B: 'b-theirs' };
    const { merged, conflicts } = mergeEnvMaps(base, base, theirs);
    expect(merged.KEY_B).toBe('b-theirs');
    expect(conflicts).toHaveLength(0);
  });

  it('no conflict when both sides changed to the same value', () => {
    const ours = { ...base, KEY_C: 'same' };
    const theirs = { ...base, KEY_C: 'same' };
    const { merged, conflicts } = mergeEnvMaps(base, ours, theirs);
    expect(merged.KEY_C).toBe('same');
    expect(conflicts).toHaveLength(0);
  });

  it('detects conflict when both sides changed a key differently', () => {
    const ours = { ...base, KEY_A: 'a-ours' };
    const theirs = { ...base, KEY_A: 'a-theirs' };
    const { conflicts } = mergeEnvMaps(base, ours, theirs);
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0].key).toBe('KEY_A');
    expect(conflicts[0].oursValue).toBe('a-ours');
    expect(conflicts[0].theirsValue).toBe('a-theirs');
  });

  it('resolves conflict with "ours" strategy by default', () => {
    const ours = { ...base, KEY_A: 'a-ours' };
    const theirs = { ...base, KEY_A: 'a-theirs' };
    const { merged } = mergeEnvMaps(base, ours, theirs, 'ours');
    expect(merged.KEY_A).toBe('a-ours');
  });

  it('resolves conflict with "theirs" strategy', () => {
    const ours = { ...base, KEY_A: 'a-ours' };
    const theirs = { ...base, KEY_A: 'a-theirs' };
    const { merged } = mergeEnvMaps(base, ours, theirs, 'theirs');
    expect(merged.KEY_A).toBe('a-theirs');
  });

  it('leaves conflict key out of merged when strategy is interactive', () => {
    const ours = { ...base, KEY_A: 'a-ours' };
    const theirs = { ...base, KEY_A: 'a-theirs' };
    const { merged, conflicts } = mergeEnvMaps(base, ours, theirs, 'interactive');
    expect(merged.KEY_A).toBeUndefined();
    expect(conflicts).toHaveLength(1);
  });

  it('handles new keys added only by us', () => {
    const ours = { ...base, NEW_KEY: 'new' };
    const { merged } = mergeEnvMaps(base, ours, base);
    expect(merged.NEW_KEY).toBe('new');
  });

  it('handles keys deleted by us', () => {
    const { KEY_C, ...oursWithoutC } = base;
    const { merged } = mergeEnvMaps(base, oursWithoutC as any, base);
    expect(merged.KEY_C).toBeUndefined();
  });

  it('detects multiple conflicts across different keys', () => {
    const ours = { ...base, KEY_A: 'a-ours', KEY_B: 'b-ours' };
    const theirs = { ...base, KEY_A: 'a-theirs', KEY_B: 'b-theirs' };
    const { conflicts } = mergeEnvMaps(base, ours, theirs);
    expect(conflicts).toHaveLength(2);
    const keys = conflicts.map((c) => c.key);
    expect(keys).toContain('KEY_A');
    expect(keys).toContain('KEY_B');
  });
});

describe('resolveConflict', () => {
  const conflict: MergeConflict = {
    key: 'KEY_A',
    baseValue: 'a',
    oursValue: 'a-ours',
    theirsValue: 'a-theirs',
  };

  it('resolves to oursValue when strategy is "ours"', () => {
    expect(resolveConflict(conflict, 'ours')).toBe('a-ours');
  });

  it('resolves to theirsValue when strategy is "theirs"', () => {
    expect(resolveConflict(conflict, 'theirs')).toBe('a-theirs');
  });
});
