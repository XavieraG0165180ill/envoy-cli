import { Command } from 'commander';
import {
  lockEnvironment,
  unlockEnvironment,
  isLocked,
  listLocks,
  LockEntry,
} from '../../env/envLock';
import * as os from 'os';

function formatLock(entry: LockEntry): string {
  const date = new Date(entry.lockedAt).toLocaleString();
  const reason = entry.reason ? ` — ${entry.reason}` : '';
  return `[${entry.environment}] locked by ${entry.lockedBy} at ${date}${reason}`;
}

export function createLockCommand(): Command {
  const lock = new Command('lock').description('Lock or unlock environments to prevent modifications');

  lock
    .command('set <environment>')
    .description('Lock an environment')
    .option('-u, --user <user>', 'User locking the environment', os.userInfo().username)
    .option('-r, --reason <reason>', 'Reason for locking')
    .action((environment: string, options: { user: string; reason?: string }) => {
      const existing = isLocked(environment);
      if (existing) {
        console.error(`Environment "${environment}" is already locked by ${existing.lockedBy}.`);
        process.exit(1);
      }
      lockEnvironment(environment, options.user, options.reason);
      console.log(`Environment "${environment}" locked by ${options.user}.`);
    });

  lock
    .command('unset <environment>')
    .description('Unlock an environment')
    .action((environment: string) => {
      const removed = unlockEnvironment(environment);
      if (!removed) {
        console.error(`Environment "${environment}" is not locked.`);
        process.exit(1);
      }
      console.log(`Environment "${environment}" unlocked.`);
    });

  lock
    .command('status <environment>')
    .description('Check if an environment is locked')
    .action((environment: string) => {
      const entry = isLocked(environment);
      if (entry) {
        console.log(formatLock(entry));
      } else {
        console.log(`Environment "${environment}" is not locked.`);
      }
    });

  lock
    .command('list')
    .description('List all locked environments')
    .action(() => {
      const locks = listLocks();
      if (locks.length === 0) {
        console.log('No environments are currently locked.');
        return;
      }
      locks.forEach((entry) => console.log(formatLock(entry)));
    });

  return lock;
}
