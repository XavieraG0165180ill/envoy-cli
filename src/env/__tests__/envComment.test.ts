import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

const mockEnvoyDir = path.join(os.tmpdir(), '.envoy-test-comment-' + Date.now());

jest.mock('../../crypto/keyManager', () => ({
  ensureEnvoyDir: () => {
    if (!fs.existsSync(mockEnvoyDir)) fs.mkdirSync(mockEnvoyDir, { recursive: true });
    return mockEnvoyDir;
  },
}));

import {
  loadComments,
  setComment,
  removeComment,
  getComment,
  getCommentsForEnvironment,
  clearCommentsForEnvironment,
} from '../envComment';

describe('envComment', () => {
  beforeEach(() => {
    const commentFile = path.join(mockEnvoyDir, 'comments.json');
    if (fs.existsSync(commentFile)) fs.unlinkSync(commentFile);
  });

  afterAll(() => {
    fs.rmSync(mockEnvoyDir, { recursive: true, force: true });
  });

  it('returns empty object when no comments file exists', () => {
    expect(loadComments()).toEqual({});
  });

  it('sets and retrieves a comment', () => {
    setComment('production', 'API_KEY', 'Main API key for external service');
    expect(getComment('production', 'API_KEY')).toBe('Main API key for external service');
  });

  it('overwrites an existing comment', () => {
    setComment('production', 'API_KEY', 'Old comment');
    setComment('production', 'API_KEY', 'New comment');
    expect(getComment('production', 'API_KEY')).toBe('New comment');
  });

  it('returns undefined for missing comment', () => {
    expect(getComment('staging', 'MISSING_KEY')).toBeUndefined();
  });

  it('removes a comment and returns true', () => {
    setComment('staging', 'DB_URL', 'Database connection string');
    const result = removeComment('staging', 'DB_URL');
    expect(result).toBe(true);
    expect(getComment('staging', 'DB_URL')).toBeUndefined();
  });

  it('returns false when removing non-existent comment', () => {
    expect(removeComment('staging', 'NONEXISTENT')).toBe(false);
  });

  it('cleans up empty environment after removing last comment', () => {
    setComment('dev', 'ONLY_KEY', 'Only comment');
    removeComment('dev', 'ONLY_KEY');
    const comments = loadComments();
    expect(comments['dev']).toBeUndefined();
  });

  it('gets all comments for an environment', () => {
    setComment('production', 'KEY_A', 'Comment A');
    setComment('production', 'KEY_B', 'Comment B');
    const envComments = getCommentsForEnvironment('production');
    expect(envComments).toEqual({ KEY_A: 'Comment A', KEY_B: 'Comment B' });
  });

  it('returns empty object for environment with no comments', () => {
    expect(getCommentsForEnvironment('unknown')).toEqual({});
  });

  it('clears all comments for an environment', () => {
    setComment('staging', 'FOO', 'foo comment');
    setComment('staging', 'BAR', 'bar comment');
    clearCommentsForEnvironment('staging');
    expect(getCommentsForEnvironment('staging')).toEqual({});
  });
});
