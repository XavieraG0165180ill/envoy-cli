import { Command } from 'commander';
import * as path from 'path';
import * as process from 'process';
import {
  loadCascadeConfig,
  saveCascadeConfig,
  removeCascadeConfig,
  resolveCascade,
  CascadeConfig,
} from '../../env/envCascade';
import { serializeEnv } from '../../env/envParser';

export function createCascadeCommand(): Command {
  const cascade = new Command('cascade').description('Manage environment cascade resolution');

  cascade
    .command('set <target>')
    .description('Set cascade chain for a target environment')
    .requiredOption('-e, --envs <envs>', 'Comma-separated list of environments to cascade from')
    .option('-s, --strategy <strategy>', 'Resolution strategy: merge or override', 'override')
    .action((target: string, opts: { envs: string; strategy: string }) => {
      const baseDir = process.cwd();
      const environments = opts.envs.split(',').map((e) => e.trim()).filter(Boolean);
      const strategy = opts.strategy === 'merge' ? 'merge' : 'override';
      const config: CascadeConfig = { environments, strategy };
      saveCascadeConfig(baseDir, config);
      console.log(`Cascade set for "${target}": [${environments.join(' -> ')}] -> ${target} (${strategy})`);
    });

  cascade
    .command('show')
    .description('Show current cascade configuration')
    .action(() => {
      const baseDir = process.cwd();
      const config = loadCascadeConfig(baseDir);
      if (!config) {
        console.log('No cascade configuration found.');
        return;
      }
      console.log(`Strategy : ${config.strategy}`);
      console.log(`Chain    : ${config.environments.join(' -> ')}`);
    });

  cascade
    .command('resolve <target>')
    .description('Resolve and print the cascaded environment')
    .action((target: string) => {
      const baseDir = process.cwd();
      const config = loadCascadeConfig(baseDir);
      if (!config) {
        console.error('No cascade configuration found. Run `cascade set` first.');
        process.exit(1);
      }
      const resolved = resolveCascade(baseDir, target, config);
      console.log(serializeEnv(resolved));
    });

  cascade
    .command('remove')
    .description('Remove cascade configuration')
    .action(() => {
      const baseDir = process.cwd();
      removeCascadeConfig(baseDir);
      console.log('Cascade configuration removed.');
    });

  return cascade;
}
