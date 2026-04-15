import { Command } from 'commander';
import {
  addRole,
  removeRole,
  assignRole,
  listRoles,
  getRoleForUser,
  Permission,
} from '../../env/envRole';

export function createRoleCommand(): Command {
  const role = new Command('role').description('Manage roles and permissions for environments');

  role
    .command('add <name>')
    .description('Add a new role with permissions and environment access')
    .option('-p, --permissions <perms>', 'Comma-separated permissions: read,write,admin', 'read')
    .option('-e, --environments <envs>', 'Comma-separated environments or * for all', '*')
    .action((name: string, options: { permissions: string; environments: string }) => {
      const permissions = options.permissions.split(',').map((p) => p.trim()) as Permission[];
      const environments = options.environments.split(',').map((e) => e.trim());
      try {
        const r = addRole(name, permissions, environments);
        console.log(`✅ Role "${r.name}" created with permissions: ${r.permissions.join(', ')}`);
      } catch (err: any) {
        console.error(`❌ ${err.message}`);
        process.exit(1);
      }
    });

  role
    .command('remove <name>')
    .description('Remove a role')
    .action((name: string) => {
      try {
        removeRole(name);
        console.log(`🗑️  Role "${name}" removed.`);
      } catch (err: any) {
        console.error(`❌ ${err.message}`);
        process.exit(1);
      }
    });

  role
    .command('assign <userId> <roleName>')
    .description('Assign a role to a user')
    .action((userId: string, roleName: string) => {
      try {
        assignRole(userId, roleName);
        console.log(`👤 User "${userId}" assigned role "${roleName}".`);
      } catch (err: any) {
        console.error(`❌ ${err.message}`);
        process.exit(1);
      }
    });

  role
    .command('list')
    .description('List all roles')
    .action(() => {
      const roles = listRoles();
      if (roles.length === 0) {
        console.log('No roles defined.');
        return;
      }
      roles.forEach((r) => {
        console.log(`• ${r.name} | permissions: ${r.permissions.join(', ')} | envs: ${r.environments.join(', ')}`);
      });
    });

  role
    .command('whoami <userId>')
    .description('Show the role assigned to a user')
    .action((userId: string) => {
      const r = getRoleForUser(userId);
      if (!r) {
        console.log(`User "${userId}" has no assigned role.`);
      } else {
        console.log(`User "${userId}" → role: ${r.name} | permissions: ${r.permissions.join(', ')} | envs: ${r.environments.join(', ')}`);
      }
    });

  return role;
}
