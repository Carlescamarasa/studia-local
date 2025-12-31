/* eslint-disable react/prop-types */
import * as React from "react"
import { cn } from "@/lib/utils"
import { componentStyles } from "@/design/componentStyles"

const Table = React.forwardRef<
  HTMLTableElement,
  React.TableHTMLAttributes<HTMLTableElement>
>(({ className, ...props }, ref) => (
  <table
    ref={ref}
    className={cn("w-full caption-bottom text-sm border-collapse bg-card overflow-hidden", className)}
    {...props}
  />
))
Table.displayName = "Table"

const TableContainer = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("ui-table-shell w-full overflow-hidden", className)}
    {...props}
  />
))
TableContainer.displayName = "TableContainer"

const TableHeader = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement> & { sticky?: boolean }
>(({ className, sticky = false, ...props }, ref) => {
  const stickyClass = sticky ? componentStyles.table.header : "";
  return (
    <thead
      ref={ref}
      className={cn("border-b border-[var(--color-border-default)]/30 bg-[var(--color-surface-muted)]/50", stickyClass, className)}
      {...props}
    />
  );
})
TableHeader.displayName = "TableHeader"

const TableBody = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement> & { zebra?: boolean }
>(({ className, zebra = false, ...props }, ref) => {
  const zebraClass = zebra ? "[&_tr:nth-child(even)]:bg-[var(--color-surface-muted)]/30" : "";
  return (
    <tbody
      ref={ref}
      className={cn("bg-[var(--color-surface)] [&_tr:last-child]:border-0", zebraClass, className)}
      {...props}
    />
  );
})
TableBody.displayName = "TableBody"

const TableFooter = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tfoot
    ref={ref}
    className={cn(
      "border-t border-[var(--color-border-default)] bg-muted font-medium",
      className
    )}
    {...props}
  />
))
TableFooter.displayName = "TableFooter"

const TableRow = React.forwardRef<
  HTMLTableRowElement,
  React.HTMLAttributes<HTMLTableRowElement> & { clickable?: boolean; selected?: boolean }
>(({ className, clickable = false, selected = false, ...props }, ref) => {
  const clickableClass = clickable ? componentStyles.table.rowClickable : "";
  const selectedClass = selected ? componentStyles.table.rowSelected : "";
  return (
    <tr
      ref={ref}
      className={cn(
        componentStyles.table.row,
        componentStyles.table.rowHover,
        clickableClass,
        selectedClass,
        className
      )}
      {...props}
    />
  );
})
TableRow.displayName = "TableRow"

const TableHead = React.forwardRef<
  HTMLTableCellElement,
  React.ThHTMLAttributes<HTMLTableCellElement> & { sortable?: boolean }
>(({ className, sortable = false, ...props }, ref) => {
  const sortableClass = sortable ? componentStyles.table.headerCellSortable : "";
  return (
    <th
      ref={ref}
      className={cn(
        componentStyles.table.headerCell,
        sortableClass,
        "[&:has([role=checkbox])]:pr-0",
        className
      )}
      {...props}
    />
  );
})
TableHead.displayName = "TableHead"

const TableCell = React.forwardRef<
  HTMLTableCellElement,
  React.TdHTMLAttributes<HTMLTableCellElement> & { compact?: boolean }
>(({ className, compact = false, ...props }, ref) => {
  const cellClass = compact ? componentStyles.table.cellCompact : componentStyles.table.cell;
  return (
    <td
      ref={ref}
      className={cn(cellClass, "[&:has([role=checkbox])]:pr-0", className)}
      {...props}
    />
  );
})
TableCell.displayName = "TableCell"

const TableCaption = React.forwardRef<
  HTMLTableCaptionElement,
  React.HTMLAttributes<HTMLTableCaptionElement>
>(({ className, ...props }, ref) => (
  <caption
    ref={ref}
    className={cn("mt-4 text-sm text-muted", className)}
    {...props}
  />
))
TableCaption.displayName = "TableCaption"

export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableContainer,
  TableRow,
  TableCell,
  TableCaption,
}