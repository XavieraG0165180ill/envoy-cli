import * as fs from 'fs';
import * as path from 'path';
import { ensureEnvoyDir } from '../crypto/keyManager';

export interface EnvChain {
  name: string;
  environments: string[];
  createdAt: string;
}

export interface ChainStore {
  chains: EnvChain[];
}

export function getChainFilePath(): string {
  const dir = ensureEnvoyDir();
  return path.join(dir, 'chains.json');
}

export function loadChains(): ChainStore {
  const filePath = getChainFilePath();
  if (!fs.existsSync(filePath)) {
    return { chains: [] };
  }
  const raw = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(raw) as ChainStore;
}

export function saveChains(store: ChainStore): void {
  const filePath = getChainFilePath();
  fs.writeFileSync(filePath, JSON.stringify(store, null, 2), 'utf-8');
}

export function addChain(name: string, environments: string[]): EnvChain {
  const store = loadChains();
  if (store.chains.find(c => c.name === name)) {
    throw new Error(`Chain "${name}" already exists.`);
  }
  const chain: EnvChain = { name, environments, createdAt: new Date().toISOString() };
  store.chains.push(chain);
  saveChains(store);
  return chain;
}

export function removeChain(name: string): boolean {
  const store = loadChains();
  const idx = store.chains.findIndex(c => c.name === name);
  if (idx === -1) return false;
  store.chains.splice(idx, 1);
  saveChains(store);
  return true;
}

export function getChain(name: string): EnvChain | undefined {
  return loadChains().chains.find(c => c.name === name);
}

export function listChains(): EnvChain[] {
  return loadChains().chains;
}
