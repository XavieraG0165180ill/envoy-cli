import { Command } from 'commander';
import { loadEnvStore, saveEnvStore } from '../../env/envStore';
import { formatEnvMap, sortEnvMap, FormatStyle } from '../../env/envFormat';

export function createFormatCommand(): Command {
  const cmd = new Command('format');

  cmd
    .description('Format keys or values in a stored environment')
    .argument('<environment>', 'Environment name to format')
    .option('--keys <styles>', 'Comma-separated key styles: upper,lower,trim', '')
    .option('--values <styles>', 'Comma-separated value styles: upper,lower,trim,quote,unquote', '')
    .option('--sort', 'Sort keys alphabetically', false)
    .option('--dry-run', 'Preview changes without saving', false)
    .action(async (environment: string, options) => {
      try {
        const store = await loadEnvStore(environment);
        if (!store) {
          console.error(`Environment "${environment}" not found.`);
          process.exit(1);
        }

        const parseStyles = (raw: string): FormatStyle[] =>
          raw ? (raw.split(',').map(s => s.trim()) as FormatStyle[]) : [];

        const keyStyles = parseStyles(options.keys);
        const valueStyles = parseStyles(options.values);

        let result = formatEnvMap(store, {
          keys: keyStyles.length ? keyStyles : undefined,
          values: valueStyles.length ? valueStyles : undefined,
        });

        if (options.sort) {
          result = sortEnvMap(result);
        }

        if (options.dryRun) {
          console.log(`Preview for "${environment}":\n`);
          for (const [k, v] of result.entries()) {
            console.log(`  ${k}=${v}`);
          }
          return;
        }

        await saveEnvStore(environment, result);
        console.log(`Environment "${environment}" formatted successfully.`);
      } catch (err: any) {
        console.error('Format failed:', err.message);
        process.exit(1);
      }
    });

  return cmd;
}
