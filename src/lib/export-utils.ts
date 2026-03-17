import toast from 'react-hot-toast';

/**
 * Escape a CSV field value: wrap in quotes if it contains commas, quotes, or newlines.
 */
function escapeCsvField(value: string | number): string {
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Export data as a CSV file and trigger a browser download.
 */
export function exportToCsv(
  filename: string,
  headers: string[],
  rows: (string | number)[][],
): void {
  const headerLine = headers.map(escapeCsvField).join(',');
  const dataLines = rows.map((row) => row.map(escapeCsvField).join(','));
  const csvContent = [headerLine, ...dataLines].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
  toast.success(`Downloaded ${filename}`);
}

/**
 * Format a currency amount as a plain decimal string (no symbol).
 */
export function fmtCurrencyPlain(amount: number): string {
  return amount.toFixed(2);
}

/**
 * Convert an array of objects to a CSV string given headers and column keys.
 */
export function tableToCSV(
  headers: string[],
  data: Record<string, unknown>[],
  columns: string[],
): string {
  const headerLine = headers.map(escapeCsvField).join(',');
  const dataLines = data.map((row) =>
    columns.map((col) => escapeCsvField(String(row[col] ?? ''))).join(','),
  );
  return [headerLine, ...dataLines].join('\n');
}
