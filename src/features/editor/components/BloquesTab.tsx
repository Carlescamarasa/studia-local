/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState } from "react";
import { useBloques } from "@/features/estudio/hooks/useBloques";
import { Button } from "@/features/shared/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/features/shared/components/ui/card";
import { Input } from "@/features/shared/components/ui/input";
import { Badge } from "@/features/shared/components/ds/Badge";
import { Plus, Search, Layers } from "lucide-react";
import ExerciseEditor from "./ExerciseEditor";
import { componentStyles } from "@/design/componentStyles";

export default function BloquesTab() {
  const [searchTerm, setSearchTerm] = useState("");
  const [editingBloque, setEditingBloque] = useState<any | null>(null);
  const [showEditor, setShowEditor] = useState(false);

  // Usar hook centralizado para bloques
  const { data: bloques = [], isLoading } = useBloques();

  const filteredBloques = bloques.filter(b =>
    b.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    b.code?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const tipoLabels = {
    CA: 'Calentamiento',
    CB: 'Cuerpo',
    TC: 'Técnica',
    TM: 'Tempo',
    FM: 'Fragmento Musical',
    VC: 'Vuelta a la Calma',
    AD: 'Advertencia/Descanso',
  };

  const tipoColors = {
    CA: 'bg-brand-100 text-brand-800',
    CB: 'bg-blue-100 text-blue-800',
    TC: 'bg-purple-100 text-purple-800',
    TM: 'bg-green-100 text-green-800',
    FM: 'bg-pink-100 text-pink-800',
    VC: 'bg-cyan-100 text-cyan-800',
    AD: 'bg-[var(--color-surface-muted)] text-ui',
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Biblioteca de Bloques</CardTitle>
            <Button onClick={() => setShowEditor(true)} className="btn-primary h-10 rounded-[var(--btn-radius)] shadow-sm">
              <Plus className="w-4 h-4 mr-2" />
              Nuevo Bloque
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-ui/60" />
              <Input
                placeholder="Buscar bloques por nombre o código..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 rounded-[var(--btn-radius)]"
              />
            </div>
          </div>

          {isLoading ? (
            <div className="text-center py-12 text-ui/80">Cargando bloques...</div>
          ) : filteredBloques.length === 0 ? (
            <div className="text-center py-12">
              <Layers className="w-16 h-16 mx-auto mb-4 text-ui/60" />
              <p className="text-ui/80 mb-4">
                {searchTerm ? 'No se encontraron bloques' : 'Aún no hay bloques. Crea el primer bloque.'}
              </p>
              {!searchTerm && (
                <Button onClick={() => setShowEditor(true)} variant="outline" className="rounded-[var(--btn-radius)]">
                  <Plus className="w-4 h-4 mr-2" />
                  Crear Primer Bloque
                </Button>
              )}
            </div>
          ) : (
            <div className={`${componentStyles.layout.grid3} gap-3`}>
              {filteredBloques.map((bloque) => (
                <Card
                  key={bloque.id}
                  className="hover:shadow-md transition-shadow cursor-pointer app-card"
                  onClick={() => {
                    setEditingBloque(bloque);
                    setShowEditor(true);
                  }}
                >
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between mb-2">
                      <Badge className={`${tipoColors[bloque.tipo]} rounded-full`}>
                        {tipoLabels[bloque.tipo]}
                      </Badge>
                      <span className="text-xs text-ui/80 font-mono">{bloque.code}</span>
                    </div>
                    <h3 className="font-semibold mb-2">{bloque.nombre}</h3>
                    <p className="text-sm text-ui/80">
                      {Math.floor(bloque.duracionSeg / 60)}:{String(bloque.duracionSeg % 60).padStart(2, '0')}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {showEditor && (
        <ExerciseEditor
          ejercicio={editingBloque}
          onClose={() => {
            setShowEditor(false);
            setEditingBloque(null);
          }}
        />
      )}
    </div>
  );
}