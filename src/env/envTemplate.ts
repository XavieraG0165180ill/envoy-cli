import * as fs from 'fs';
import * as path from 'path';
import { parseEnvContent, serializeEnv } from './envParser';

export interface TemplateEntry {
  key: string;
  defaultValue: string;
  comment?: string;
  required: boolean;
}

/**
 * Generate a template (.env.example) from an existing env record.
 * Strips sensitive values, replacing them with empty or placeholder strings.
 */
export function generateTemplate(
  envRecord: Record<string, string>,
  placeholderMap: Record<string, string> = {}
): Record<string, string> {
  const template: Record<string, string> = {};
  for (const key of Object.keys(envRecord)) {
    template[key] = placeholderMap[key] ?? '';
  }
  return template;
}

/**
 * Parse a template file into structured entries.
 * Lines beginning with `# required` mark the next key as required.
 */
export function parseTemplate(content: string): TemplateEntry[] {
  const lines = content.split('\n');
  const entries: TemplateEntry[] = [];
  let pendingComment: string | undefined;
  let nextRequired = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('#')) {
      const commentText = trimmed.slice(1).trim();
      if (commentText.toLowerCase() === 'required') {
        nextRequired = true;
      } else {
        pendingComment = commentText;
      }
      continue;
    }
    if (trimmed === '') {
      pendingComment = undefined;
      nextRequired = false;
      continue;
    }
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const defaultValue = trimmed.slice(eqIdx + 1).trim();
    entries.push({ key, defaultValue, comment: pendingComment, required: nextRequired });
    pendingComment = undefined;
    nextRequired = false;
  }
  return entries;
}

/**
 * Validate that all required template keys exist in a given env record.
 * Returns an array of missing required keys.
 */
export function validateAgainstTemplate(
  template: TemplateEntry[],
  envRecord: Record<string, string>
): string[] {
  return template
    .filter((entry) => entry.required && !(entry.key in envRecord))
    .map((entry) => entry.key);
}

/**
 * Write a template file to disk.
 */
export function writeTemplateFile(filePath: string, envRecord: Record<string, string>): void {
  const template = generateTemplate(envRecord);
  const content = serializeEnv(template);
  fs.writeFileSync(filePath, content, 'utf-8');
}
