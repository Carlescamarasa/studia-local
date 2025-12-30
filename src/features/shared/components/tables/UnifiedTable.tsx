import React, { useState, useMemo } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/features/shared/components/ui/table";
import { Button } from "@/features/shared/components/ui/button";
import { Checkbox } from "@/features/shared/components/ui/checkbox";
import { ChevronUp, ChevronDown, FileText, MoreVertical } from "lucide-react";
import RowActionsMenu from "@/features/shared/components/common/RowActionsMenu";
import TablePagination from "@/features/shared/components/common/TablePagination";
import { componentStyles } from "@/design/componentStyles";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/features/shared/components/ui/dropdown-menu";

/**
 * Helper function to check if a raw value should be considered "empty"
 * Used to filter out empty fields in mobile view to avoid showing "Label: -" or similar
 * This function should be used on rawValue (the actual data), not on rendered ReactNodes
 */
/**
 * Helper function to check if a raw value should be considered "empty"
 * Used to filter out empty fields in mobile view to avoid showing "Label: -" or similar
 * This function should be used on rawValue (the actual data), not on rendered ReactNodes
 */
function isEmptyRawValue(value: any) {
  if (value === null || value === undefined) return true;
  if (typeof value === 'number' && Number.isNaN(value)) return true;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return true; // string vacío
    if (['-', '–', 'NaN', 'N/A', 'null', 'undefined'].includes(trimmed)) return true;
  }
  // Si es un ReactNode complejo (objeto, array), no debería llegar aquí
  // Esta función se usa solo para valores primitivos del registro
  if (typeof value === 'object' && value !== null) return false;
  return false;
}

export interface TableColumn<T> {
  key: string;
  label: string;
  render?: (item: T, index: number) => React.ReactNode;
  sortable?: boolean;
  sortValue?: (item: T) => any;
  mobileHidden?: boolean;
  mobileIsPrimary?: boolean;
  mobileLabel?: string;
  mobileFullRow?: boolean;
  rawValue?: any | ((item: T) => any);
}

export interface TableAction<T = any> {
  id: string;
  label: string;
  icon?: React.ComponentType<{ className?: string }> | React.ReactNode;
  onClick: (item?: T) => void;
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
}

export interface UnifiedTableProps<T> {
  columns: TableColumn<T>[];
  data: T[];
  onRowClick?: (item: T) => void;
  rowActions?: ((item: T) => TableAction<T>[]) | null;
  getRowActions?: ((item: T) => TableAction<T>[]) | null;
  bulkActions?: TableAction<any[]>[] | null;
  keyField?: string;
  selectable?: boolean;
  emptyMessage?: string;
  emptyIcon?: React.ComponentType<{ className?: string }>;
  paginated?: boolean;
  defaultPageSize?: number;
  selectedKeys?: Set<any> | null;
  onSelectionChange?: ((keys: Set<any>) => void) | null;
}

