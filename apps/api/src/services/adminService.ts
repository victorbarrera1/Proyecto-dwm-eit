import { AppError } from '../errors.js';
import type { AdminResourcesQuery, AdminUsersQuery } from '../schemas.js';
import * as adminRepository from '../repositories/adminRepository.js';
import { resolvePeriod } from '../utils/time.js';

export function listUsers(query: AdminUsersQuery) {
  return adminRepository.listUsers(query);
}

export function getUser(userId: string) {
  const user = adminRepository.findAdminUser(userId);
  if (!user) throw userNotFound();
  return user;
}

export function getUserResources(userId: string, query: AdminResourcesQuery) {
  getUser(userId);
  const period =
    query.type === 'readings' ? resolvePeriod(query.from, query.to, 30) : undefined;
  return {
    ...adminRepository.listUserResources(userId, query, period),
    ...(period ? { period } : {})
  };
}

export function removeUser(currentAdminId: string, targetUserId: string): void {
  if (currentAdminId === targetUserId) {
    throw new AppError(409, 'CANNOT_DELETE_SELF', 'No puedes eliminar tu propia cuenta administrativa.');
  }
  const target = getUser(targetUserId);
  if (target.user.role === 'ADMIN' && adminRepository.countAdmins() <= 1) {
    throw new AppError(409, 'LAST_ADMIN', 'No es posible eliminar al último administrador.');
  }
  if (!adminRepository.deleteUser(targetUserId)) throw userNotFound();
}

export function getStats() {
  return adminRepository.getGlobalStats();
}

function userNotFound(): AppError {
  return new AppError(404, 'USER_NOT_FOUND', 'No se encontró el usuario.');
}
