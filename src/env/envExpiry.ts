import * as fs from 'fs';
import * as path from 'path';
import { ensureEnvoyDir } from '../crypto/keyManager';

export interface ExpiryEntry {
  environment: string;
  expiresAt: string; // ISO date string
  notifyBefore?: number; // days before expiry to warn
  createdAt: string;
}

export interface ExpiryMap {
  [environment: string]: ExpiryEntry;
}

export function getExpiryFilePath(): string {
  const envoyDir = ensureEnvoyDir();
  return path.join(envoyDir, 'expiry.json');
}

export function loadExpiries(): ExpiryMap {
  const filePath = getExpiryFilePath();
  if (!fs.existsSync(filePath)) return {};
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch {
    return {};
  }
}

export function saveExpiries(expiries: ExpiryMap): void {
  const filePath = getExpiryFilePath();
  fs.writeFileSync(filePath, JSON.stringify(expiries, null, 2), 'utf-8');
}

export function setExpiry(
  environment: string,
  expiresAt: Date,
  notifyBefore?: number
): ExpiryEntry {
  const expiries = loadExpiries();
  const entry: ExpiryEntry = {
    environment,
    expiresAt: expiresAt.toISOString(),
    notifyBefore,
    createdAt: new Date().toISOString(),
  };
  expiries[environment] = entry;
  saveExpiries(expiries);
  return entry;
}

export function removeExpiry(environment: string): boolean {
  const expiries = loadExpiries();
  if (!expiries[environment]) return false;
  delete expiries[environment];
  saveExpiries(expiries);
  return true;
}

export function getExpiry(environment: string): ExpiryEntry | null {
  const expiries = loadExpiries();
  return expiries[environment] ?? null;
}

export function isExpired(environment: string): boolean {
  const entry = getExpiry(environment);
  if (!entry) return false;
  return new Date(entry.expiresAt) <= new Date();
}

export function isExpiringSoon(environment: string): boolean {
  const entry = getExpiry(environment);
  if (!entry || !entry.notifyBefore) return false;
  const expiry = new Date(entry.expiresAt);
  const warnDate = new Date();
  warnDate.setDate(warnDate.getDate() + entry.notifyBefore);
  return expiry <= warnDate && expiry > new Date();
}
