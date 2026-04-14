import { Command } from 'commander';
import { createPushCommand } from './push';
import { createPullCommand } from './pull';
import { createListCommand } from './list';
import { createInitCommand } from './init';
import { createRotateCommand } from './rotate';
import { createDiffCommand } from './diff';
import { createExportCommand } from './export';
import { createCopyCommand } from './copy';
import { createValidateCommand } from './validate';
import { createRenameCommand } from './rename';
import { createHistoryCommand } from './history';
import { createAuditCommand } from './audit';
import { createImportCommand } from './import';
import { createSearchCommand } from './search';

export function registerCommands(program: Command): void {
  program.addCommand(createInitCommand());
  program.addCommand(createPushCommand());
  program.addCommand(createPullCommand());
  program.addCommand(createListCommand());
  program.addCommand(createRotateCommand());
  program.addCommand(createDiffCommand());
  program.addCommand(createExportCommand());
  program.addCommand(createCopyCommand());
  program.addCommand(createValidateCommand());
  program.addCommand(createRenameCommand());
  program.addCommand(createHistoryCommand());
  program.addCommand(createAuditCommand());
  program.addCommand(createImportCommand());
  program.addCommand(createSearchCommand());
}
