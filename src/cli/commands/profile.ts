import { Command } from 'commander';
import {
  addProfile,
  removeProfile,
  getProfile,
  listProfiles,
} from '../../env/envProfile';

export function createProfileCommand(): Command {
  const profile = new Command('profile').description('Manage environment profiles');

  profile
    .command('add <name>')
    .description('Create or update a profile')
    .requiredOption('-e, --environments <envs...>', 'Environments to include in the profile')
    .option('-d, --description <desc>', 'Profile description')
    .option('--default <env>', 'Default environment for this profile')
    .action((name: string, opts) => {
      const result = addProfile(name, opts.environments, opts.description, opts.default);
      console.log(`✅ Profile "${result.name}" saved with environments: ${result.environments.join(', ')}`);
      if (result.defaultEnvironment) {
        console.log(`   Default environment: ${result.defaultEnvironment}`);
      }
    });

  profile
    .command('remove <name>')
    .description('Remove a profile')
    .action((name: string) => {
      const removed = removeProfile(name);
      if (removed) {
        console.log(`🗑️  Profile "${name}" removed.`);
      } else {
        console.error(`❌ Profile "${name}" not found.`);
        process.exit(1);
      }
    });

  profile
    .command('show <name>')
    .description('Show details of a profile')
    .action((name: string) => {
      const p = getProfile(name);
      if (!p) {
        console.error(`❌ Profile "${name}" not found.`);
        process.exit(1);
      }
      console.log(`Profile: ${p.name}`);
      if (p.description) console.log(`  Description : ${p.description}`);
      console.log(`  Environments: ${p.environments.join(', ')}`);
      if (p.defaultEnvironment) console.log(`  Default     : ${p.defaultEnvironment}`);
      console.log(`  Created     : ${p.createdAt}`);
      console.log(`  Updated     : ${p.updatedAt}`);
    });

  profile
    .command('list')
    .description('List all profiles')
    .action(() => {
      const profiles = listProfiles();
      if (profiles.length === 0) {
        console.log('No profiles defined.');
        return;
      }
      profiles.forEach((p) => {
        const def = p.defaultEnvironment ? ` (default: ${p.defaultEnvironment})` : '';
        console.log(`  ${p.name}${def} — ${p.environments.join(', ')}`);
      });
    });

  return profile;
}
