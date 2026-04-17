import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

let tmpDir: string;

jest.mock('../../crypto/keyManager', () => ({
  ensureEnvoyDir: () => tmpDir,
}));

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'envoy-version-int-'));
  jest.resetModules();
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test('full version lifecycle', async () => {
  const {
    addVersion, loadVersions, removeVersion,
    getVersionsForEnvironment, generateChecksum,
  } = await import('../envVersion');

  const content = 'DB_URL=postgres://localhost/test\nSECRET=abc';
  const checksum = generateChecksum(content);

  addVersion({ id: 'a1', environment: 'dev', timestamp: new Date().toISOString(), checksum });
  addVersion({ id: 'a2', environment: 'dev', timestamp: new Date().toISOString(), checksum, message: 'v2' });
  addVersion({ id: 'b1', environment: 'prod', timestamp: new Date().toISOString(), checksum });

  expect(loadVersions()).toHaveLength(3);
  expect(getVersionsForEnvironment('dev')).toHaveLength(2);
  expect(getVersionsForEnvironment('prod')).toHaveLength(1);

  removeVersion('a1');
  expect(getVersionsForEnvironment('dev')).toHaveLength(1);
  expect(getVersionsForEnvironment('dev')[0].id).toBe('a2');
});
