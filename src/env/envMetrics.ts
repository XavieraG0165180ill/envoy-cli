import * as fs from 'fs';
import * as path from 'path';
import { ensureEnvoyDir } from '../crypto/keyManager';

export interface EnvMetrics {
  environment: string;
  keyCount: number;
  emptyValues: number;
  totalBytes: number;
  lastUpdated: string;
  changeFrequency: number; // changes per day over last 30 days
}

export interface MetricsStore {
  [environment: string]: EnvMetrics;
}

export function getMetricsFilePath(): string {
  const dir = ensureEnvoyDir();
  return path.join(dir, 'metrics.json');
}

export function loadMetrics(): MetricsStore {
  const filePath = getMetricsFilePath();
  if (!fs.existsSync(filePath)) return {};
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch {
    return {};
  }
}

export function saveMetrics(metrics: MetricsStore): void {
  const filePath = getMetricsFilePath();
  fs.writeFileSync(filePath, JSON.stringify(metrics, null, 2), 'utf-8');
}

export function recordMetrics(
  environment: string,
  envMap: Map<string, string>,
  historyEntries: { timestamp: string }[]
): EnvMetrics {
  const metrics = loadMetrics();
  const keyCount = envMap.size;
  const emptyValues = Array.from(envMap.values()).filter(v => v === '').length;
  const totalBytes = Array.from(envMap.entries()).reduce(
    (sum, [k, v]) => sum + k.length + v.length + 2,
    0
  );
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const recentChanges = historyEntries.filter(
    e => new Date(e.timestamp) >= thirtyDaysAgo
  ).length;
  const changeFrequency = parseFloat((recentChanges / 30).toFixed(4));

  const entry: EnvMetrics = {
    environment,
    keyCount,
    emptyValues,
    totalBytes,
    lastUpdated: now.toISOString(),
    changeFrequency,
  };

  metrics[environment] = entry;
  saveMetrics(metrics);
  return entry;
}

export function getMetricsForEnvironment(environment: string): EnvMetrics | null {
  const metrics = loadMetrics();
  return metrics[environment] ?? null;
}

export function clearMetrics(environment: string): void {
  const metrics = loadMetrics();
  delete metrics[environment];
  saveMetrics(metrics);
}
