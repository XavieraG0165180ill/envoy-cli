import { Command } from 'commander';
import {
  addCondition,
  removeCondition,
  getConditionsForEnvironment,
  loadConditions,
  evaluateCondition,
  Condition,
} from '../../env/envCondition';
import { loadMasterKey } from '../../crypto/keyManager';
import { getStorePath } from '../../env/envStore';
import { parseEnvContent } from '../../env/envParser';
import * as fs from 'fs';

function formatCondition(c: Condition): string {
  const valueStr = c.value ? ` "${c.value}"` : '';
  return `[${c.id}] ${c.environment} | ${c.key} ${c.operator}${valueStr} → ${c.action}${
    c.message ? ` ("${c.message}")` : ''
  }`;
}

export function createConditionCommand(): Command {
  const cmd = new Command('condition').description('Manage environment key conditions');

  cmd
    .command('add <environment> <key> <operator>')
    .description('Add a condition for an environment key (operators: exists, not_exists, eq, neq, matches)')
    .option('-v, --value <value>', 'Value for eq/neq/matches operators')
    .option('-a, --action <action>', 'Action on failure: require, warn, block', 'warn')
    .option('-m, --message <message>', 'Custom failure message')
    .action((environment, key, operator, opts) => {
      const cond = addCondition({
        environment,
        key,
        operator: operator as Condition['operator'],
        value: opts.value,
        action: opts.action as Condition['action'],
        message: opts.message,
      });
      console.log(`Condition added: ${formatCondition(cond)}`);
    });

  cmd
    .command('remove <id>')
    .description('Remove a condition by ID')
    .action((id) => {
      const removed = removeCondition(id);
      if (removed) {
        console.log(`Condition ${id} removed.`);
      } else {
        console.error(`Condition ${id} not found.`);
        process.exit(1);
      }
    });

  cmd
    .command('list [environment]')
    .description('List conditions, optionally filtered by environment')
    .action((environment) => {
      const conditions = environment
        ? getConditionsForEnvironment(environment)
        : loadConditions();
      if (conditions.length === 0) {
        console.log('No conditions found.');
        return;
      }
      conditions.forEach((c) => console.log(formatCondition(c)));
    });

  cmd
    .command('check <environment>')
    .description('Evaluate all conditions for an environment against stored values')
    .action((environment) => {
      const storePath = getStorePath(environment);
      if (!fs.existsSync(storePath)) {
        console.error(`No stored env found for environment: ${environment}`);
        process.exit(1);
      }
      const raw = fs.readFileSync(storePath, 'utf-8');
      const envMap = parseEnvContent(raw);
      const conditions = getConditionsForEnvironment(environment);
      if (conditions.length === 0) {
        console.log('No conditions defined for this environment.');
        return;
      }
      let hasFailure = false;
      for (const cond of conditions) {
        const { passed, message } = evaluateCondition(cond, envMap);
        if (!passed) {
          hasFailure = true;
          const prefix = cond.action === 'block' ? '✖ BLOCK' : cond.action === 'require' ? '✖ REQUIRE' : '⚠ WARN';
          console.log(`${prefix}: ${message}`);
        } else {
          console.log(`✔ PASS: ${cond.key} ${cond.operator}`);
        }
      }
      if (hasFailure) process.exit(1);
    });

  return cmd;
}
