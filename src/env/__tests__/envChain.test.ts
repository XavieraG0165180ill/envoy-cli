import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

jest.mock('../../../src/crypto/keyManager', () => ({
  ensureEnvoyDir: () => tmpDir,
}));

let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'envoy-chain-test-'));
  jest.resetModules();
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

import {
  addChain,
  removeChain,
  getChain,
  listChains,
} from '../envChain';

describe('envChain', () => {
  it('should add a chain', () => {
    const chain = addChain('deploy', ['dev', 'staging', 'prod']);
    expect(chain.name).toBe('deploy');
    expect(chain.environments).toEqual(['dev', 'staging', 'prod']);
    expect(chain.createdAt).toBeDefined();
  });

  it('should list chains', () => {
    addChain('deploy', ['dev', 'prod']);
    addChain('test', ['dev', 'test']);
    const chains = listChains();
    expect(chains).toHaveLength(2);
    expect(chains.map(c => c.name)).toContain('deploy');
  });

  it('should throw when adding duplicate chain', () => {
    addChain('deploy', ['dev']);
    expect(() => addChain('deploy', ['prod'])).toThrow('Chain "deploy" already exists.');
  });

  it('should get a chain by name', () => {
    addChain('ci', ['dev', 'ci']);
    const chain = getChain('ci');
    expect(chain).toBeDefined();
    expect(chain!.environments).toEqual(['dev', 'ci']);
  });

  it('should return undefined for missing chain', () => {
    expect(getChain('nonexistent')).toBeUndefined();
  });

  it('should remove a chain', () => {
    addChain('deploy', ['dev', 'prod']);
    const result = removeChain('deploy');
    expect(result).toBe(true);
    expect(listChains()).toHaveLength(0);
  });

  it('should return false when removing nonexistent chain', () => {
    expect(removeChain('ghost')).toBe(false);
  });
});
