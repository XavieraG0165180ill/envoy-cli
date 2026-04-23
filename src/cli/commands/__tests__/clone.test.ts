import * as fs from 'fs';
import * as path from 'path';
import { Command } from 'commander';
import { createCloneCommand } from '../clone';
import * as envClone from '../../../env/envClone';

jest.mock('../../../env/envClone');

const mockedClone = envClone.cloneEnvironment as jest.MockedFunction<typeof envClone.cloneEnvironment>;
const mockedList = envClone.listCloneable as jest.MockedFunction<typeof envClone.listCloneable>;

function runCommand(args: string[]): Promise<void> {
  const program = new Command();
  program.addCommand(createCloneCommand());
  return program.parseAsync(['node', 'envoy', 'clone', ...args]);
}

describe('clone command', () => {
  beforeEach(() => jest.clearAllMocks());

  it('clones an environment successfully', async () => {
    mockedClone.mockResolvedValue({ source: 'dev', destination: 'staging', keysCloned: 5, historyCloned: false });
    const spy = jest.spyOn(console, 'log').mockImplementation();

    await runCommand(['dev', 'staging']);

    expect(mockedClone).toHaveBeenCalledWith('dev', 'staging', { overwrite: false, includeHistory: false });
    expect(spy).toHaveBeenCalledWith(expect.stringContaining("Cloned 'dev' → 'staging' (5 keys)"));
    spy.mockRestore();
  });

  it('passes --overwrite and --include-history flags', async () => {
    mockedClone.mockResolvedValue({ source: 'dev', destination: 'prod', keysCloned: 3, historyCloned: true });
    const spy = jest.spyOn(console, 'log').mockImplementation();

    await runCommand(['dev', 'prod', '--overwrite', '--include-history']);

    expect(mockedClone).toHaveBeenCalledWith('dev', 'prod', { overwrite: true, includeHistory: true });
    expect(spy).toHaveBeenCalledWith(expect.stringContaining('History cloned'));
    spy.mockRestore();
  });

  it('prints error and exits on failure', async () => {
    mockedClone.mockRejectedValue(new Error("Source environment 'missing' does not exist."));
    const errSpy = jest.spyOn(console, 'error').mockImplementation();
    const exitSpy = jest.spyOn(process, 'exit').mockImplementation(() => { throw new Error('exit'); });

    await expect(runCommand(['missing', 'new'])).rejects.toThrow('exit');
    expect(errSpy).toHaveBeenCalledWith(expect.stringContaining("Source environment 'missing' does not exist."));
    errSpy.mockRestore();
    exitSpy.mockRestore();
  });

  it('lists available environments with --list', async () => {
    mockedList.mockResolvedValue(['dev', 'prod', 'staging']);
    const spy = jest.spyOn(console, 'log').mockImplementation();

    await runCommand(['__unused__', '__unused2__', '--list']);

    expect(mockedList).toHaveBeenCalled();
    expect(spy).toHaveBeenCalledWith(expect.stringContaining('dev'));
    spy.mockRestore();
  });
});
