import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

jest.mock('../../../src/crypto/keyManager', () => ({
  ensureEnvoyDir: () => tmpDir,
}));

let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'envoy-label-test-'));
  jest.resetModules();
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

import {
  addLabel,
  removeLabel,
  getLabels,
  findByLabel,
  clearLabels,
  loadLabels,
} from '../envLabel';

describe('envLabel', () => {
  it('adds a label to an environment', () => {
    addLabel('production', 'critical');
    expect(getLabels('production')).toContain('critical');
  });

  it('does not add duplicate labels', () => {
    addLabel('production', 'critical');
    addLabel('production', 'critical');
    expect(getLabels('production').filter(l => l === 'critical').length).toBe(1);
  });

  it('removes a label from an environment', () => {
    addLabel('staging', 'test');
    removeLabel('staging', 'test');
    expect(getLabels('staging')).not.toContain('test');
  });

  it('removes environment key when last label removed', () => {
    addLabel('dev', 'local');
    removeLabel('dev', 'local');
    const labels = loadLabels();
    expect(labels['dev']).toBeUndefined();
  });

  it('finds environments by label', () => {
    addLabel('production', 'critical');
    addLabel('staging', 'critical');
    addLabel('dev', 'local');
    const envs = findByLabel('critical');
    expect(envs).toContain('production');
    expect(envs).toContain('staging');
    expect(envs).not.toContain('dev');
  });

  it('clears all labels for an environment', () => {
    addLabel('production', 'a');
    addLabel('production', 'b');
    clearLabels('production');
    expect(getLabels('production')).toEqual([]);
  });

  it('returns empty array for unknown environment', () => {
    expect(getLabels('unknown')).toEqual([]);
  });
});
