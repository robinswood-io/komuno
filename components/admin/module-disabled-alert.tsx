import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

interface ModuleDisabledAlertProps {
  moduleName: string;
}

export function ModuleDisabledAlert({ moduleName }: ModuleDisabledAlertProps) {
  return (
    <Alert variant="destructive" className="mb-6">
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>Module désactivé</AlertTitle>
      <AlertDescription className="flex items-center justify-between">
        <span>
          Le module <strong>{moduleName}</strong> est actuellement désactivé.
          Les utilisateurs ne peuvent pas y accéder sur le site public et vous ne pouvez pas modifier son contenu.
        </span>
        <Button variant="outline" size="sm" asChild className="ml-4 flex-shrink-0">
          <Link href="/admin/settings?tab=modules">
            Activer le module
          </Link>
        </Button>
      </AlertDescription>
    </Alert>
  );
}
