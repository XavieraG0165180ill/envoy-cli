import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

let tmpDir: string;

jest.mock('../../../src/crypto/keyManager', () => ({
  ensureEnvoyDir: () => tmpDir,
}));

import {
  loadHooks,
  addHook,
  removeHook,
  toggleHook,
  getHooksForEvent,
} from '../envHook';

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'envoy-hook-'));
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe('loadHooks', () => {
  it('returns empty object when no file exists', () => {
    expect(loadHooks()).toEqual({});
  });
});

describe('addHook', () => {
  it('adds a new hook and persists it', () => {
    const hook = addHook('pre-push', 'production', 'npm test');
    expect(hook.event).toBe('pre-push');
    expect(hook.environment).toBe('production');
    expect(hook.command).toBe('npm test');
    expect(hook.enabled).toBe(true);
    const hooks = loadHooks();
    expect(hooks[hook.id]).toBeDefined();
  });

  it('assigns unique ids for multiple hooks', () => {
    const h1 = addHook('post-push', 'staging', 'echo done');
    const h2 = addHook('post-push', 'staging', 'echo also done');
    expect(h1.id).not.toBe(h2.id);
  });
});

describe('removeHook', () => {
  it('removes an existing hook', () => {
    const hook = addHook('pre-pull', 'dev', 'echo pre');
    expect(removeHook(hook.id)).toBe(true);
    expect(loadHooks()[hook.id]).toBeUndefined();
  });

  it('returns false for unknown id', () => {
    expect(removeHook('nonexistent')).toBe(false);
  });
});

describe('toggleHook', () => {
  it('disables an enabled hook', () => {
    const hook = addHook('post-pull', 'production', 'echo done');
    expect(toggleHook(hook.id, false)).toBe(true);
    expect(loadHooks()[hook.id].enabled).toBe(false);
  });

  it('returns false for unknown id', () => {
    expect(toggleHook('ghost', true)).toBe(false);
  });
});

describe('getHooksForEvent', () => {
  it('returns only enabled hooks matching event and environment', () => {
    addHook('pre-push', 'production', 'cmd1');
    const h2 = addHook('pre-push', 'production', 'cmd2');
    toggleHook(h2.id, false);
    addHook('post-push', 'production', 'cmd3');
    const results = getHooksForEvent('pre-push', 'production');
    expect(results).toHaveLength(1);
    expect(results[0].command).toBe('cmd1');
  });
});
