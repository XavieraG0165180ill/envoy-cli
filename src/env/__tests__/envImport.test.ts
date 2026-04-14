import * as fs from 'fs';
import * as path from 'path';
import { importEnvFile, importFromJson, importFromYaml, detectFormat } from '../envImport';

jest.mock('fs');
const mockedFs = fs as jest.Mocked<typeof fs>;

describe('detectFormat', () => {
  it('detects json format', () => {
    expect(detectFormat('/path/to/file.json')).toBe('json');
  });
  it('detects yaml format', () => {
    expect(detectFormat('/path/to/file.yaml')).toBe('yaml');
    expect(detectFormat('/path/to/file.yml')).toBe('yaml');
  });
  it('defaults to dotenv', () => {
    expect(detectFormat('/path/to/.env')).toBe('dotenv');
    expect(detectFormat('/path/to/file.txt')).toBe('dotenv');
  });
});

describe('importFromJson', () => {
  it('parses flat json object', () => {
    const result = importFromJson(JSON.stringify({ KEY: 'value', FOO: 'bar' }));
    expect(result).toEqual([{ key: 'KEY', value: 'value' }, { key: 'FOO', value: 'bar' }]);
  });
  it('throws on non-string values', () => {
    expect(() => importFromJson(JSON.stringify({ KEY: 123 }))).toThrow();
  });
  it('throws on array input', () => {
    expect(() => importFromJson('[]')).toThrow();
  });
});

describe('importFromYaml', () => {
  it('parses simple yaml', () => {
    const yaml = 'KEY: value\nFOO: bar';
    const result = importFromYaml(yaml);
    expect(result).toEqual([{ key: 'KEY', value: 'value' }, { key: 'FOO', value: 'bar' }]);
  });
  it('ignores comments and empty lines', () => {
    const yaml = '# comment\n\nKEY: value';
    const result = importFromYaml(yaml);
    expect(result).toHaveLength(1);
  });
  it('strips quotes from values', () => {
    const yaml = 'KEY: "quoted value"';
    const result = importFromYaml(yaml);
    expect(result[0].value).toBe('quoted value');
  });
});

describe('importEnvFile', () => {
  it('throws if file does not exist', () => {
    mockedFs.existsSync.mockReturnValue(false);
    expect(() => importEnvFile('/missing.env')).toThrow('File not found');
  });
  it('imports dotenv file', () => {
    mockedFs.existsSync.mockReturnValue(true);
    mockedFs.readFileSync.mockReturnValue('KEY=value\nFOO=bar' as any);
    const result = importEnvFile('/path/.env');
    expect(result.format).toBe('dotenv');
    expect(result.count).toBe(2);
  });
  it('imports json file', () => {
    mockedFs.existsSync.mockReturnValue(true);
    mockedFs.readFileSync.mockReturnValue(JSON.stringify({ KEY: 'value' }) as any);
    const result = importEnvFile('/path/vars.json');
    expect(result.format).toBe('json');
    expect(result.count).toBe(1);
  });
});
