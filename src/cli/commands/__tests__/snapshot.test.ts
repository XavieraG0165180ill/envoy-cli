import { createSnapshotCommand } from '../snapshot';
import * as envSnapshot from '../../../env/envSnapshot';
import * as envSync from '../../../env/envSync';
import * as envParser from '../../../env/envParser';

jest.mock('../../../env/envSnapshot');
jest.mock('../../../env/envSync');
jest.mock('../../../env/envParser');

const mockSave = envSnapshot.saveSnapshot as jest.Mock;
const mockLoad = envSnapshot.loadSnapshots as jest.Mock;
const mockDelete = envSnapshot.deleteSnapshot as jest.Mock;
const mockGetById = envSnapshot.getSnapshotById as jest.Mock;
const mockClear = envSnapshot.clearSnapshots as jest.Mock;
const mockLoadEnv = envSync.loadEnv as jest.Mock;
const mockSerialize = envParser.serializeEnv as jest.Mock;

const sampleData = { API_KEY: 'abc' };
const sampleSnap = { id: 'snap1', environment: 'prod', timestamp: '2024-01-01T00:00:00Z', data: sampleData };

beforeEach(() => jest.clearAllMocks());

async function runCommand(args: string[]): Promise<string> {
  const cmd = createSnapshotCommand();
  const logs: string[] = [];
  jest.spyOn(console, 'log').mockImplementation((...a) => logs.push(a.join(' ')));
  jest.spyOn(console, 'error').mockImplementation(() => {});
  await cmd.parseAsync(['node', 'snapshot', ...args]);
  return logs.join('\n');
}

test('save prints snapshot id', async () => {
  mockLoadEnv.mockResolvedValue(sampleData);
  mockSave.mockReturnValue(sampleSnap);
  const out = await runCommand(['save', 'prod', '--label', 'v1']);
  expect(out).toContain('snap1');
  expect(mockSave).toHaveBeenCalledWith('prod', sampleData, 'v1');
});

test('list prints snapshots', async () => {
  mockLoad.mockReturnValue([sampleSnap]);
  const out = await runCommand(['list', 'prod']);
  expect(out).toContain('snap1');
});

test('list prints message when empty', async () => {
  mockLoad.mockReturnValue([]);
  const out = await runCommand(['list', 'prod']);
  expect(out).toContain('No snapshots');
});

test('restore prints serialized env', async () => {
  mockGetById.mockReturnValue(sampleSnap);
  mockSerialize.mockReturnValue('API_KEY=abc');
  const out = await runCommand(['restore', 'prod', 'snap1']);
  expect(out).toContain('API_KEY=abc');
});

test('restore exits on missing snapshot', async () => {
  mockGetById.mockReturnValue(undefined);
  const exitSpy = jest.spyOn(process, 'exit').mockImplementation(() => { throw new Error('exit'); });
  await expect(runCommand(['restore', 'prod', 'missing'])).rejects.toThrow('exit');
  exitSpy.mockRestore();
});

test('delete prints success', async () => {
  mockDelete.mockReturnValue(true);
  const out = await runCommand(['delete', 'prod', 'snap1']);
  expect(out).toContain('deleted');
});

test('clear calls clearSnapshots', async () => {
  mockClear.mockReturnValue(undefined);
  const out = await runCommand(['clear', 'prod']);
  expect(mockClear).toHaveBeenCalledWith('prod');
  expect(out).toContain('cleared');
});
