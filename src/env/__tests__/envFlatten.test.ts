import { flattenObject, unflattenEnvMap } from '../envFlatten';

describe('flattenObject', () => {
  it('flattens a simple nested object with underscore separator', () => {
    const obj = { database: { host: 'localhost', port: 5432 } };
    const result = flattenObject(obj);
    expect(result.get('DATABASE_HOST')).toBe('localhost');
    expect(result.get('DATABASE_PORT')).toBe('5432');
  });

  it('flattens with dot separator', () => {
    const obj = { api: { key: 'abc123' } };
    const result = flattenObject(obj, { style: 'dot', uppercase: false });
    expect(result.get('api.key')).toBe('abc123');
  });

  it('applies prefix when provided', () => {
    const obj = { host: 'localhost' };
    const result = flattenObject(obj, { prefix: 'DB' });
    expect(result.get('DB_HOST')).toBe('localhost');
  });

  it('handles arrays by indexing', () => {
    const obj = { servers: ['a', 'b'] };
    const result = flattenObject(obj);
    expect(result.get('SERVERS_0')).toBe('a');
    expect(result.get('SERVERS_1')).toBe('b');
  });

  it('handles null values as empty string', () => {
    const obj = { value: null };
    const result = flattenObject(obj);
    expect(result.get('VALUE')).toBe('');
  });

  it('preserves case when uppercase is false', () => {
    const obj = { myKey: 'val' };
    const result = flattenObject(obj, { uppercase: false });
    expect(result.get('myKey')).toBe('val');
  });

  it('handles deeply nested objects', () => {
    const obj = { a: { b: { c: 'deep' } } };
    const result = flattenObject(obj);
    expect(result.get('A_B_C')).toBe('deep');
  });
});

describe('unflattenEnvMap', () => {
  it('unflattens a simple map into nested object', () => {
    const map = new Map([['DATABASE_HOST', 'localhost'], ['DATABASE_PORT', '5432']]);
    const result = unflattenEnvMap(map);
    expect((result['database'] as Record<string, unknown>)['host']).toBe('localhost');
    expect((result['database'] as Record<string, unknown>)['port']).toBe('5432');
  });

  it('returns flat object for single-segment keys', () => {
    const map = new Map([['HOST', 'localhost']]);
    const result = unflattenEnvMap(map);
    expect(result['host']).toBe('localhost');
  });

  it('handles dot-separated keys', () => {
    const map = new Map([['api.key', 'secret']]);
    const result = unflattenEnvMap(map, 'dot');
    expect((result['api'] as Record<string, unknown>)['key']).toBe('secret');
  });

  it('returns empty object for empty map', () => {
    const result = unflattenEnvMap(new Map());
    expect(result).toEqual({});
  });
});
