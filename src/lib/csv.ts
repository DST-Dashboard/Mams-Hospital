"use client";

/**
 * [FE-05] Client-side CSV generator and downloader (U-12).
 * Correctly escapes special characters, quotes, commas, and handles nulls.
 */
export function exportToCsv<T extends Record<string, unknown>>(
  filename: string,
  columns: { key: keyof T; label: string; format?: (val: unknown, row: T) => string }[],
  data: T[]
): void {
  if (data.length === 0) {
    const emptyHeaders = columns.map((c) => `"${c.label.replace(/"/g, '""')}"`).join(",");
    downloadCsvBlob(filename, emptyHeaders);
    return;
  }

  // Header row
  const header = columns.map((c) => `"${c.label.replace(/"/g, '""')}"`).join(",");

  // Data rows
  const rows = data.map((row) =>
    columns
      .map((c) => {
        const val = row[c.key];
        const formatted = c.format ? c.format(val, row) : val == null ? "" : String(val);
        // Escape quotes
        return `"${formatted.replace(/"/g, '""')}"`;
      })
      .join(",")
  );

  const csvContent = [header, ...rows].join("\r\n");
  downloadCsvBlob(filename, csvContent);
}

function downloadCsvBlob(filename: string, content: string) {
  const blob = new Blob(["\uFEFF" + content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", filename.endsWith(".csv") ? filename : `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
