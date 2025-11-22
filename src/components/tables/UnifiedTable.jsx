import React, { useState, useMemo } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ChevronUp, ChevronDown, FileText } from "lucide-react";
import RowActionsMenu from "@/components/common/RowActionsMenu";
import TablePagination from "@/components/common/TablePagination";
import { componentStyles } from "@/design/componentStyles";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

export default function UnifiedTable({
  columns,
  data,
  onRowClick,
  rowActions,
  getRowActions,
  bulkActions,
  keyField = "id",
  selectable = false,
  emptyMessage = "No hay datos disponibles",
  emptyIcon: EmptyIcon = FileText,
  paginated = true,
  defaultPageSize = 10
}) {
  const [sortColumn, setSortColumn] = useState(null);
  const [sortDirection, setSortDirection] = useState('asc');
  const [selectedItems, setSelectedItems] = useState(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(defaultPageSize);

  const handleSort = (columnKey) => {
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

    return [...data].sort((a, b) => {
      const column = columns.find(c => c.key === sortColumn);
      if (!column) return 0;

      const aVal = column.sortValue ? column.sortValue(a) : a[sortColumn];
      const bVal = column.sortValue ? column.sortValue(b) : b[sortColumn];

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

  const toggleSelection = (itemKey) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(itemKey)) {
      newSelected.delete(itemKey);
    } else {
      newSelected.add(itemKey);
    }
    setSelectedItems(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedItems.size === data.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(data.map(item => item[keyField])));
    }
  };

  const isMobile = useIsMobile();
  const isDesktop = !isMobile;

  const hasActions = (rowActions && typeof rowActions === 'function') || getRowActions;
  
  // Verificar si solo hay una acción para todos los items (si es así, ocultar columna de acciones)
  const sampleActions = data.length > 0 && hasActions 
    ? (getRowActions ? getRowActions(data[0]) : (rowActions ? rowActions(data[0]) : []))
    : [];
  const hasOnlyOneAction = sampleActions.length === 1;
  const shouldHideActionsColumn = hasOnlyOneAction;

  // Preparar columnas para mobile: filtrar ocultas y determinar columna primaria
  const mobileColumns = useMemo(() => {
    return columns.filter(col => !col.mobileHidden);
  }, [columns]);

  const primaryColumn = useMemo(() => {
    return mobileColumns.find(col => col.mobileIsPrimary) || mobileColumns[0];
  }, [mobileColumns]);

  const detailColumns = useMemo(() => {
    // Hasta 3 columnas que no sean la primaria y no estén ocultas
    return mobileColumns
      .filter(col => col.key !== primaryColumn?.key && !col.mobileHidden)
      .slice(0, 3);
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
          <div className="w-full overflow-x-auto rounded-2xl border border-[var(--color-border-default)] overflow-hidden">
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
                </TableRow>
              </TableHeader>
              <TableBody zebra>
                {displayData.map((item) => {
                  const actions = getRowActions ? getRowActions(item) : (rowActions ? rowActions(item) : []);
                  const isSelected = selectedItems.has(item[keyField]);
                  
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
                  
                  return (
                    <TableRow
                      key={item[keyField]}
                      clickable={!!(onRowClick || (hasOnlyOneAction && actions.length === 1))}
                      selected={isSelected}
                      className="group hover:bg-[var(--color-surface-muted)]/50 transition-colors"
                      onClick={handleRowClick}
                    >
                      {selectable && (
                        <TableCell onClick={(e) => e.stopPropagation()} className="py-2 px-3">
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => toggleSelection(item[keyField])}
                            aria-label={`Seleccionar ${item[keyField]}`}
                          />
                        </TableCell>
                      )}
                      {columns.map((col) => (
                        <TableCell key={col.key} className="py-2 px-3 text-sm">
                          {col.render ? col.render(item) : item[col.key]}
                        </TableCell>
                      ))}
                      {hasActions && !shouldHideActionsColumn && (
                        <TableCell className="text-right py-2 px-3" onClick={(e) => e.stopPropagation()}>
                          <div className="opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-150 flex justify-end">
                            <RowActionsMenu actions={actions} />
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
              data={sortedData}
              pageSize={pageSize}
              currentPage={currentPage}
              onPageChange={setCurrentPage}
              onPageSizeChange={(newSize) => {
                setPageSize(newSize);
                setCurrentPage(1);
              }}
            />
          )}

          {selectable && selectedItems.size > 0 && bulkActions && (
            <div className="sticky bottom-0 bg-[var(--color-surface-elevated)] border-t border-[var(--color-border-default)] shadow-lg p-4 mt-4 rounded-lg backdrop-blur-sm">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <span className="text-sm font-semibold text-[var(--color-text-primary)]">
                  {selectedItems.size} {selectedItems.size === 1 ? 'elemento seleccionado' : 'elementos seleccionados'}
                </span>
                <div className="flex gap-2 flex-wrap">
                  {bulkActions.map((action, idx) => (
                    <Button
                      key={idx}
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        action.onClick(Array.from(selectedItems));
                        setSelectedItems(new Set());
                      }}
                      className="h-9 text-xs"
                    >
                      {action.icon && <action.icon className="w-4 h-4 mr-2" />}
                      {action.label}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </>
      ) : (
        <>
          <div className="space-y-2">
            {displayData.map((item) => {
              const actions = getRowActions ? getRowActions(item) : (rowActions ? rowActions(item) : []);
              const isSelected = selectedItems.has(item[keyField]);
              
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
                ? (primaryColumn.render ? primaryColumn.render(item) : item[primaryColumn.key])
                : null;
              
              // Renderizar columnas de detalle
              const detailContent = detailColumns.map((col) => {
                const label = col.mobileLabel || col.label;
                const value = col.render ? col.render(item) : item[col.key];
                return { label, value, key: col.key };
              }).filter(detail => detail.value != null && detail.value !== '');
              
              return (
                <div
                  key={item[keyField]}
                  className={cn(
                    "w-full text-left rounded-2xl border border-[var(--color-border-default)]",
                    "bg-[var(--color-surface-default)]",
                    "px-3 py-2 flex flex-col gap-1",
                    "transition-all hover:shadow-sm",
                    isSelected && "border-l-4 border-l-[hsl(var(--brand-500))] bg-[hsl(var(--brand-50))]",
                    isClickable && "cursor-pointer"
                  )}
                  onClick={isClickable ? handleCardClick : undefined}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0 flex-1 flex items-center gap-2">
                      {selectable && (
                        <div onClick={(e) => e.stopPropagation()}>
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => toggleSelection(item[keyField])}
                            className="h-4 w-4 shrink-0"
                            aria-label={`Seleccionar ${item[keyField]}`}
                          />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        {primaryContent && (
                          <p className="font-medium text-sm truncate">
                            {primaryContent}
                          </p>
                        )}
                      </div>
                    </div>
                    {hasActions && !shouldHideActionsColumn && actions.length > 0 && (
                      <div onClick={(e) => e.stopPropagation()} className="shrink-0">
                        <RowActionsMenu actions={actions} />
                      </div>
                    )}
                  </div>
                  {detailContent.length > 0 && (
                    <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-[var(--color-text-secondary)]">
                      {detailContent.map((detail) => (
                        <span key={detail.key}>
                          <span className="font-medium">{detail.label}:</span>{' '}
                          <span className="text-[var(--color-text-primary)]">{detail.value}</span>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {paginated && (
            <TablePagination
              data={sortedData}
              pageSize={pageSize}
              currentPage={currentPage}
              onPageChange={setCurrentPage}
              onPageSizeChange={(newSize) => {
                setPageSize(newSize);
                setCurrentPage(1);
              }}
            />
          )}

          {selectable && selectedItems.size > 0 && bulkActions && (
            <div className="fixed bottom-0 left-0 right-0 bg-[var(--color-surface-elevated)] border-t border-[var(--color-border-default)] shadow-lg p-4 z-20 backdrop-blur-sm">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 max-w-7xl mx-auto">
                <span className="text-sm font-semibold text-[var(--color-text-primary)]">
                  {selectedItems.size} {selectedItems.size === 1 ? 'elemento seleccionado' : 'elementos seleccionados'}
                </span>
                <div className="flex gap-2 flex-wrap">
                  {bulkActions.map((action, idx) => (
                    <Button
                      key={idx}
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        action.onClick(Array.from(selectedItems));
                        setSelectedItems(new Set());
                      }}
                      className="h-9 text-xs"
                    >
                      {action.icon && <action.icon className="w-4 h-4 mr-2" />}
                      {action.label}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </>
  );
}