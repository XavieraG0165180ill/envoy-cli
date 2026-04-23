import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import {
  getMetricsFilePath,
  loadMetrics,
  saveMetrics,
  recordMetrics,
  getMetricsForEnvironment,
  clearMetrics,
} from '../envMetrics';

jest.mock('../../crypto/keyManager', () => ({
  ensureEnvoyDir: () => tmpDir,
}));

let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'envoy-metrics-test-'));
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe('envMetrics', () => {
  it('returns empty store when no file exists', () => {
    expect(loadMetrics()).toEqual({});
  });

  it('saves and loads metrics', () => {
    const store = {
      production: {
        environment: 'production',
        keyCount: 5,
        emptyValues: 1,
        totalBytes: 120,
        lastUpdated: new Date().toISOString(),
        changeFrequency: 0.1,
      },
    };
    saveMetrics(store);
    expect(loadMetrics()).toEqual(store);
  });

  it('records metrics for an environment', () => {
    const envMap = new Map([
      ['KEY1', 'value1'],
      ['KEY2', ''],
      ['KEY3', 'value3'],
    ]);
    const history = [
      { timestamp: new Date().toISOString() },
      { timestamp: new Date().toISOString() },
    ];
    const result = recordMetrics('staging', envMap, history);
    expect(result.environment).toBe('staging');
    expect(result.keyCount).toBe(3);
    expect(result.emptyValues).toBe(1);
    expect(result.totalBytes).toBeGreaterThan(0);
    expect(result.changeFrequency).toBeGreaterThanOrEqual(0);
  });

  it('returns null for unknown environment', () => {
    expect(getMetricsForEnvironment('unknown')).toBeNull();
  });

  it('retrieves metrics for a known environment', () => {
    const envMap = new Map([['API_KEY', 'secret']]);
    recordMetrics('dev', envMap, []);
    const m = getMetricsForEnvironment('dev');
    expect(m).not.toBeNull();
    expect(m!.keyCount).toBe(1);
  });

  it('clears metrics for a specific environment', () => {
    const envMap = new Map([['FOO', 'bar']]);
    recordMetrics('test', envMap, []);
    clearMetrics('test');
    expect(getMetricsForEnvironment('test')).toBeNull();
  });

  it('returns valid metrics file path', () => {
    const p = getMetricsFilePath();
    expect(p).toContain('metrics.json');
  });
});
