import React from "react";
import { X, Search, Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { componentStyles } from "@/design/componentStyles";

/**
 * StudentSearchBar
 * - Búsqueda instantánea con lista filtrada
 * - Selección múltiple con chips removibles
 * - Optimizado para >50 estudiantes (filtro en memoria)
 *
 * Props:
 * - items: Array<{ value: string, label: string }>
 * - value: string[] (ids seleccionados)
 * - onChange: (newValues: string[]) => void
 * - placeholder?: string
 * - className?: string
 */
export default function StudentSearchBar({
  items,
  value = [],
  onChange,
  placeholder = "Buscar estudiantes...",
  className,
}) {
  const [query, setQuery] = React.useState("");

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((it) => it.label.toLowerCase().includes(q));
  }, [items, query]);

  const toggle = (id) => {
    const isSelected = value.includes(id);
    if (isSelected) {
      onChange(value.filter((v) => v !== id));
    } else {
      onChange([...value, id]);
    }
  };

  const remove = (id) => {
    onChange(value.filter((v) => v !== id));
  };

  const clearAll = () => {
    onChange([]);
  };

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center gap-2 flex-wrap">
        {value.length === 0 ? (
          <span className="text-xs text-[var(--color-text-secondary)]">Ningún estudiante seleccionado</span>
        ) : (
          <>
            {value.map((id) => {
              const student = items.find((it) => it.value === id);
              if (!student) return null;
              return (
                <Badge key={id} variant="secondary" className="rounded-full px-2 py-1 text-xs flex items-center gap-1">
                  <span className="truncate max-w-[180px]">{student.label}</span>
                  <button
                    type="button"
                    onClick={() => remove(id)}
                    className="ml-1 hover:opacity-80"
                    aria-label={`Quitar ${student.label}`}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              );
            })}
            <button
              type="button"
              onClick={clearAll}
              className="text-xs text-[var(--color-text-secondary)] underline hover:text-[var(--color-text-primary)]"
            >
              Limpiar
            </button>
          </>
        )}
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-secondary)]" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          className={`pl-10 ${componentStyles.controls.inputDefault}`}
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          data-lt-active="false"
          data-gramm="false"
          data-form-type="other"
          aria-label="Buscar estudiantes"
        />
      </div>

      <div className="border border-[var(--color-border-default)] rounded-[var(--radius-card)] overflow-hidden">
        <div className="max-h-64 overflow-auto">
          {filtered.length === 0 ? (
            <div className="p-3 text-sm text-[var(--color-text-secondary)]">Sin resultados</div>
          ) : (
            <ul className="divide-y divide-[var(--color-border-default)]">
              {filtered.map((it) => {
                const selected = value.includes(it.value);
                return (
                  <li
                    key={it.value}
                    className={cn(
                      "flex items-center gap-2 p-2 cursor-pointer hover:bg-muted",
                      selected && "bg-[var(--color-primary-soft)]"
                    )}
                    onClick={() => toggle(it.value)}
                  >
                    <div
                      className={cn(
                        "w-4 h-4 border-2 rounded flex items-center justify-center",
                        selected ? "bg-[var(--color-accent)] border-[var(--color-accent)]" : "border-[var(--color-border-default)]"
                      )}
                    >
                      {selected && <Check className="w-3 h-3 text-white" />}
                    </div>
                    <span className="text-sm text-[var(--color-text-primary)] truncate">{it.label}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}


