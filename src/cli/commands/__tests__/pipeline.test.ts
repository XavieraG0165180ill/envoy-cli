import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { Command } from 'commander';

let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'envoy-pipeline-cmd-test-'));
  jest.resetModules();
  jest.doMock('../../../crypto/keyManager', () => ({
    ensureEnvoyDir: () => tmpDir,
  }));
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
  jest.resetAllMocks();
});

async function runCommand(args: string[]): Promise<string> {
  const { createPipelineCommand } = await import('../pipeline');
  const program = new Command();
  program.addCommand(createPipelineCommand());
  const output: string[] = [];
  jest.spyOn(console, 'log').mockImplementation((...a) => output.push(a.join(' ')));
  jest.spyOn(console, 'error').mockImplementation((...a) => output.push(a.join(' ')));
  try {
    await program.parseAsync(['node', 'test', ...args]);
  } catch {
    // ignore exit
  }
  return output.join('\n');
}

test('pipeline add creates a pipeline', async () => {
  const steps = JSON.stringify([{ name: 'build', command: 'npm', args: ['run', 'build'] }]);
  const out = await runCommand(['pipeline', 'add', 'production', '-s', steps]);
  expect(out).toContain('Pipeline created:');
  expect(out).toContain('production');
  expect(out).toContain('build');
});

test('pipeline list shows all pipelines', async () => {
  const steps = JSON.stringify([{ name: 'test', command: 'jest' }]);
  await runCommand(['pipeline', 'add', 'dev', '-s', steps]);
  const out = await runCommand(['pipeline', 'list']);
  expect(out).toContain('dev');
  expect(out).toContain('test');
});

test('pipeline list filters by environment', async () => {
  const steps1 = JSON.stringify([{ name: 'test', command: 'jest' }]);
  const steps2 = JSON.stringify([{ name: 'deploy', command: 'deploy.sh' }]);
  await runCommand(['pipeline', 'add', 'dev', '-s', steps1]);
  await runCommand(['pipeline', 'add', 'prod', '-s', steps2]);
  const out = await runCommand(['pipeline', 'list', 'dev']);
  expect(out).toContain('dev');
  expect(out).not.toContain('prod');
});

test('pipeline remove deletes a pipeline', async () => {
  const steps = JSON.stringify([{ name: 'lint', command: 'eslint' }]);
  const addOut = await runCommand(['pipeline', 'add', 'staging', '-s', steps]);
  const idMatch = addOut.match(/Pipeline created: (\S+)/);
  expect(idMatch).not.toBeNull();
  const id = idMatch![1];
  const removeOut = await runCommand(['pipeline', 'remove', id]);
  expect(removeOut).toContain(`Pipeline ${id} removed`);
});

test('pipeline list shows none when empty', async () => {
  const out = await runCommand(['pipeline', 'list']);
  expect(out).toContain('No pipelines found');
});

test('pipeline add rejects invalid JSON', async () => {
  const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => { throw new Error('exit'); });
  await runCommand(['pipeline', 'add', 'dev', '-s', 'not-json']);
  expect(mockExit).toHaveBeenCalledWith(1);
  mockExit.mockRestore();
});
