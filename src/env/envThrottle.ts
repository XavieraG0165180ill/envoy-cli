import * as fs from 'fs';
import * as path from 'path';
import { ensureEnvoyDir } from '../crypto/keyManager';

export interface ThrottlePolicy {
  environment: string;
  maxOperationsPerMinute: number;
  maxOperationsPerHour: number;
  currentMinuteCount: number;
  currentHourCount: number;
  minuteWindowStart: number;
  hourWindowStart: number;
}

export interface ThrottleStore {
  policies: Record<string, ThrottlePolicy>;
}

export function getThrottleFilePath(): string {
  const dir = ensureEnvoyDir();
  return path.join(dir, 'throttle.json');
}

export function loadThrottleStore(): ThrottleStore {
  const filePath = getThrottleFilePath();
  if (!fs.existsSync(filePath)) {
    return { policies: {} };
  }
  const raw = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(raw) as ThrottleStore;
}

export function saveThrottleStore(store: ThrottleStore): void {
  const filePath = getThrottleFilePath();
  fs.writeFileSync(filePath, JSON.stringify(store, null, 2), 'utf-8');
}

export function setThrottlePolicy(
  environment: string,
  maxOperationsPerMinute: number,
  maxOperationsPerHour: number
): ThrottlePolicy {
  const store = loadThrottleStore();
  const now = Date.now();
  const existing = store.policies[environment];
  const policy: ThrottlePolicy = {
    environment,
    maxOperationsPerMinute,
    maxOperationsPerHour,
    currentMinuteCount: existing?.currentMinuteCount ?? 0,
    currentHourCount: existing?.currentHourCount ?? 0,
    minuteWindowStart: existing?.minuteWindowStart ?? now,
    hourWindowStart: existing?.hourWindowStart ?? now,
  };
  store.policies[environment] = policy;
  saveThrottleStore(store);
  return policy;
}

export function removeThrottlePolicy(environment: string): boolean {
  const store = loadThrottleStore();
  if (!store.policies[environment]) return false;
  delete store.policies[environment];
  saveThrottleStore(store);
  return true;
}

export function checkThrottle(environment: string): { allowed: boolean; reason?: string } {
  const store = loadThrottleStore();
  const policy = store.policies[environment];
  if (!policy) return { allowed: true };

  const now = Date.now();
  const oneMinute = 60 * 1000;
  const oneHour = 60 * 60 * 1000;

  if (now - policy.minuteWindowStart > oneMinute) {
    policy.currentMinuteCount = 0;
    policy.minuteWindowStart = now;
  }
  if (now - policy.hourWindowStart > oneHour) {
    policy.currentHourCount = 0;
    policy.hourWindowStart = now;
  }

  if (policy.currentMinuteCount >= policy.maxOperationsPerMinute) {
    return { allowed: false, reason: `Exceeded ${policy.maxOperationsPerMinute} operations per minute` };
  }
  if (policy.currentHourCount >= policy.maxOperationsPerHour) {
    return { allowed: false, reason: `Exceeded ${policy.maxOperationsPerHour} operations per hour` };
  }

  policy.currentMinuteCount++;
  policy.currentHourCount++;
  store.policies[environment] = policy;
  saveThrottleStore(store);
  return { allowed: true };
}

export function listThrottlePolicies(): ThrottlePolicy[] {
  const store = loadThrottleStore();
  return Object.values(store.policies);
}
