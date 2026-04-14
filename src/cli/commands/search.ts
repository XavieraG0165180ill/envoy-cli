import { Command } from 'commander';
import chalk from 'chalk';
import { searchInEnvironment, searchAcrossEnvironments, SearchResult } from '../../env/envSearch';
import { listEnvironments } from '../../env/envStore';

function formatResult(result: SearchResult): string {
  const env = chalk.cyan(`[${result.environment}]`);
  const key = chalk.yellow(result.key);
  const value = chalk.green(result.value);
  const line = result.line !== undefined ? chalk.gray(` (line ${result.line})`) : '';
  return `${env} ${key}=${value}${line}`;
}

export function createSearchCommand(): Command {
  const cmd = new Command('search');

  cmd
    .description('Search for keys or values across environments')
    .option('-k, --key <pattern>', 'Search by key pattern (regex supported)')
    .option('-v, --value <pattern>', 'Search by value pattern (regex supported)')
    .option('-e, --env <environment>', 'Limit search to a specific environment')
    .option('-c, --case-sensitive', 'Enable case-sensitive matching')
    .option('-x, --exact', 'Use exact string matching instead of regex')
    .action(async (options) => {
      if (!options.key && !options.value) {
        console.error(chalk.red('Error: provide at least --key or --value to search'));
        process.exit(1);
      }

      const searchOptions = {
        keyPattern: options.key,
        valuePattern: options.value,
        caseSensitive: !!options.caseSensitive,
        exactMatch: !!options.exact,
      };

      try {
        let results: SearchResult[];

        if (options.env) {
          results = await searchInEnvironment(options.env, searchOptions);
        } else {
          const environments = await listEnvironments();
          if (environments.length === 0) {
            console.log(chalk.yellow('No environments found. Run `envoy init` first.'));
            return;
          }
          results = await searchAcrossEnvironments(environments, searchOptions);
        }

        if (results.length === 0) {
          console.log(chalk.yellow('No matching entries found.'));
          return;
        }

        console.log(chalk.bold(`Found ${results.length} result(s):\n`));
        results.forEach(r => console.log(formatResult(r)));
      } catch (err: any) {
        console.error(chalk.red(`Search failed: ${err.message}`));
        process.exit(1);
      }
    });

  return cmd;
}
