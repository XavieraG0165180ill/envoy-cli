import { Command } from 'commander';
import { createPushCommand } from './push';
import { createPullCommand } from './pull';
import { createListCommand } from './list';
import { createInitCommand } from './init';

export function registerCommands(program: Command): void {
  program.addCommand(createInitCommand());
  program.addCommand(createPushCommand());
  program.addCommand(createPullCommand());
  program.addCommand(createListCommand());
}

export {
  createInitCommand,
  createPushCommand,
  createPullCommand,
  createListCommand,
};
