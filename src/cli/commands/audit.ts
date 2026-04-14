import { Command } from 'commander';
import { loadAuditLog, getAuditForEnvironment, clearAuditLog } from '../../env/envAudit';

function formatEntry(entry: {
  timestamp: string;
  action: string;
  environment: string;
  user?: string;
  details?: string;
}): string {
  const parts = [
    `[${entry.timestamp}]`,
    entry.action.toUpperCase().padEnd(8),
    entry.environment,
  ];
  if (entry.user) parts.push(`by ${entry.user}`);
  if (entry.details) parts.push(`— ${entry.details}`);
  return parts.join(' ');
}

export function createAuditCommand(): Command {
  const audit = new Command('audit');

  audit
    .description('View the audit log of envoy actions')
    .option('-e, --env <environment>', 'Filter by environment')
    .option('--clear', 'Clear the audit log')
    .option('-n, --limit <number>', 'Limit number of entries shown', '20')
    .action((options) => {
      if (options.clear) {
        clearAuditLog();
        console.log('Audit log cleared.');
        return;
      }

      const entries = options.env
        ? getAuditForEnvironment(options.env)
        : loadAuditLog();

      if (entries.length === 0) {
        console.log('No audit entries found.');
        return;
      }

      const limit = parseInt(options.limit, 10);
      const shown = entries.slice(-limit);

      console.log(`Showing last ${shown.length} audit entries:\n`);
      shown.forEach((entry) => console.log(formatEntry(entry)));
    });

  return audit;
}
