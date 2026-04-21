import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'envoy-pipeline-test-'));
  jest.resetModules();
  jest.doMock('../../crypto/keyManager', () => ({
    ensureEnvoyDir: () => tmpDir,
  }));
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
  jest.resetAllMocks();
});

async function getPipeline() {
  return await import('../envPipeline');
}

test('loadPipelines returns empty array when no file', async () => {
  const { loadPipelines } = await getPipeline();
  expect(loadPipelines()).toEqual([]);
});

test('addPipeline creates and persists a pipeline', async () => {
  const { addPipeline, loadPipelines } = await getPipeline();
  const steps = [{ name: 'build', command: 'npm', args: ['run', 'build'] }];
  const pipeline = addPipeline('production', steps);
  expect(pipeline.environment).toBe('production');
  expect(pipeline.steps).toEqual(steps);
  expect(pipeline.id).toContain('production');
  const all = loadPipelines();
  expect(all).toHaveLength(1);
});

test('removePipeline removes an existing pipeline', async () => {
  const { addPipeline, removePipeline, loadPipelines } = await getPipeline();
  const pipeline = addPipeline('staging', [{ name: 'lint', command: 'eslint' }]);
  const removed = removePipeline(pipeline.id);
  expect(removed).toBe(true);
  expect(loadPipelines()).toHaveLength(0);
});

test('removePipeline returns false for unknown id', async () => {
  const { removePipeline } = await getPipeline();
  expect(removePipeline('nonexistent')).toBe(false);
});

test('getPipelinesForEnvironment filters correctly', async () => {
  const { addPipeline, getPipelinesForEnvironment } = await getPipeline();
  addPipeline('dev', [{ name: 'test', command: 'jest' }]);
  addPipeline('prod', [{ name: 'deploy', command: 'deploy.sh' }]);
  const devPipelines = getPipelinesForEnvironment('dev');
  expect(devPipelines).toHaveLength(1);
  expect(devPipelines[0].environment).toBe('dev');
});

test('updatePipeline updates steps and updatedAt', async () => {
  const { addPipeline, updatePipeline } = await getPipeline();
  const pipeline = addPipeline('dev', [{ name: 'test', command: 'jest' }]);
  const newSteps = [{ name: 'build', command: 'tsc' }];
  const updated = updatePipeline(pipeline.id, newSteps);
  expect(updated).not.toBeNull();
  expect(updated!.steps).toEqual(newSteps);
  expect(updated!.updatedAt).not.toBe(pipeline.updatedAt);
});

test('updatePipeline returns null for unknown id', async () => {
  const { updatePipeline } = await getPipeline();
  expect(updatePipeline('unknown', [])).toBeNull();
});
