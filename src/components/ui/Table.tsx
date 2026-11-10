"use client";

import clsx from "clsx";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import React, { forwardRef, type HTMLAttributes, type ReactNode, type TdHTMLAttributes, type ThHTMLAttributes } from "react";

export interface TableProps extends HTMLAttributes<HTMLTableElement> {
  containerClassName?: string;
}

export const Table = forwardRef<HTMLTableElement, TableProps>(function Table(
  { className, containerClassName, children, ...props },
  ref
) {
  return (
    <div className={clsx("relative w-full overflow-x-auto rounded-md border hairline bg-surface", containerClassName)}>
      <table ref={ref} className={clsx("w-full text-left text-sm text-ink caption-bottom", className)} {...props}>
        {children}
      </table>
    </div>
  );
});
Table.displayName = "Table";

export const TableHeader = forwardRef<HTMLTableSectionElement, HTMLAttributes<HTMLTableSectionElement>>(
  function TableHeader({ className, ...props }, ref) {
    return <thead ref={ref} className={clsx("border-b hairline bg-raised/50 font-medium text-muted text-xs uppercase tracking-wider", className)} {...props} />;
  }
);
TableHeader.displayName = "TableHeader";

export const TableBody = forwardRef<HTMLTableSectionElement, HTMLAttributes<HTMLTableSectionElement>>(
  function TableBody({ className, ...props }, ref) {
    return <tbody ref={ref} className={clsx("divide-y hairline divide-line/40", className)} {...props} />;
  }
);
TableBody.displayName = "TableBody";

export const TableRow = forwardRef<HTMLTableRowElement, HTMLAttributes<HTMLTableRowElement>>(
  function TableRow({ className, ...props }, ref) {
    return <tr ref={ref} className={clsx("transition-colors hover:bg-raised/40", className)} {...props} />;
  }
);
TableRow.displayName = "TableRow";

export interface TableHeadProps extends ThHTMLAttributes<HTMLTableCellElement> {
  sortable?: boolean;
  sortDirection?: "asc" | "desc" | null;
  onSort?: () => void;
}

export const TableHead = forwardRef<HTMLTableCellElement, TableHeadProps>(function TableHead(
  { className, children, sortable, sortDirection, onSort, ...props },
  ref
) {
  return (
    <th
      ref={ref}
      className={clsx(
        "h-10 px-4 text-left align-middle font-medium text-muted [&:has([role=checkbox])]:pr-0",
        sortable && "cursor-pointer select-none hover:text-ink transition-colors",
        className
      )}
      onClick={sortable ? onSort : undefined}
      {...props}
    >
      <div className="flex items-center gap-1.5">
        <span>{children}</span>
        {sortable ? (
          <span className="text-muted/70">
            {sortDirection === "asc" ? (
              <ArrowUp className="h-3.5 w-3.5 text-tide" />
            ) : sortDirection === "desc" ? (
              <ArrowDown className="h-3.5 w-3.5 text-tide" />
            ) : (
              <ArrowUpDown className="h-3.5 w-3.5 opacity-50" />
            )}
          </span>
        ) : null}
      </div>
    </th>
  );
});
TableHead.displayName = "TableHead";

export const TableCell = forwardRef<HTMLTableCellElement, TdHTMLAttributes<HTMLTableCellElement>>(
  function TableCell({ className, ...props }, ref) {
    return <td ref={ref} className={clsx("p-4 align-middle [&:has([role=checkbox])]:pr-0", className)} {...props} />;
  }
);
TableCell.displayName = "TableCell";

export function TableEmpty({ colSpan, message }: { colSpan: number; message: ReactNode }) {
  return (
    <TableRow>
      <TableCell colSpan={colSpan} className="h-32 text-center text-muted">
        {message}
      </TableCell>
    </TableRow>
  );
}
