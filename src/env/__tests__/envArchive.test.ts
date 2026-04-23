import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

let tmpDir: string;

jest.mock('../../../src/crypto/keyManager', () => ({
  ensureEnvoyDir: () => tmpDir,
}));

import {
  loadArchives,
  saveArchives,
  archiveEnvironment,
  restoreArchive,
  deleteArchive,
  listArchives,
} from '../envArchive';

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'envoy-archive-test-'));
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe('loadArchives', () => {
  it('returns empty object when no file exists', () => {
    expect(loadArchives()).toEqual({});
  });

  it('returns parsed archives from file', () => {
    const data = { production: { environment: 'production', archivedAt: '2024-01-01T00:00:00.000Z', snapshot: { KEY: 'val' } } };
    fs.writeFileSync(path.join(tmpDir, 'archives.json'), JSON.stringify(data));
    expect(loadArchives()).toEqual(data);
  });
});

describe('archiveEnvironment', () => {
  it('creates an archive entry for the environment', () => {
    const snapshot = { DB_URL: 'postgres://localhost/prod' };
    const entry = archiveEnvironment('production', snapshot, 'decommissioned');
    expect(entry.environment).toBe('production');
    expect(entry.snapshot).toEqual(snapshot);
    expect(entry.reason).toBe('decommissioned');
    expect(entry.archivedAt).toBeTruthy();
  });

  it('overwrites existing archive for same environment', () => {
    archiveEnvironment('staging', { A: '1' });
    const updated = archiveEnvironment('staging', { A: '2' });
    expect(updated.snapshot).toEqual({ A: '2' });
    expect(listArchives().filter(e => e.environment === 'staging')).toHaveLength(1);
  });
});

describe('restoreArchive', () => {
  it('returns null for non-existent archive', () => {
    expect(restoreArchive('ghost')).toBeNull();
  });

  it('returns the archived entry', () => {
    archiveEnvironment('dev', { FOO: 'bar' });
    const entry = restoreArchive('dev');
    expect(entry).not.toBeNull();
    expect(entry?.snapshot).toEqual({ FOO: 'bar' });
  });
});

describe('deleteArchive', () => {
  it('returns false when archive does not exist', () => {
    expect(deleteArchive('nonexistent')).toBe(false);
  });

  it('removes the archive and returns true', () => {
    archiveEnvironment('qa', { X: 'y' });
    expect(deleteArchive('qa')).toBe(true);
    expect(restoreArchive('qa')).toBeNull();
  });
});

describe('listArchives', () => {
  it('returns archives sorted by archivedAt descending', () => {
    archiveEnvironment('env-a', {});
    archiveEnvironment('env-b', {});
    const list = listArchives();
    expect(list.length).toBeGreaterThanOrEqual(2);
    expect(new Date(list[0].archivedAt).getTime()).toBeGreaterThanOrEqual(
      new Date(list[1].archivedAt).getTime()
    );
  });
});
