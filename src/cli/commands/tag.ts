import { Command } from 'commander';
import {
  addTag,
  removeTag,
  getTag,
  loadTags,
  listTagsForEnvironment,
} from '../../env/envTag';

export function createTagCommand(): Command {
  const tag = new Command('tag').description('Manage environment tags');

  tag
    .command('add <tag> <environment>')
    .description('Tag an environment with a label')
    .action((tagName: string, environment: string) => {
      addTag(tagName, environment);
      console.log(`Tag "${tagName}" added for environment "${environment}".`);
    });

  tag
    .command('remove <tag>')
    .description('Remove a tag')
    .action((tagName: string) => {
      const removed = removeTag(tagName);
      if (removed) {
        console.log(`Tag "${tagName}" removed.`);
      } else {
        console.error(`Tag "${tagName}" not found.`);
        process.exit(1);
      }
    });

  tag
    .command('show <tag>')
    .description('Show the environment associated with a tag')
    .action((tagName: string) => {
      const entry = getTag(tagName);
      if (!entry) {
        console.error(`Tag "${tagName}" not found.`);
        process.exit(1);
      }
      console.log(`Tag: ${entry.tag}`);
      console.log(`Environment: ${entry.environment}`);
      console.log(`Created: ${entry.createdAt}`);
    });

  tag
    .command('list [environment]')
    .description('List all tags, optionally filtered by environment')
    .action((environment?: string) => {
      const entries = environment
        ? listTagsForEnvironment(environment)
        : Object.values(loadTags());
      if (entries.length === 0) {
        console.log('No tags found.');
        return;
      }
      entries.forEach(e => {
        console.log(`  ${e.tag.padEnd(20)} -> ${e.environment}  (${e.createdAt})`);
      });
    });

  return tag;
}
