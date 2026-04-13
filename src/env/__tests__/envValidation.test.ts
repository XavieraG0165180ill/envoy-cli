import {
  validateEnv,
  detectEmptyValues,
  detectDuplicateKeys,
  ValidationRule,
} from '../envValidation';
import { EnvRecord } from '../envParser';

describe('validateEnv', () => {
  const rules: ValidationRule[] = [
    { key: 'DATABASE_URL', required: true },
    { key: 'PORT', required: true, pattern: /^\d+$/ },
    { key: 'SECRET_KEY', required: true, minLength: 16 },
    { key: 'APP_NAME', maxLength: 20 },
  ];

  it('passes when all required keys are present and valid', () => {
    const env: EnvRecord = {
      DATABASE_URL: 'postgres://localhost/db',
      PORT: '5432',
      SECRET_KEY: 'supersecretkey1234',
    };
    const result = validateEnv(env, rules);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('reports missing required keys', () => {
    const env: EnvRecord = { PORT: '3000', SECRET_KEY: 'supersecretkey1234' };
    const result = validateEnv(env, rules);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Missing required key: DATABASE_URL');
  });

  it('reports pattern mismatch', () => {
    const env: EnvRecord = {
      DATABASE_URL: 'postgres://localhost/db',
      PORT: 'not-a-number',
      SECRET_KEY: 'supersecretkey1234',
    };
    const result = validateEnv(env, rules);
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toMatch(/PORT/);
  });

  it('reports minLength violation', () => {
    const env: EnvRecord = {
      DATABASE_URL: 'postgres://localhost/db',
      PORT: '3000',
      SECRET_KEY: 'short',
    };
    const result = validateEnv(env, rules);
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toMatch(/SECRET_KEY/);
  });

  it('adds warning for maxLength violation', () => {
    const env: EnvRecord = {
      DATABASE_URL: 'postgres://localhost/db',
      PORT: '3000',
      SECRET_KEY: 'supersecretkey1234',
      APP_NAME: 'this-app-name-is-way-too-long',
    };
    const result = validateEnv(env, rules);
    expect(result.valid).toBe(true);
    expect(result.warnings.length).toBeGreaterThan(0);
  });
});

describe('detectEmptyValues', () => {
  it('returns keys with empty string values', () => {
    const env: EnvRecord = { A: 'hello', B: '', C: '' };
    expect(detectEmptyValues(env)).toEqual(['B', 'C']);
  });

  it('returns empty array when no empty values', () => {
    const env: EnvRecord = { A: 'x', B: 'y' };
    expect(detectEmptyValues(env)).toHaveLength(0);
  });
});

describe('detectDuplicateKeys', () => {
  it('detects duplicate keys in raw content', () => {
    const content = 'FOO=bar\nBAZ=qux\nFOO=override';
    expect(detectDuplicateKeys(content)).toContain('FOO');
  });

  it('ignores comments and blank lines', () => {
    const content = '# comment\nA=1\nB=2';
    expect(detectDuplicateKeys(content)).toHaveLength(0);
  });
});
