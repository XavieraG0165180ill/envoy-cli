import { Command } from 'commander';
import {
  addDependency,
  removeDependency,
  loadDependencies,
  getDependentsOf,
  resolveDependencyOrder,
} from '../../env/envDependency';

export function createDependencyCommand(): Command {
  const cmd = new Command('dependency').alias('dep').description('Manage env variable dependencies');

  cmd
    .command('add <key> <dependsOn...>')
    .description('Add dependencies for a key')
    .option('-d, --description <desc>', 'Optional description')
    .action((key: string, dependsOn: string[], options: { description?: string }) => {
      addDependency(key, dependsOn, options.description);
      console.log(`Added dependencies for "${key}": ${dependsOn.join(', ')}`);
    });

  cmd
    .command('remove <key>')
    .description('Remove dependency entry for a key')
    .action((key: string) => {
      const removed = removeDependency(key);
      if (removed) {
        console.log(`Removed dependency entry for "${key}"`);
      } else {
        console.error(`No dependency entry found for "${key}"`);
        process.exit(1);
      }
    });

  cmd
    .command('list')
    .description('List all dependency entries')
    .action(() => {
      const deps = loadDependencies();
      const entries = Object.values(deps);
      if (entries.length === 0) {
        console.log('No dependencies defined.');
        return;
      }
      for (const dep of entries) {
        const desc = dep.description ? ` — ${dep.description}` : '';
        console.log(`  ${dep.key} → [${dep.dependsOn.join(', ')}]${desc}`);
      }
    });

  cmd
    .command('dependents <key>')
    .description('List all keys that depend on the given key')
    .action((key: string) => {
      const dependents = getDependentsOf(key);
      if (dependents.length === 0) {
        console.log(`No keys depend on "${key}"`);
      } else {
        console.log(`Keys depending on "${key}": ${dependents.join(', ')}`);
      }
    });

  cmd
    .command('order <keys...>')
    .description('Resolve and display dependency resolution order')
    .action((keys: string[]) => {
      const order = resolveDependencyOrder(keys);
      console.log('Resolved order:');
      order.forEach((k, i) => console.log(`  ${i + 1}. ${k}`));
    });

  return cmd;
}
