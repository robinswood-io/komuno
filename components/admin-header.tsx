'use client';

import { useState, useMemo } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import {
  Shield,
  UserCircle,
  Users,
  Award,
  Activity,
  Palette,
  Mail,
  LogOut,
  Menu,
  X,
  TrendingUp,
  Lightbulb,
  Calendar,
  Package,
  ChevronDown,
  Settings,
  BarChart3,
  Wallet,
  Receipt,
  TrendingDown,
  FileText,
} from "lucide-react";
import { useBranding } from '@/contexts/BrandingContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface MenuItem {
  id: string;
  label: string;
  icon: any;
  path: string;
  module?: string;
  feature?: string;
}

export default function AdminHeader() {
  const { user, logoutMutation } = useAuth();
  const { branding } = useBranding();
  const router = useRouter();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  // Modules de navigation
  const crmModule: MenuItem[] = [
    { id: "members", label: "Membres", icon: UserCircle, path: "/admin/crm/members", module: "crm" },
    { id: "patrons", label: "Mécènes", icon: Users, path: "/admin/crm/patrons", module: "crm" },
  ];

  const contentModule: MenuItem[] = [
    { id: "ideas", label: "Idées", icon: Lightbulb, path: "/admin/content/ideas", module: "content", feature: "ideas" },
    { id: "events", label: "Événements", icon: Calendar, path: "/admin/content/events", module: "content", feature: "events" },
    { id: "loans", label: "Prêt", icon: Package, path: "/admin/content/loans", module: "content", feature: "loan" },
  ];

  const financeModule: MenuItem[] = [
    { id: "dashboard-finance", label: "Tableau de bord", icon: BarChart3, path: "/admin/finance/dashboard", module: "finance" },
    { id: "sponsorships", label: "Sponsorings", icon: Award, path: "/admin/finance/sponsorships", module: "finance" },
    { id: "budgets", label: "Budgets", icon: Wallet, path: "/admin/finance/budgets", module: "finance" },
    { id: "expenses", label: "Dépenses", icon: Receipt, path: "/admin/finance/expenses", module: "finance" },
    { id: "forecasts", label: "Prévisions", icon: TrendingDown, path: "/admin/finance/forecasts", module: "finance" },
    { id: "reports", label: "Rapports", icon: FileText, path: "/admin/finance/reports", module: "finance" },
  ];

  const settingsModule: MenuItem[] = [
    { id: "branding", label: "Branding", icon: Palette, path: "/admin/settings/branding", module: "settings" },
    { id: "email-config", label: "Email SMTP", icon: Mail, path: "/admin/settings/email-config", module: "settings" },
    { id: "features", label: "Fonctionnalités", icon: Settings, path: "/admin/settings/features", module: "settings" },
  ];

  // Menu de base (toujours visible) - pour usage futur
  // const baseMenuItems: MenuItem[] = [
  //   { id: "dashboard", label: "Tableau de bord", icon: TrendingUp, path: "/admin/dashboard" },
  //   { id: "tracking", label: "Suivi", icon: Activity, path: "/admin/tracking" },
  // ];

  // Menu legacy (compatibilité)
  const legacyMenuItems: MenuItem[] = user?.role === "super_admin"
    ? [
        { id: "admin-legacy", label: "Gestion", icon: Shield, path: "/admin" },
      ]
    : [];

  // Déterminer le module actif
  const activeModule = useMemo(() => {
    if (pathname.startsWith("/admin/crm")) return "crm";
    if (pathname.startsWith("/admin/content")) return "content";
    if (pathname.startsWith("/admin/finance")) return "finance";
    if (pathname.startsWith("/admin/settings")) return "settings";
    return null;
  }, [pathname]);

  const handleNavigation = (path: string) => {
    router.push(path);
    setMobileMenuOpen(false);
    setOpenDropdown(null);
  };

  const isActive = (path: string) => {
    return pathname === path || pathname.startsWith(path + "/");
  };

  return (
    <header className="bg-gray-800 dark:bg-gray-900 text-white shadow-lg border-b-4 border-primary">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-4">
          <div className="flex items-center space-x-4">
            <Shield className="w-8 h-8 text-primary" data-testid="icon-admin-shield" />
            <div>
              <h1 className="text-xl sm:text-2xl font-bold" data-testid="text-admin-title">
                {branding?.app?.shortName || 'CJD Amiens'} - Administration
              </h1>
              <p className="text-gray-300 text-sm" data-testid="text-admin-subtitle">Espace de gestion</p>
            </div>
          </div>

          {/* Navigation Desktop */}
          <nav className="hidden lg:flex space-x-2 items-center">
            {/* Dashboard */}
            <Button
              variant={isActive("/admin/dashboard") ? "default" : "ghost"}
              size="sm"
              onClick={() => handleNavigation("/admin/dashboard")}
              className="text-white hover:text-primary hover:bg-gray-700"
            >
              <TrendingUp className="w-4 h-4 mr-2" />
              Dashboard
            </Button>

            {/* Module CRM */}
            <DropdownMenu open={openDropdown === "crm"} onOpenChange={(open) => setOpenDropdown(open ? "crm" : null)}>
              <DropdownMenuTrigger asChild>
                <Button
                  variant={activeModule === "crm" ? "default" : "ghost"}
                  size="sm"
                  className="text-white hover:text-primary hover:bg-gray-700"
                >
                  CRM
                  <ChevronDown className="w-4 h-4 ml-2" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-48">
                {crmModule.map((item) => (
                  <DropdownMenuItem
                    key={item.id}
                    onClick={() => handleNavigation(item.path)}
                    className={isActive(item.path) ? "bg-gray-100 dark:bg-gray-800" : ""}
                  >
                    <item.icon className="w-4 h-4 mr-2" />
                    {item.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Module Contenu */}
            <DropdownMenu open={openDropdown === "content"} onOpenChange={(open) => setOpenDropdown(open ? "content" : null)}>
              <DropdownMenuTrigger asChild>
                <Button
                  variant={activeModule === "content" ? "default" : "ghost"}
                  size="sm"
                  className="text-white hover:text-primary hover:bg-gray-700"
                >
                  Contenu
                  <ChevronDown className="w-4 h-4 ml-2" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-48">
                {contentModule.map((item) => (
                  <DropdownMenuItem
                    key={item.id}
                    onClick={() => handleNavigation(item.path)}
                    className={isActive(item.path) ? "bg-gray-100 dark:bg-gray-800" : ""}
                  >
                    <item.icon className="w-4 h-4 mr-2" />
                    {item.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Module Finances */}
            {user?.role === "super_admin" && (
              <DropdownMenu open={openDropdown === "finance"} onOpenChange={(open) => setOpenDropdown(open ? "finance" : null)}>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant={activeModule === "finance" ? "default" : "ghost"}
                    size="sm"
                    className="text-white hover:text-primary hover:bg-gray-700"
                  >
                    Finances
                    <ChevronDown className="w-4 h-4 ml-2" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-48">
                  {financeModule.map((item) => (
                    <DropdownMenuItem
                      key={item.id}
                      onClick={() => handleNavigation(item.path)}
                      className={isActive(item.path) ? "bg-gray-100 dark:bg-gray-800" : ""}
                    >
                      <item.icon className="w-4 h-4 mr-2" />
                      {item.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {/* Tracking */}
            <Button
              variant={isActive("/admin/tracking") ? "default" : "ghost"}
              size="sm"
              onClick={() => handleNavigation("/admin/tracking")}
              className="text-white hover:text-primary hover:bg-gray-700"
            >
              <Activity className="w-4 h-4 mr-2" />
              Suivi
            </Button>

            {/* Module Settings */}
            {user?.role === "super_admin" && (
              <DropdownMenu open={openDropdown === "settings"} onOpenChange={(open) => setOpenDropdown(open ? "settings" : null)}>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant={activeModule === "settings" ? "default" : "ghost"}
                    size="sm"
                    className="text-white hover:text-primary hover:bg-gray-700"
                  >
                    Paramètres
                    <ChevronDown className="w-4 h-4 ml-2" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-48">
                  {settingsModule.map((item) => (
                    <DropdownMenuItem
                      key={item.id}
                      onClick={() => handleNavigation(item.path)}
                      className={isActive(item.path) ? "bg-gray-100 dark:bg-gray-800" : ""}
                    >
                      <item.icon className="w-4 h-4 mr-2" />
                      {item.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {/* Menu legacy (compatibilité) */}
            {legacyMenuItems.map((item) => (
              <Button
                key={item.id}
                variant={isActive(item.path) ? "default" : "ghost"}
                size="sm"
                onClick={() => handleNavigation(item.path)}
                className="text-white hover:text-primary hover:bg-gray-700"
              >
                <item.icon className="w-4 h-4 mr-2" />
                {item.label}
              </Button>
            ))}
          </nav>

          {/* User info + Logout */}
          <div className="flex items-center space-x-4">
            {/* Menu Mobile Button */}
            <div className="lg:hidden">
              <Button
                variant="ghost"
                size="sm"
                className="text-white hover:text-primary hover:bg-gray-700"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                data-testid="button-mobile-menu"
              >
                {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </Button>
            </div>

            {/* User Info - Hidden on mobile */}
            <div className="hidden sm:block text-right">
              <p className="text-gray-300 text-xs">Connecté en tant que</p>
              <p className="font-medium text-sm" data-testid="text-user-email">{user?.email}</p>
              <p className="text-primary text-xs capitalize" data-testid="text-user-role">
                {user?.role?.replace('_', ' ') ?? ''}
              </p>
            </div>

            {/* Logout Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => logoutMutation.mutate()}
              className="border-gray-600 hover:bg-gray-700 text-white hover:text-white"
              data-testid="button-logout"
              disabled={logoutMutation.isPending}
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Menu Mobile Déroulant */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-gray-700 border-t border-gray-600">
          <div className="max-w-7xl mx-auto px-4 py-3 space-y-1">
            {/* User info on mobile */}
            <div className="sm:hidden pb-3 mb-3 border-b border-gray-600">
              <p className="text-gray-300 text-xs">Connecté en tant que</p>
              <p className="font-medium text-sm">{user?.email}</p>
              <p className="text-primary text-xs capitalize">{user?.role?.replace('_', ' ') ?? ''}</p>
            </div>

            {/* Dashboard */}
            <button
              onClick={() => handleNavigation("/admin/dashboard")}
              className={`flex items-center gap-3 w-full text-left py-3 px-2 rounded transition-colors duration-200 ${
                isActive("/admin/dashboard") ? "bg-gray-600" : "hover:bg-gray-600"
              }`}
            >
              <TrendingUp className="w-5 h-5" />
              Tableau de bord
            </button>

            {/* Module CRM */}
            <div className="py-2">
              <p className="text-gray-400 text-xs font-semibold px-2 mb-1">CRM</p>
              {crmModule.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleNavigation(item.path)}
                  className={`flex items-center gap-3 w-full text-left py-2 px-4 rounded transition-colors duration-200 ${
                    isActive(item.path) ? "bg-gray-600" : "hover:bg-gray-600"
                  }`}
                >
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </button>
              ))}
            </div>

            {/* Module Contenu */}
            <div className="py-2">
              <p className="text-gray-400 text-xs font-semibold px-2 mb-1">Contenu</p>
              {contentModule.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleNavigation(item.path)}
                  className={`flex items-center gap-3 w-full text-left py-2 px-4 rounded transition-colors duration-200 ${
                    isActive(item.path) ? "bg-gray-600" : "hover:bg-gray-600"
                  }`}
                >
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </button>
              ))}
            </div>

            {/* Module Finances */}
            {user?.role === "super_admin" && (
              <div className="py-2">
                <p className="text-gray-400 text-xs font-semibold px-2 mb-1">Finances</p>
                {financeModule.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => handleNavigation(item.path)}
                    className={`flex items-center gap-3 w-full text-left py-2 px-4 rounded transition-colors duration-200 ${
                      isActive(item.path) ? "bg-gray-600" : "hover:bg-gray-600"
                    }`}
                  >
                    <item.icon className="w-4 h-4" />
                    {item.label}
                  </button>
                ))}
              </div>
            )}

            {/* Tracking */}
            <button
              onClick={() => handleNavigation("/admin/tracking")}
              className={`flex items-center gap-3 w-full text-left py-3 px-2 rounded transition-colors duration-200 ${
                isActive("/admin/tracking") ? "bg-gray-600" : "hover:bg-gray-600"
              }`}
            >
              <Activity className="w-5 h-5" />
              Suivi
            </button>

            {/* Module Settings */}
            {user?.role === "super_admin" && (
              <div className="py-2">
                <p className="text-gray-400 text-xs font-semibold px-2 mb-1">Paramètres</p>
                {settingsModule.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => handleNavigation(item.path)}
                    className={`flex items-center gap-3 w-full text-left py-2 px-4 rounded transition-colors duration-200 ${
                      isActive(item.path) ? "bg-gray-600" : "hover:bg-gray-600"
                    }`}
                  >
                    <item.icon className="w-4 h-4" />
                    {item.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
