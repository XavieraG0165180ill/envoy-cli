import * as fs from 'fs';
import { interpolateValues, resolveEnv } from '../envResolve';

jest.mock('fs');

const mockFs = fs as jest.Mocked<typeof fs>;

describe('interpolateValues', () => {
  it('resolves simple variable references', () => {
    const env = new Map([
      ['BASE', '/home/user'],
      ['PATH', '${BASE}/bin'],
    ]);
    const result = interpolateValues(env);
    expect(result.get('PATH')).toBe('/home/user/bin');
  });

  it('leaves unresolved refs as empty string', () => {
    const env = new Map([['FOO', '${MISSING}']]);
    const result = interpolateValues(env);
    expect(result.get('FOO')).toBe('');
  });

  it('handles nested references', () => {
    const env = new Map([
      ['A', 'hello'],
      ['B', '${A}'],
      ['C', '${B} world'],
    ]);
    const result = interpolateValues(env);
    expect(result.get('C')).toBe('hello world');
  });

  it('does not mutate original map', () => {
    const env = new Map([['X', '${Y}'], ['Y', '42']]);
    interpolateValues(env);
    expect(env.get('X')).toBe('${Y}');
  });
});

describe('resolveEnv', () => {
  it('applies overrides over base', () => {
    const base = new Map([['KEY', 'base'], ['OTHER', 'keep']]);
    const result = resolveEnv(base, { overrides: { KEY: 'override' }, interpolate: false });
    expect(result.get('KEY')).toBe('override');
    expect(result.get('OTHER')).toBe('keep');
  });

  it('reads baseEnv file and fills missing keys', () => {
    mockFs.readFileSync.mockReturnValue('EXTRA=fromfile\nKEY=fromfile');
    const base = new Map([['KEY', 'base']]);
    const result = resolveEnv(base, { baseEnv: '.env.base', interpolate: false });
    expect(result.get('EXTRA')).toBe('fromfile');
    expect(result.get('KEY')).toBe('base'); // base takes precedence
  });

  it('interpolates by default', () => {
    const base = new Map([['HOST', 'localhost'], ['URL', 'http://${HOST}:3000']]);
    const result = resolveEnv(base);
    expect(result.get('URL')).toBe('http://localhost:3000');
  });
});
