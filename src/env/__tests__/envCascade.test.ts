import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import {
  getCascadeFilePath,
  loadCascadeConfig,
  saveCascadeConfig,
  removeCascadeConfig,
  resolveCascade,
  CascadeConfig,
} from '../envCascade';
import { getStorePath } from '../envStore';

let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'envoy-cascade-'));
  fs.mkdirSync(path.join(tmpDir, '.envoy'), { recursive: true });
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test('getCascadeFilePath returns correct path', () => {
  expect(getCascadeFilePath(tmpDir)).toBe(path.join(tmpDir, '.envoy', 'cascade.json'));
});

test('loadCascadeConfig returns null when file missing', () => {
  expect(loadCascadeConfig(tmpDir)).toBeNull();
});

test('saveCascadeConfig and loadCascadeConfig round-trip', () => {
  const config: CascadeConfig = { environments: ['base', 'staging'], strategy: 'merge' };
  saveCascadeConfig(tmpDir, config);
  const loaded = loadCascadeConfig(tmpDir);
  expect(loaded).toEqual(config);
});

test('removeCascadeConfig deletes the file', () => {
  const config: CascadeConfig = { environments: ['base'], strategy: 'override' };
  saveCascadeConfig(tmpDir, config);
  removeCascadeConfig(tmpDir);
  expect(loadCascadeConfig(tmpDir)).toBeNull();
});

test('resolveCascade merges environments in order', () => {
  const storeDir = path.join(tmpDir, '.envoy', 'store');
  fs.mkdirSync(storeDir, { recursive: true });

  fs.writeFileSync(getStorePath(tmpDir, 'base'), 'KEY1=base\nKEY2=base2\n');
  fs.writeFileSync(getStorePath(tmpDir, 'staging'), 'KEY2=staging2\nKEY3=staging3\n');
  fs.writeFileSync(getStorePath(tmpDir, 'prod'), 'KEY3=prod3\nKEY4=prod4\n');

  const config: CascadeConfig = { environments: ['base', 'staging'], strategy: 'override' };
  const result = resolveCascade(tmpDir, 'prod', config);

  expect(result.get('KEY1')).toBe('base');
  expect(result.get('KEY2')).toBe('staging2');
  expect(result.get('KEY3')).toBe('prod3');
  expect(result.get('KEY4')).toBe('prod4');
});

test('resolveCascade merge strategy keeps first value', () => {
  const storeDir = path.join(tmpDir, '.envoy', 'store');
  fs.mkdirSync(storeDir, { recursive: true });

  fs.writeFileSync(getStorePath(tmpDir, 'base'), 'KEY=base\n');
  fs.writeFileSync(getStorePath(tmpDir, 'prod'), 'KEY=prod\n');

  const config: CascadeConfig = { environments: ['base'], strategy: 'merge' };
  const result = resolveCascade(tmpDir, 'prod', config);

  expect(result.get('KEY')).toBe('base');
});
