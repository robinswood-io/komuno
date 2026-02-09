'use client';

import { useAuth } from '@/hooks/use-auth';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Users,
  Heart,
  Lightbulb,
  Calendar,
  Package,
  DollarSign,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Tag,
  CheckSquare,
  Link2,
  BarChart3,
  Activity,
  ClipboardList,
  Palette,
  Bell,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useState } from 'react';
import { NotificationBell } from './notification-bell';

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface NavSection {
  title?: string;
  items: NavItem[];
}

const navItems: (NavItem | NavSection)[] = [
  {
    title: 'Dashboard',
    href: '/admin/dashboard',
    icon: LayoutDashboard,
  },
  {
    title: 'CRM Membres',
    items: [
      {
        title: 'Liste des membres',
        href: '/admin/members',
        icon: Users,
      },
      {
        title: 'Tâches',
        href: '/admin/members/tasks',
        icon: CheckSquare,
      },
      {
        title: 'Relations',
        href: '/admin/members/member-graph',
        icon: Link2,
      },
      {
        title: 'Statistiques',
        href: '/admin/members/stats',
        icon: BarChart3,
      },
    ],
  },
  {
    title: 'Mécènes',
    href: '/admin/patrons',
    icon: Heart,
  },
  {
    title: 'Idées',
    href: '/admin/ideas',
    icon: Lightbulb,
  },
  {
    title: 'Événements',
    href: '/admin/events',
    icon: Calendar,
  },
  {
    title: 'Prêts',
    href: '/admin/loans',
    icon: Package,
  },
  {
    title: 'Finance',
    href: '/admin/financial',
    icon: DollarSign,
  },
  {
    title: 'Outils',
    items: [
      {
        title: 'Notifications',
        href: '/admin/notifications',
        icon: Bell,
      },
      {
        title: 'Tracking',
        href: '/admin/tracking',
        icon: Activity,
      },
      {
        title: 'Demandes dev',
        href: '/admin/development-requests',
        icon: ClipboardList,
      },
      {
        title: 'Branding',
        href: '/admin/branding',
        icon: Palette,
      },
    ],
  },
  {
    title: 'Paramètres',
    href: '/admin/settings',
    icon: Settings,
  },
];

export function AdminSidebar() {
  const { user, logoutMutation } = useAuth();
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  const getUserInitials = (name?: string) => {
    if (!name) return 'U';
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  return (
    <aside
      className={cn(
        'flex flex-col h-screen bg-sidebar border-r border-sidebar-border transition-all duration-300',
        isCollapsed ? 'w-20' : 'w-64'
      )}
    >
      {/* Header avec logo et utilisateur */}
      <div className="p-4 border-b border-sidebar-border">
        <div className="flex items-center justify-between mb-4">
          {!isCollapsed && (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-sm">CJD</span>
              </div>
              <span className="font-bold text-sidebar-foreground">Admin</span>
            </div>
          )}
          <div className="flex items-center gap-1">
            <NotificationBell />
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setIsCollapsed(!isCollapsed)}
            >
              {isCollapsed ? (
                <ChevronRight className="h-4 w-4" />
              ) : (
                <ChevronLeft className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        {!isCollapsed && user && (
          <div className="flex items-center gap-3 p-2 rounded-lg bg-sidebar-accent">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                {getUserInitials(`${user.firstName} ${user.lastName}`)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-sidebar-accent-foreground truncate">
                {`${user.firstName} ${user.lastName}`}
              </p>
              <p className="text-xs text-sidebar-accent-foreground/60 truncate">
                {user.role}
              </p>
            </div>
          </div>
        )}

        {isCollapsed && user && (
          <div className="flex justify-center">
            <Avatar className="h-10 w-10">
              <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                {getUserInitials(`${user.firstName} ${user.lastName}`)}
              </AvatarFallback>
            </Avatar>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4">
        <ul className="space-y-1 px-2">
          {navItems.map((item, index) => {
            const isSection = 'items' in item;

            if (isSection) {
              // Render section with nested items
              return (
                <div key={`section-${index}`}>
                  {!isCollapsed && item.title && (
                    <h3 className="text-xs font-semibold text-sidebar-foreground/60 uppercase tracking-wider px-3 py-2 mt-4 mb-2 first:mt-0">
                      {item.title}
                    </h3>
                  )}
                  <ul className="space-y-1">
                    {item.items.map((subItem) => {
                      const Icon = subItem.icon;
                      const isActive = pathname?.startsWith(subItem.href);

                      return (
                        <li key={subItem.href}>
                          <Link
                            href={subItem.href}
                            className={cn(
                              'flex items-center gap-3 px-3 py-2 rounded-lg transition-colors',
                              'hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                              isActive
                                ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                                : 'text-sidebar-foreground',
                              isCollapsed && 'justify-center',
                              !isCollapsed && 'ml-0'
                            )}
                            title={isCollapsed ? subItem.title : undefined}
                          >
                            <Icon className="h-5 w-5 flex-shrink-0" />
                            {!isCollapsed && (
                              <span className="text-sm font-medium">{subItem.title}</span>
                            )}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            }

            // Render regular item
            const Icon = item.icon;
            const isActive = pathname?.startsWith(item.href);

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2 rounded-lg transition-colors',
                    'hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                    isActive
                      ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                      : 'text-sidebar-foreground',
                    isCollapsed && 'justify-center'
                  )}
                  title={isCollapsed ? item.title : undefined}
                >
                  <Icon className="h-5 w-5 flex-shrink-0" />
                  {!isCollapsed && (
                    <span className="text-sm font-medium">{item.title}</span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer avec logout */}
      <div className="p-4 border-t border-sidebar-border">
        <Button
          variant="ghost"
          className={cn(
            'w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
            isCollapsed && 'justify-center px-0'
          )}
          onClick={handleLogout}
          disabled={logoutMutation.isPending}
        >
          <LogOut className="h-5 w-5 flex-shrink-0" />
          {!isCollapsed && <span className="ml-3">Déconnexion</span>}
        </Button>
      </div>
    </aside>
  );
}
