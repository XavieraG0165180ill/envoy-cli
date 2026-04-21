import { Command } from 'commander';
import {
  addPipeline,
  removePipeline,
  getPipelinesForEnvironment,
  loadPipelines,
  updatePipeline,
  PipelineStep,
} from '../../env/envPipeline';

function formatPipeline(env: string, steps: PipelineStep[]): string {
  const lines = [`Environment: ${env}`, 'Steps:'];
  steps.forEach((s, i) => {
    const args = s.args ? ` ${s.args.join(' ')}` : '';
    lines.push(`  ${i + 1}. [${s.name}] ${s.command}${args}`);
  });
  return lines.join('\n');
}

export function createPipelineCommand(): Command {
  const cmd = new Command('pipeline').description('Manage environment pipelines');

  cmd
    .command('add <environment>')
    .description('Add a pipeline for an environment (steps as JSON)')
    .requiredOption('-s, --steps <json>', 'Pipeline steps as a JSON array')
    .action((environment: string, options: { steps: string }) => {
      let steps: PipelineStep[];
      try {
        steps = JSON.parse(options.steps);
      } catch {
        console.error('Invalid JSON for steps.');
        process.exit(1);
      }
      const pipeline = addPipeline(environment, steps);
      console.log(`Pipeline created: ${pipeline.id}`);
      console.log(formatPipeline(pipeline.environment, pipeline.steps));
    });

  cmd
    .command('remove <id>')
    .description('Remove a pipeline by ID')
    .action((id: string) => {
      const removed = removePipeline(id);
      if (removed) {
        console.log(`Pipeline ${id} removed.`);
      } else {
        console.error(`Pipeline ${id} not found.`);
        process.exit(1);
      }
    });

  cmd
    .command('list [environment]')
    .description('List pipelines, optionally filtered by environment')
    .action((environment?: string) => {
      const pipelines = environment
        ? getPipelinesForEnvironment(environment)
        : loadPipelines();
      if (pipelines.length === 0) {
        console.log('No pipelines found.');
        return;
      }
      pipelines.forEach(p => {
        console.log(`\nID: ${p.id}`);
        console.log(formatPipeline(p.environment, p.steps));
      });
    });

  cmd
    .command('update <id>')
    .description('Update steps for an existing pipeline')
    .requiredOption('-s, --steps <json>', 'New pipeline steps as a JSON array')
    .action((id: string, options: { steps: string }) => {
      let steps: PipelineStep[];
      try {
        steps = JSON.parse(options.steps);
      } catch {
        console.error('Invalid JSON for steps.');
        process.exit(1);
      }
      const updated = updatePipeline(id, steps);
      if (!updated) {
        console.error(`Pipeline ${id} not found.`);
        process.exit(1);
      }
      console.log(`Pipeline ${id} updated.`);
      console.log(formatPipeline(updated.environment, updated.steps));
    });

  return cmd;
}
