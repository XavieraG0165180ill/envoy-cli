import { formatEnvMap, sortEnvMap, deduplicateEnvMap } from '../envFormat';

function makeMap(obj: Record<string, string>): Map<string, string> {
  return new Map(Object.entries(obj));
}

describe('formatEnvMap', () => {
  it('uppercases keys', () => {
    const env = makeMap({ db_host: 'localhost' });
    const result = formatEnvMap(env, { keys: ['upper'] });
    expect(result.get('DB_HOST')).toBe('localhost');
  });

  it('trims and quotes values', () => {
    const env = makeMap({ KEY: '  hello  ' });
    const result = formatEnvMap(env, { values: ['trim', 'quote'] });
    expect(result.get('KEY')).toBe('"hello"');
  });

  it('unquotes values', () => {
    const env = makeMap({ KEY: '"value"' });
    const result = formatEnvMap(env, { values: ['unquote'] });
    expect(result.get('KEY')).toBe('value');
  });

  it('applies no transformation when options are empty', () => {
    const env = makeMap({ KEY: 'val' });
    const result = formatEnvMap(env, {});
    expect(result.get('KEY')).toBe('val');
  });
});

describe('sortEnvMap', () => {
  it('sorts keys alphabetically', () => {
    const env = makeMap({ ZEBRA: '1', APPLE: '2', MANGO: '3' });
    const sorted = sortEnvMap(env);
    expect([...sorted.keys()]).toEqual(['APPLE', 'MANGO', 'ZEBRA']);
  });
});

describe('deduplicateEnvMap', () => {
  it('returns all keys when no duplicates', () => {
    const env = makeMap({ A: '1', B: '2' });
    const { result, removed } = deduplicateEnvMap(env);
    expect(result.size).toBe(2);
    expect(removed).toHaveLength(0);
  });

  it('handles empty map', () => {
    const { result, removed } = deduplicateEnvMap(new Map());
    expect(result.size).toBe(0);
    expect(removed).toHaveLength(0);
  });
});
