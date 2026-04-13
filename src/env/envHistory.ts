import * as fs from 'fs';
import * as path from 'path';
import { getStorePath } from './envStore';

export interface HistoryEntry {
  timestamp: string;
  environment: string;
  action: 'push' | 'pull' | 'rotate' | 'copy';
  keyCount: number;
}

const HISTORY_FILE = 'history.json';

function getHistoryPath(): string {
  return path.join(getStorePath(), HISTORY_FILE);
}

export function loadHistory(): HistoryEntry[] {
  const historyPath = getHistoryPath();
  if (!fs.existsSync(historyPath)) {
    return [];
  }
  try {
    const raw = fs.readFileSync(historyPath, 'utf-8');
    return JSON.parse(raw) as HistoryEntry[];
  } catch {
    return [];
  }
}

export function appendHistory(entry: HistoryEntry): void {
  const history = loadHistory();
  history.push(entry);
  const historyPath = getHistoryPath();
  fs.writeFileSync(historyPath, JSON.stringify(history, null, 2), 'utf-8');
}

export function clearHistory(): void {
  const historyPath = getHistoryPath();
  if (fs.existsSync(historyPath)) {
    fs.writeFileSync(historyPath, JSON.stringify([], null, 2), 'utf-8');
  }
}

export function getHistoryForEnvironment(environment: string): HistoryEntry[] {
  return loadHistory().filter((e) => e.environment === environment);
}
