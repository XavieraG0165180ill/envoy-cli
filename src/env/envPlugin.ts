import * as fs from 'fs';
import * as path from 'path';
import { ensureEnvoyDir } from '../crypto/keyManager';

export interface Plugin {
  name: string;
  description: string;
  hookOn: 'push' | 'pull' | 'rotate' | 'any';
  scriptPath: string;
  enabled: boolean;
  createdAt: string;
}

export type PluginMap = Record<string, Plugin>;

export function getPluginFilePath(): string {
  const envoyDir = ensureEnvoyDir();
  return path.join(envoyDir, 'plugins.json');
}

export function loadPlugins(): PluginMap {
  const filePath = getPluginFilePath();
  if (!fs.existsSync(filePath)) return {};
  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(raw) as PluginMap;
  } catch {
    return {};
  }
}

export function savePlugins(plugins: PluginMap): void {
  const filePath = getPluginFilePath();
  fs.writeFileSync(filePath, JSON.stringify(plugins, null, 2), 'utf-8');
}

export function addPlugin(name: string, scriptPath: string, hookOn: Plugin['hookOn'], description: string): Plugin {
  const plugins = loadPlugins();
  if (plugins[name]) {
    throw new Error(`Plugin "${name}" already exists.`);
  }
  if (!fs.existsSync(scriptPath)) {
    throw new Error(`Script path "${scriptPath}" does not exist.`);
  }
  const plugin: Plugin = {
    name,
    description,
    hookOn,
    scriptPath,
    enabled: true,
    createdAt: new Date().toISOString(),
  };
  plugins[name] = plugin;
  savePlugins(plugins);
  return plugin;
}

export function removePlugin(name: string): void {
  const plugins = loadPlugins();
  if (!plugins[name]) {
    throw new Error(`Plugin "${name}" not found.`);
  }
  delete plugins[name];
  savePlugins(plugins);
}

export function togglePlugin(name: string, enabled: boolean): Plugin {
  const plugins = loadPlugins();
  if (!plugins[name]) {
    throw new Error(`Plugin "${name}" not found.`);
  }
  plugins[name].enabled = enabled;
  savePlugins(plugins);
  return plugins[name];
}

export function getPluginsForHook(hookOn: Plugin['hookOn']): Plugin[] {
  const plugins = loadPlugins();
  return Object.values(plugins).filter(
    (p) => p.enabled && (p.hookOn === hookOn || p.hookOn === 'any')
  );
}
