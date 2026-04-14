import * as fs from 'fs';
import * as path from 'path';
import {
  loadSnapshots,
  saveSnapshot,
  deleteSnapshot,
  getSnapshotById,
  clearSnapshots,
} from '../envSnapshot';
import { getStorePath } from '../envStore';

jest.mock('fs');
jest.mock('../envStore', () => ({ getStorePath: () => '/mock/.envoy' }));

const mockFs = fs as jest.Mocked<typeof fs>;

const sampleData = { API_KEY: 'abc', DB_URL: 'postgres://localhost' };

beforeEach(() => jest.clearAllMocks());

test('loadSnapshots returns empty array when file missing', () => {
  mockFs.existsSync.mockReturnValue(false);
  expect(loadSnapshots('production')).toEqual([]);
});

test('loadSnapshots parses existing file', () => {
  mockFs.existsSync.mockReturnValue(true);
  const snap = [{ id: 'abc', environment: 'production', timestamp: 't', data: sampleData }];
  mockFs.readFileSync.mockReturnValue(JSON.stringify(snap) as any);
  expect(loadSnapshots('production')).toHaveLength(1);
});

test('saveSnapshot creates and returns snapshot', () => {
  mockFs.existsSync.mockReturnValue(false);
  mockFs.readFileSync.mockReturnValue('[]' as any);
  mockFs.mkdirSync.mockReturnValue(undefined as any);
  mockFs.writeFileSync.mockReturnValue(undefined);

  const snap = saveSnapshot('staging', sampleData, 'before-deploy');
  expect(snap.environment).toBe('staging');
  expect(snap.label).toBe('before-deploy');
  expect(snap.data).toEqual(sampleData);
  expect(snap.id).toBeTruthy();
});

test('deleteSnapshot removes correct snapshot', () => {
  const snaps = [
    { id: 'id1', environment: 'dev', timestamp: 't', data: {} },
    { id: 'id2', environment: 'dev', timestamp: 't', data: {} },
  ];
  mockFs.existsSync.mockReturnValue(true);
  mockFs.readFileSync.mockReturnValue(JSON.stringify(snaps) as any);
  mockFs.writeFileSync.mockReturnValue(undefined);

  const result = deleteSnapshot('dev', 'id1');
  expect(result).toBe(true);
  const written = JSON.parse((mockFs.writeFileSync.mock.calls[0][1] as string));
  expect(written).toHaveLength(1);
  expect(written[0].id).toBe('id2');
});

test('deleteSnapshot returns false when id not found', () => {
  mockFs.existsSync.mockReturnValue(true);
  mockFs.readFileSync.mockReturnValue('[]' as any);
  expect(deleteSnapshot('dev', 'missing')).toBe(false);
});

test('getSnapshotById returns matching snapshot', () => {
  const snaps = [{ id: 'xyz', environment: 'dev', timestamp: 't', data: sampleData }];
  mockFs.existsSync.mockReturnValue(true);
  mockFs.readFileSync.mockReturnValue(JSON.stringify(snaps) as any);
  const result = getSnapshotById('dev', 'xyz');
  expect(result?.id).toBe('xyz');
});

test('clearSnapshots removes file', () => {
  mockFs.existsSync.mockReturnValue(true);
  mockFs.unlinkSync.mockReturnValue(undefined);
  clearSnapshots('dev');
  expect(mockFs.unlinkSync).toHaveBeenCalled();
});
