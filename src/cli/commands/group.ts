import { Command } from 'commander';
import {
  addGroup,
  removeGroup,
  listGroups,
  getGroup,
  addEnvironmentToGroup,
  removeEnvironmentFromGroup,
} from '../../env/envGroup';

export function createGroupCommand(): Command {
  const group = new Command('group').description('Manage environment groups');

  group
    .command('create <name> [environments...]')
    .description('Create a new group with optional environments')
    .option('-d, --description <desc>', 'Group description')
    .action((name: string, environments: string[], opts: { description?: string }) => {
      const created = addGroup(name, environments, opts.description);
      console.log(`Group "${created.name}" created with ${created.environments.length} environment(s).`);
    });

  group
    .command('delete <name>')
    .description('Delete a group')
    .action((name: string) => {
      const removed = removeGroup(name);
      if (removed) {
        console.log(`Group "${name}" deleted.`);
      } else {
        console.error(`Group "${name}" not found.`);
        process.exit(1);
      }
    });

  group
    .command('list')
    .description('List all groups')
    .action(() => {
      const groups = listGroups();
      if (groups.length === 0) {
        console.log('No groups defined.');
        return;
      }
      groups.forEach(g => {
        const desc = g.description ? ` — ${g.description}` : '';
        console.log(`${g.name}${desc}`);
        console.log(`  Environments: ${g.environments.join(', ') || '(none)'}`);
      });
    });

  group
    .command('show <name>')
    .description('Show details of a group')
    .action((name: string) => {
      const g = getGroup(name);
      if (!g) {
        console.error(`Group "${name}" not found.`);
        process.exit(1);
      }
      console.log(`Name: ${g.name}`);
      if (g.description) console.log(`Description: ${g.description}`);
      console.log(`Environments: ${g.environments.join(', ') || '(none)'}`);
      console.log(`Created: ${g.createdAt}`);
      console.log(`Updated: ${g.updatedAt}`);
    });

  group
    .command('add-env <groupName> <environment>')
    .description('Add an environment to a group')
    .action((groupName: string, environment: string) => {
      const ok = addEnvironmentToGroup(groupName, environment);
      if (ok) {
        console.log(`Added "${environment}" to group "${groupName}".`);
      } else {
        console.error(`Group "${groupName}" not found.`);
        process.exit(1);
      }
    });

  group
    .command('remove-env <groupName> <environment>')
    .description('Remove an environment from a group')
    .action((groupName: string, environment: string) => {
      const ok = removeEnvironmentFromGroup(groupName, environment);
      if (ok) {
        console.log(`Removed "${environment}" from group "${groupName}".`);
      } else {
        console.error(`Group "${groupName}" not found.`);
        process.exit(1);
      }
    });

  return group;
}
