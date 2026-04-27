import * as fs from 'fs';
import * as path from 'path';
import { checkEnvironmentHealth, runHealthReport } from '../envHealthCheck';
import * as envStore from '../envStore';
import * as envChecksum from '../envChecksum';
import * as envExpiry from '../envExpiry';
import * as envLock from '../envLock';

jest.mock('fs');
jest.mock('../envStore');
jest.mock('../envChecksum');
jest.mock('../envExpiry');
jest.mock('../envLock');

const mockFs = fs as jest.Mocked<typeof fs>;

beforeEach(() => {
  jest.clearAllMocks();
  (envStore.getStorePath as jest.Mock).mockReturnValue('/fake/.envoy/env/production.enc');
  (envChecksum.loadChecksums as jest.Mock).mockReturnValue({});
  (envExpiry.loadExpiries as jest.Mock).mockReturnValue({});
  (envLock.loadLocks as jest.Mock).mockReturnValue({});
  mockFs.existsSync.mockReturnValue(true);
  mockFs.readFileSync.mockReturnValue('encrypted-content' as any);
});

describe('checkEnvironmentHealth', () => {
  it('returns healthy when no issues found', async () => {
    const result = await checkEnvironmentHealth('production');
    expect(result.healthy).toBe(true);
    expect(result.issues).toHaveLength(0);
    expect(result.environment).toBe('production');
  });

  it('returns unhealthy when environment file does not exist', async () => {
    mockFs.existsSync.mockReturnValue(false);
    const result = await checkEnvironmentHealth('staging');
    expect(result.healthy).toBe(false);
    expect(result.issues).toContain('Environment file does not exist');
  });

  it('flags checksum mismatch', async () => {
    (envChecksum.loadChecksums as jest.Mock).mockReturnValue({ production: 'abc123' });
    (envChecksum.computeChecksum as jest.Mock).mockReturnValue('different-hash');
    const result = await checkEnvironmentHealth('production');
    expect(result.healthy).toBe(false);
    expect(result.issues.some((i) => i.includes('Checksum mismatch'))).toBe(true);
  });

  it('flags expired environment', async () => {
    (envExpiry.loadExpiries as jest.Mock).mockReturnValue({
      production: new Date(Date.now() - 1000).toISOString(),
    });
    const result = await checkEnvironmentHealth('production');
    expect(result.healthy).toBe(false);
    expect(result.issues.some((i) => i.includes('expired'))).toBe(true);
  });

  it('flags locked environment', async () => {
    (envLock.loadLocks as jest.Mock).mockReturnValue({
      production: { lockedBy: 'alice', lockedAt: new Date().toISOString() },
    });
    const result = await checkEnvironmentHealth('production');
    expect(result.healthy).toBe(false);
    expect(result.issues.some((i) => i.includes('locked by alice'))).toBe(true);
  });
});

describe('runHealthReport', () => {
  it('returns a summary across multiple environments', async () => {
    mockFs.existsSync.mockReturnValueOnce(true).mockReturnValueOnce(false);
    const report = await runHealthReport(['production', 'staging']);
    expect(report.summary.total).toBe(2);
    expect(report.summary.unhealthy).toBeGreaterThanOrEqual(1);
    expect(report.results).toHaveLength(2);
  });
});
