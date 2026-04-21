import { Command } from 'commander';
import {
  setRetention,
  removeRetention,
  listRetentions,
  getRetention,
  RetentionPolicy,
} from '../../env/envRetention';

function formatPolicy(policy: RetentionPolicy): string {
  const parts: string[] = [`  Environment : ${policy.environment}`];
  if (policy.maxVersions !== undefined)
    parts.push(`  Max Versions: ${policy.maxVersions}`);
  if (policy.maxAgeDays !== undefined)
    parts.push(`  Max Age Days: ${policy.maxAgeDays}`);
  parts.push(`  Created At  : ${policy.createdAt}`);
  return parts.join('\n');
}

export function createRetentionCommand(): Command {
  const cmd = new Command('retention').description(
    'Manage retention policies for environments'
  );

  cmd
    .command('set <environment>')
    .description('Set a retention policy for an environment')
    .option('--max-versions <n>', 'Maximum number of versions to retain', parseInt)
    .option('--max-age-days <n>', 'Maximum age in days before expiry', parseInt)
    .action((environment: string, options) => {
      if (!options.maxVersions && !options.maxAgeDays) {
        console.error('Error: provide --max-versions and/or --max-age-days');
        process.exit(1);
      }
      const policy = setRetention(environment, options.maxVersions, options.maxAgeDays);
      console.log(`Retention policy set for "${environment}":`);
      console.log(formatPolicy(policy));
    });

  cmd
    .command('remove <environment>')
    .description('Remove the retention policy for an environment')
    .action((environment: string) => {
      const removed = removeRetention(environment);
      if (!removed) {
        console.error(`No retention policy found for "${environment}"`);
        process.exit(1);
      }
      console.log(`Retention policy removed for "${environment}"`);
    });

  cmd
    .command('get <environment>')
    .description('Show the retention policy for an environment')
    .action((environment: string) => {
      const policy = getRetention(environment);
      if (!policy) {
        console.error(`No retention policy found for "${environment}"`);
        process.exit(1);
      }
      console.log(formatPolicy(policy));
    });

  cmd
    .command('list')
    .description('List all retention policies')
    .action(() => {
      const policies = listRetentions();
      if (policies.length === 0) {
        console.log('No retention policies defined.');
        return;
      }
      policies.forEach((p) => {
        console.log(formatPolicy(p));
        console.log();
      });
    });

  return cmd;
}
