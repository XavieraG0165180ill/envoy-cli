import { Command } from 'commander';
import {
  addHook,
  removeHook,
  toggleHook,
  loadHooks,
  Hook,
} from '../../env/envHook';

function formatHook(hook: Hook): string {
  const status = hook.enabled ? '✓' : '✗';
  return `[${status}] ${hook.id}\n    event: ${hook.event} | env: ${hook.environment}\n    command: ${hook.command}`;
}

export function createHookCommand(): Command {
  const cmd = new Command('hook').description('Manage lifecycle hooks for environments');

  cmd
    .command('add <event> <environment> <command>')
    .description('Register a hook for a lifecycle event (pre-push, post-push, pre-pull, post-pull)')
    .action((event: string, environment: string, command: string) => {
      const validEvents = ['pre-push', 'post-push', 'pre-pull', 'post-pull'];
      if (!validEvents.includes(event)) {
        console.error(`Invalid event "${event}". Must be one of: ${validEvents.join(', ')}`);
        process.exit(1);
      }
      const hook = addHook(event as Hook['event'], environment, command);
      console.log(`Hook registered: ${hook.id}`);
    });

  cmd
    .command('remove <id>')
    .description('Remove a hook by ID')
    .action((id: string) => {
      const removed = removeHook(id);
      if (removed) {
        console.log(`Hook ${id} removed.`);
      } else {
        console.error(`Hook "${id}" not found.`);
        process.exit(1);
      }
    });

  cmd
    .command('enable <id>')
    .description('Enable a hook')
    .action((id: string) => {
      if (!toggleHook(id, true)) {
        console.error(`Hook "${id}" not found.`);
        process.exit(1);
      }
      console.log(`Hook ${id} enabled.`);
    });

  cmd
    .command('disable <id>')
    .description('Disable a hook without removing it')
    .action((id: string) => {
      if (!toggleHook(id, false)) {
        console.error(`Hook "${id}" not found.`);
        process.exit(1);
      }
      console.log(`Hook ${id} disabled.`);
    });

  cmd
    .command('list')
    .description('List all registered hooks')
    .action(() => {
      const hooks = Object.values(loadHooks());
      if (hooks.length === 0) {
        console.log('No hooks registered.');
        return;
      }
      hooks.forEach((h) => console.log(formatHook(h)));
    });

  return cmd;
}
