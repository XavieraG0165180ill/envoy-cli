import { Command } from 'commander';
import * as fs from 'fs';
import * as path from 'path';
import { parseEnvContent, envToRecord } from '../../env/envParser';
import {
  validateEnv,
  detectEmptyValues,
  detectDuplicateKeys,
  ValidationRule,
} from '../../env/envValidation';

function loadRules(rulesPath: string): ValidationRule[] {
  if (!fs.existsSync(rulesPath)) return [];
  const raw = fs.readFileSync(rulesPath, 'utf-8');
  return JSON.parse(raw) as ValidationRule[];
}

export function createValidateCommand(): Command {
  const cmd = new Command('validate');

  cmd
    .description('Validate a .env file against optional rules')
    .argument('<file>', '.env file to validate')
    .option('-r, --rules <path>', 'path to JSON rules file')
    .option('--strict', 'treat warnings as errors', false)
    .action((file: string, options: { rules?: string; strict: boolean }) => {
      const filePath = path.resolve(file);

      if (!fs.existsSync(filePath)) {
        console.error(`File not found: ${filePath}`);
        process.exit(1);
      }

      const content = fs.readFileSync(filePath, 'utf-8');
      const entries = parseEnvContent(content);
      const record = envToRecord(entries);

      const duplicates = detectDuplicateKeys(content);
      if (duplicates.length > 0) {
        console.warn(`⚠ Duplicate keys found: ${duplicates.join(', ')}`);
      }

      const emptyKeys = detectEmptyValues(record);
      if (emptyKeys.length > 0) {
        console.warn(`⚠ Empty values for keys: ${emptyKeys.join(', ')}`);
      }

      const rules = options.rules ? loadRules(options.rules) : [];
      if (rules.length === 0) {
        console.log('✔ Basic validation passed (no rules file provided)');
        return;
      }

      const result = validateEnv(record, rules);

      if (result.errors.length > 0) {
        console.error('✖ Validation errors:');
        result.errors.forEach((e) => console.error(`  - ${e}`));
      }

      if (result.warnings.length > 0) {
        console.warn('⚠ Warnings:');
        result.warnings.forEach((w) => console.warn(`  - ${w}`));
      }

      const failed =
        !result.valid || (options.strict && result.warnings.length > 0);

      if (!failed) {
        console.log('✔ Validation passed');
      } else {
        process.exit(1);
      }
    });

  return cmd;
}
