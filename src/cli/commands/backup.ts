import { Command } from 'commander';
import { loadMasterKey } from '../../crypto/keyManager';
import { encrypt, decrypt } from '../../crypto/encryption';
import { getStorePath } from '../../env/envStore';
import { loadBackups, saveBackup, deleteBackup, getBackupById, clearBackups } from '../../env/envBackup';
import * as fs from 'fs';

export function formatBackup(entry: { id: string; createdAt: string; description?: string }): string {
  const desc = entry.description ? ` — ${entry.description}` : '';
  return `[${entry.id}] ${entry.createdAt}${desc}`;
}

export function createBackupCommand(): Command {
  const backup = new Command('backup').description('Manage environment backups');

  backup
    .command('create <environment>')
    .description('Create a backup of an environment')
    .option('-d, --description <desc>', 'Backup description')
    .action(async (environment: string, opts: { description?: string }) => {
      const storePath = getStorePath(environment);
      if (!fs.existsSync(storePath)) {
        console.error(`No data found for environment: ${environment}`);
        process.exit(1);
      }
      const raw = fs.readFileSync(storePath, 'utf-8');
      const entry = saveBackup(environment, raw, opts.description);
      console.log(`Backup created: ${formatBackup(entry)}`);
    });

  backup
    .command('list <environment>')
    .description('List all backups for an environment')
    .action((environment: string) => {
      const backups = loadBackups(environment);
      if (backups.length === 0) {
        console.log(`No backups found for environment: ${environment}`);
        return;
      }
      backups.forEach((b) => console.log(formatBackup(b)));
    });

  backup
    .command('restore <environment> <id>')
    .description('Restore an environment from a backup')
    .action((environment: string, id: string) => {
      const entry = getBackupById(environment, id);
      if (!entry) {
        console.error(`Backup not found: ${id}`);
        process.exit(1);
      }
      const storePath = getStorePath(environment);
      fs.writeFileSync(storePath, entry.data);
      console.log(`Environment "${environment}" restored from backup ${id}`);
    });

  backup
    .command('delete <environment> <id>')
    .description('Delete a specific backup')
    .action((environment: string, id: string) => {
      const removed = deleteBackup(environment, id);
      if (!removed) {
        console.error(`Backup not found: ${id}`);
        process.exit(1);
      }
      console.log(`Backup ${id} deleted.`);
    });

  backup
    .command('clear <environment>')
    .description('Clear all backups for an environment')
    .action((environment: string) => {
      clearBackups(environment);
      console.log(`All backups cleared for environment: ${environment}`);
    });

  return backup;
}
