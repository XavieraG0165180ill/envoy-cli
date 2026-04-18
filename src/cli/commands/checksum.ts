import { Command } from 'commander';
import * as fs from 'fs';
import {
  setChecksum,
  verifyChecksum,
  getChecksum,
  removeChecksum,
  loadChecksums,
} from '../../env/envChecksum';

export function createChecksumCommand(): Command {
  const cmd = new Command('checksum').description('Manage environment file checksums');

  cmd
    .command('set <environment> <file>')
    .description('Compute and store checksum for an env file')
    .action((environment: string, file: string) => {
      if (!fs.existsSync(file)) {
        console.error(`File not found: ${file}`);
        process.exit(1);
      }
      const content = fs.readFileSync(file, 'utf-8');
      const entry = setChecksum(environment, content);
      console.log(`Checksum set for '${environment}': ${entry.checksum}`);
    });

  cmd
    .command('verify <environment> <file>')
    .description('Verify env file against stored checksum')
    .action((environment: string, file: string) => {
      if (!fs.existsSync(file)) {
        console.error(`File not found: ${file}`);
        process.exit(1);
      }
      const content = fs.readFileSync(file, 'utf-8');
      const ok = verifyChecksum(environment, content);
      if (ok) {
        console.log(`✔ Checksum verified for '${environment}'`);
      } else {
        console.error(`✘ Checksum mismatch for '${environment}'`);
        process.exit(1);
      }
    });

  cmd
    .command('get <environment>')
    .description('Show stored checksum for an environment')
    .action((environment: string) => {
      const entry = getChecksum(environment);
      if (!entry) {
        console.error(`No checksum found for '${environment}'`);
        process.exit(1);
      }
      console.log(`${entry.environment}  ${entry.checksum}  (${entry.updatedAt})`);
    });

  cmd
    .command('remove <environment>')
    .description('Remove stored checksum for an environment')
    .action((environment: string) => {
      removeChecksum(environment);
      console.log(`Checksum removed for '${environment}'`);
    });

  cmd
    .command('list')
    .description('List all stored checksums')
    .action(() => {
      const all = loadChecksums();
      const entries = Object.values(all);
      if (entries.length === 0) {
        console.log('No checksums stored.');
        return;
      }
      entries.forEach(e => console.log(`${e.environment.padEnd(20)} ${e.checksum}  ${e.updatedAt}`));
    });

  return cmd;
}
