import * as React from "react"
import { cn } from "@/lib/utils"
import { componentStyles } from "@/design/componentStyles"

const Table = React.forwardRef(({ className, ...props }, ref) => (
  <table
    ref={ref}
    className={cn("w-full caption-bottom text-sm border-collapse bg-card", className)}
    {...props}
  />
))
Table.displayName = "Table"

const TableHeader = React.forwardRef(({ className, sticky = false, ...props }, ref) => {
  const stickyClass = sticky ? componentStyles.table.header : "";
  return (
    <thead 
      ref={ref} 
      className={cn("border-b-2 border-[var(--color-border-default)] bg-[var(--color-surface-muted)]", stickyClass, className)} 
      {...props} 
    />
  );
})
TableHeader.displayName = "TableHeader"

const TableBody = React.forwardRef(({ className, zebra = false, ...props }, ref) => {
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

const TableFooter = React.forwardRef(({ className, ...props }, ref) => (
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

const TableRow = React.forwardRef(({ className, clickable = false, selected = false, ...props }, ref) => {
  const clickableClass = clickable ? componentStyles.table.rowClickable : "";
  const selectedClass = selected ? componentStyles.table.rowSelected : "";
  return (
    <tr
      ref={ref}
      className={cn(
        "border-b border-[var(--color-border-default)] transition-colors",
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

const TableHead = React.forwardRef(({ className, sortable = false, ...props }, ref) => {
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

const TableCell = React.forwardRef(({ className, compact = false, ...props }, ref) => {
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

const TableCaption = React.forwardRef(({ className, ...props }, ref) => (
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
  TableRow,
  TableCell,
  TableCaption,
}