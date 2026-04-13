import { Command } from 'commander';
import { loadHistory, clearHistory, getHistoryForEnvironment } from '../../env/envHistory';

function formatEntry(entry: { timestamp: string; environment: string; action: string; keyCount: number }): string {
  const date = new Date(entry.timestamp).toLocaleString();
  return `[${date}] ${entry.action.toUpperCase().padEnd(8)} env=${entry.environment} keys=${entry.keyCount}`;
}

export function createHistoryCommand(): Command {
  const cmd = new Command('history');

  cmd
    .description('Show the history of envoy operations')
    .option('-e, --env <environment>', 'Filter history by environment')
    .option('--clear', 'Clear all history')
    .option('-n, --limit <number>', 'Limit number of entries shown', '20')
    .action((options) => {
      if (options.clear) {
        clearHistory();
        console.log('History cleared.');
        return;
      }

      const limit = parseInt(options.limit, 10);
      const entries = options.env
        ? getHistoryForEnvironment(options.env)
        : loadHistory();

      if (entries.length === 0) {
        console.log('No history found.');
        return;
      }

      const displayed = entries.slice(-limit).reverse();
      console.log(`Showing last ${displayed.length} entries:\n`);
      displayed.forEach((entry) => console.log(formatEntry(entry)));
    });

  return cmd;
}
