import { createSecretCommand } from '../secret';
import * as envSecret from '../../../env/envSecret';

jest.mock('../../../env/envSecret');

const mockedGetSecretFilePath = envSecret.getSecretFilePath as jest.MockedFunction<typeof envSecret.getSecretFilePath>;
const mockedAddSecret = envSecret.addSecret as jest.MockedFunction<typeof envSecret.addSecret>;
const mockedGetSecret = envSecret.getSecret as jest.MockedFunction<typeof envSecret.getSecret>;
const mockedRemoveSecret = envSecret.removeSecret as jest.MockedFunction<typeof envSecret.removeSecret>;
const mockedListSecrets = envSecret.listSecrets as jest.MockedFunction<typeof envSecret.listSecrets>;

const FAKE_PATH = '/fake/.envoy/secrets/production.secrets.json';

async function runCommand(...args: string[]): Promise<void> {
  const cmd = createSecretCommand();
  await cmd.parseAsync(['node', 'secret', ...args]);
}

describe('secret command', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedGetSecretFilePath.mockReturnValue(FAKE_PATH);
    jest.spyOn(process, 'exit').mockImplementation((() => {}) as never);
  });

  it('set stores a secret', async () => {
    mockedAddSecret.mockResolvedValue(undefined);
    const spy = jest.spyOn(console, 'log').mockImplementation(() => {});
    await runCommand('set', 'production', 'API_KEY', 'supersecret');
    expect(mockedAddSecret).toHaveBeenCalledWith(FAKE_PATH, 'production', 'API_KEY', 'supersecret');
    expect(spy).toHaveBeenCalledWith(expect.stringContaining('API_KEY'));
    spy.mockRestore();
  });

  it('get prints decrypted value', async () => {
    mockedGetSecret.mockResolvedValue('decrypted-value');
    const spy = jest.spyOn(console, 'log').mockImplementation(() => {});
    await runCommand('get', 'production', 'API_KEY');
    expect(spy).toHaveBeenCalledWith('decrypted-value');
    spy.mockRestore();
  });

  it('get exits with error when secret not found', async () => {
    mockedGetSecret.mockResolvedValue(null);
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    await runCommand('get', 'production', 'MISSING');
    expect(process.exit).toHaveBeenCalledWith(1);
    spy.mockRestore();
  });

  it('remove deletes a secret', async () => {
    mockedRemoveSecret.mockReturnValue(true);
    const spy = jest.spyOn(console, 'log').mockImplementation(() => {});
    await runCommand('remove', 'production', 'API_KEY');
    expect(mockedRemoveSecret).toHaveBeenCalledWith(FAKE_PATH, 'production', 'API_KEY');
    expect(spy).toHaveBeenCalledWith(expect.stringContaining('removed'));
    spy.mockRestore();
  });

  it('remove exits with error when secret not found', async () => {
    mockedRemoveSecret.mockReturnValue(false);
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    await runCommand('remove', 'production', 'GHOST');
    expect(process.exit).toHaveBeenCalledWith(1);
    spy.mockRestore();
  });

  it('list shows secret keys', async () => {
    const now = new Date().toISOString();
    mockedListSecrets.mockReturnValue([
      { key: 'KEY1', encryptedValue: 'enc', environment: 'production', createdAt: now, updatedAt: now },
    ]);
    const spy = jest.spyOn(console, 'log').mockImplementation(() => {});
    await runCommand('list', 'production');
    expect(spy).toHaveBeenCalledWith(expect.stringContaining('KEY1'));
    spy.mockRestore();
  });

  it('list shows empty message when no secrets', async () => {
    mockedListSecrets.mockReturnValue([]);
    const spy = jest.spyOn(console, 'log').mockImplementation(() => {});
    await runCommand('list', 'production');
    expect(spy).toHaveBeenCalledWith(expect.stringContaining('No secrets'));
    spy.mockRestore();
  });
});
