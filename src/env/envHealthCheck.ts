import * as fs from 'fs';
import * as path from 'path';
import { getStorePath } from './envStore';
import { loadExpiries } from './envExpiry';
import { loadLocks } from './envLock';
import { computeChecksum, loadChecksums } from './envChecksum';

export interface HealthCheckResult {
  environment: string;
  healthy: boolean;
  issues: string[];
  checkedAt: string;
}

export interface HealthReport {
  results: HealthCheckResult[];
  summary: { total: number; healthy: number; unhealthy: number };
}

export async function checkEnvironmentHealth(
  environment: string
): Promise<HealthCheckResult> {
  const issues: string[] = [];
  const storePath = getStorePath(environment);

  if (!fs.existsSync(storePath)) {
    return {
      environment,
      healthy: false,
      issues: ['Environment file does not exist'],
      checkedAt: new Date().toISOString(),
    };
  }

  const content = fs.readFileSync(storePath, 'utf-8');

  // Check checksum integrity
  try {
    const checksums = loadChecksums();
    if (checksums[environment]) {
      const current = computeChecksum(content);
      if (current !== checksums[environment]) {
        issues.push('Checksum mismatch — file may have been tampered with');
      }
    }
  } catch {
    issues.push('Unable to verify checksum');
  }

  // Check expiry
  try {
    const expiries = loadExpiries();
    if (expiries[environment]) {
      const expiry = new Date(expiries[environment]);
      if (expiry < new Date()) {
        issues.push(`Environment expired at ${expiry.toISOString()}`);
      }
    }
  } catch {
    // expiry file may not exist
  }

  // Check lock state
  try {
    const locks = loadLocks();
    if (locks[environment]) {
      issues.push(`Environment is locked by ${locks[environment].lockedBy}`);
    }
  } catch {
    // lock file may not exist
  }

  return {
    environment,
    healthy: issues.length === 0,
    issues,
    checkedAt: new Date().toISOString(),
  };
}

export async function runHealthReport(
  environments: string[]
): Promise<HealthReport> {
  const results = await Promise.all(
    environments.map((env) => checkEnvironmentHealth(env))
  );
  const healthy = results.filter((r) => r.healthy).length;
  return {
    results,
    summary: { total: results.length, healthy, unhealthy: results.length - healthy },
  };
}
