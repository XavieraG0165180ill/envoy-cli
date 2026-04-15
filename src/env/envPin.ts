import * as fs from 'fs';
import * as path from 'path';
import { ensureEnvoyDir } from '../crypto/keyManager';

export interface PinEntry {
  environment: string;
  version: string;
  pinnedAt: string;
  pinnedBy?: string;
  reason?: string;
}

export type PinMap = Record<string, PinEntry>;

export function getPinFilePath(): string {
  const envoyDir = ensureEnvoyDir();
  return path.join(envoyDir, 'pins.json');
}

export function loadPins(): PinMap {
  const filePath = getPinFilePath();
  if (!fs.existsSync(filePath)) return {};
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as PinMap;
  } catch {
    return {};
  }
}

export function savePins(pins: PinMap): void {
  const filePath = getPinFilePath();
  fs.writeFileSync(filePath, JSON.stringify(pins, null, 2), 'utf-8');
}

export function pinEnvironment(
  environment: string,
  version: string,
  reason?: string,
  pinnedBy?: string
): PinEntry {
  const pins = loadPins();
  const entry: PinEntry = {
    environment,
    version,
    pinnedAt: new Date().toISOString(),
    ...(pinnedBy && { pinnedBy }),
    ...(reason && { reason }),
  };
  pins[environment] = entry;
  savePins(pins);
  return entry;
}

export function unpinEnvironment(environment: string): boolean {
  const pins = loadPins();
  if (!pins[environment]) return false;
  delete pins[environment];
  savePins(pins);
  return true;
}

export function getPin(environment: string): PinEntry | undefined {
  const pins = loadPins();
  return pins[environment];
}

export function isPinned(environment: string): boolean {
  return !!getPin(environment);
}

export function listPins(): PinEntry[] {
  return Object.values(loadPins());
}
