import { Command } from 'commander';
import * as path from 'path';
import * as os from 'os';
import { getEnvStatus, getAllEnvStatuses, EnvStatus } from '../../env/envStatus';

function formatStatus(s: EnvStatus): string {
  const lines: string[] = [];
  lines.push(`Environment : ${s.environment}`);
  lines.push(`Exists      : ${s.exists ? 'yes' : 'no'}`);
  lines.push(`Locked      : ${s.locked ? 'yes' : 'no'}`);
  lines.push(`Expired     : ${s.expired ? 'yes' : 'no'}`);
  if (s.expiresAt) lines.push(`Expires At  : ${s.expiresAt}`);
  lines.push(`Tags        : ${s.tags.length ? s.tags.join(', ') : 'none'}`);
  if (s.exists) {
    lines.push(`Size        : ${s.sizeBytes} bytes`);
    lines.push(`Modified    : ${s.lastModified}`);
  }
  return lines.join('\n');
}

export function createStatusCommand(): Command {
  const cmd = new Command('status');
  cmd
    .description('Show status of one or all environments')
    .argument('[environment]', 'Environment name (omit for all)')
    .option('--json', 'Output as JSON')
    .action(async (environment: string | undefined, opts) => {
      const envoyDir = path.join(os.homedir(), '.envoy');
      try {
        if (environment) {
          const status = await getEnvStatus(environment);
          if (opts.json) {
            console.log(JSON.stringify(status, null, 2));
          } else {
            console.log(formatStatus(status));
          }
        } else {
          const statuses = await getAllEnvStatuses(envoyDir);
          if (!statuses.length) {
            console.log('No environments found.');
            return;
          }
          if (opts.json) {
            console.log(JSON.stringify(statuses, null, 2));
          } else {
            statuses.forEach(s => {
              console.log('---');
              console.log(formatStatus(s));
            });
          }
        }
      } catch (err: any) {
        console.error(`Error: ${err.message}`);
        process.exit(1);
      }
    });
  return cmd;
}
