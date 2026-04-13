import { parseEnvContent, serializeEnv, envToRecord } from '../envParser';

describe('parseEnvContent', () => {
  it('parses simple key=value pairs', () => {
    const content = 'FOO=bar\nBAZ=qux';
    const { entries } = parseEnvContent(content);
    expect(entries).toHaveLength(2);
    expect(entries[0]).toEqual({ key: 'FOO', value: 'bar' });
    expect(entries[1]).toEqual({ key: 'BAZ', value: 'qux' });
  });

  it('ignores comment lines', () => {
    const content = '# This is a comment\nFOO=bar';
    const { entries } = parseEnvContent(content);
    expect(entries).toHaveLength(1);
    expect(entries[0].key).toBe('FOO');
  });

  it('ignores empty lines', () => {
    const content = 'FOO=bar\n\nBAZ=qux\n';
    const { entries } = parseEnvContent(content);
    expect(entries).toHaveLength(2);
  });

  it('strips surrounding quotes from values', () => {
    const content = 'FOO="hello world"\nBAR=\'single\'';
    const { entries } = parseEnvContent(content);
    expect(entries[0].value).toBe('hello world');
    expect(entries[1].value).toBe('single');
  });

  it('handles values with equals signs', () => {
    const content = 'TOKEN=abc=def=ghi';
    const { entries } = parseEnvContent(content);
    expect(entries[0].value).toBe('abc=def=ghi');
  });
});

describe('serializeEnv', () => {
  it('serializes entries back to env format', () => {
    const entries = [{ key: 'FOO', value: 'bar' }, { key: 'BAZ', value: 'qux' }];
    const result = serializeEnv(entries);
    expect(result).toContain('FOO=bar');
    expect(result).toContain('BAZ=qux');
  });

  it('quotes values with spaces', () => {
    const entries = [{ key: 'MSG', value: 'hello world' }];
    const result = serializeEnv(entries);
    expect(result).toContain('MSG="hello world"');
  });
});

describe('envToRecord', () => {
  it('converts entries array to a plain record', () => {
    const entries = [{ key: 'A', value: '1' }, { key: 'B', value: '2' }];
    const record = envToRecord(entries);
    expect(record).toEqual({ A: '1', B: '2' });
  });
});
