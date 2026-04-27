import { Command } from 'commander';
import * as fs from 'fs';
import { checkEnvironmentHealth, runHealthReport } from '../../env/envHealthCheck';
import { getStorePath } from '../../env/envStore';

function formatResult(env: string, healthy: boolean, issues: string[]): string {
  const icon = healthy ? '✅' : '❌';
  const lines = [`${icon} ${env}: ${healthy ? 'healthy' : 'unhealthy'}`];
  for (const issue of issues) {
    lines.push(`   • ${issue}`);
  }
  return lines.join('\n');
}

export function createHealthCheckCommand(): Command {
  const cmd = new Command('healthcheck');

  cmd
    .description('Check the health of one or more environments')
    .argument('[environments...]', 'environments to check (defaults to all known)')
    .option('--json', 'output results as JSON')
    .action(async (environments: string[], options: { json?: boolean }) => {
      let envs: string[] = environments;

      if (envs.length === 0) {
        // Discover environments by listing store files
        const storeDir = getStorePath('__probe__').replace('/__probe__.enc', '');
        if (fs.existsSync(storeDir)) {
          envs = fs
            .readdirSync(storeDir)
            .filter((f) => f.endsWith('.enc'))
            .map((f) => f.replace('.enc', ''));
        }
      }

      if (envs.length === 0) {
        console.log('No environments found.');
        return;
      }

      const report = await runHealthReport(envs);

      if (options.json) {
        console.log(JSON.stringify(report, null, 2));
        return;
      }

      for (const result of report.results) {
        console.log(formatResult(result.environment, result.healthy, result.issues));
      }

      console.log(
        `\nSummary: ${report.summary.healthy}/${report.summary.total} environments healthy`
      );

      if (report.summary.unhealthy > 0) {
        process.exitCode = 1;
      }
    });

  return cmd;
}
