import { Command } from 'commander';
import chalk from 'chalk';
import {
  watchEnvironment,
  unwatchAll,
  listWatched,
  WatchEvent,
} from '../../env/envWatch';

function formatEvent(event: WatchEvent): string {
  const time = new Date(event.timestamp).toLocaleTimeString();
  const icon =
    event.changeType === 'created'
      ? chalk.green('+')
      : event.changeType === 'deleted'
      ? chalk.red('-')
      : chalk.yellow('~');
  return `[${time}] ${icon} ${chalk.bold(event.environment)} — ${event.changeType}`;
}

export function createWatchCommand(): Command {
  const cmd = new Command('watch');

  cmd
    .description('Watch one or more environments for changes')
    .argument('[environments...]', 'environments to watch (default: all stored)')
    .option('-q, --quiet', 'suppress output except errors')
    .action(async (environments: string[], options) => {
      if (environments.length === 0) {
        console.error(chalk.red('Error: specify at least one environment to watch.'));
        process.exit(1);
      }

      if (!options.quiet) {
        console.log(chalk.cyan(`Watching environments: ${environments.join(', ')}`));
        console.log(chalk.gray('Press Ctrl+C to stop.\n'));
      }

      for (const env of environments) {
        try {
          watchEnvironment(env, (event: WatchEvent) => {
            if (!options.quiet) {
              console.log(formatEvent(event));
            }
          });
        } catch (err: any) {
          console.error(chalk.red(`Failed to watch "${env}": ${err.message}`));
        }
      }

      process.on('SIGINT', () => {
        unwatchAll();
        if (!options.quiet) {
          console.log(chalk.gray('\nStopped watching.'));
        }
        process.exit(0);
      });

      // Keep process alive
      await new Promise(() => {});
    });

  return cmd;
}
