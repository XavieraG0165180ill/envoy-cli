import { Command } from 'commander';
import {
  pinEnvironment,
  unpinEnvironment,
  listPins,
  getPin,
  isPinned,
} from '../../env/envPin';

function formatPin(entry: { environment: string; version: string; pinnedAt: string; pinnedBy?: string; reason?: string }): string {
  const parts = [
    `  Environment : ${entry.environment}`,
    `  Version     : ${entry.version}`,
    `  Pinned At   : ${new Date(entry.pinnedAt).toLocaleString()}`,
  ];
  if (entry.pinnedBy) parts.push(`  Pinned By   : ${entry.pinnedBy}`);
  if (entry.reason) parts.push(`  Reason      : ${entry.reason}`);
  return parts.join('\n');
}

export function createPinCommand(): Command {
  const pin = new Command('pin').description('Pin or manage environment version pins');

  pin
    .command('set <environment> <version>')
    .description('Pin an environment to a specific version')
    .option('-r, --reason <reason>', 'Reason for pinning')
    .option('-u, --user <user>', 'User performing the pin')
    .action((environment: string, version: string, options: { reason?: string; user?: string }) => {
      const entry = pinEnvironment(environment, version, options.reason, options.user);
      console.log(`✔ Pinned "${environment}" to version "${version}".`);
      if (options.reason) console.log(`  Reason: ${options.reason}`);
    });

  pin
    .command('remove <environment>')
    .description('Remove the pin from an environment')
    .action((environment: string) => {
      const removed = unpinEnvironment(environment);
      if (removed) {
        console.log(`✔ Pin removed from "${environment}".`);
      } else {
        console.error(`✖ No pin found for environment "${environment}".`);
        process.exit(1);
      }
    });

  pin
    .command('status <environment>')
    .description('Check pin status for an environment')
    .action((environment: string) => {
      if (isPinned(environment)) {
        const entry = getPin(environment)!;
        console.log(`✔ "${environment}" is pinned:\n${formatPin(entry)}`);
      } else {
        console.log(`"${environment}" is not pinned.`);
      }
    });

  pin
    .command('list')
    .description('List all pinned environments')
    .action(() => {
      const pins = listPins();
      if (pins.length === 0) {
        console.log('No environments are currently pinned.');
        return;
      }
      console.log(`Pinned environments (${pins.length}):`);
      pins.forEach((entry) => {
        console.log(`\n${formatPin(entry)}`);
      });
    });

  return pin;
}
