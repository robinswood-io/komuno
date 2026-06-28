import type { Admin } from '../../../shared/schema';

export function isDemoModeEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.KOMUNO_DEMO_MODE === 'true' && env.NODE_ENV !== 'production';
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

export function attachDemoUser(request: Record<string, any>): Admin {
  const user = getDemoAdminUser();
  request.user = user;
  request.isAuthenticated = () => true;
  return user;
}
