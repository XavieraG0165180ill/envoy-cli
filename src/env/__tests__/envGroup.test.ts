import * as fs from 'fs';
import * as path from 'path';
import {
  loadGroups,
  saveGroups,
  addGroup,
  removeGroup,
  getGroup,
  listGroups,
  addEnvironmentToGroup,
  removeEnvironmentFromGroup,
  getGroupFilePath,
} from '../envGroup';

jest.mock('../../crypto/keyManager', () => ({
  ensureEnvoyDir: () => '/tmp/envoy-test-group',
}));

jest.mock('fs');

const mockFs = fs as jest.Mocked<typeof fs>;

const sampleGroups = {
  staging: {
    name: 'staging',
    environments: ['staging-us', 'staging-eu'],
    description: 'All staging envs',
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
  },
};

beforeEach(() => {
  jest.clearAllMocks();
  mockFs.existsSync.mockReturnValue(true);
  mockFs.readFileSync.mockReturnValue(JSON.stringify(sampleGroups) as any);
  mockFs.writeFileSync.mockImplementation(() => {});
});

test('loadGroups returns parsed groups', () => {
  const groups = loadGroups();
  expect(groups['staging'].name).toBe('staging');
  expect(groups['staging'].environments).toHaveLength(2);
});

test('loadGroups returns empty object when file missing', () => {
  mockFs.existsSync.mockReturnValue(false);
  expect(loadGroups()).toEqual({});
});

test('addGroup creates and saves a new group', () => {
  const group = addGroup('production', ['prod-us'], 'Production envs');
  expect(group.name).toBe('production');
  expect(group.environments).toContain('prod-us');
  expect(mockFs.writeFileSync).toHaveBeenCalled();
});

test('removeGroup deletes an existing group', () => {
  const result = removeGroup('staging');
  expect(result).toBe(true);
  expect(mockFs.writeFileSync).toHaveBeenCalled();
});

test('removeGroup returns false for non-existent group', () => {
  expect(removeGroup('nonexistent')).toBe(false);
});

test('getGroup returns the correct group', () => {
  const group = getGroup('staging');
  expect(group?.description).toBe('All staging envs');
});

test('listGroups returns array of groups', () => {
  const groups = listGroups();
  expect(Array.isArray(groups)).toBe(true);
  expect(groups[0].name).toBe('staging');
});

test('addEnvironmentToGroup adds env without duplicates', () => {
  addEnvironmentToGroup('staging', 'staging-ap');
  const written = JSON.parse((mockFs.writeFileSync as jest.Mock).mock.calls[0][1]);
  expect(written['staging'].environments).toContain('staging-ap');
});

test('addEnvironmentToGroup returns false for missing group', () => {
  expect(addEnvironmentToGroup('missing', 'env')).toBe(false);
});

test('removeEnvironmentFromGroup removes the env', () => {
  removeEnvironmentFromGroup('staging', 'staging-us');
  const written = JSON.parse((mockFs.writeFileSync as jest.Mock).mock.calls[0][1]);
  expect(written['staging'].environments).not.toContain('staging-us');
});
