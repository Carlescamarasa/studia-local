import React, { useMemo } from "react";
import { useAsignaciones } from "@/hooks/entities/useAsignaciones";
import { useUsers } from "@/hooks/entities/useUsers";
import { resolveUserIdActual } from "@/components/utils/helpers";
import { useEffectiveUser } from "@/providers/EffectiveUserProvider";
import HabilidadesView from "@/features/progreso/components/HabilidadesView";
import PageHeader from "@/components/ds/PageHeader";
import { componentStyles } from "@/design/componentStyles";
import { Star } from "lucide-react";

export default function HabilidadesPage() {
    const effectiveUser = useEffectiveUser();
    const isAdmin = effectiveUser?.rolPersonalizado === 'ADMIN';
    const isProf = effectiveUser?.rolPersonalizado === 'PROF';

    // Usar hook centralizado para usuarios
    const { data: usuarios = [] } = useUsers();

    // Resolve current user ID
    const userIdActual = useMemo(() => {
        return resolveUserIdActual(effectiveUser, usuarios);
    }, [effectiveUser, usuarios]);

    // Usar hook centralizado para asignaciones (filtramos después)
    const { data: asignacionesProf = [] } = useAsignaciones();

    const estudiantesDelProfesor = useMemo(() => {
        if (!isProf || !effectiveUser) return [];

        const misAsignaciones = asignacionesProf.filter(a =>
            a.profesorId === userIdActual &&
            (a.estado === 'publicada' || a.estado === 'en_curso' || a.estado === 'borrador')
        );

        const alumnosIds = [...new Set(misAsignaciones.map(a => a.alumnoId))];
        return alumnosIds;
    }, [asignacionesProf, effectiveUser, isProf, userIdActual]);

    const estudiantes = usuarios.filter(u => u.rolPersonalizado === 'ESTU');

    return (
        <div className="min-h-screen bg-background">
            <PageHeader
                title="Habilidades Maestras"
                subtitle="Visualiza y analiza el progreso técnico"
                icon={Star}
            />

            <div className="studia-section">
                <HabilidadesView
                    alumnoId={userIdActual}
                    students={
                        isAdmin
                            ? estudiantes
                            : isProf
                                ? estudiantes.filter(e => estudiantesDelProfesor.includes(e.id))
                                : []
                    }
                    enableSelection={isAdmin || isProf}
                    showTitle={false}
                />
            </div>
        </div>
    );
}
