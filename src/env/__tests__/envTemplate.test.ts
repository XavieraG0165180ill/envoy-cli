import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import {
  generateTemplate,
  parseTemplate,
  validateAgainstTemplate,
  writeTemplateFile,
} from '../envTemplate';

describe('generateTemplate', () => {
  it('replaces all values with empty strings by default', () => {
    const record = { DB_URL: 'postgres://localhost', SECRET: 'abc123' };
    const result = generateTemplate(record);
    expect(result).toEqual({ DB_URL: '', SECRET: '' });
  });

  it('uses placeholderMap values when provided', () => {
    const record = { DB_URL: 'postgres://localhost', PORT: '3000' };
    const result = generateTemplate(record, { DB_URL: 'your_db_url' });
    expect(result).toEqual({ DB_URL: 'your_db_url', PORT: '' });
  });

  it('returns empty object for empty input', () => {
    expect(generateTemplate({})).toEqual({});
  });
});

describe('parseTemplate', () => {
  it('parses simple key=value lines', () => {
    const content = 'DB_URL=\nPORT=3000';
    const entries = parseTemplate(content);
    expect(entries).toHaveLength(2);
    expect(entries[0]).toMatchObject({ key: 'DB_URL', defaultValue: '', required: false });
    expect(entries[1]).toMatchObject({ key: 'PORT', defaultValue: '3000', required: false });
  });

  it('marks keys as required when preceded by # required comment', () => {
    const content = '# required\nSECRET_KEY=';
    const entries = parseTemplate(content);
    expect(entries[0].required).toBe(true);
    expect(entries[0].key).toBe('SECRET_KEY');
  });

  it('attaches comments to entries', () => {
    const content = '# Database connection string\nDB_URL=';
    const entries = parseTemplate(content);
    expect(entries[0].comment).toBe('Database connection string');
  });

  it('ignores blank lines and resets state', () => {
    const content = '# required\n\nSECRET=';
    const entries = parseTemplate(content);
    expect(entries[0].required).toBe(false);
  });
});

describe('validateAgainstTemplate', () => {
  const template = [
    { key: 'DB_URL', defaultValue: '', required: true },
    { key: 'PORT', defaultValue: '3000', required: false },
    { key: 'SECRET', defaultValue: '', required: true },
  ];

  it('returns empty array when all required keys are present', () => {
    const record = { DB_URL: 'postgres://localhost', SECRET: 'abc' };
    expect(validateAgainstTemplate(template, record)).toEqual([]);
  });

  it('returns missing required keys', () => {
    const record = { DB_URL: 'postgres://localhost' };
    const missing = validateAgainstTemplate(template, record);
    expect(missing).toContain('SECRET');
    expect(missing).not.toContain('PORT');
  });
});

describe('writeTemplateFile', () => {
  it('writes a template file to disk', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'envoy-test-'));
    const filePath = path.join(tmpDir, '.env.example');
    writeTemplateFile(filePath, { DB_URL: 'postgres://localhost', PORT: '3000' });
    const content = fs.readFileSync(filePath, 'utf-8');
    expect(content).toContain('DB_URL=');
    expect(content).toContain('PORT=');
    expect(content).not.toContain('postgres://localhost');
    fs.rmSync(tmpDir, { recursive: true });
  });
});
