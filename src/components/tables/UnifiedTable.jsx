import React, { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ds";
import { ChevronUp, ChevronDown } from "lucide-react";
import RowActionsMenu from "@/components/common/RowActionsMenu";

export default function UnifiedTable({
  columns,
  data,
  onRowClick,
  rowActions,
  getRowActions,
  bulkActions,
  keyField = "id",
  selectable = false,
  emptyMessage = "No hay datos disponibles"
}) {
  const [sortColumn, setSortColumn] = useState(null);
  const [sortDirection, setSortDirection] = useState('asc');
  const [selectedItems, setSelectedItems] = useState(new Set());

  const handleSort = (columnKey) => {
    if (!columnKey) return;
    
    if (sortColumn === columnKey) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(columnKey);
      setSortDirection('asc');
    }
  };

  const sortedData = React.useMemo(() => {
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

  if (data.length === 0) {
    return (
      <div className="text-center py-12 text-muted">
        {emptyMessage}
      </div>
    );
  }

  return (
    <>
      {isDesktop ? (
        <>
          <div className="w-full overflow-x-auto">
            <Table>
              <TableHeader>
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
                      className={col.sortable ? 'cursor-pointer hover:bg-muted transition-colors' : ''}
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
                  {hasActions && <TableHead className="w-10"></TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedData.map((item) => {
                  const actions = getRowActions ? getRowActions(item) : (rowActions ? rowActions(item) : []);
                  const isSelected = selectedItems.has(item[keyField]);
                  
                  return (
                    <TableRow
                      key={item[keyField]}
                      className={`group transition-colors ${onRowClick ? 'cursor-pointer' : ''} ${isSelected ? 'bg-[hsl(var(--brand-50))] border-l-4 border-l-[hsl(var(--brand-500))]' : 'hover:bg-muted'}`}
                      onClick={() => onRowClick && onRowClick(item)}
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
                      {hasActions && (
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

          {selectable && selectedItems.size > 0 && bulkActions && (
            <div className="sticky bottom-0 bg-background border-t border-[var(--color-border-default)] shadow-card p-4 mt-4 app-card">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-ui">
                  {selectedItems.size} seleccionados
                </span>
                <div className="flex gap-2">
                  {bulkActions.map((action, idx) => (
                    <Button
                      key={idx}
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        action.onClick(Array.from(selectedItems));
                        setSelectedItems(new Set());
                      }}
                      className="btn-secondary h-9"
                    >
                      <action.icon className="w-4 h-4 mr-2" />
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
          <div className="space-y-3">
            {sortedData.map((item) => {
              const actions = getRowActions ? getRowActions(item) : (rowActions ? rowActions(item) : []);
              const isSelected = selectedItems.has(item[keyField]);
              
              return (
                <Card 
                  key={item[keyField]} 
                  className={`app-card hover:shadow-md transition-all ${isSelected ? 'border-l-4 border-l-[hsl(var(--brand-500))] bg-[hsl(var(--brand-50))]' : ''}`}
                >
                  <CardContent className="pt-4">
                    <div className="flex items-start gap-3">
                      {selectable && (
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleSelection(item[keyField])}
                          className="mt-1"
                          aria-label={`Seleccionar ${item[keyField]}`}
                        />
                      )}
                      <div 
                        className="flex-1 min-w-0 cursor-pointer"
                        onClick={() => onRowClick && onRowClick(item)}
                      >
                        {columns.slice(0, 3).map((col) => (
                          <div key={col.key} className="mb-2">
                            {col.render ? col.render(item) : (
                              <>
                                <p className="text-xs text-muted">{col.label}</p>
                                <p className="text-sm font-medium text-ui">{item[col.key]}</p>
                              </>
                            )}
                          </div>
                        ))}
                      </div>
                      {hasActions && actions.length > 0 && (
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

          {selectable && selectedItems.size > 0 && bulkActions && (
            <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-[var(--color-border-default)] shadow-card p-4 z-20 app-panel">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-ui">
                  {selectedItems.size} seleccionados
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
                      className="btn-secondary h-9"
                    >
                      <action.icon className="w-4 h-4 mr-2" />
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