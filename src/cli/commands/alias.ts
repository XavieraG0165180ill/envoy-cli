import { Command } from 'commander';
import {
  addAlias,
  removeAlias,
  listAliases,
  resolveAlias,
} from '../../env/envAlias';

export function createAliasCommand(): Command {
  const alias = new Command('alias').description('Manage environment aliases');

  alias
    .command('add <alias> <environment>')
    .description('Create an alias for an environment name')
    .action((aliasName: string, environment: string) => {
      addAlias(aliasName, environment);
      console.log(`Alias '${aliasName}' -> '${environment}' added.`);
    });

  alias
    .command('remove <alias>')
    .description('Remove an existing alias')
    .action((aliasName: string) => {
      const removed = removeAlias(aliasName);
      if (removed) {
        console.log(`Alias '${aliasName}' removed.`);
      } else {
        console.error(`Alias '${aliasName}' not found.`);
        process.exit(1);
      }
    });

  alias
    .command('list')
    .description('List all aliases')
    .action(() => {
      const aliases = listAliases();
      if (aliases.length === 0) {
        console.log('No aliases defined.');
        return;
      }
      const maxLen = Math.max(...aliases.map((a) => a.alias.length));
      for (const { alias: a, environment } of aliases) {
        console.log(`  ${a.padEnd(maxLen)}  ->  ${environment}`);
      }
    });

  alias
    .command('resolve <alias>')
    .description('Resolve an alias to its environment name')
    .action((aliasName: string) => {
      const resolved = resolveAlias(aliasName);
      console.log(resolved);
    });

  return alias;
}
