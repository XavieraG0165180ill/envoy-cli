import { Command } from 'commander';
import {
  addBroadcast,
  removeBroadcast,
  getBroadcastsForEnvironment,
  pruneExpiredBroadcasts,
  BroadcastMessage,
} from '../../env/envBroadcast';

function formatBroadcast(b: BroadcastMessage): string {
  const expire = b.expiresAt ? ` (expires: ${b.expiresAt})` : '';
  const author = b.author ? ` [${b.author}]` : '';
  return `[${b.severity.toUpperCase()}]${author} ${b.message}${expire}  (id: ${b.id})`;
}

export function createBroadcastCommand(): Command {
  const cmd = new Command('broadcast').description('Manage broadcast messages for environments');

  cmd
    .command('send <environment> <message>')
    .description('Send a broadcast message to an environment')
    .option('-s, --severity <level>', 'Severity: info | warning | critical', 'info')
    .option('-e, --expires <iso>', 'Expiry datetime in ISO format')
    .option('-a, --author <name>', 'Author name')
    .action((environment: string, message: string, opts) => {
      const severity = opts.severity as BroadcastMessage['severity'];
      if (!['info', 'warning', 'critical'].includes(severity)) {
        console.error(`Invalid severity: ${severity}`);
        process.exit(1);
      }
      const entry = addBroadcast(environment, message, severity, {
        expiresAt: opts.expires,
        author: opts.author,
      });
      console.log(`Broadcast sent (id: ${entry.id})`);
    });

  cmd
    .command('list <environment>')
    .description('List broadcast messages for an environment')
    .action((environment: string) => {
      const broadcasts = getBroadcastsForEnvironment(environment);
      if (broadcasts.length === 0) {
        console.log(`No broadcasts for environment: ${environment}`);
        return;
      }
      broadcasts.forEach((b) => console.log(formatBroadcast(b)));
    });

  cmd
    .command('remove <id>')
    .description('Remove a broadcast message by id')
    .action((id: string) => {
      const ok = removeBroadcast(id);
      if (!ok) {
        console.error(`Broadcast not found: ${id}`);
        process.exit(1);
      }
      console.log(`Broadcast removed: ${id}`);
    });

  cmd
    .command('prune')
    .description('Remove all expired broadcast messages')
    .action(() => {
      const count = pruneExpiredBroadcasts();
      console.log(`Pruned ${count} expired broadcast(s).`);
    });

  return cmd;
}
