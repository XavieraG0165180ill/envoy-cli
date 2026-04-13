import { Command } from 'commander';
import chalk from 'chalk';
import { loadEnvStore, getStorePath } from '../../env/envStore';
import { loadMasterKey } from '../../crypto/keyManager';
import { decrypt } from '../../crypto/encryption';
import { parseEnvContent, envToRecord } from '../../env/envParser';
import * as fs from 'fs';

export function createDiffCommand(): Command {
  const cmd = new Command('diff');

  cmd
    .description('Show differences between a local .env file and a stored environment')
    .argument('<environment>', 'Environment name to compare against')
    .option('-f, --file <path>', 'Path to local .env file', '.env')
    .action(async (environment: string, options: { file: string }) => {
      try {
        if (!fs.existsSync(options.file)) {
          console.error(chalk.red(`Local file not found: ${options.file}`));
          process.exit(1);
        }

        const storePath = getStorePath(environment);
        if (!fs.existsSync(storePath)) {
          console.error(chalk.red(`No stored environment found: ${environment}`));
          process.exit(1);
        }

        const masterKey = await loadMasterKey();
        const encryptedData = fs.readFileSync(storePath, 'utf-8');
        const decrypted = await decrypt(encryptedData, masterKey);
        const storedVars = envToRecord(parseEnvContent(decrypted));

        const localContent = fs.readFileSync(options.file, 'utf-8');
        const localVars = envToRecord(parseEnvContent(localContent));

        const allKeys = new Set([...Object.keys(storedVars), ...Object.keys(localVars)]);
        let hasDiff = false;

        console.log(chalk.bold(`\nDiff: ${options.file} vs stored "${environment}"\n`));

        for (const key of Array.from(allKeys).sort()) {
          const localVal = localVars[key];
          const storedVal = storedVars[key];

          if (localVal === undefined) {
            console.log(chalk.red(`- ${key}=${storedVal}`));
            hasDiff = true;
          } else if (storedVal === undefined) {
            console.log(chalk.green(`+ ${key}=${localVal}`));
            hasDiff = true;
          } else if (localVal !== storedVal) {
            console.log(chalk.red(`- ${key}=${storedVal}`));
            console.log(chalk.green(`+ ${key}=${localVal}`));
            hasDiff = true;
          }
        }

        if (!hasDiff) {
          console.log(chalk.gray('No differences found.'));
        }
      } catch (err) {
        console.error(chalk.red(`Error: ${(err as Error).message}`));
        process.exit(1);
      }
    });

  return cmd;
}
