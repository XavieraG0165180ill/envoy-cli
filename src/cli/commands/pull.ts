import { Command } from 'commander';
import * as fs from 'fs';
import * as path from 'path';
import { serializeEnv } from '../../env/envParser';
import { loadEnvironment, listStoredEnvironments } from '../../env/envStore';
import { decrypt } from '../../crypto/encryption';
import { loadMasterKey, masterKeyExists } from '../../crypto/keyManager';

export function createPullCommand(): Command {
  const pull = new Command('pull');

  pull
    .description('Pull an environment from the encrypted store to a local .env file')
    .argument('<environment>', 'Source environment name (e.g. development, production)')
    .option('-f, --file <path>', 'Output .env file path', '.env')
    .option('--overwrite', 'Overwrite existing file without prompting', false)
    .action(async (environment: string, options: { file: string; overwrite: boolean }) => {
      try {
        if (!masterKeyExists()) {
          console.error('Error: No master key found. Run `envoy init` first.');
          process.exit(1);
        }

        const available = listStoredEnvironments();
        if (!available.includes(environment)) {
          console.error(`Error: Environment "${environment}" not found. Available: ${available.join(', ') || 'none'}`);
          process.exit(1);
        }

        const outputPath = path.resolve(process.cwd(), options.file);

        if (fs.existsSync(outputPath) && !options.overwrite) {
          console.error(`Error: File already exists: ${outputPath}. Use --overwrite to replace it.`);
          process.exit(1);
        }

        const masterKey = loadMasterKey();
        const encrypted = loadEnvironment(environment);
        const decrypted = await decrypt(encrypted, masterKey);
        const envVars: Record<string, string> = JSON.parse(decrypted);
        const content = serializeEnv(envVars);

        fs.writeFileSync(outputPath, content, 'utf-8');

        console.log(`✓ Pulled ${Object.keys(envVars).length} variable(s) from "${environment}" to ${options.file}`);
      } catch (err) {
        console.error(`Error pulling environment: ${(err as Error).message}`);
        process.exit(1);
      }
    });

  return pull;
}
