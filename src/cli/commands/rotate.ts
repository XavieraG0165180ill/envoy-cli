import { Command } from 'commander';
import * as path from 'path';
import * as fs from 'fs';
import { generateMasterKey, saveMasterKey, loadMasterKey, ensureEnvoyDir } from '../../crypto/keyManager';
import { listStoredEnvironments, getStorePath } from '../../env/envStore';
import { encrypt, decrypt } from '../../crypto/encryption';

export function createRotateCommand(): Command {
  const cmd = new Command('rotate');

  cmd
    .description('Rotate the master encryption key and re-encrypt all stored environments')
    .option('-f, --force', 'Skip confirmation prompt', false)
    .action(async (options) => {
      try {
        ensureEnvoyDir();

        const oldKey = loadMasterKey();
        if (!oldKey) {
          console.error('No master key found. Run `envoy init` first.');
          process.exit(1);
        }

        const environments = listStoredEnvironments();
        if (environments.length === 0) {
          console.log('No stored environments found. Generating new key...');
        } else {
          console.log(`Found ${environments.length} environment(s) to re-encrypt: ${environments.join(', ')}`);
        }

        if (!options.force) {
          const readline = await import('readline');
          const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
          const confirmed = await new Promise<boolean>((resolve) => {
            rl.question('Rotate master key? This will re-encrypt all environments. (y/N): ', (answer) => {
              rl.close();
              resolve(answer.toLowerCase() === 'y');
            });
          });
          if (!confirmed) {
            console.log('Key rotation cancelled.');
            return;
          }
        }

        const decryptedEnvs: Record<string, string> = {};
        for (const env of environments) {
          const storePath = getStorePath(env);
          const encryptedData = fs.readFileSync(storePath, 'utf-8');
          decryptedEnvs[env] = decrypt(encryptedData, oldKey);
        }

        const newKey = generateMasterKey();
        saveMasterKey(newKey);

        for (const env of environments) {
          const storePath = getStorePath(env);
          const reEncrypted = encrypt(decryptedEnvs[env], newKey);
          fs.writeFileSync(storePath, reEncrypted, 'utf-8');
        }

        console.log(`✓ Master key rotated successfully.`);
        if (environments.length > 0) {
          console.log(`✓ Re-encrypted ${environments.length} environment(s).`);
        }
      } catch (err) {
        console.error('Key rotation failed:', (err as Error).message);
        process.exit(1);
      }
    });

  return cmd;
}
