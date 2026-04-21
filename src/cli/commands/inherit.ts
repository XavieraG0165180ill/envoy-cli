import { Command } from 'commander';
import {
  setParents,
  removeInheritance,
  getParents,
  resolveAncestors,
  loadInheritMap,
} from '../../env/envInherit';

export function createInheritCommand(): Command {
  const inherit = new Command('inherit').description(
    'Manage environment inheritance chains'
  );

  inherit
    .command('set <environment> <parents...>')
    .description('Set parent environments for an environment')
    .action((environment: string, parents: string[]) => {
      setParents(environment, parents);
      console.log(
        `Set parents of "${environment}" to: ${parents.join(', ')}`
      );
    });

  inherit
    .command('remove <environment>')
    .description('Remove inheritance for an environment')
    .action((environment: string) => {
      removeInheritance(environment);
      console.log(`Removed inheritance for "${environment}"`);
    });

  inherit
    .command('show <environment>')
    .description('Show direct parents of an environment')
    .action((environment: string) => {
      const parents = getParents(environment);
      if (parents.length === 0) {
        console.log(`"${environment}" has no parent environments.`);
      } else {
        console.log(`Parents of "${environment}": ${parents.join(', ')}`);
      }
    });

  inherit
    .command('ancestors <environment>')
    .description('Show full resolved ancestor chain for an environment')
    .action((environment: string) => {
      const ancestors = resolveAncestors(environment);
      if (ancestors.length === 0) {
        console.log(`"${environment}" has no ancestors.`);
      } else {
        console.log(`Ancestors of "${environment}" (ordered):`);
        ancestors.forEach((a, i) => console.log(`  ${i + 1}. ${a}`));
      }
    });

  inherit
    .command('list')
    .description('List all environments with inheritance configured')
    .action(() => {
      const map = loadInheritMap();
      const entries = Object.values(map);
      if (entries.length === 0) {
        console.log('No inheritance chains configured.');
        return;
      }
      entries.forEach(({ environment, parents }) => {
        console.log(`  ${environment} -> ${parents.join(', ')}`);
      });
    });

  return inherit;
}
