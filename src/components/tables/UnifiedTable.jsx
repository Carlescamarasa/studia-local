import React, { useState, useMemo } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ds";
import { ChevronUp, ChevronDown, FileText } from "lucide-react";
import RowActionsMenu from "@/components/common/RowActionsMenu";
import TablePagination from "@/components/common/TablePagination";
import { componentStyles } from "@/design/componentStyles";

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

  const [isDesktop, setIsDesktop] = React.useState(
    typeof window !== 'undefined' && window.innerWidth >= 1024
  );

  React.useEffect(() => {
    const handleResize = () => {
      setIsDesktop(window.innerWidth >= 1024);
    };
    
    window.addEventListener('resize', handleResize);
    handleResize();
    
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const hasActions = (rowActions && typeof rowActions === 'function') || getRowActions;
  
  // Verificar si solo hay una acción para todos los items (si es así, ocultar columna de acciones)
  const sampleActions = data.length > 0 && hasActions 
    ? (getRowActions ? getRowActions(data[0]) : (rowActions ? rowActions(data[0]) : []))
    : [];
  const hasOnlyOneAction = sampleActions.length === 1;
  const shouldHideActionsColumn = hasOnlyOneAction;

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
          <div className="w-full overflow-x-auto">
            <Table>
              <TableHeader sticky>
                <TableRow>
                  {selectable && (
                    <TableHead className="w-12">
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
                    >
                      <div className="flex items-center gap-2">
                        {col.label}
                        {col.sortable && sortColumn === col.key && (
                          sortDirection === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                        )}
                      </div>
                    </TableHead>
                  ))}
                  {hasActions && !shouldHideActionsColumn && <TableHead className="w-10"></TableHead>}
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
                      className="group"
                      onClick={handleRowClick}
                    >
                      {selectable && (
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => toggleSelection(item[keyField])}
                            aria-label={`Seleccionar ${item[keyField]}`}
                          />
                        </TableCell>
                      )}
                      {columns.map((col) => (
                        <TableCell key={col.key}>
                          {col.render ? col.render(item) : item[col.key]}
                        </TableCell>
                      ))}
                      {hasActions && !shouldHideActionsColumn && (
                        <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
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
          <div className="space-y-2 sm:space-y-3">
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
              
              return (
                <Card 
                  key={item[keyField]} 
                  className={`app-card hover:shadow-md transition-all ${isSelected ? 'border-l-4 border-l-[hsl(var(--brand-500))] bg-[hsl(var(--brand-50))]' : ''} ${isClickable ? 'cursor-pointer' : ''}`}
                >
                  <CardContent className="p-0.5 sm:p-1 md:p-1.5">
                    <div className="flex items-start gap-1.5 sm:gap-2">
                      {selectable && (
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleSelection(item[keyField])}
                          className="mt-1"
                          aria-label={`Seleccionar ${item[keyField]}`}
                        />
                      )}
                      <div 
                        className={`flex-1 min-w-0 ${isClickable ? 'cursor-pointer' : ''}`}
                        onClick={isClickable ? handleCardClick : undefined}
                      >
                        {columns.map((col) => (
                          <div key={col.key} className="mb-1 sm:mb-1.5 md:mb-2 last:mb-0">
                            {col.render ? col.render(item) : (
                              <>
                                <p className="text-[10px] sm:text-xs text-[var(--color-text-secondary)] mb-0.5 sm:mb-1">{col.label}</p>
                                <p className="text-xs sm:text-sm font-medium text-[var(--color-text-primary)]">{item[col.key]}</p>
                              </>
                            )}
                          </div>
                        ))}
                      </div>
                      {hasActions && !shouldHideActionsColumn && actions.length > 0 && (
                        <div onClick={(e) => e.stopPropagation()}>
                          <RowActionsMenu actions={actions} />
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
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