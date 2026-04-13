import { Command } from 'commander';
import * as fs from 'fs';
import * as path from 'path';
import { loadMasterKey } from '../../crypto/keyManager';
import { pullEnvironment } from '../../env/envSync';
import { serializeEnv } from '../../env/envParser';

export type ExportFormat = 'dotenv' | 'json' | 'shell';

export function formatEnv(record: Record<string, string>, format: ExportFormat): string {
  switch (format) {
    case 'json':
      return JSON.stringify(record, null, 2);
    case 'shell':
      return Object.entries(record)
        .map(([k, v]) => `export ${k}="${v.replace(/"/g, '\\"')}"`)
        .join('\n');
    case 'dotenv':
    default:
      return serializeEnv(record);
  }
}

export function createExportCommand(): Command {
  const cmd = new Command('export');

  cmd
    .description('Export a stored environment to a file or stdout')
    .argument('<environment>', 'Name of the environment to export')
    .option('-f, --format <format>', 'Output format: dotenv, json, shell', 'dotenv')
    .option('-o, --output <file>', 'Output file path (defaults to stdout)')
    .action(async (environment: string, options: { format: string; output?: string }) => {
      try {
        const masterKey = await loadMasterKey();
        if (!masterKey) {
          console.error('No master key found. Run `envoy init` first.');
          process.exit(1);
        }

        const format = options.format as ExportFormat;
        if (!['dotenv', 'json', 'shell'].includes(format)) {
          console.error(`Invalid format "${format}". Choose from: dotenv, json, shell`);
          process.exit(1);
        }

        const record = await pullEnvironment(environment, masterKey);
        const output = formatEnv(record, format);

        if (options.output) {
          const outPath = path.resolve(options.output);
          fs.writeFileSync(outPath, output, 'utf-8');
          console.log(`Exported environment "${environment}" to ${outPath}`);
        } else {
          console.log(output);
        }
      } catch (err: any) {
        console.error(`Export failed: ${err.message}`);
        process.exit(1);
      }
    });

  return cmd;
}
