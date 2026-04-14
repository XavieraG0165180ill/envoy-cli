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
});

describe('resolveConflict', () => {
  const merged = { KEY_A: 'existing' };
  const conflict: MergeConflict = {
    key: 'KEY_A',
    baseValue: 'base',
    oursValue: 'ours-val',
    theirsValue: 'theirs-val',
  };

  it('resolves with ours', () => {
    const result = resolveConflict(merged, conflict, 'ours');
    expect(result.KEY_A).toBe('ours-val');
  });

  it('resolves with theirs', () => {
    const result = resolveConflict(merged, conflict, 'theirs');
    expect(result.KEY_A).toBe('theirs-val');
  });

  it('resolves with custom value', () => {
    const result = resolveConflict(merged, conflict, 'custom', 'my-custom');
    expect(result.KEY_A).toBe('my-custom');
  });

  it('does not mutate the original merged map', () => {
    resolveConflict(merged, conflict, 'theirs');
    expect(merged.KEY_A).toBe('existing');
  });
});
