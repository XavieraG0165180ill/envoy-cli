import { Command } from 'commander';
import { createShareCommand } from '../share';
import {
  createShareToken,
  resolveShareToken,
  revokeShareToken,
  listShareTokens,
} from '../../../env/envShare';
import * as fs from 'fs';

jest.mock('../../../env/envShare');
jest.mock('fs');

const mockCreate = createShareToken as jest.MockedFunction<typeof createShareToken>;
const mockResolve = resolveShareToken as jest.MockedFunction<typeof resolveShareToken>;
const mockRevoke = revokeShareToken as jest.MockedFunction<typeof revokeShareToken>;
const mockList = listShareTokens as jest.MockedFunction<typeof listShareTokens>;
const mockFs = fs as jest.Mocked<typeof fs>;

function runCommand(args: string[]): Promise<void> {
  const program = new Command();
  program.addCommand(createShareCommand());
  program.exitOverride();
  return program.parseAsync(['node', 'envoy', ...args]);
}

describe('share command', () => {
  let consoleSpy: jest.SpyInstance;
  let exitSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    jest.spyOn(console, 'error').mockImplementation();
    exitSpy = jest.spyOn(process, 'exit').mockImplementation(() => undefined as never);
  });

  afterEach(() => jest.restoreAllMocks());

  describe('share create', () => {
    it('should create a share token and print its id', async () => {
      mockCreate.mockResolvedValue({
        id: 'token123',
        environment: 'production',
        createdAt: '2024-01-01T00:00:00.000Z',
        expiresAt: null,
        encryptedPayload: 'enc',
        iv: 'iv',
        salt: 'salt',
      });
      await runCommand(['share', 'create', 'production']);
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('token123'));
    });

    it('should pass ttl option to createShareToken', async () => {
      mockCreate.mockResolvedValue({
        id: 'tok', environment: 'staging', createdAt: '', expiresAt: '2099-01-01T00:00:00.000Z',
        encryptedPayload: '', iv: '', salt: '',
      });
      await runCommand(['share', 'create', 'staging', '--ttl', '30']);
      expect(mockCreate).toHaveBeenCalledWith('staging', 30);
    });

    it('should handle errors gracefully', async () => {
      mockCreate.mockRejectedValue(new Error('Environment not found'));
      await runCommand(['share', 'create', 'missing']);
      expect(exitSpy).toHaveBeenCalledWith(1);
    });
  });

  describe('share resolve', () => {
    it('should print resolved env content to stdout', async () => {
      mockResolve.mockResolvedValue('KEY=value\nOTHER=123');
      await runCommand(['share', 'resolve', 'token123']);
      expect(consoleSpy).toHaveBeenCalledWith('KEY=value\nOTHER=123');
    });

    it('should write to file when --output is given', async () => {
      mockResolve.mockResolvedValue('KEY=value');
      mockFs.writeFileSync.mockImplementation(() => undefined);
      await runCommand(['share', 'resolve', 'token123', '--output', '.env']);
      expect(mockFs.writeFileSync).toHaveBeenCalledWith('.env', 'KEY=value');
    });
  });

  describe('share revoke', () => {
    it('should revoke a token', async () => {
      mockRevoke.mockImplementation(() => undefined);
      await runCommand(['share', 'revoke', 'token123']);
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('revoked'));
    });
  });

  describe('share list', () => {
    it('should print no tokens message when list is empty', async () => {
      mockList.mockReturnValue([]);
      await runCommand(['share', 'list']);
      expect(consoleSpy).toHaveBeenCalledWith('No active share tokens.');
    });

    it('should print tokens with status', async () => {
      mockList.mockReturnValue([{
        id: 'abc',
        environment: 'production',
        createdAt: '2024-01-01T00:00:00.000Z',
        expiresAt: null,
        encryptedPayload: '', iv: '', salt: '',
      }]);
      await runCommand(['share', 'list']);
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('[ACTIVE]'));
    });
  });
});
