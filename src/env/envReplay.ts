import * as fs from 'fs';
import * as path from 'path';
import { loadHistory, HistoryEntry } from './envHistory';
import { loadAuditLog } from './envAudit';

export interface ReplayStep {
  timestamp: string;
  environment: string;
  action: string;
  keys: string[];
  snapshot: Record<string, string>;
}

export interface ReplaySession {
  environment: string;
  steps: ReplayStep[];
  createdAt: string;
}

export function buildReplaySession(
  environment: string,
  from?: string,
  to?: string
): ReplaySession {
  const history = loadHistory().filter((e) => e.environment === environment);
  const audit = loadAuditLog().filter((e) => e.environment === environment);

  const steps: ReplayStep[] = history
    .filter((e) => {
      if (from && e.timestamp < from) return false;
      if (to && e.timestamp > to) return false;
      return true;
    })
    .map((entry) => {
      const auditEntry = audit.find((a) => a.timestamp === entry.timestamp);
      return {
        timestamp: entry.timestamp,
        environment: entry.environment,
        action: auditEntry?.action ?? 'unknown',
        keys: entry.keys ?? [],
        snapshot: entry.snapshot ?? {},
      };
    })
    .sort((a, b) => a.timestamp.localeCompare(b.timestamp));

  return {
    environment,
    steps,
    createdAt: new Date().toISOString(),
  };
}

export function getStepAt(
  session: ReplaySession,
  index: number
): ReplayStep | undefined {
  return session.steps[index];
}

export function replayToTimestamp(
  session: ReplaySession,
  timestamp: string
): ReplayStep | undefined {
  const eligible = session.steps.filter((s) => s.timestamp <= timestamp);
  return eligible[eligible.length - 1];
}
