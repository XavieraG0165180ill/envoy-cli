import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import {
  loadPlugins,
  savePlugins,
  addPlugin,
  removePlugin,
  togglePlugin,
  getPluginsForHook,
  getPluginFilePath,
} from '../envPlugin';

jest.mock('../../../src/crypto/keyManager', () => ({
  ensureEnvoyDir: () => tmpDir,
}));

let tmpDir: string;
let fakeScript: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'envoy-plugin-test-'));
  fakeScript = path.join(tmpDir, 'hook.sh');
  fs.writeFileSync(fakeScript, '#!/bin/sh\necho hello');
  jest.resetModules();
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe('loadPlugins', () => {
  it('returns empty object when no file exists', () => {
    expect(loadPlugins()).toEqual({});
  });

  it('returns parsed plugins from file', () => {
    const data = { myPlugin: { name: 'myPlugin', description: 'test', hookOn: 'push', scriptPath: fakeScript, enabled: true, createdAt: '2024-01-01T00:00:00.000Z' } };
    fs.writeFileSync(getPluginFilePath(), JSON.stringify(data));
    expect(loadPlugins()).toEqual(data);
  });
});

describe('addPlugin', () => {
  it('adds a new plugin successfully', () => {
    const plugin = addPlugin('deploy', fakeScript, 'push', 'Deploy hook');
    expect(plugin.name).toBe('deploy');
    expect(plugin.hookOn).toBe('push');
    expect(plugin.enabled).toBe(true);
    const plugins = loadPlugins();
    expect(plugins['deploy']).toBeDefined();
  });

  it('throws if plugin already exists', () => {
    addPlugin('deploy', fakeScript, 'push', 'Deploy hook');
    expect(() => addPlugin('deploy', fakeScript, 'pull', 'Another')).toThrow('already exists');
  });

  it('throws if script path does not exist', () => {
    expect(() => addPlugin('bad', '/nonexistent/script.sh', 'any', 'Bad')).toThrow('does not exist');
  });
});

describe('removePlugin', () => {
  it('removes an existing plugin', () => {
    addPlugin('deploy', fakeScript, 'push', 'Deploy hook');
    removePlugin('deploy');
    expect(loadPlugins()['deploy']).toBeUndefined();
  });

  it('throws if plugin not found', () => {
    expect(() => removePlugin('ghost')).toThrow('not found');
  });
});

describe('togglePlugin', () => {
  it('disables a plugin', () => {
    addPlugin('deploy', fakeScript, 'push', 'Deploy hook');
    const updated = togglePlugin('deploy', false);
    expect(updated.enabled).toBe(false);
  });

  it('throws if plugin not found', () => {
    expect(() => togglePlugin('ghost', true)).toThrow('not found');
  });
});

describe('getPluginsForHook', () => {
  it('returns plugins matching the hook or "any"', () => {
    addPlugin('onPush', fakeScript, 'push', 'Push hook');
    const script2 = path.join(tmpDir, 'hook2.sh');
    fs.writeFileSync(script2, '#!/bin/sh');
    addPlugin('onAny', script2, 'any', 'Any hook');
    const results = getPluginsForHook('push');
    expect(results.map((p) => p.name)).toContain('onPush');
    expect(results.map((p) => p.name)).toContain('onAny');
  });

  it('excludes disabled plugins', () => {
    addPlugin('onPush', fakeScript, 'push', 'Push hook');
    togglePlugin('onPush', false);
    expect(getPluginsForHook('push')).toHaveLength(0);
  });
});
