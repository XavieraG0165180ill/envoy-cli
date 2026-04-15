import * as fs from 'fs';
import * as path from 'path';
import { ensureEnvoyDir } from '../crypto/keyManager';

export type Permission = 'read' | 'write' | 'admin';

export interface Role {
  name: string;
  permissions: Permission[];
  environments: string[];
  createdAt: string;
}

export interface RoleStore {
  roles: Record<string, Role>;
  assignments: Record<string, string>; // userId -> roleName
}

export function getRoleFilePath(): string {
  const envoyDir = ensureEnvoyDir();
  return path.join(envoyDir, 'roles.json');
}

export function loadRoles(): RoleStore {
  const filePath = getRoleFilePath();
  if (!fs.existsSync(filePath)) {
    return { roles: {}, assignments: {} };
  }
  const content = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(content) as RoleStore;
}

export function saveRoles(store: RoleStore): void {
  const filePath = getRoleFilePath();
  fs.writeFileSync(filePath, JSON.stringify(store, null, 2), 'utf-8');
}

export function addRole(name: string, permissions: Permission[], environments: string[]): Role {
  const store = loadRoles();
  if (store.roles[name]) {
    throw new Error(`Role "${name}" already exists.`);
  }
  const role: Role = { name, permissions, environments, createdAt: new Date().toISOString() };
  store.roles[name] = role;
  saveRoles(store);
  return role;
}

export function removeRole(name: string): void {
  const store = loadRoles();
  if (!store.roles[name]) {
    throw new Error(`Role "${name}" not found.`);
  }
  delete store.roles[name];
  for (const userId of Object.keys(store.assignments)) {
    if (store.assignments[userId] === name) {
      delete store.assignments[userId];
    }
  }
  saveRoles(store);
}

export function assignRole(userId: string, roleName: string): void {
  const store = loadRoles();
  if (!store.roles[roleName]) {
    throw new Error(`Role "${roleName}" not found.`);
  }
  store.assignments[userId] = roleName;
  saveRoles(store);
}

export function getRoleForUser(userId: string): Role | null {
  const store = loadRoles();
  const roleName = store.assignments[userId];
  return roleName ? store.roles[roleName] ?? null : null;
}

export function listRoles(): Role[] {
  const store = loadRoles();
  return Object.values(store.roles);
}

export function hasPermission(userId: string, permission: Permission, environment: string): boolean {
  const role = getRoleForUser(userId);
  if (!role) return false;
  const envAllowed = role.environments.includes('*') || role.environments.includes(environment);
  return envAllowed && role.permissions.includes(permission);
}
