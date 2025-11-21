import React, { useState, useEffect, useCallback } from "react";
import { X, Search, Check, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { componentStyles } from "@/design/componentStyles";
import { supabase } from "@/lib/supabaseClient";
import { displayName } from "@/components/utils/helpers";

/**
 * StudentSearchBarAsync
 * - Búsqueda asíncrona en Supabase con debounce
 * - No carga estudiantes al montar
 * - Busca solo cuando el usuario escribe (mínimo 1 carácter)
 * - Selección múltiple con chips removibles
 * 
 * Props:
 * - value: string[] (ids seleccionados)
 * - onChange: (newValues: string[]) => void
 * - placeholder?: string
 * - className?: string
 * - profesorFilter?: string (ID del profesor para filtrar, opcional)
 * - selectedStudents?: Array<{ id: string, nombre: string, email?: string }> (estudiantes ya seleccionados para mostrar)
 */
export default function StudentSearchBarAsync({
  value = [],
  onChange,
  placeholder = "Buscar estudiante por nombre...",
  className,
  profesorFilter = null,
  selectedStudents = [],
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [debouncedQuery, setDebouncedQuery] = useState("");

  // Debounce de 300ms
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  // Buscar estudiantes en Supabase cuando cambia la query (mínimo 1 carácter)
  useEffect(() => {
    const searchStudents = async () => {
      const trimmedQuery = debouncedQuery.trim();
      
      // No buscar si la query tiene menos de 1 carácter
      if (trimmedQuery.length < 1) {
        setResults([]);
        return;
      }

      setIsLoading(true);
      
      try {
        let supabaseQuery = supabase
          .from('profiles')
          .select('id, full_name, role, profesor_asignado_id')
          .eq('role', 'ESTU')
          .ilike('full_name', `%${trimmedQuery}%`)
          .order('full_name', { ascending: true });

        // Si hay filtro de profesor, añadir condición
        if (profesorFilter && profesorFilter !== 'all') {
          supabaseQuery = supabaseQuery.eq('profesor_asignado_id', profesorFilter);
        }

        const { data, error } = await supabaseQuery;

        if (error) {
          console.error('[StudentSearchBarAsync] Error buscando estudiantes:', error);
          setResults([]);
        } else {
          // Normalizar resultados
          // Nota: El email no está en profiles, se obtiene del usuario autenticado si coincide
          const normalized = (data || []).map(estudiante => ({
            value: estudiante.id,
            label: estudiante.full_name || 'Sin nombre',
            nombre: estudiante.full_name || 'Sin nombre',
            email: null, // El email no está disponible en profiles
          }));
          setResults(normalized);
        }
      } catch (error) {
        console.error('[StudentSearchBarAsync] Error inesperado:', error);
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    };

    searchStudents();
  }, [debouncedQuery, profesorFilter]);

  // Combinar resultados con estudiantes ya seleccionados para mostrar en los chips
  const allStudentsMap = React.useMemo(() => {
    const map = new Map();
    
    // Añadir estudiantes seleccionados
    selectedStudents.forEach(est => {
      map.set(est.id, {
        value: est.id,
        label: `${est.nombre}${est.email ? ` (${est.email})` : ''}`.trim(),
      });
    });
    
    // Añadir resultados de búsqueda
    results.forEach(est => {
      map.set(est.value, est);
    });
    
    return map;
  }, [selectedStudents, results]);

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
      {/* Chips de estudiantes seleccionados */}
      <div className="flex items-center gap-2 flex-wrap">
        {value.length === 0 ? (
          <span className="text-xs text-[var(--color-text-secondary)]">Ningún estudiante seleccionado</span>
        ) : (
          <>
            {value.map((id) => {
              const student = allStudentsMap.get(id);
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

      {/* Input de búsqueda */}
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

      {/* Contenedor de resultados con scroll */}
      <div className="border border-[var(--color-border-default)] rounded-[var(--radius-card)] overflow-hidden">
        <div className="max-h-[200px] overflow-y-auto">
          {isLoading ? (
            <div className="p-3 text-sm text-[var(--color-text-secondary)] flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Buscando…</span>
            </div>
          ) : query.trim().length < 1 ? (
            <div className="p-3 text-sm text-[var(--color-text-secondary)]">
              Escribe al menos 1 carácter para buscar
            </div>
          ) : results.length === 0 ? (
            <div className="p-3 text-sm text-[var(--color-text-secondary)]">Sin resultados</div>
          ) : (
            <ul className="divide-y divide-[var(--color-border-default)]">
              {results.map((it) => {
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

