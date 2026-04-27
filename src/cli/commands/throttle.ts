import { Command } from 'commander';
import {
  setThrottlePolicy,
  removeThrottlePolicy,
  checkThrottle,
  listThrottlePolicies,
} from '../../env/envThrottle';

function formatPolicy(p: ReturnType<typeof listThrottlePolicies>[number]): string {
  return `  ${p.environment.padEnd(20)} ${String(p.maxOperationsPerMinute).padEnd(10)}/min   ${String(p.maxOperationsPerHour).padEnd(10)}/hr`;
}

export function createThrottleCommand(): Command {
  const cmd = new Command('throttle').description('Manage operation throttle policies per environment');

  cmd
    .command('set <environment> <perMinute> <perHour>')
    .description('Set throttle limits for an environment')
    .action((environment: string, perMinute: string, perHour: string) => {
      const pm = parseInt(perMinute, 10);
      const ph = parseInt(perHour, 10);
      if (isNaN(pm) || isNaN(ph) || pm <= 0 || ph <= 0) {
        console.error('Error: perMinute and perHour must be positive integers.');
        process.exit(1);
      }
      setThrottlePolicy(environment, pm, ph);
      console.log(`Throttle policy set for "${environment}": ${pm}/min, ${ph}/hr`);
    });

  cmd
    .command('remove <environment>')
    .description('Remove throttle policy for an environment')
    .action((environment: string) => {
      const removed = removeThrottlePolicy(environment);
      if (removed) {
        console.log(`Throttle policy removed for "${environment}".`);
      } else {
        console.error(`No throttle policy found for "${environment}".`);
        process.exit(1);
      }
    });

  cmd
    .command('check <environment>')
    .description('Check if an operation is allowed under throttle policy')
    .action((environment: string) => {
      const result = checkThrottle(environment);
      if (result.allowed) {
        console.log(`Operation allowed for "${environment}".`);
      } else {
        console.error(`Operation blocked for "${environment}": ${result.reason}`);
        process.exit(1);
      }
    });

  cmd
    .command('list')
    .description('List all throttle policies')
    .action(() => {
      const policies = listThrottlePolicies();
      if (policies.length === 0) {
        console.log('No throttle policies configured.');
        return;
      }
      console.log(`${'ENVIRONMENT'.padEnd(20)} ${'PER MINUTE'.padEnd(10)}      ${'PER HOUR'.padEnd(10)}`);
      console.log('-'.repeat(50));
      policies.forEach(p => console.log(formatPolicy(p)));
    });

  return cmd;
}
