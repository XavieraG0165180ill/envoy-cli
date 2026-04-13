import { Command } from 'commander';
import * as fs from 'fs';
import * as path from 'path';
import { masterKeyExists, generateMasterKey, saveMasterKey } from '../../crypto/keyManager';

export function createInitCommand(): Command {
  const cmd = new Command('init');

  cmd
    .description('Initialize envoy in the current project directory')
    .option('--force', 'Overwrite existing configuration', false)
    .action(async (options) => {
      const envoyConfigPath = path.join(process.cwd(), '.envoy');

      if (fs.existsSync(envoyConfigPath) && !options.force) {
        console.error('envoy is already initialized. Use --force to reinitialize.');
        process.exit(1);
      }

      try {
        // Create .envoy directory
        if (!fs.existsSync(envoyConfigPath)) {
          fs.mkdirSync(envoyConfigPath, { recursive: true });
        }

        // Generate and save master key if not exists
        if (!masterKeyExists() || options.force) {
          const masterKey = generateMasterKey();
          saveMasterKey(masterKey);
          console.log('✔ Generated new master encryption key.');
        } else {
          console.log('✔ Master key already exists, skipping key generation.');
        }

        // Create default config file
        const configPath = path.join(envoyConfigPath, 'config.json');
        const defaultConfig = {
          version: '1.0.0',
          environments: [],
          createdAt: new Date().toISOString(),
        };

        if (!fs.existsSync(configPath) || options.force) {
          fs.writeFileSync(configPath, JSON.stringify(defaultConfig, null, 2), 'utf-8');
          console.log('✔ Created envoy configuration file.');
        }

        // Add .envoy/master.key to .gitignore if present
        const gitignorePath = path.join(process.cwd(), '.gitignore');
        if (fs.existsSync(gitignorePath)) {
          const gitignoreContent = fs.readFileSync(gitignorePath, 'utf-8');
          if (!gitignoreContent.includes('.envoy/master.key')) {
            fs.appendFileSync(gitignorePath, '\n.envoy/master.key\n');
            console.log('✔ Added .envoy/master.key to .gitignore.');
          }
        }

        console.log('\n🚀 envoy initialized successfully!');
      } catch (err) {
        console.error('Failed to initialize envoy:', (err as Error).message);
        process.exit(1);
      }
    });

  return cmd;
}
