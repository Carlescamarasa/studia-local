import React, { useMemo } from 'react';
import { useStudentBackpack } from '@/hooks/useStudentBackpack';
import { PageHeader, Card, CardContent, CardHeader, CardTitle, Badge, EmptyState } from '@/features/shared/components/ds';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Backpack, Trophy, Clock, Archive } from 'lucide-react';

export default function MochilaPage() {
    const { data: backpackItems = [], isLoading, error } = useStudentBackpack();

    const stats = useMemo(() => {
        return {
            total: backpackItems.length,
            mastered: backpackItems.filter(i => i.status === 'dominado').length,
            inProgress: backpackItems.filter(i => i.status === 'en_progreso').length,
        };
    }, [backpackItems]);

    const getStatusBadgeVariant = (status) => {
        switch (status) {
            case 'dominado': return 'success';
            case 'en_progreso': return 'info'; // Assuming 'info' or 'primary' exists, checking DS usually default/outline/secondary/destructive. I'll use default or custom class if needed.
            case 'oxidado': return 'warning';
            case 'archivado': return 'outline';
            default: return 'default';
        }
    };

    const getStatusLabel = (status) => {
        switch (status) {
            case 'dominado': return 'Dominado';
            case 'en_progreso': return 'En Progreso';
            case 'oxidado': return 'Oxidado';
            case 'archivado': return 'Archivado';
            case 'nuevo': return 'Nuevo';
            default: return status;
        }
    };

    if (isLoading) {
        return (
            <div className="p-8 flex justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-8 text-center text-red-600">
                Error cargando la mochila: {error.message}
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50/50 pb-12">
            <PageHeader
                title="Mochila de Estudio"
                description="Gestiona tu repertorio y progreso técnico a largo plazo."
                icon={Backpack}
            />

            <main className="studia-section mt-8 space-y-8">
                {/* Stats Row */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Items en Mochila</CardTitle>
                            <Backpack className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stats.total}</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Dominados</CardTitle>
                            <Trophy className="h-4 w-4 text-green-600" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stats.mastered}</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">En Progreso</CardTitle>
                            <Clock className="h-4 w-4 text-blue-600" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stats.inProgress}</div>
                        </CardContent>
                    </Card>
                </div>

                {/* Content Table */}
                <Card>
                    <CardHeader>
                        <CardTitle>Repertorio Activo</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {backpackItems.length === 0 ? (
                            <EmptyState
                                icon={<Backpack className="w-12 h-12 text-muted-foreground" />}
                                title="Mochila vacía"
                                description="A medida que practiques, los ejercicios se guardarán aquí automáticamente."
                            />
                        ) : (
                            <div className="rounded-md border">
                                <table className="w-full text-sm">
                                    <thead className="bg-gray-50 border-b">
                                        <tr>
                                            <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Ejercicio / Item</th>
                                            <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Estado</th>
                                            <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Nivel Maestría</th>
                                            <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Última Práctica</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {backpackItems.map((item) => (
                                            <tr key={item.id} className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                                                <td className="p-4 align-middle font-medium">
                                                    {item.backpackKey}
                                                </td>
                                                <td className="p-4 align-middle">
                                                    <Badge variant={getStatusBadgeVariant(item.status)}>
                                                        {getStatusLabel(item.status)}
                                                    </Badge>
                                                </td>
                                                <td className="p-4 align-middle">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-full bg-secondary rounded-full h-2.5 max-w-[100px] overflow-hidden">
                                                            <div
                                                                className="bg-primary h-2.5 rounded-full"
                                                                style={{ width: `${Math.min(100, item.masteryScore)}%` }}
                                                            ></div>
                                                        </div>
                                                        <span className="text-xs text-muted-foreground">{item.masteryScore} XP</span>
                                                    </div>
                                                </td>
                                                <td className="p-4 align-middle text-muted-foreground">
                                                    {item.lastPracticedAt
                                                        ? format(new Date(item.lastPracticedAt), "d MMM yyyy", { locale: es })
                                                        : '-'
                                                    }
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </main>
        </div>
    );
}
