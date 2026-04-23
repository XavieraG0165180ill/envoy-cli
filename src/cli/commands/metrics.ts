import { Command } from 'commander';
import { loadMetrics, getMetricsForEnvironment, clearMetrics } from '../../env/envMetrics';
import { EnvMetrics } from '../../env/envMetrics';

export function formatMetrics(m: EnvMetrics): string {
  return [
    `Environment : ${m.environment}`,
    `Keys        : ${m.keyCount}`,
    `Empty Values: ${m.emptyValues}`,
    `Total Bytes : ${m.totalBytes}`,
    `Last Updated: ${m.lastUpdated}`,
    `Change Freq : ${m.changeFrequency}/day (30d avg)`,
  ].join('\n');
}

export function createMetricsCommand(): Command {
  const cmd = new Command('metrics').description('View usage metrics for environments');

  cmd
    .command('show [environment]')
    .description('Show metrics for one or all environments')
    .action((environment?: string) => {
      if (environment) {
        const m = getMetricsForEnvironment(environment);
        if (!m) {
          console.error(`No metrics found for environment: ${environment}`);
          process.exit(1);
        }
        console.log(formatMetrics(m));
      } else {
        const store = loadMetrics();
        const entries = Object.values(store);
        if (entries.length === 0) {
          console.log('No metrics recorded yet.');
          return;
        }
        entries.forEach((m, i) => {
          if (i > 0) console.log('---');
          console.log(formatMetrics(m));
        });
      }
    });

  cmd
    .command('clear <environment>')
    .description('Clear metrics for a specific environment')
    .action((environment: string) => {
      clearMetrics(environment);
      console.log(`Metrics cleared for environment: ${environment}`);
    });

  cmd
    .command('list')
    .description('List all environments with recorded metrics')
    .action(() => {
      const store = loadMetrics();
      const keys = Object.keys(store);
      if (keys.length === 0) {
        console.log('No metrics recorded yet.');
        return;
      }
      keys.forEach(k => console.log(`  - ${k}`));
    });

  return cmd;
}
