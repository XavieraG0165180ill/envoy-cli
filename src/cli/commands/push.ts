import { Command } from 'commander';
import * as fs from 'fs';
import * as path from 'path';
import { parseEnvFile } from '../../env/envParser';
import { storeEnvironment, getStorePath } from '../../env/envStore';
import { encrypt } from '../../crypto/encryption';
import { loadMasterKey, masterKeyExists } from '../../crypto/keyManager';

export function createPushCommand(): Command {
  const push = new Command('push');

  push
    .description('Push a local .env file to the encrypted store')
    .argument('<environment>', 'Target environment name (e.g. development, production)')
    .option('-f, --file <path>', 'Path to the .env file', '.env')
    .action(async (environment: string, options: { file: string }) => {
      try {
        const filePath = path.resolve(process.cwd(), options.file);

        if (!fs.existsSync(filePath)) {
          console.error(`Error: File not found: ${filePath}`);
          process.exit(1);
        }

        if (!masterKeyExists()) {
          console.error('Error: No master key found. Run `envoy init` first.');
          process.exit(1);
        }

        const masterKey = loadMasterKey();
        const envVars = parseEnvFile(filePath);
        const serialized = JSON.stringify(envVars);
        const encrypted = await encrypt(serialized, masterKey);

        storeEnvironment(environment, encrypted);

        console.log(`✓ Pushed ${Object.keys(envVars).length} variable(s) to environment "${environment}"`);
      } catch (err) {
        console.error(`Error pushing environment: ${(err as Error).message}`);
        process.exit(1);
      }
    });

  return push;
}
