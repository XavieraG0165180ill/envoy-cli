import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import {
  loadConditions,
  saveConditions,
  addCondition,
  removeCondition,
  getConditionsForEnvironment,
  evaluateCondition,
  Condition,
} from '../envCondition';

jest.mock('../../crypto/keyManager', () => ({
  ensureEnvoyDir: () => tmpDir,
}));

let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'envoy-condition-test-'));
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe('loadConditions', () => {
  it('returns empty array when file does not exist', () => {
    expect(loadConditions()).toEqual([]);
  });

  it('loads conditions from file', () => {
    const conditions: Condition[] = [
      { id: 'c1', environment: 'production', key: 'API_KEY', operator: 'exists', action: 'require', createdAt: '2024-01-01T00:00:00.000Z' },
    ];
    saveConditions(conditions);
    expect(loadConditions()).toEqual(conditions);
  });
});

describe('addCondition', () => {
  it('adds a new condition with generated id', () => {
    const cond = addCondition({ environment: 'staging', key: 'DB_URL', operator: 'exists', action: 'warn' });
    expect(cond.id).toMatch(/^cond_/);
    expect(cond.environment).toBe('staging');
    expect(loadConditions()).toHaveLength(1);
  });
});

describe('removeCondition', () => {
  it('removes an existing condition', () => {
    const cond = addCondition({ environment: 'dev', key: 'SECRET', operator: 'exists', action: 'require' });
    expect(removeCondition(cond.id)).toBe(true);
    expect(loadConditions()).toHaveLength(0);
  });

  it('returns false for non-existent id', () => {
    expect(removeCondition('nonexistent')).toBe(false);
  });
});

describe('getConditionsForEnvironment', () => {
  it('filters conditions by environment', () => {
    addCondition({ environment: 'production', key: 'KEY1', operator: 'exists', action: 'require' });
    addCondition({ environment: 'staging', key: 'KEY2', operator: 'exists', action: 'warn' });
    const prod = getConditionsForEnvironment('production');
    expect(prod).toHaveLength(1);
    expect(prod[0].environment).toBe('production');
  });
});

describe('evaluateCondition', () => {
  const makeMap = (entries: Record<string, string>) => new Map(Object.entries(entries));

  it('passes exists check when key is present', () => {
    const cond: Condition = { id: 'c1', environment: 'prod', key: 'API_KEY', operator: 'exists', action: 'require', createdAt: '' };
    expect(evaluateCondition(cond, makeMap({ API_KEY: 'abc' })).passed).toBe(true);
  });

  it('fails exists check when key is missing', () => {
    const cond: Condition = { id: 'c1', environment: 'prod', key: 'API_KEY', operator: 'exists', action: 'require', createdAt: '' };
    expect(evaluateCondition(cond, makeMap({})).passed).toBe(false);
  });

  it('evaluates eq operator', () => {
    const cond: Condition = { id: 'c2', environment: 'prod', key: 'ENV', operator: 'eq', value: 'production', action: 'require', createdAt: '' };
    expect(evaluateCondition(cond, makeMap({ ENV: 'production' })).passed).toBe(true);
    expect(evaluateCondition(cond, makeMap({ ENV: 'staging' })).passed).toBe(false);
  });

  it('evaluates matches operator', () => {
    const cond: Condition = { id: 'c3', environment: 'prod', key: 'PORT', operator: 'matches', value: '^\\d+$', action: 'warn', createdAt: '' };
    expect(evaluateCondition(cond, makeMap({ PORT: '3000' })).passed).toBe(true);
    expect(evaluateCondition(cond, makeMap({ PORT: 'abc' })).passed).toBe(false);
  });

  it('returns custom message when provided', () => {
    const cond: Condition = { id: 'c4', environment: 'prod', key: 'X', operator: 'exists', action: 'require', message: 'X must exist', createdAt: '' };
    expect(evaluateCondition(cond, makeMap({})).message).toBe('X must exist');
  });
});
