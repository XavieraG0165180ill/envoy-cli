import { Command } from 'commander';
import { createDependencyCommand } from '../dependency';

const mockAdd = jest.fn();
const mockRemove = jest.fn();
const mockLoad = jest.fn();
const mockGetDependents = jest.fn();
const mockResolveOrder = jest.fn();

jest.mock('../../../env/envDependency', () => ({
  addDependency: (...args: unknown[]) => mockAdd(...args),
  removeDependency: (...args: unknown[]) => mockRemove(...args),
  loadDependencies: () => mockLoad(),
  getDependentsOf: (...args: unknown[]) => mockGetDependents(...args),
  resolveDependencyOrder: (...args: unknown[]) => mockResolveOrder(...args),
}));

async function runCommand(args: string[]) {
  const program = new Command();
  program.addCommand(createDependencyCommand());
  await program.parseAsync(['node', 'test', 'dependency', ...args]);
}

beforeEach(() => jest.clearAllMocks());

describe('dependency command', () => {
  it('add subcommand calls addDependency', async () => {
    mockAdd.mockReturnValue({});
    await runCommand(['add', 'DATABASE_URL', 'DB_HOST', 'DB_PORT']);
    expect(mockAdd).toHaveBeenCalledWith('DATABASE_URL', ['DB_HOST', 'DB_PORT'], undefined);
  });

  it('add subcommand passes description option', async () => {
    mockAdd.mockReturnValue({});
    await runCommand(['add', 'API_URL', 'API_HOST', '--description', 'API base URL']);
    expect(mockAdd).toHaveBeenCalledWith('API_URL', ['API_HOST'], 'API base URL');
  });

  it('remove subcommand calls removeDependency and logs success', async () => {
    mockRemove.mockReturnValue(true);
    const spy = jest.spyOn(console, 'log').mockImplementation();
    await runCommand(['remove', 'DATABASE_URL']);
    expect(mockRemove).toHaveBeenCalledWith('DATABASE_URL');
    expect(spy).toHaveBeenCalledWith(expect.stringContaining('DATABASE_URL'));
    spy.mockRestore();
  });

  it('remove subcommand exits with error when key not found', async () => {
    mockRemove.mockReturnValue(false);
    const exitSpy = jest.spyOn(process, 'exit').mockImplementation(() => { throw new Error('exit'); });
    await expect(runCommand(['remove', 'MISSING'])).rejects.toThrow('exit');
    exitSpy.mockRestore();
  });

  it('list subcommand prints dependencies', async () => {
    mockLoad.mockReturnValue({
      DB_URL: { key: 'DB_URL', dependsOn: ['DB_HOST'], description: 'db' },
    });
    const spy = jest.spyOn(console, 'log').mockImplementation();
    await runCommand(['list']);
    expect(spy).toHaveBeenCalledWith(expect.stringContaining('DB_URL'));
    spy.mockRestore();
  });

  it('list subcommand prints empty message when no deps', async () => {
    mockLoad.mockReturnValue({});
    const spy = jest.spyOn(console, 'log').mockImplementation();
    await runCommand(['list']);
    expect(spy).toHaveBeenCalledWith(expect.stringContaining('No dependencies'));
    spy.mockRestore();
  });

  it('dependents subcommand calls getDependentsOf', async () => {
    mockGetDependents.mockReturnValue(['DATABASE_URL']);
    const spy = jest.spyOn(console, 'log').mockImplementation();
    await runCommand(['dependents', 'DB_HOST']);
    expect(mockGetDependents).toHaveBeenCalledWith('DB_HOST');
    expect(spy).toHaveBeenCalledWith(expect.stringContaining('DATABASE_URL'));
    spy.mockRestore();
  });

  it('order subcommand prints resolved order', async () => {
    mockResolveOrder.mockReturnValue(['DB_HOST', 'DATABASE_URL', 'APP_URL']);
    const spy = jest.spyOn(console, 'log').mockImplementation();
    await runCommand(['order', 'APP_URL']);
    expect(mockResolveOrder).toHaveBeenCalledWith(['APP_URL']);
    expect(spy).toHaveBeenCalledWith(expect.stringContaining('DB_HOST'));
    spy.mockRestore();
  });
});
