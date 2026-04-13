import { Command } from 'commander';
import { renameEnvironment } from '../../env/envStore';

export function createRenameCommand(): Command {
  const cmd = new Command('rename');

  cmd
    .description('Rename a stored environment')
    .argument('<oldName>', 'Current environment name')
    .argument('<newName>', 'New environment name')
    .option('-f, --force', 'Skip confirmation prompt', false)
    .action(async (oldName: string, newName: string, options: { force: boolean }) => {
      try {
        const { environmentExists } = await import('../../env/envStore');

        if (!(await environmentExists(oldName))) {
          console.error(`Error: Environment "${oldName}" does not exist.`);
          process.exit(1);
        }

        if (await environmentExists(newName)) {
          if (!options.force) {
            console.error(
              `Error: Environment "${newName}" already exists. Use --force to overwrite.`
            );
            process.exit(1);
          }
        }

        await renameEnvironment(oldName, newName);
        console.log(`✓ Environment "${oldName}" renamed to "${newName}" successfully.`);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error(`Error renaming environment: ${message}`);
        process.exit(1);
      }
    });

  return cmd;
}
