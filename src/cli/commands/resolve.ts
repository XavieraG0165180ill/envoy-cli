import { Command } from 'commander';
import * as fs from 'fs';
import * as path from 'path';
import { parseEnvContent, serializeEnv } from '../../env/envParser';
import { resolveEnv } from '../../env/envResolve';

export function createResolveCommand(): Command {
  const cmd = new Command('resolve');

  cmd
    .description('Resolve and interpolate variable references in an env file')
    .argument('<file>', 'Path to the .env file to resolve')
    .option('-b, --base <file>', 'Base .env file to inherit missing values from')
    .option('-o, --output <file>', 'Write resolved output to file instead of stdout')
    .option('--no-interpolate', 'Skip variable interpolation')
    .option('--set <assignments...>', 'Override values (KEY=VALUE format)')
    .action((file: string, options) => {
      if (!fs.existsSync(file)) {
        console.error(`File not found: ${file}`);
        process.exit(1);
      }

      const content = fs.readFileSync(file, 'utf-8');
      const base = parseEnvContent(content);

      const overrides: Record<string, string> = {};
      if (options.set) {
        for (const assignment of options.set as string[]) {
          const idx = assignment.indexOf('=');
          if (idx === -1) {
            console.error(`Invalid assignment: ${assignment}`);
            process.exit(1);
          }
          overrides[assignment.slice(0, idx)] = assignment.slice(idx + 1);
        }
      }

      const resolved = resolveEnv(base, {
        baseEnv: options.base,
        overrides,
        interpolate: options.interpolate !== false,
      });

      const output = serializeEnv(resolved);

      if (options.output) {
        fs.writeFileSync(options.output, output, 'utf-8');
        console.log(`Resolved env written to ${options.output}`);
      } else {
        process.stdout.write(output);
      }
    });

  return cmd;
}
