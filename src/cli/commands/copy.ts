import { Command } from 'commander';
import { loadMasterKey } from '../../crypto/keyManager';
import { loadEnv, saveEnv } from '../../env/envStore';
import { parseEnvContent, serializeEnv } from '../../env/envParser';

export function createCopyCommand(): Command {
  const copy = new Command('copy');

  copy
    .alias('cp')
    .description('Copy environment variables from one environment to another')
    .argument('<source>', 'source environment name')
    .argument('<destination>', 'destination environment name')
    .option('-o, --overwrite', 'overwrite existing keys in destination', false)
    .option('-k, --keys <keys>', 'comma-separated list of keys to copy (copies all if omitted)')
    .action(async (source: string, destination: string, options) => {
      try {
        const masterKey = await loadMasterKey();

        const sourceContent = await loadEnv(source, masterKey);
        const sourceVars = parseEnvContent(sourceContent);

        let destVars: Record<string, string> = {};
        try {
          const destContent = await loadEnv(destination, masterKey);
          const parsed = parseEnvContent(destContent);
          destVars = Object.fromEntries(parsed.map((e) => [e.key, e.value]));
        } catch {
          // destination may not exist yet
        }

        const keyFilter = options.keys
          ? new Set(options.keys.split(',').map((k: string) => k.trim()))
          : null;

        let copied = 0;
        let skipped = 0;

        for (const entry of sourceVars) {
          if (keyFilter && !keyFilter.has(entry.key)) continue;
          if (!options.overwrite && entry.key in destVars) {
            skipped++;
            continue;
          }
          destVars[entry.key] = entry.value;
          copied++;
        }

        const merged = Object.entries(destVars).map(([key, value]) => ({ key, value }));
        const serialized = serializeEnv(merged);
        await saveEnv(destination, serialized, masterKey);

        console.log(`✔ Copied ${copied} variable(s) from '${source}' to '${destination}'.`);
        if (skipped > 0) {
          console.log(`  Skipped ${skipped} existing key(s). Use --overwrite to replace them.`);
        }
      } catch (err: any) {
        console.error(`Error: ${err.message}`);
        process.exit(1);
      }
    });

  return copy;
}
