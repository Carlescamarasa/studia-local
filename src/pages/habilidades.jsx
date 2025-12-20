import React, { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { localDataClient } from "@/api/localDataClient";
import { useEffectiveUser, resolveUserIdActual } from "@/components/utils/helpers";
import HabilidadesView from "@/components/estadisticas/HabilidadesView";
import PageHeader from "@/components/ds/PageHeader";
import { componentStyles } from "@/design/componentStyles";
import { Star } from "lucide-react";

export default function HabilidadesPage() {
    const effectiveUser = useEffectiveUser();
    const isAdmin = effectiveUser?.rolPersonalizado === 'ADMIN';
    const isProf = effectiveUser?.rolPersonalizado === 'PROF';

    // Load users
    const { data: usuarios = [] } = useQuery({
        queryKey: ['users'],
        queryFn: () => localDataClient.entities.User.list(),
        staleTime: 5 * 60 * 1000, // 5 minutos - evita refetch en navegación cálida
    });

    // Resolve current user ID
    const userIdActual = useMemo(() => {
        return resolveUserIdActual(effectiveUser, usuarios);
    }, [effectiveUser, usuarios]);

    // Load assignments for professor to filter students
    const { data: asignacionesProf = [] } = useQuery({
        queryKey: ['asignacionesProf', userIdActual],
        queryFn: () => localDataClient.entities.Asignacion.list(),
        enabled: isProf && !!userIdActual,
        staleTime: 5 * 60 * 1000,
    });

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
