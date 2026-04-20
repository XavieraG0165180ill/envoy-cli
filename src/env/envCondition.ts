import * as fs from 'fs';
import * as path from 'path';
import { ensureEnvoyDir } from '../crypto/keyManager';

export interface Condition {
  id: string;
  environment: string;
  key: string;
  operator: 'eq' | 'neq' | 'exists' | 'not_exists' | 'matches';
  value?: string;
  action: 'require' | 'warn' | 'block';
  message?: string;
  createdAt: string;
}

interface ConditionStore {
  conditions: Condition[];
}

export function getConditionFilePath(): string {
  const envoyDir = ensureEnvoyDir();
  return path.join(envoyDir, 'conditions.json');
}

export function loadConditions(): Condition[] {
  const filePath = getConditionFilePath();
  if (!fs.existsSync(filePath)) return [];
  const raw = fs.readFileSync(filePath, 'utf-8');
  const store: ConditionStore = JSON.parse(raw);
  return store.conditions ?? [];
}

export function saveConditions(conditions: Condition[]): void {
  const filePath = getConditionFilePath();
  fs.writeFileSync(filePath, JSON.stringify({ conditions }, null, 2), 'utf-8');
}

export function addCondition(condition: Omit<Condition, 'id' | 'createdAt'>): Condition {
  const conditions = loadConditions();
  const newCondition: Condition = {
    ...condition,
    id: `cond_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    createdAt: new Date().toISOString(),
  };
  conditions.push(newCondition);
  saveConditions(conditions);
  return newCondition;
}

export function removeCondition(id: string): boolean {
  const conditions = loadConditions();
  const index = conditions.findIndex((c) => c.id === id);
  if (index === -1) return false;
  conditions.splice(index, 1);
  saveConditions(conditions);
  return true;
}

export function getConditionsForEnvironment(environment: string): Condition[] {
  return loadConditions().filter((c) => c.environment === environment);
}

export function evaluateCondition(
  condition: Condition,
  envMap: Map<string, string>
): { passed: boolean; message: string } {
  const value = envMap.get(condition.key);
  let passed = false;

  switch (condition.operator) {
    case 'exists':
      passed = envMap.has(condition.key);
      break;
    case 'not_exists':
      passed = !envMap.has(condition.key);
      break;
    case 'eq':
      passed = value === condition.value;
      break;
    case 'neq':
      passed = value !== condition.value;
      break;
    case 'matches':
      passed = condition.value ? new RegExp(condition.value).test(value ?? '') : false;
      break;
  }

  const message =
    condition.message ??
    `Condition failed: ${condition.key} ${condition.operator}${
      condition.value ? ` ${condition.value}` : ''
    }`;

  return { passed, message };
}
