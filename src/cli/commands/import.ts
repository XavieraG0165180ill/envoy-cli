import { Command } from 'commander';
import * as path from 'path';
import { importEnvFile } from '../../env/envImport';
import { loadEnvStore, saveEnvStore } from '../../env/envStore';
import { appendAuditEntry } from '../../env/envAudit';
import { serializeEnv } from '../../env/envParser';

export function createImportCommand(): Command {
  const cmd = new Command('import');

  cmd
    .description('Import environment variables from a file (.env, .json, .yaml)')
    .argument('<file>', 'Path to the file to import')
    .option('-e, --env <environment>', 'Target environment name', 'development')
    .option('--merge', 'Merge with existing variables instead of replacing', false)
    .option('--dry-run', 'Preview changes without saving', false)
    .action(async (file: string, options: { env: string; merge: boolean; dryRun: boolean }) => {
      try {
        const filePath = path.resolve(file);
        const { entries, count, format } = importEnvFile(filePath);

        if (options.dryRun) {
          console.log(`[dry-run] Would import ${count} variable(s) from ${format} file into "${options.env}"`);
          entries.forEach(({ key, value }) => {
            console.log(`  ${key}=${value}`);
          });
          return;
        }

        const store = loadEnvStore();
        const existing = store[options.env] ?? [];

        let merged = options.merge ? [...existing] : [];

        for (const entry of entries) {
          const idx = merged.findIndex(e => e.key === entry.key);
          if (idx >= 0) {
            merged[idx] = entry;
          } else {
            merged.push(entry);
          }
        }

        store[options.env] = merged;
        saveEnvStore(store);

        appendAuditEntry(options.env, 'import', {
          file: filePath,
          format,
          count,
          merge: options.merge,
        });

        const action = options.merge ? 'Merged' : 'Imported';
        console.log(`✔ ${action} ${count} variable(s) into "${options.env}" from ${format} file.`);
      } catch (err: any) {
        console.error(`✖ Import failed: ${err.message}`);
        process.exit(1);
      }
    });

  return cmd;
}
