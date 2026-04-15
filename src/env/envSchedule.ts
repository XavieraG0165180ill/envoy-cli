import * as fs from 'fs';
import * as path from 'path';
import { ensureEnvoyDir } from '../crypto/keyManager';

export interface ScheduledSync {
  id: string;
  environment: string;
  cronExpression: string;
  lastRun?: string;
  nextRun?: string;
  enabled: boolean;
  createdAt: string;
}

function getScheduleFilePath(): string {
  const envoyDir = ensureEnvoyDir();
  return path.join(envoyDir, 'schedules.json');
}

export function loadSchedules(): ScheduledSync[] {
  const filePath = getScheduleFilePath();
  if (!fs.existsSync(filePath)) return [];
  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(raw) as ScheduledSync[];
  } catch {
    return [];
  }
}

export function saveSchedules(schedules: ScheduledSync[]): void {
  const filePath = getScheduleFilePath();
  fs.writeFileSync(filePath, JSON.stringify(schedules, null, 2), 'utf-8');
}

export function addSchedule(
  environment: string,
  cronExpression: string
): ScheduledSync {
  const schedules = loadSchedules();
  const newSchedule: ScheduledSync = {
    id: `${environment}-${Date.now()}`,
    environment,
    cronExpression,
    enabled: true,
    createdAt: new Date().toISOString(),
  };
  schedules.push(newSchedule);
  saveSchedules(schedules);
  return newSchedule;
}

export function removeSchedule(id: string): boolean {
  const schedules = loadSchedules();
  const index = schedules.findIndex((s) => s.id === id);
  if (index === -1) return false;
  schedules.splice(index, 1);
  saveSchedules(schedules);
  return true;
}

export function toggleSchedule(id: string, enabled: boolean): boolean {
  const schedules = loadSchedules();
  const schedule = schedules.find((s) => s.id === id);
  if (!schedule) return false;
  schedule.enabled = enabled;
  saveSchedules(schedules);
  return true;
}

export function getSchedulesForEnvironment(environment: string): ScheduledSync[] {
  return loadSchedules().filter((s) => s.environment === environment);
}
