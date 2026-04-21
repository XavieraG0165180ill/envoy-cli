import { Command } from 'commander';
import { buildReplaySession, getStepAt, replayToTimestamp } from '../../env/envReplay';

function formatStep(step: ReturnType<typeof getStepAt>): string {
  if (!step) return 'No step found.';
  const lines = [
    `Timestamp : ${step.timestamp}`,
    `Action    : ${step.action}`,
    `Keys      : ${step.keys.join(', ') || '(none)'}`,
    `Snapshot  :`,
    ...Object.entries(step.snapshot).map(([k, v]) => `  ${k}=${v}`),
  ];
  return lines.join('\n');
}

export function createReplayCommand(): Command {
  const cmd = new Command('replay');

  cmd
    .description('Replay the history of an environment step by step')
    .argument('<environment>', 'Environment name to replay')
    .option('--from <timestamp>', 'Start replay from this ISO timestamp')
    .option('--to <timestamp>', 'End replay at this ISO timestamp')
    .option('--step <number>', 'Show a specific step by index (0-based)', parseInt)
    .option('--at <timestamp>', 'Show the environment state at a specific timestamp')
    .action((environment: string, options) => {
      const session = buildReplaySession(environment, options.from, options.to);

      if (session.steps.length === 0) {
        console.log(`No history found for environment "${environment}".`);
        return;
      }

      if (options.at !== undefined) {
        const step = replayToTimestamp(session, options.at);
        console.log(`State at ${options.at}:\n`);
        console.log(formatStep(step));
        return;
      }

      if (options.step !== undefined) {
        const step = getStepAt(session, options.step);
        if (!step) {
          console.error(`Step ${options.step} does not exist. Session has ${session.steps.length} step(s).`);
          process.exit(1);
        }
        console.log(`Step ${options.step}:\n`);
        console.log(formatStep(step));
        return;
      }

      console.log(`Replay session for "${environment}" — ${session.steps.length} step(s):\n`);
      session.steps.forEach((step, i) => {
        console.log(`--- Step ${i} ---`);
        console.log(formatStep(step));
        console.log();
      });
    });

  return cmd;
}
