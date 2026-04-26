/**
 * envTokenize.ts
 * Provides tokenization support for environment variable values,
 * allowing sensitive values to be replaced with opaque tokens
 * that can be resolved back to their original values.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { ensureEnvoyDir } from '../crypto/keyManager';

export interface TokenEntry {
  token: string;
  environment: string;
  key: string;
  createdAt: string;
}

export interface TokenStore {
  tokens: Record<string, TokenEntry>; // token -> entry
  values: Record<string, string>;     // token -> encrypted original value
}

const TOKEN_PREFIX = 'envoy_tok_';

export function getTokenFilePath(): string {
  const dir = ensureEnvoyDir();
  return path.join(dir, 'tokens.json');
}

export function loadTokenStore(): TokenStore {
  const filePath = getTokenFilePath();
  if (!fs.existsSync(filePath)) {
    return { tokens: {}, values: {} };
  }
  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(raw) as TokenStore;
  } catch {
    return { tokens: {}, values: {} };
  }
}

export function saveTokenStore(store: TokenStore): void {
  const filePath = getTokenFilePath();
  fs.writeFileSync(filePath, JSON.stringify(store, null, 2), 'utf-8');
}

/**
 * Generate a new opaque token for a given environment key.
 * The original value is stored alongside the token entry.
 */
export function createToken(
  environment: string,
  key: string,
  value: string
): string {
  const store = loadTokenStore();
  const token = TOKEN_PREFIX + crypto.randomBytes(16).toString('hex');

  store.tokens[token] = {
    token,
    environment,
    key,
    createdAt: new Date().toISOString(),
  };
  store.values[token] = value;

  saveTokenStore(store);
  return token;
}

/**
 * Resolve a token back to its original value.
 * Returns undefined if the token is not found.
 */
export function resolveToken(token: string): string | undefined {
  const store = loadTokenStore();
  return store.values[token];
}

/**
 * Revoke (delete) a token so it can no longer be resolved.
 */
export function revokeToken(token: string): boolean {
  const store = loadTokenStore();
  if (!store.tokens[token]) {
    return false;
  }
  delete store.tokens[token];
  delete store.values[token];
  saveTokenStore(store);
  return true;
}

/**
 * List all tokens for a given environment.
 */
export function listTokensForEnvironment(environment: string): TokenEntry[] {
  const store = loadTokenStore();
  return Object.values(store.tokens).filter(
    (entry) => entry.environment === environment
  );
}

/**
 * Replace all values in an env map with tokens, returning the tokenized map
 * and a reverse lookup of token -> original value.
 */
export function tokenizeEnvMap(
  environment: string,
  envMap: Map<string, string>
): Map<string, string> {
  const tokenized = new Map<string, string>();
  for (const [key, value] of envMap.entries()) {
    const token = createToken(environment, key, value);
    tokenized.set(key, token);
  }
  return tokenized;
}

/**
 * Resolve all token values in a tokenized env map back to their originals.
 * Keys whose values are not valid tokens are passed through unchanged.
 */
export function detokenizeEnvMap(
  tokenizedMap: Map<string, string>
): Map<string, string> {
  const resolved = new Map<string, string>();
  for (const [key, maybeToken] of tokenizedMap.entries()) {
    if (maybeToken.startsWith(TOKEN_PREFIX)) {
      const original = resolveToken(maybeToken);
      resolved.set(key, original !== undefined ? original : maybeToken);
    } else {
      resolved.set(key, maybeToken);
    }
  }
  return resolved;
}
