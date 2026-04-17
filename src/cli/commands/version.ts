import { Command } from 'commander';
import {
  addVersion,
  removeVersion,
  getVersionsForEnvironment,
  getVersionById,
  generateChecksum,
  EnvVersion,
} from '../../env/envVersion';
import { randomUUID } from 'crypto';

function formatVersion(v: EnvVersion): string {
  return `[${v.id}] ${v.environment} @ ${v.timestamp}${v.message ? ' — ' + v.message : ''} (checksum: ${v.checksum})`;
}

export function createVersionCommand(): Command {
  const cmd = new Command('version').description('Manage environment versions');

  cmd
    .command('add <environment> <content>')
    .description('Tag a new version for an environment')
    .option('-m, --message <msg>', 'Version message')
    .action((environment: string, content: string, opts) => {
      const version: EnvVersion = {
        id: randomUUID().slice(0, 8),
        environment,
        timestamp: new Date().toISOString(),
        message: opts.message,
        checksum: generateChecksum(content),
      };
      addVersion(version);
      console.log(`Version ${version.id} added for ${environment}.`);
    });

  cmd
    .command('list <environment>')
    .description('List versions for an environment')
    .action((environment: string) => {
      const versions = getVersionsForEnvironment(environment);
      if (!versions.length) {
        console.log(`No versions found for ${environment}.`);
        return;
      }
      versions.forEach(v => console.log(formatVersion(v)));
    });

  cmd
    .command('show <id>')
    .description('Show details for a specific version')
    .action((id: string) => {
      const v = getVersionById(id);
      if (!v) { console.error(`Version ${id} not found.`); process.exit(1); }
      console.log(formatVersion(v));
    });

  cmd
    .command('remove <id>')
    .description('Remove a version by id')
    .action((id: string) => {
      if (!removeVersion(id)) { console.error(`Version ${id} not found.`); process.exit(1); }
      console.log(`Version ${id} removed.`);
    });

  return cmd;
}
