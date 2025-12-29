import React, { useState, useEffect, useMemo } from "react";
import { X, Search, Check, Loader2 } from "lucide-react";
import { Input } from "@/features/shared/components/ui/input";
import { Badge } from "@/features/shared/components/ui/badge";
import { cn } from "@/lib/utils";
import { componentStyles } from "@/design/componentStyles";
import { useUsers } from "@/features/shared/hooks/useUsers";
import { displayName } from "@/features/shared/utils/helpers";

interface Usuario {
    id: string;
    nombre?: string;
    email?: string;
    rolPersonalizado?: string;
    role?: string;
    profesorAsignadoId?: string;
    profesor_asignado_id?: string;
}

interface StudentResult {
    value: string;
    label: string;
    nombre: string;
    email: string | null;
}

interface SelectedStudent {
    id: string;
    nombre: string;
    email?: string;
}

interface StudentSearchBarAsyncProps {
    value: string[];
    onChange: (newValues: string[]) => void;
    placeholder?: string;
    className?: string;
    profesorFilter?: string | null;
    selectedStudents?: SelectedStudent[];
}

/**
 * StudentSearchBarAsync
 * - Búsqueda en memoria usando useUsers (cached) con debounce simulado para UX
 * - No carga estudiantes individualmente, usa el cache global
 * - Selección múltiple con chips removibles
 */
export default function StudentSearchBarAsync({
    value = [],
    onChange,
    placeholder = "Buscar estudiante por nombre...",
    className,
    profesorFilter = null,
    selectedStudents = [],
}: StudentSearchBarAsyncProps) {
    const [query, setQuery] = useState("");
    const [debouncedQuery, setDebouncedQuery] = useState("");

    // Usar el hook useUsers para obtener todos los usuarios (cached)
    const { data: allUsers = [], isLoading: isLoadingUsers } = useUsers() as { data: Usuario[]; isLoading: boolean };

    // Debounce de 300ms para la búsqueda visual
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedQuery(query);
        }, 300);

        return () => clearTimeout(timer);
    }, [query]);

    // Filtrar resultados usando useMemo
    const results: StudentResult[] = useMemo(() => {
        const trimmedQuery = debouncedQuery.trim();

        // Si no hay query, devolver vacío (o comportamiento deseado)
        if (trimmedQuery.length < 1) {
            return [];
        }

        const queryLower = trimmedQuery.toLowerCase();

        // Filtrar usuarios que son ESTU y coinciden con la query
        const filtered = allUsers.filter((u: Usuario) => {
            // Verificar rol (manejar ambos nombres de propiedad por compatibilidad)
            const rol = u.rolPersonalizado || u.role;
            if (rol !== 'ESTU') return false;

            // Filtro de profesor si aplica
            if (profesorFilter && profesorFilter !== 'all') {
                // useUsers devuelve camelCase (profesorAsignadoId)
                if (u.profesorAsignadoId !== profesorFilter && u.profesor_asignado_id !== profesorFilter) {
                    return false;
                }
            }

            // Filtro de texto
            const nombre = displayName(u).toLowerCase();
            const email = (u.email || '').toLowerCase();

            return nombre.includes(queryLower) || email.includes(queryLower);
        });

        // Ordenar y normalizar
        return filtered
            .map((estudiante: Usuario) => ({
                value: estudiante.id,
                label: `${displayName(estudiante)}${estudiante.email ? ` (${estudiante.email})` : ''}`.trim(),
                nombre: displayName(estudiante),
                email: estudiante.email || null,
            }))
            .sort((a, b) => a.label.localeCompare(b.label));

    }, [debouncedQuery, allUsers, profesorFilter]);

    // Combinar resultados con estudiantes ya seleccionados para mostrar en los chips
    const allStudentsMap = useMemo(() => {
        const map = new Map<string, { value: string; label: string }>();

        // Añadir estudiantes seleccionados (props)
        selectedStudents.forEach(est => {
            map.set(est.id, {
                value: est.id,
                label: `${est.nombre}${est.email ? ` (${est.email})` : ''}`.trim(),
            });
        });

        // Añadir estudiantes del hook si están seleccionados pero no en props (fallback)
        value.forEach(id => {
            if (!map.has(id)) {
                const u = allUsers.find((user: Usuario) => user.id === id);
                if (u) {
                    map.set(id, {
                        value: u.id,
                        label: `${displayName(u)}${u.email ? ` (${u.email})` : ''}`.trim(),
                    });
                }
            }
        });

        // Añadir resultados de búsqueda actuales
        results.forEach(est => {
            map.set(est.value, est);
        });

        return map;
    }, [selectedStudents, results, value, allUsers]);

    const toggle = (id: string) => {
        const isSelected = value.includes(id);
        if (isSelected) {
            onChange(value.filter((v) => v !== id));
        } else {
            onChange([...value, id]);
        }
    };

    const remove = (id: string) => {
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
                            // Si no encontramos datos, mostrar ID (fallback extremo)
                            const label = student ? student.label : "Cargando...";

                            return (
                                <Badge key={id} variant="secondary" className="rounded-full px-2 py-1 text-xs flex items-center gap-1">
                                    <span className="truncate max-w-[180px]">{label}</span>
                                    <button
                                        type="button"
                                        onClick={() => remove(id)}
                                        className="ml-1 hover:opacity-80"
                                        aria-label={`Quitar ${label}`}
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
                    {isLoadingUsers && results.length === 0 ? (
                        <div className="p-3 text-sm text-[var(--color-text-secondary)] flex items-center gap-2">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>Cargando estudiantes...</span>
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
