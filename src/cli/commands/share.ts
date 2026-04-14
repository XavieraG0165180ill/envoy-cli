import { Command } from 'commander';
import {
  createShareToken,
  resolveShareToken,
  revokeShareToken,
  listShareTokens,
} from '../../env/envShare';
import { parseEnvContent, serializeEnv } from '../../env/envParser';
import { getStorePath } from '../../env/envStore';
import * as fs from 'fs';

export function createShareCommand(): Command {
  const share = new Command('share').description('Share environment variables securely via tokens');

  share
    .command('create <environment>')
    .description('Create a share token for an environment')
    .option('--ttl <minutes>', 'Token time-to-live in minutes')
    .action(async (environment: string, options: { ttl?: string }) => {
      try {
        const ttl = options.ttl ? parseInt(options.ttl, 10) : undefined;
        const token = await createShareToken(environment, ttl);
        console.log(`Share token created: ${token.id}`);
        console.log(`Environment: ${token.environment}`);
        console.log(`Created: ${token.createdAt}`);
        console.log(`Expires: ${token.expiresAt ?? 'Never'}`);
        console.log(`\nUse: envoy share resolve ${token.id}`);
      } catch (err: any) {
        console.error(`Error: ${err.message}`);
        process.exit(1);
      }
    });

  share
    .command('resolve <id>')
    .description('Resolve a share token and print the env content')
    .option('--output <file>', 'Write resolved env to a file instead of stdout')
    .action(async (id: string, options: { output?: string }) => {
      try {
        const content = await resolveShareToken(id);
        if (options.output) {
          fs.writeFileSync(options.output, content);
          console.log(`Written to ${options.output}`);
        } else {
          console.log(content);
        }
      } catch (err: any) {
        console.error(`Error: ${err.message}`);
        process.exit(1);
      }
    });

  share
    .command('revoke <id>')
    .description('Revoke a share token')
    .action((id: string) => {
      try {
        revokeShareToken(id);
        console.log(`Share token '${id}' revoked.`);
      } catch (err: any) {
        console.error(`Error: ${err.message}`);
        process.exit(1);
      }
    });

  share
    .command('list')
    .description('List all active share tokens')
    .action(() => {
      const tokens = listShareTokens();
      if (tokens.length === 0) {
        console.log('No active share tokens.');
        return;
      }
      tokens.forEach(t => {
        const expired = t.expiresAt && new Date(t.expiresAt) < new Date();
        const status = expired ? '[EXPIRED]' : '[ACTIVE]';
        console.log(`${status} ${t.id} — ${t.environment} (created: ${t.createdAt}, expires: ${t.expiresAt ?? 'never'})`);
      });
    });

  return share;
}
