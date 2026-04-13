import { EnvRecord } from './envParser';

export interface ValidationRule {
  key: string;
  required?: boolean;
  pattern?: RegExp;
  minLength?: number;
  maxLength?: number;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export function validateEnv(
  env: EnvRecord,
  rules: ValidationRule[]
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  for (const rule of rules) {
    const value = env[rule.key];

    if (rule.required && (value === undefined || value === '')) {
      errors.push(`Missing required key: ${rule.key}`);
      continue;
    }

    if (value === undefined) continue;

    if (rule.pattern && !rule.pattern.test(value)) {
      errors.push(`Key "${rule.key}" does not match required pattern`);
    }

    if (rule.minLength !== undefined && value.length < rule.minLength) {
      errors.push(
        `Key "${rule.key}" is too short (min ${rule.minLength} chars)`
      );
    }

    if (rule.maxLength !== undefined && value.length > rule.maxLength) {
      warnings.push(
        `Key "${rule.key}" exceeds recommended length (max ${rule.maxLength} chars)`
      );
    }
  }

  return { valid: errors.length === 0, errors, warnings };
}

export function detectEmptyValues(env: EnvRecord): string[] {
  return Object.entries(env)
    .filter(([, v]) => v === '')
    .map(([k]) => k);
}

export function detectDuplicateKeys(content: string): string[] {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  const lines = content.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.substring(0, eqIdx).trim();
    if (seen.has(key)) duplicates.add(key);
    else seen.add(key);
  }

  return Array.from(duplicates);
}
