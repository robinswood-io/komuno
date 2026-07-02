import type { Admin } from '../../../shared/schema';
import { isDemoModeAllowed } from '../config/demo-mode';

export function isDemoModeEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return isDemoModeAllowed(env);
}

export function getDemoAdminUser(): Admin {
  const now = new Date();
  return {
    email: process.env.KOMUNO_DEMO_ADMIN_EMAIL || 'demo@komuno.fr',
    firstName: 'Demo',
    lastName: 'Komuno',
    password: null,
    addedBy: 'komuno-demo-mode',
    role: 'super_admin',
    status: 'active',
    isActive: true,
    notificationEmail: null,
    createdAt: now,
    updatedAt: now,
  } as Admin;
}

export function attachDemoUser(request: { user?: Admin; isAuthenticated?: () => boolean }): Admin {
  const user = getDemoAdminUser();
  request.user = user;
  request.isAuthenticated = () => true;
  return user;
}
