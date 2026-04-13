import { Command } from 'commander';
import { createPushCommand } from './push';
import { createPullCommand } from './pull';
import { createListCommand } from './list';
import { createInitCommand } from './init';
import { createRotateCommand } from './rotate';
import { createDiffCommand } from './diff';
import { createExportCommand } from './export';
import { createCopyCommand } from './copy';

export function registerCommands(program: Command): void {
  program.addCommand(createInitCommand());
  program.addCommand(createPushCommand());
  program.addCommand(createPullCommand());
  program.addCommand(createListCommand());
  program.addCommand(createRotateCommand());
  program.addCommand(createDiffCommand());
  program.addCommand(createExportCommand());
  program.addCommand(createCopyCommand());
}