export default function UnifiedTable<T>({
  columns,
  data,
  onRowClick,
  rowActions = null,
  getRowActions = null,
  bulkActions = null,
  keyField = "id",
  selectable = false,
  emptyMessage = "No hay datos disponibles",
  emptyIcon: EmptyIcon = FileText,
  paginated = true,
  defaultPageSize = 10,
  // Props for controlled selection
  selectedKeys = null,
  onSelectionChange = null
}: UnifiedTableProps<T>) {
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [internalSelectedItems, setInternalSelectedItems] = useState(new Set<any>());

  // Use external selection if provided, otherwise internal
  const selectedItems = selectedKeys || internalSelectedItems;
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(defaultPageSize);

  const handleSort = (columnKey: string) => {
    if (!columnKey) return;

    if (sortColumn === columnKey) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(columnKey);
      setSortDirection('asc');
    }
  };

  const sortedData = useMemo(() => {
    if (!sortColumn) return data;

    return [...data].sort((a: T, b: T) => {
      const column = columns.find(c => c.key === sortColumn);
      if (!column) return 0;

      const aVal = column.sortValue ? column.sortValue(a) : (a as any)[sortColumn];
      const bVal = column.sortValue ? column.sortValue(b) : (b as any)[sortColumn];

      if (aVal === bVal) return 0;
      if (aVal == null) return 1;
      if (bVal == null) return -1;

      const comparison = aVal < bVal ? -1 : 1;
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [data, sortColumn, sortDirection, columns]);

  // Calcular datos paginados
  const displayData = useMemo(() => {
    if (!paginated) return sortedData;

    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return sortedData.slice(startIndex, endIndex);
  }, [sortedData, paginated, currentPage, pageSize]);

  const toggleSelection = (itemKey: any) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(itemKey)) {
      newSelected.delete(itemKey);
    } else {
      newSelected.add(itemKey);
    }

    if (onSelectionChange) {
      onSelectionChange(newSelected);
    }

    if (!selectedKeys) {
      setInternalSelectedItems(newSelected);
    }
  };

  const toggleSelectAll = () => {
    let newSelected: Set<any>;
    if (selectedItems.size === data.length && data.length > 0) {
      newSelected = new Set();
    } else {
      newSelected = new Set(data.map(item => (item as any)[keyField as string]));
    }

    if (onSelectionChange) {
      onSelectionChange(newSelected);
    }

    if (!selectedKeys) {
      setInternalSelectedItems(newSelected);
    }
  };

  const isMobile = useIsMobile();
  const isDesktop = !isMobile;

  const hasActions = (rowActions && typeof rowActions === 'function') || getRowActions;

  // Verificar si solo hay una acción para todos los items (si es así, ocultar columna de acciones)
  // Pero solo ocultar si TODOS los items tienen exactamente 1 acción
  // AND onRowClick is NOT defined (if onRowClick is defined, user wants explicit actions)
  let hasOnlyOneAction = false;
  let shouldHideActionsColumn = false;

  if (data.length > 0 && hasActions) {
    // Verificar acciones para todos los items, no solo el primero
    const allActionsCounts = data.map(item => {
      const actions = getRowActions ? getRowActions(item) : (rowActions ? rowActions(item) : []);
      return actions.length;
    });

    // Solo ocultar si TODOS los items tienen exactamente 1 acción AND no hay onRowClick
    hasOnlyOneAction = allActionsCounts.every(count => count === 1) && allActionsCounts[0] === 1;
    // If onRowClick is defined, always show actions column (user wants explicit action buttons)
    shouldHideActionsColumn = hasOnlyOneAction && !onRowClick;
  }

  // Preparar columnas para mobile: filtrar ocultas y determinar columna primaria
  const mobileColumns = useMemo(() => {
    return columns.filter(col => !col.mobileHidden);
  }, [columns]);

  const primaryColumn = useMemo(() => {
    return mobileColumns.find(col => col.mobileIsPrimary) || mobileColumns[0];
  }, [mobileColumns]);

  const detailColumns = useMemo(() => {
    // Hasta 5 columnas que no sean la primaria y no estén ocultas
    return mobileColumns
      .filter(col => col.key !== primaryColumn?.key && !col.mobileHidden)
      .slice(0, 5);
  }, [mobileColumns, primaryColumn]);

  if (data.length === 0) {
    return (
      <div className="text-center py-12">
        <EmptyIcon className={componentStyles.components.emptyStateIcon} />
        <p className={componentStyles.components.emptyStateText}>{emptyMessage}</p>
      </div>
    );
  }

  return (
    <>
      {isDesktop ? (
        <>
          <div className="ui-table-shell w-full overflow-x-auto">
            <Table>
              <TableHeader sticky>
                <TableRow>
                  {selectable && (
                    <TableHead className="w-12 py-2 px-3">
                      <Checkbox
                        checked={selectedItems.size === data.length && data.length > 0}
                        onCheckedChange={toggleSelectAll}
                        aria-label="Seleccionar todo"
                      />
                    </TableHead>
                  )}
                  {columns.map((col) => (
                    <TableHead
                      key={col.key}
                      sortable={col.sortable}
                      onClick={() => col.sortable && handleSort(col.key)}
                      aria-sort={sortColumn === col.key ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'}
                      className="py-2 px-3"
                    >
                      <div className="flex items-center gap-2 text-xs font-semibold">
                        {col.label}
                        {col.sortable && sortColumn === col.key && (
                          sortDirection === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                        )}
                      </div>
                    </TableHead>
                  ))}
                  {hasActions && !shouldHideActionsColumn && <TableHead className="w-10 py-2 px-3"></TableHead>}
                  {selectable && bulkActions && selectedItems.size > 0 && (
                    <TableHead className="w-12 py-2 px-3">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            aria-label="Acciones masivas"
                          >
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56">
                          {bulkActions.map((action, idx) => (
                            <DropdownMenuItem
                              key={idx}
                              onClick={() => {
                                action.onClick(Array.from(selectedItems));
                                setInternalSelectedItems(new Set());
                              }}
                              className="cursor-pointer"
                            >
                              {(() => {
                                if (!action.icon) return null;
                                const Icon = action.icon;
                                if (React.isValidElement(Icon)) return <span className="mr-2">{Icon}</span>;
                                if (typeof Icon === 'function' || (typeof Icon === 'object' && Icon !== null)) {
                                  const Comp = Icon as React.ElementType;
                                  return <Comp className="mr-2 h-4 w-4" />;
                                }
                                return null;
                              })()}
                              {action.label}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody
                zebra
                className={selectable && selectedItems.size > 0 ? "pb-16" : ""}
              >
                {displayData.map((item, index) => {
                  const actions = getRowActions ? getRowActions(item) : (rowActions ? rowActions(item) : []);
                  const itemKey = (item as any)[keyField as string];
                  const isSelected = selectedItems.has(itemKey);

                  // Si solo hay una acción, ejecutarla directamente en el click de la fila si no hay onRowClick
                  const handleRowClick = () => {
                    if (onRowClick) {
                      // Usar onRowClick si existe (tiene prioridad)
                      onRowClick(item);
                    } else if (hasOnlyOneAction && actions.length === 1) {
                      // Si no hay onRowClick pero hay una acción, ejecutarla directamente
                      actions[0].onClick?.();
                    }
                  };

                  // Calculate the actual index considering pagination
                  const globalIndex = paginated ? (currentPage - 1) * pageSize + index : index;

                  return (
                    <TableRow
                      key={itemKey}
                      //@ts-ignore - clickable is a valid prop in our table.tsx
                      clickable={!!(onRowClick || (hasOnlyOneAction && actions.length === 1))}
                      selected={isSelected}
                      className="group hover:bg-[var(--color-surface-muted)]/50 transition-colors"
                      onClick={handleRowClick}
                    >
                      {selectable && (
                        <TableCell onClick={(e: React.MouseEvent) => e.stopPropagation()} className="py-2 px-3">
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => toggleSelection(itemKey)}
                            aria-label={`Seleccionar ${itemKey}`}
                          />
                        </TableCell>
                      )}
                      {columns.map((col) => (
                        <TableCell key={col.key} className="py-2 px-3 text-sm">
                          {col.render ? col.render(item, globalIndex) : (item as any)[col.key]}
                        </TableCell>
                      ))}
                      {hasActions && !shouldHideActionsColumn && (
                        <TableCell className="text-right py-2 px-3" onClick={(e: React.MouseEvent) => e.stopPropagation()}>
                          <div className="flex justify-end">
                            <RowActionsMenu actions={actions as any} />
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {paginated && (
            <TablePagination
              data={sortedData as any}
              pageSize={pageSize}
              currentPage={currentPage}
              onPageChange={setCurrentPage}
              onPageSizeChange={(newSize: number) => {
                setPageSize(newSize);
                setCurrentPage(1);
              }}
            />
          )}

          {selectable && selectedItems.size > 0 && bulkActions && (
            <div className="sticky bottom-0 left-0 right-0 w-full border-t border-[var(--color-border-default)] bg-[var(--color-surface-elevated)] px-3 sm:px-4 py-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-2 shadow-[0_-4px_12px_rgba(0,0,0,0.15)] z-20">
              <span className="text-xs sm:text-sm font-semibold text-[var(--color-text-primary)] shrink-0">
                {selectedItems.size} {selectedItems.size === 1 ? 'elemento seleccionado' : 'elementos seleccionados'}
              </span>
              <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-1.5 sm:gap-2 w-full sm:w-auto">
                {bulkActions.map((action, idx) => (
                  <Button
                    key={idx}
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      action.onClick(Array.from(selectedItems));
                      setInternalSelectedItems(new Set());
                    }}
                    className={cn(
                      componentStyles.buttons.outline,
                      "h-8 sm:h-9 text-xs",
                      "px-2 sm:px-3",
                      isMobile && action.icon
                        ? "flex items-center justify-center w-full"
                        : "justify-center sm:justify-start"
                    )}
                    title={action.label}
                  >
                    {(() => {
                      if (!action.icon) return null;
                      const Icon = action.icon;
                      if (React.isValidElement(Icon)) return <span className={cn("shrink-0", !isMobile && "mr-2")}>{Icon}</span>;
                      if (typeof Icon === 'function' || (typeof Icon === 'object' && Icon !== null)) {
                        const Comp = Icon as React.ElementType;
                        return <Comp className={cn("w-4 h-4 shrink-0", !isMobile && "mr-2")} />;
                      }
                      return null;
                    })()}
                    {(!isMobile || !action.icon) && (
                      <span className="text-[10px] sm:text-xs truncate">
                        {action.label}
                      </span>
                    )}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </>
      ) : (
        <>
          <div className="space-y-2 w-full">
            {displayData.map((item) => {
              const actions = getRowActions ? getRowActions(item) : (rowActions ? rowActions(item) : []);
              const itemKey = (item as any)[keyField as string];
              const isSelected = selectedItems.has(itemKey);

              // Si solo hay una acción, ejecutarla directamente en el click de la tarjeta
              const handleCardClick = () => {
                if (onRowClick) {
                  // Usar onRowClick si existe (tiene prioridad)
                  onRowClick(item);
                } else if (hasOnlyOneAction && actions.length === 1) {
                  // Si no hay onRowClick pero hay una acción, ejecutarla directamente
                  actions[0].onClick?.();
                }
              };

              const isClickable = !!(onRowClick || (hasOnlyOneAction && actions.length === 1));

              // Renderizar columna primaria (título)
              const primaryContent = primaryColumn
                ? (primaryColumn.render ? primaryColumn.render(item, 0) : (item as any)[primaryColumn.key])
                : null;

              // Renderizar columnas de detalle
              // IMPORTANTE: Separar rawValue (valor del registro) de displayValue (ReactNode renderizado)
              // La decisión de "está vacío" se basa en rawValue, no en el ReactNode
              const detailContent = detailColumns.map((col) => {
                // Use mobileLabel if explicitly defined (including empty string), otherwise fall back to label
                const label = col.mobileLabel !== undefined ? col.mobileLabel : col.label;

                // Obtener rawValue: puede venir de col.rawValue (función o valor), o de item[col.key]
                const rawValue = typeof col.rawValue === 'function'
                  ? col.rawValue(item)
                  : col.rawValue !== undefined
                    ? col.rawValue
                    : (item as any)[col.key];

                // Obtener displayValue: el ReactNode renderizado (si existe render) o el rawValue
                const displayValue = typeof col.render === 'function'
                  ? col.render(item, 0)
                  : rawValue;

                return { label, value: displayValue, rawValue, key: col.key, fullRow: col.mobileFullRow };
              }).filter(detail => {
                // Si el render devuelve null o undefined, filtrar (no mostrar)
                if (detail.value === null || detail.value === undefined) {
                  return false;
                }

                // Si es un ReactNode (objeto válido), mostrarlo siempre
                // excepto si el rawValue está vacío Y no hay rawValue definido explícitamente
                if (typeof detail.value === 'object' && detail.value !== null) {
                  const isReactElement = React.isValidElement
                    ? React.isValidElement(detail.value)
                    : (detail.value && typeof detail.value === 'object' && '$$typeof' in (detail.value as any));

                  if (isReactElement) {
                    // Si hay un rawValue definido y está vacío, filtrar
                    // Si no hay rawValue definido (es un componente puro), mostrar siempre
                    if (detail.rawValue !== undefined) {
                      return !isEmptyRawValue(detail.rawValue);
                    }
                    return true; // Mantener ReactNodes sin rawValue definido
                  }
                }

                // Para valores primitivos, aplicar filtro de vacío basado en rawValue
                // Si rawValue está vacío, no mostrar
                return !isEmptyRawValue(detail.rawValue);
              });

              return (
                <div
                  key={itemKey}
                  className={cn(
                    "ui-card app-card w-full text-left box-border relative",
                    "bg-[var(--color-surface-default)] dark:bg-[var(--color-surface-elevated)] border border-[var(--color-border-default)]",
                    "rounded-xl shadow-sm transition-all hover:shadow-md",
                    isSelected && "border-l-4 border-l-[var(--color-primary)] bg-[var(--color-primary-soft)]",
                    isClickable && "cursor-pointer"
                  )}
                  onClick={isClickable ? handleCardClick : undefined}
                >
                  {/* Actions menu in top right */}
                  {actions.length > 0 && (
                    <div className="absolute top-3 right-3" onClick={(e: React.MouseEvent) => e.stopPropagation()}>
                      <RowActionsMenu actions={actions as any} />
                    </div>
                  )}
                  {/* All fields in one flex-wrap row */}
                  <div className="px-4 py-3 md:px-5 md:py-4 flex flex-wrap items-center gap-x-4 gap-y-3 w-full text-xs text-[var(--color-text-secondary)]">
                    {/* Checkbox if selectable */}
                    {selectable && (
                      <div onClick={(e: React.MouseEvent) => e.stopPropagation()} className="shrink-0">
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleSelection(itemKey)}
                          className="h-4 w-4"
                          aria-label={`Seleccionar ${itemKey}`}
                        />
                      </div>
                    )}
                    {/* Primary field */}
                    {primaryContent && (
                      <div className="flex items-center gap-1.5 min-w-0">
                        {primaryColumn?.label && (
                          <span className="font-medium shrink-0">
                            {primaryColumn.mobileLabel || primaryColumn.label}:
                          </span>
                        )}
                        <div className="text-[var(--color-text-primary)] font-medium min-w-0">{primaryContent}</div>
                      </div>
                    )}
                    {/* Detail fields */}
                    {detailContent.map((detail) => (
                      <div
                        key={detail.key}
                        className={cn(
                          "flex items-center gap-1.5 min-w-0",
                          detail.fullRow && "w-full basis-full"
                        )}
                      >
                        {detail.label && (
                          <span className="font-medium shrink-0">{detail.label}:</span>
                        )}
                        <div className="text-[var(--color-text-primary)] min-w-0">{detail.value}</div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {paginated && (
            <TablePagination
              data={sortedData as any}
              pageSize={pageSize}
              currentPage={currentPage}
              onPageChange={setCurrentPage}
              onPageSizeChange={(newSize: number) => {
                setPageSize(newSize);
                setCurrentPage(1);
              }}
            />
          )}

          {selectable && selectedItems.size > 0 && bulkActions && (
            <div className="sticky bottom-0 left-0 right-0 w-full border-t border-[var(--color-border-default)] bg-[var(--color-surface-elevated)] px-3 sm:px-4 py-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-2 shadow-[0_-4px_12px_rgba(0,0,0,0.15)] z-20">
              <span className="text-xs sm:text-sm font-semibold text-[var(--color-text-primary)] shrink-0">
                {selectedItems.size} {selectedItems.size === 1 ? 'elemento seleccionado' : 'elementos seleccionados'}
              </span>
              <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-1.5 sm:gap-2 w-full sm:w-auto">
                {bulkActions.map((action, idx) => (
                  <Button
                    key={idx}
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      action.onClick(Array.from(selectedItems));
                      setInternalSelectedItems(new Set());
                    }}
                    className={cn(
                      componentStyles.buttons.outline,
                      "h-8 sm:h-9 text-xs",
                      "px-2 sm:px-3",
                      isMobile && action.icon
                        ? "flex items-center justify-center w-full"
                        : "justify-center sm:justify-start"
                    )}
                    title={action.label}
                  >
                    {(() => {
                      if (!action.icon) return null;
                      const Icon = action.icon;
                      if (React.isValidElement(Icon)) return <span className={cn("shrink-0", !isMobile && "mr-2")}>{Icon}</span>;
                      if (typeof Icon === 'function' || (typeof Icon === 'object' && Icon !== null)) {
                        const Comp = Icon as React.ElementType;
                        return <Comp className={cn("w-4 h-4 shrink-0", !isMobile && "mr-2")} />;
                      }
                      return null;
                    })()}
                    {(!isMobile || !action.icon) && (
                      <span className="text-[10px] sm:text-xs truncate">
                        {action.label}
                      </span>
                    )}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </>
  );
}