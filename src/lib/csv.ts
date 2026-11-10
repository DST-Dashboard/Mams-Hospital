/**
 * Client-side CSV export for tables and charts with RFC-4180 escaping
 * and formula-injection neutralization (U-12).
 */

export type CsvCell = string | number | boolean | null | undefined;
export type CsvRow = Record<string, CsvCell> | CsvCell[];

/**
 * Escapes a cell value according to RFC-4180 and prepends a single quote
 * if the text begins with a spreadsheet formula trigger (=, +, -, @).
 */
export function escapeCsvCell(val: CsvCell): string {
  if (val === null || val === undefined) {
    return "";
  }

  let text = String(val);

  // Formula injection neutralization (CWE-1236)
  if (/^[=+\-@\t\r]/.test(text)) {
    text = `'${text}`;
  }

  // If text contains quotes, commas, or newlines, wrap in quotes and escape internal quotes
  if (/[",\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }

  return text;
}

/**
 * Converts array of rows into a clean CSV string.
 */
export function toCsvString(rows: CsvRow[], headers?: string[]): string {
  if (!rows || rows.length === 0) return "";

  const lines: string[] = [];

  if (headers && headers.length > 0) {
    lines.push(headers.map(escapeCsvCell).join(","));
  }

  for (const row of rows) {
    if (Array.isArray(row)) {
      lines.push(row.map(escapeCsvCell).join(","));
    } else {
      const keys = headers || Object.keys(row);
      lines.push(keys.map((k) => escapeCsvCell(row[k])).join(","));
    }
  }

  return lines.join("\r\n");
}

/**
 * Triggers a browser download of a CSV file using Blob.
 */
export function downloadCsv(filename: string, rows: CsvRow[], headers?: string[]): void {
  const csvContent = toCsvString(rows, headers);
  const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", filename.endsWith(".csv") ? filename : `${filename}.csv`);
  link.style.visibility = "hidden";

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
