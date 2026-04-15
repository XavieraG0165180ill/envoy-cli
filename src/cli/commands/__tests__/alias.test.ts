import { createAliasCommand } from '../alias';
import * as envAlias from '../../../env/envAlias';

jest.mock('../../../env/envAlias');

const mockedAdd = envAlias.addAlias as jest.MockedFunction<typeof envAlias.addAlias>;
const mockedRemove = envAlias.removeAlias as jest.MockedFunction<typeof envAlias.removeAlias>;
const mockedList = envAlias.listAliases as jest.MockedFunction<typeof envAlias.listAliases>;
const mockedResolve = envAlias.resolveAlias as jest.MockedFunction<typeof envAlias.resolveAlias>;

let consoleSpy: jest.SpyInstance;
let errorSpy: jest.SpyInstance;
let exitSpy: jest.SpyInstance;

beforeEach(() => {
  consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
  errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  exitSpy = jest.spyOn(process, 'exit').mockImplementation(() => undefined as never);
  jest.clearAllMocks();
});

afterEach(() => {
  consoleSpy.mockRestore();
  errorSpy.mockRestore();
  exitSpy.mockRestore();
});

async function run(args: string[]): Promise<void> {
  const cmd = createAliasCommand();
  await cmd.parseAsync(['node', 'alias', ...args]);
}

test('alias add calls addAlias and logs success', async () => {
  await run(['add', 'prod', 'production']);
  expect(mockedAdd).toHaveBeenCalledWith('prod', 'production');
  expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("'prod' -> 'production'"));
});

test('alias remove calls removeAlias and logs success', async () => {
  mockedRemove.mockReturnValue(true);
  await run(['remove', 'prod']);
  expect(mockedRemove).toHaveBeenCalledWith('prod');
  expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("'prod' removed"));
});

test('alias remove exits with error when alias not found', async () => {
  mockedRemove.mockReturnValue(false);
  await run(['remove', 'ghost']);
  expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining("'ghost' not found"));
  expect(exitSpy).toHaveBeenCalledWith(1);
});

test('alias list prints all aliases', async () => {
  mockedList.mockReturnValue([
    { alias: 'p', environment: 'production' },
    { alias: 'dev', environment: 'development' },
  ]);
  await run(['list']);
  expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('production'));
  expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('development'));
});

test('alias list prints message when no aliases defined', async () => {
  mockedList.mockReturnValue([]);
  await run(['list']);
  expect(consoleSpy).toHaveBeenCalledWith('No aliases defined.');
});

test('alias resolve prints resolved environment', async () => {
  mockedResolve.mockReturnValue('production');
  await run(['resolve', 'prod']);
  expect(mockedResolve).toHaveBeenCalledWith('prod');
  expect(consoleSpy).toHaveBeenCalledWith('production');
});
