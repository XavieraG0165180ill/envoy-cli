import { Command } from 'commander';
import {
  saveSnapshot,
  loadSnapshots,
  deleteSnapshot,
  getSnapshotById,
  clearSnapshots,
} from '../../env/envSnapshot';
import { loadEnv } from '../../env/envSync';
import { serializeEnv } from '../../env/envParser';
import * as fs from 'fs';

function formatSnapshot(s: { id: string; timestamp: string; label?: string }): string {
  const label = s.label ? ` [${s.label}]` : '';
  return `  ${s.id}  ${s.timestamp}${label}`;
}

export function createSnapshotCommand(): Command {
  const cmd = new Command('snapshot').description('Manage environment snapshots');

  cmd
    .command('save <environment>')
    .description('Save a snapshot of the current environment')
    .option('-l, --label <label>', 'Optional label for the snapshot')
    .action(async (environment: string, options: { label?: string }) => {
      try {
        const data = await loadEnv(environment);
        const snap = saveSnapshot(environment, data, options.label);
        console.log(`Snapshot saved: ${snap.id} (${snap.timestamp})`);
      } catch (err: any) {
        console.error(`Error: ${err.message}`);
        process.exit(1);
      }
    });

  cmd
    .command('list <environment>')
    .description('List all snapshots for an environment')
    .action((environment: string) => {
      const snaps = loadSnapshots(environment);
      if (snaps.length === 0) {
        console.log(`No snapshots found for "${environment}".`);
        return;
      }
      console.log(`Snapshots for "${environment}":`);
      snaps.forEach((s) => console.log(formatSnapshot(s)));
    });

  cmd
    .command('restore <environment> <id>')
    .description('Restore environment from a snapshot (prints to stdout)')
    .action((environment: string, id: string) => {
      const snap = getSnapshotById(environment, id);
      if (!snap) {
        console.error(`Snapshot "${id}" not found for "${environment}".`);
        process.exit(1);
      }
      console.log(serializeEnv(snap.data));
    });

  cmd
    .command('delete <environment> <id>')
    .description('Delete a specific snapshot')
    .action((environment: string, id: string) => {
      const removed = deleteSnapshot(environment, id);
      if (!removed) {
        console.error(`Snapshot "${id}" not found.`);
        process.exit(1);
      }
      console.log(`Snapshot "${id}" deleted.`);
    });

  cmd
    .command('clear <environment>')
    .description('Clear all snapshots for an environment')
    .action((environment: string) => {
      clearSnapshots(environment);
      console.log(`All snapshots cleared for "${environment}".`);
    });

  return cmd;
}
