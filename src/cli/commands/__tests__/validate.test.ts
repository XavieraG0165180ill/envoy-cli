import { Command } from 'commander';
import * as fs from 'fs';
import * as path from 'path';
import { createValidateCommand } from '../validate';

jest.mock('fs');

const mockFs = fs as jest.Mocked<typeof fs>;

describe('createValidateCommand', () => {
  let cmd: Command;
  let exitSpy: jest.SpyInstance;
  let consoleSpy: jest.SpyInstance;
  let warnSpy: jest.SpyInstance;

  beforeEach(() => {
    cmd = createValidateCommand();
    exitSpy = jest.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('process.exit');
    });
    consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => jest.restoreAllMocks());

  it('exits with error when file does not exist', () => {
    mockFs.existsSync.mockReturnValue(false);
    expect(() => cmd.parse(['node', 'envoy', 'missing.env'])).toThrow(
      'process.exit'
    );
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it('passes basic validation without rules', () => {
    mockFs.existsSync.mockReturnValue(true);
    mockFs.readFileSync.mockReturnValue('FOO=bar\nBAZ=qux');
    cmd.parse(['node', 'envoy', '.env']);
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('Basic validation passed')
    );
  });

  it('warns about empty values', () => {
    mockFs.existsSync.mockReturnValue(true);
    mockFs.readFileSync.mockReturnValue('FOO=\nBAR=hello');
    cmd.parse(['node', 'envoy', '.env']);
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('FOO'));
  });

  it('warns about duplicate keys', () => {
    mockFs.existsSync.mockReturnValue(true);
    mockFs.readFileSync.mockReturnValue('FOO=bar\nFOO=baz');
    cmd.parse(['node', 'envoy', '.env']);
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('FOO'));
  });

  it('exits when required key is missing with rules', () => {
    const rules = JSON.stringify([{ key: 'SECRET', required: true }]);
    mockFs.existsSync.mockReturnValue(true);
    mockFs.readFileSync
      .mockReturnValueOnce('FOO=bar')
      .mockReturnValueOnce(rules);
    jest.spyOn(path, 'resolve').mockReturnValue('/fake/.env');
    expect(() =>
      cmd.parse(['node', 'envoy', '.env', '--rules', 'rules.json'])
    ).toThrow('process.exit');
    expect(exitSpy).toHaveBeenCalledWith(1);
  });
});
