import { Command } from 'commander';
import { listStoredEnvironments } from '../../env/envStore';
import { masterKeyExists } from '../../crypto/keyManager';
import chalk from 'chalk';

export function createListCommand(): Command {
  const cmd = new Command('list');

  cmd
    .description('List all stored environments')
    .option('-v, --verbose', 'Show additional details about each environment')
    .action(async (options) => {
      try {
        if (!masterKeyExists()) {
          console.error(
            chalk.red('No master key found. Run `envoy init` to initialize.')
          );
          process.exit(1);
        }

        const environments = listStoredEnvironments();

        if (environments.length === 0) {
          console.log(chalk.yellow('No environments stored yet.'));
          console.log(
            chalk.dim('Use `envoy push <env>` to store an environment.')
          );
          return;
        }

        console.log(chalk.bold('\nStored environments:'));
        console.log(chalk.dim('─'.repeat(40)));

        environments.forEach((env, index) => {
          const icon = '●';
          console.log(
            `  ${chalk.cyan(icon)} ${chalk.white(env.name)}${
              options.verbose
                ? chalk.dim(` — last modified: ${env.lastModified ?? 'unknown'}`)
                : ''
            }`
          );
        });

        console.log(chalk.dim('─'.repeat(40)));
        console.log(
          chalk.dim(`\nTotal: ${environments.length} environment(s)`)
        );
      } catch (err) {
        console.error(
          chalk.red('Error listing environments:'),
          (err as Error).message
        );
        process.exit(1);
      }
    });

  return cmd;
}
