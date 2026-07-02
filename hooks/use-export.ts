import { useCallback, useState } from 'react';
import { exportToCSV, exportToExcel, exportToPDF, type ExportOptions, type ExportRow } from '@/lib/export-utils';
import { useToast } from './use-toast';

export type ExportFormat = 'csv' | 'excel' | 'pdf';

interface UseExportOptions extends Omit<ExportOptions, 'data'> {
  getData: () => ExportRow[] | Promise<ExportRow[]>;
}

export function useExport(options: UseExportOptions) {
  const [isExporting, setIsExporting] = useState(false);
  const { toast } = useToast();

  const exportData = useCallback(async (format: ExportFormat) => {
    setIsExporting(true);
    try {
      const data = await options.getData();
      
      if (data.length === 0) {
        toast({
          title: 'Export impossible',
          description: 'Aucune donnée à exporter',
          variant: 'destructive',
        });
        return;
      }

      const exportOptions: ExportOptions = {
        filename: options.filename,
        title: options.title,
        columns: options.columns,
        data,
      };

      switch (format) {
        case 'csv':
          exportToCSV(exportOptions);
          break;
        case 'excel':
          exportToExcel(exportOptions);
          break;
        case 'pdf':
          exportToPDF(exportOptions);
          break;
      }

      toast({
        title: 'Export réussi',
        description: `${data.length} lignes exportées en ${format.toUpperCase()}`,
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: 'Erreur d\'export',
        description: 'Une erreur est survenue lors de l\'export',
        variant: 'destructive',
      });
    } finally {
      setIsExporting(false);
    }
  }, [options, toast]);

  return {
    exportData,
    isExporting,
    exportCSV: () => exportData('csv'),
    exportExcel: () => exportData('excel'),
    exportPDF: () => exportData('pdf'),
  };
}
