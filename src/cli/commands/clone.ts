import { Command } from 'commander';
import { cloneEnvironment, listCloneable } from '../../env/envClone';

export function createCloneCommand(): Command {
  const cmd = new Command('clone');

  cmd
    .description('Clone an environment to a new environment name')
    .argument('<source>', 'Source environment name')
    .argument('<destination>', 'Destination environment name')
    .option('--overwrite', 'Overwrite destination if it already exists', false)
    .option('--include-history', 'Also clone the change history', false)
    .option('--list', 'List all environments available to clone')
    .action(async (source: string, destination: string, opts) => {
      if (opts.list) {
        const envs = await listCloneable();
        if (envs.length === 0) {
          console.log('No environments found.');
        } else {
          console.log('Available environments:');
          envs.forEach((e) => console.log(`  - ${e}`));
        }
        return;
      }

      try {
        const result = await cloneEnvironment(source, destination, {
          overwrite: opts.overwrite,
          includeHistory: opts.includeHistory,
        });

        console.log(
          `✔ Cloned '${result.source}' → '${result.destination}' (${result.keysCloned} keys)`
        );

        if (result.historyCloned) {
          console.log('  ✔ History cloned.');
        }
      } catch (err: any) {
        console.error(`✘ ${err.message}`);
        process.exit(1);
      }
    });

  return cmd;
}
