import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import {
  getAccessFilePath,
  loadAccess,
  saveAccess,
  grantAccess,
  revokeAccess,
  listAccess,
  hasAccess,
} from '../envAccess';

jest.mock('../../crypto/keyManager', () => ({
  ensureEnvoyDir: () => tmpDir,
}));

let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'envoy-access-test-'));
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe('loadAccess', () => {
  it('returns empty object when file does not exist', () => {
    expect(loadAccess()).toEqual({});
  });

  it('returns parsed access map when file exists', () => {
    const data = { production: { environment: 'production', allowedUsers: ['alice'], createdAt: '', updatedAt: '' } };
    fs.writeFileSync(getAccessFilePath(), JSON.stringify(data));
    expect(loadAccess()).toEqual(data);
  });

  it('returns empty object on malformed JSON', () => {
    fs.writeFileSync(getAccessFilePath(), 'not-json');
    expect(loadAccess()).toEqual({});
  });
});

describe('grantAccess', () => {
  it('creates a new entry and grants access to a user', () => {
    const entry = grantAccess('staging', 'bob');
    expect(entry.allowedUsers).toContain('bob');
    expect(entry.environment).toBe('staging');
  });

  it('does not duplicate user if already granted', () => {
    grantAccess('staging', 'bob');
    const entry = grantAccess('staging', 'bob');
    expect(entry.allowedUsers.filter((u) => u === 'bob').length).toBe(1);
  });

  it('adds multiple users to the same environment', () => {
    grantAccess('staging', 'alice');
    const entry = grantAccess('staging', 'bob');
    expect(entry.allowedUsers).toContain('alice');
    expect(entry.allowedUsers).toContain('bob');
  });
});

describe('revokeAccess', () => {
  it('removes a user from an environment', () => {
    grantAccess('production', 'alice');
    const result = revokeAccess('production', 'alice');
    expect(result).toBe(true);
    expect(listAccess('production')).not.toContain('alice');
  });

  it('returns false if environment does not exist', () => {
    expect(revokeAccess('nonexistent', 'alice')).toBe(false);
  });

  it('returns false if user is not in the list', () => {
    grantAccess('production', 'alice');
    expect(revokeAccess('production', 'charlie')).toBe(false);
  });
});

describe('hasAccess', () => {
  it('returns true if user has access', () => {
    grantAccess('dev', 'alice');
    expect(hasAccess('dev', 'alice')).toBe(true);
  });

  it('returns false if user does not have access', () => {
    expect(hasAccess('dev', 'unknown')).toBe(false);
  });
});
