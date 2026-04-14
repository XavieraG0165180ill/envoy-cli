import { parseEnvContent } from './envParser';
import { loadEncryptedEnv } from './envStore';
import { loadMasterKey } from '../crypto/keyManager';
import { decrypt } from '../crypto/encryption';

export interface SearchResult {
  environment: string;
  key: string;
  value: string;
  line?: number;
}

export interface SearchOptions {
  keyPattern?: string;
  valuePattern?: string;
  caseSensitive?: boolean;
  exactMatch?: boolean;
}

export async function searchInEnvironment(
  environment: string,
  options: SearchOptions
): Promise<SearchResult[]> {
  const masterKey = await loadMasterKey();
  const encrypted = await loadEncryptedEnv(environment);
  const decrypted = await decrypt(encrypted, masterKey);
  const entries = parseEnvContent(decrypted);

  const results: SearchResult[] = [];
  const flags = options.caseSensitive ? '' : 'i';

  entries.forEach(({ key, value }, index) => {
    const keyMatch = matchesPattern(key, options.keyPattern, flags, options.exactMatch);
    const valueMatch = matchesPattern(value, options.valuePattern, flags, options.exactMatch);

    const keyPatternProvided = options.keyPattern !== undefined;
    const valuePatternProvided = options.valuePattern !== undefined;

    const matched =
      (!keyPatternProvided || keyMatch) && (!valuePatternProvided || valueMatch);

    if (matched) {
      results.push({ environment, key, value, line: index + 1 });
    }
  });

  return results;
}

function matchesPattern(
  text: string,
  pattern: string | undefined,
  flags: string,
  exactMatch?: boolean
): boolean {
  if (pattern === undefined) return true;
  if (exactMatch) {
    return flags.includes('i')
      ? text.toLowerCase() === pattern.toLowerCase()
      : text === pattern;
  }
  return new RegExp(pattern, flags).test(text);
}

export async function searchAcrossEnvironments(
  environments: string[],
  options: SearchOptions
): Promise<SearchResult[]> {
  const allResults: SearchResult[] = [];
  for (const env of environments) {
    try {
      const results = await searchInEnvironment(env, options);
      allResults.push(...results);
    } catch {
      // skip environments that cannot be read
    }
  }
  return allResults;
}
