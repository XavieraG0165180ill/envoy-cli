import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { Command } from 'commander';
import { createMetricsCommand, formatMetrics } from '../metrics';
import { saveMetrics } from '../../../env/envMetrics';
import { EnvMetrics } from '../../../env/envMetrics';

let tmpDir: string;

jest.mock('../../../crypto/keyManager', () => ({
  ensureEnvoyDir: () => tmpDir,
}));

function runCommand(args: string[]): { stdout: string; exitCode: number } {
  const logs: string[] = [];
  const errors: string[] = [];
  const spy = jest.spyOn(console, 'log').mockImplementation(m => logs.push(m));
  const errSpy = jest.spyOn(console, 'error').mockImplementation(m => errors.push(m));
  const exitSpy = jest.spyOn(process, 'exit').mockImplementation(() => { throw new Error('exit'); });
  const program = new Command();
  program.addCommand(createMetricsCommand());
  try {
    program.parse(['node', 'test', 'metrics', ...args]);
  } catch {}
  spy.mockRestore();
  errSpy.mockRestore();
  exitSpy.mockRestore();
  return { stdout: logs.join('\n'), exitCode: 0 };
}

const sampleMetrics: EnvMetrics = {
  environment: 'production',
  keyCount: 10,
  emptyValues: 2,
  totalBytes: 300,
  lastUpdated: '2024-01-01T00:00:00.000Z',
  changeFrequency: 0.5,
};

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'envoy-metrics-cmd-'));
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe('metrics command', () => {
  it('formatMetrics returns expected output', () => {
    const out = formatMetrics(sampleMetrics);
    expect(out).toContain('production');
    expect(out).toContain('10');
    expect(out).toContain('0.5/day');
  });

  it('show prints no metrics message when empty', () => {
    const { stdout } = runCommand(['show']);
    expect(stdout).toContain('No metrics recorded yet.');
  });

  it('list prints no metrics message when empty', () => {
    const { stdout } = runCommand(['list']);
    expect(stdout).toContain('No metrics recorded yet.');
  });

  it('show lists all environments when store has entries', () => {
    saveMetrics({ production: sampleMetrics });
    const { stdout } = runCommand(['show']);
    expect(stdout).toContain('production');
    expect(stdout).toContain('10');
  });

  it('list shows environment names', () => {
    saveMetrics({ production: sampleMetrics });
    const { stdout } = runCommand(['list']);
    expect(stdout).toContain('production');
  });

  it('clear removes a specific environment', () => {
    saveMetrics({ production: sampleMetrics });
    const { stdout } = runCommand(['clear', 'production']);
    expect(stdout).toContain('Metrics cleared for environment: production');
  });

  it('show for specific environment displays its metrics', () => {
    saveMetrics({ production: sampleMetrics });
    const { stdout } = runCommand(['show', 'production']);
    expect(stdout).toContain('production');
    expect(stdout).toContain('300');
  });
});
