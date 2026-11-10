"use client";

import React, { useMemo, useState } from "react";
import clsx from "clsx";
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp, ChevronsUpDown } from "lucide-react";

export interface Column<T> {
  key: string;
  header: string;
  align?: "left" | "right";
  sortable?: boolean;
  sortValue?: (r: T) => number | string | null;
  render?: (r: T) => React.ReactNode;
}

export interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  rowKey: (r: T) => string | number;
  onRowClick?: (r: T) => void;
  pageSize?: number;
  empty?: React.ReactNode;
  footnote?: React.ReactNode;
  caption?: string;
  className?: string;
}

export interface PaginationProps {
  page: number;
  pageCount: number;
  onPage: (page: number) => void;
  pageSize?: number;
  onPageSize?: (size: number) => void;
}

export function Pagination({
  page,
  pageCount,
  onPage,
  pageSize,
  onPageSize,
}: PaginationProps) {
  if (pageCount <= 1 && !onPageSize) return null;

  return (
    <div className="flex items-center justify-between flex-wrap gap-4 pt-4 mt-2">
      {onPageSize && pageSize && (
        <div className="flex items-center gap-2 text-[12px] text-[var(--tx-quiet)]">
          <span>Rows per page:</span>
          <select
            value={pageSize}
            onChange={(e) => onPageSize(Number(e.target.value))}
            className="select py-1 px-2 text-[12px] min-h-[32px] w-auto"
          >
            {[10, 25, 50, 100].map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="flex items-center gap-1 ml-auto">
        <button
          type="button"
          onClick={() => onPage(Math.max(1, page - 1))}
          disabled={page <= 1}
          aria-label="Previous page"
          className="btn btn-outline btn-icon w-9 h-9 p-0 rounded-[8px]"
        >
          <ChevronLeft size={16} aria-hidden />
        </button>

        <span className="text-[12px] px-3 font-medium text-[var(--tx-main)]">
          Page {page} of {Math.max(1, pageCount)}
        </span>

        <button
          type="button"
          onClick={() => onPage(Math.min(pageCount, page + 1))}
          disabled={page >= pageCount}
          aria-label="Next page"
          className="btn btn-outline btn-icon w-9 h-9 p-0 rounded-[8px]"
        >
          <ChevronRight size={16} aria-hidden />
        </button>
      </div>
    </div>
  );
}

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  onRowClick,
  pageSize = 25,
  empty,
  footnote,
  caption,
  className,
}: DataTableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [currentPage, setCurrentPage] = useState(1);

  const handleSort = (column: Column<T>) => {
    if (!column.sortable) return;
    if (sortKey === column.key) {
      if (sortDirection === "asc") {
        setSortDirection("desc");
      } else {
        setSortKey(null);
        setSortDirection("asc");
      }
    } else {
      setSortKey(column.key);
      setSortDirection("asc");
    }
  };

  const sortedRows = useMemo(() => {
    if (!sortKey) return rows;
    const col = columns.find((c) => c.key === sortKey);
    if (!col) return rows;

    const copy = [...rows];
    copy.sort((a, b) => {
      const valA = col.sortValue ? col.sortValue(a) : (a as Record<string, unknown>)[sortKey];
      const valB = col.sortValue ? col.sortValue(b) : (b as Record<string, unknown>)[sortKey];

      if (valA == null && valB == null) return 0;
      if (valA == null) return 1;
      if (valB == null) return -1;

      if (typeof valA === "number" && typeof valB === "number") {
        return sortDirection === "asc" ? valA - valB : valB - valA;
      }

      const strA = String(valA);
      const strB = String(valB);
      return sortDirection === "asc" ? strA.localeCompare(strB) : strB.localeCompare(strA);
    });

    return copy;
  }, [rows, sortKey, sortDirection, columns]);

  const pageCount = Math.ceil(sortedRows.length / pageSize);
  const pagedRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedRows.slice(start, start + pageSize);
  }, [sortedRows, currentPage, pageSize]);

  return (
    <div className={clsx("w-full", className)}>
      <div className="table-wrap">
        <table className="table">
          {caption && <caption className="sr-only">{caption}</caption>}
          <thead>
            <tr>
              {columns.map((col) => {
                const isSorted = sortKey === col.key;
                return (
                  <th
                    key={col.key}
                    scope="col"
                    className={clsx(
                      col.align === "right" && "align-right",
                      col.sortable && "cursor-pointer select-none hover:text-[var(--tx-head)]"
                    )}
                    onClick={() => handleSort(col)}
                    aria-sort={
                      !col.sortable
                        ? undefined
                        : isSorted
                        ? sortDirection === "asc"
                          ? "ascending"
                          : "descending"
                        : "none"
                    }
                  >
                    <div
                      className={clsx(
                        "inline-flex items-center gap-1.5",
                        col.align === "right" && "justify-end w-full"
                      )}
                    >
                      <span>{col.header}</span>
                      {col.sortable && (
                        <span className="text-[var(--tx-quiet)]">
                          {isSorted ? (
                            sortDirection === "asc" ? (
                              <ChevronUp size={12} aria-hidden />
                            ) : (
                              <ChevronDown size={12} aria-hidden />
                            )
                          ) : (
                            <ChevronsUpDown size={12} aria-hidden />
                          )}
                        </span>
                      )}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {pagedRows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="text-center py-8 text-[var(--tx-muted)]">
                  {empty || "No data available."}
                </td>
              </tr>
            ) : (
              pagedRows.map((row) => (
                <tr
                  key={rowKey(row)}
                  onClick={() => onRowClick?.(row)}
                  className={clsx(onRowClick && "cursor-pointer hover:bg-[var(--bg-subtle)]")}
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={clsx(col.align === "right" && "align-right num")}
                    >
                      {col.render
                        ? col.render(row)
                        : (row as Record<string, React.ReactNode>)[col.key] ?? "—"}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {footnote && (
        <div className="card-foot">
          {footnote}
        </div>
      )}

      {pageCount > 1 && (
        <Pagination
          page={currentPage}
          pageCount={pageCount}
          onPage={(p) => setCurrentPage(p)}
          pageSize={pageSize}
        />
      )}
    </div>
  );
}
