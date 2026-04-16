import * as fs from 'fs';
import * as path from 'path';
import { ensureEnvoyDir } from '../crypto/keyManager';

export interface LabelMap {
  [environment: string]: string[];
}

export function getLabelFilePath(): string {
  const dir = ensureEnvoyDir();
  return path.join(dir, 'labels.json');
}

export function loadLabels(): LabelMap {
  const filePath = getLabelFilePath();
  if (!fs.existsSync(filePath)) return {};
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch {
    return {};
  }
}

export function saveLabels(labels: LabelMap): void {
  const filePath = getLabelFilePath();
  fs.writeFileSync(filePath, JSON.stringify(labels, null, 2));
}

export function addLabel(environment: string, label: string): void {
  const labels = loadLabels();
  if (!labels[environment]) labels[environment] = [];
  if (!labels[environment].includes(label)) {
    labels[environment].push(label);
    saveLabels(labels);
  }
}

export function removeLabel(environment: string, label: string): void {
  const labels = loadLabels();
  if (!labels[environment]) return;
  labels[environment] = labels[environment].filter(l => l !== label);
  if (labels[environment].length === 0) delete labels[environment];
  saveLabels(labels);
}

export function getLabels(environment: string): string[] {
  return loadLabels()[environment] ?? [];
}

export function findByLabel(label: string): string[] {
  const labels = loadLabels();
  return Object.entries(labels)
    .filter(([, tags]) => tags.includes(label))
    .map(([env]) => env);
}

export function clearLabels(environment: string): void {
  const labels = loadLabels();
  delete labels[environment];
  saveLabels(labels);
}
