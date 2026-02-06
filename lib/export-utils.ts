import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

// Extend jsPDF type to include autoTable
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

export interface ExportColumn {
  header: string;
  accessor: string;
  format?: (value: any) => string;
}

export interface ExportOptions {
  filename: string;
  title?: string;
  columns: ExportColumn[];
  data: any[];
}

/**
 * Export data to CSV format
 */
export function exportToCSV({ filename, columns, data }: ExportOptions): void {
  const headers = columns.map(col => col.header);
  const rows = data.map(row => 
    columns.map(col => {
      const value = row[col.accessor];
      return col.format ? col.format(value) : (value ?? '');
    })
  );

  const csvContent = [
    headers.join(';'),
    ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(';'))
  ].join('\n');

  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
  downloadBlob(blob, `${filename}.csv`);
}

/**
 * Export data to Excel format
 */
export function exportToExcel({ filename, title, columns, data }: ExportOptions): void {
  const worksheetData = [
    columns.map(col => col.header),
    ...data.map(row =>
      columns.map(col => {
        const value = row[col.accessor];
        return col.format ? col.format(value) : (value ?? '');
      })
    )
  ];

  const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, title || 'Export');

  // Auto-size columns
  const colWidths = columns.map((col) => ({
    wch: Math.max(
      col.header.length,
      ...data.map(row => String(row[col.accessor] ?? '').length)
    )
  }));
  worksheet['!cols'] = colWidths;

  XLSX.writeFile(workbook, `${filename}.xlsx`);
}

/**
 * Export data to PDF format
 */
export function exportToPDF({ filename, title, columns, data }: ExportOptions): void {
  const doc = new jsPDF();
  
  // Title
  if (title) {
    doc.setFontSize(16);
    doc.text(title, 14, 15);
  }

  // Table
  const tableData = data.map(row =>
    columns.map(col => {
      const value = row[col.accessor];
      return col.format ? col.format(value) : String(value ?? '');
    })
  );

  doc.autoTable({
    head: [columns.map(col => col.header)],
    body: tableData,
    startY: title ? 25 : 15,
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [16, 185, 129], textColor: 255 },
    alternateRowStyles: { fillColor: [245, 247, 250] },
  });

  doc.save(`${filename}.pdf`);
}

/**
 * Helper function to download a blob
 */
function downloadBlob(blob: Blob, filename: string): void {
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
}

/**
 * Format date for export
 */
export function formatExportDate(date: Date | string | null | undefined): string {
  if (!date) return '';
  const d = new Date(date);
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

/**
 * Format currency for export
 */
export function formatExportCurrency(value: number | null | undefined): string {
  if (value == null) return '';
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(value);
}

/**
 * Format boolean for export
 */
export function formatExportBoolean(value: boolean | null | undefined): string {
  if (value == null) return '';
  return value ? 'Oui' : 'Non';
}

// ============================================
// Fonctions spécifiques pour CJD80
// ============================================

export interface Vote {
  id: string;
  voterName: string;
  voterEmail: string;
  createdAt: string;
}

export interface Inscription {
  id: string;
  name: string;
  email: string;
  company?: string | null;
  phone?: string | null;
  comments?: string | null;
  createdAt: string;
}

export interface Unsubscription {
  id: string;
  name: string;
  email: string;
  comments?: string | null;
  createdAt: string;
}

/**
 * Export des votants (PDF ou Excel)
 */
export function exportVoters(
  ideaTitle: string,
  votes: Vote[],
  format: 'pdf' | 'excel'
) {
  const filename = `votants-${ideaTitle.slice(0, 30).replace(/[^a-z0-9]/gi, '-')}-${Date.now()}`;
  const exportOptions: ExportOptions = {
    filename,
    title: `Liste des Votants - ${ideaTitle}`,
    columns: [
      { header: 'N°', accessor: 'index' },
      { header: 'Nom', accessor: 'voterName' },
      { header: 'Email', accessor: 'voterEmail' },
      { header: 'Date de vote', accessor: 'createdAt', format: (value) =>
        new Date(value).toLocaleDateString('fr-FR', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })
      },
    ],
    data: votes.map((vote, index) => ({ ...vote, index: index + 1 })),
  };

  if (format === 'pdf') {
    exportToPDF(exportOptions);
  } else {
    exportToExcel(exportOptions);
  }
}

/**
 * Export des inscriptions (PDF ou Excel)
 */
export function exportInscriptions(
  eventTitle: string,
  inscriptions: Inscription[],
  format: 'pdf' | 'excel'
) {
  const filename = `inscrits-${eventTitle.slice(0, 30).replace(/[^a-z0-9]/gi, '-')}-${Date.now()}`;
  const exportOptions: ExportOptions = {
    filename,
    title: `Liste des Inscrits - ${eventTitle}`,
    columns: [
      { header: 'N°', accessor: 'index' },
      { header: 'Nom', accessor: 'name' },
      { header: 'Email', accessor: 'email' },
      { header: 'Entreprise', accessor: 'company', format: (value) => value || '-' },
      { header: 'Téléphone', accessor: 'phone', format: (value) => value || '-' },
      { header: 'Commentaires', accessor: 'comments', format: (value) => value || '-' },
      { header: 'Date d\'inscription', accessor: 'createdAt', format: formatExportDate },
    ],
    data: inscriptions.map((inscription, index) => ({ ...inscription, index: index + 1 })),
  };

  if (format === 'pdf') {
    exportToPDF(exportOptions);
  } else {
    exportToExcel(exportOptions);
  }
}

/**
 * Export des désinscriptions (PDF ou Excel)
 */
export function exportUnsubscriptions(
  eventTitle: string,
  unsubscriptions: Unsubscription[],
  format: 'pdf' | 'excel'
) {
  const filename = `absences-${eventTitle.slice(0, 30).replace(/[^a-z0-9]/gi, '-')}-${Date.now()}`;
  const exportOptions: ExportOptions = {
    filename,
    title: `Liste des Absences - ${eventTitle}`,
    columns: [
      { header: 'N°', accessor: 'index' },
      { header: 'Nom', accessor: 'name' },
      { header: 'Email', accessor: 'email' },
      { header: 'Raison de l\'absence', accessor: 'comments', format: (value) => value || '-' },
      { header: 'Date de déclaration', accessor: 'createdAt', format: formatExportDate },
    ],
    data: unsubscriptions.map((unsub, index) => ({ ...unsub, index: index + 1 })),
  };

  if (format === 'pdf') {
    exportToPDF(exportOptions);
  } else {
    exportToExcel(exportOptions);
  }
}
