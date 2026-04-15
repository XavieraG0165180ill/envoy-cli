import { Command } from 'commander';
import * as path from 'path';
import {
  getSecretFilePath,
  addSecret,
  getSecret,
  removeSecret,
  listSecrets,
} from '../../env/envSecret';

export function createSecretCommand(): Command {
  const secret = new Command('secret').description('Manage encrypted secrets for environments');

  secret
    .command('set <environment> <key> <value>')
    .description('Store an encrypted secret')
    .action(async (environment: string, key: string, value: string) => {
      const filePath = getSecretFilePath(process.cwd(), environment);
      await addSecret(filePath, environment, key, value);
      console.log(`Secret "${key}" stored for environment "${environment}".`);
    });

  secret
    .command('get <environment> <key>')
    .description('Retrieve and decrypt a secret')
    .action(async (environment: string, key: string) => {
      const filePath = getSecretFilePath(process.cwd(), environment);
      const value = await getSecret(filePath, environment, key);
      if (value === null) {
        console.error(`Secret "${key}" not found in environment "${environment}".`);
        process.exit(1);
      }
      console.log(value);
    });

  secret
    .command('remove <environment> <key>')
    .description('Remove a secret')
    .action((environment: string, key: string) => {
      const filePath = getSecretFilePath(process.cwd(), environment);
      const removed = removeSecret(filePath, environment, key);
      if (!removed) {
        console.error(`Secret "${key}" not found in environment "${environment}".`);
        process.exit(1);
      }
      console.log(`Secret "${key}" removed from environment "${environment}".`);
    });

  secret
    .command('list <environment>')
    .description('List all secret keys for an environment')
    .action((environment: string) => {
      const filePath = getSecretFilePath(process.cwd(), environment);
      const entries = listSecrets(filePath, environment);
      if (entries.length === 0) {
        console.log(`No secrets found for environment "${environment}".`);
        return;
      }
      console.log(`Secrets for "${environment}":`);
      entries.forEach(e => {
        console.log(`  ${e.key}  (updated: ${e.updatedAt})`);
      });
    });

  return secret;
}
