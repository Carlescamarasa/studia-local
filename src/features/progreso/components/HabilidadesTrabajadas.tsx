import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/features/shared/components/ds';
import { Loader2, Activity } from 'lucide-react';
import { RegistroBloque, Bloque } from '@/features/shared/types/domain';

interface HabilidadesTrabajadasProps {
    data: { skill: string; count: number }[];
    isLoading?: boolean;
}

export default function HabilidadesTrabajadas({ data, isLoading }: HabilidadesTrabajadasProps) {
    if (isLoading) {
        return (
            <div className="flex justify-center p-4">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (!data || data.length === 0) {
        return (
            <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
                <div className="p-6 text-center text-muted-foreground text-sm">
                    No hay actividad registrada en habilidades maestras en los últimos 30 días.
                </div>
            </div>
        );
    }

    return (
        <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
            <div className="flex flex-col space-y-1.5 p-6 pb-2">
                <h3 className="text-sm font-medium flex items-center gap-2 leading-none tracking-tight">
                    <Activity className="h-4 w-4" />
                    Habilidades trabajadas (últimos 30 días)
                </h3>
            </div>
            <div className="p-6 pt-0">
                <ul className="space-y-2">
                    {data.map(({ skill, count }) => (
                        <li key={skill} className="flex justify-between items-center text-sm">
                            <span className="font-medium">{skill}</span>
                            <span className="bg-secondary text-secondary-foreground px-2 py-1 rounded-full text-xs">
                                {count} sesiones
                            </span>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
}
