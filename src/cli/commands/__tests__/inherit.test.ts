import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { Command } from 'commander';

let tmpDir: string;

jest.mock('../../../env/envStore', () => ({
  getStorePath: () => tmpDir,
}));

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'envoy-inherit-cmd-'));
  jest.resetModules();
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

import { createInheritCommand } from '../inherit';

async function runCommand(args: string[]): Promise<string> {
  const logs: string[] = [];
  const spy = jest.spyOn(console, 'log').mockImplementation((msg) => logs.push(msg));
  const program = new Command();
  program.addCommand(createInheritCommand());
  await program.parseAsync(['node', 'envoy', 'inherit', ...args]);
  spy.mockRestore();
  return logs.join('\n');
}

describe('inherit command', () => {
  test('set and show parents', async () => {
    await runCommand(['set', 'staging', 'base', 'defaults']);
    const out = await runCommand(['show', 'staging']);
    expect(out).toContain('base');
    expect(out).toContain('defaults');
  });

  test('show with no parents', async () => {
    const out = await runCommand(['show', 'orphan']);
    expect(out).toContain('no parent');
  });

  test('remove inheritance', async () => {
    await runCommand(['set', 'staging', 'base']);
    await runCommand(['remove', 'staging']);
    const out = await runCommand(['show', 'staging']);
    expect(out).toContain('no parent');
  });

  test('ancestors shows chain', async () => {
    await runCommand(['set', 'prod', 'staging']);
    await runCommand(['set', 'staging', 'base']);
    const out = await runCommand(['ancestors', 'prod']);
    expect(out).toContain('staging');
    expect(out).toContain('base');
  });

  test('ancestors with no chain', async () => {
    const out = await runCommand(['ancestors', 'solo']);
    expect(out).toContain('no ancestors');
  });

  test('list shows all configured chains', async () => {
    await runCommand(['set', 'staging', 'base']);
    await runCommand(['set', 'prod', 'staging']);
    const out = await runCommand(['list']);
    expect(out).toContain('staging');
    expect(out).toContain('prod');
  });

  test('list with no chains', async () => {
    const out = await runCommand(['list']);
    expect(out).toContain('No inheritance');
  });
});
