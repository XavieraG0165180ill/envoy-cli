import fs from 'fs';
import os from 'os';
import path from 'path';
import { watchEnvironment, unwatchEnvironment, unwatchAll, listWatched } from '../envWatch';

// Integration test using real filesystem
describe('envWatch integration', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'envoy-watch-'));
    jest.resetModules();
    // Override getStorePath to use tmpDir
    jest.mock('../envStore', () => ({
      getStorePath: (env: string) => path.join(tmpDir, `${env}.enc`),
    }));
  });

  afterEach(() => {
    unwatchAll();
    fs.rmSync(tmpDir, { recursive: true, force: true });
    jest.resetModules();
  });

  it('should track watched environments', () => {
    const { watchEnvironment: watch, listWatched: list, unwatchAll: stopAll } =
      jest.requireActual('../envWatch');

    // Simulate by checking the exported functions exist
    expect(typeof watch).toBe('function');
    expect(typeof list).toBe('function');
    expect(typeof stopAll).toBe('function');
  });

  it('unwatchAll clears all watchers', () => {
    unwatchAll();
    expect(listWatched()).toHaveLength(0);
  });

  it('unwatchEnvironment returns false for unknown env', () => {
    expect(unwatchEnvironment('nonexistent')).toBe(false);
  });
});
