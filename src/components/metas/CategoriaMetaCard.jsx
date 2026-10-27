import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Pencil, Target, Trash2 } from 'lucide-react';
import BarraMeta from './BarraMeta';

const formatar = (valor) =>
  Number(valor || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function CategoriaMetaCard({ categoria, vendido, meta, podeEditar, onEditar, onRemover }) {
  const percentual = meta > 0 ? (vendido / meta) * 100 : 0;
  const atingida = percentual >= 100;
  const falta = Math.max(meta - vendido, 0);

  return (
    <Card className={`border ${atingida ? 'border-green-300 bg-green-50/40' : 'border-slate-200 bg-white'}`}>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <div
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                atingida ? 'bg-green-500' : 'bg-blue-500'
              }`}
            >
              <Target className="h-4 w-4 text-white" />
            </div>
            <p className="truncate text-sm font-bold text-slate-800">{categoria}</p>
          </div>
          {podeEditar && (
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onEditar} title="Editar meta">
                <Pencil className="h-3.5 w-3.5 text-slate-500" />
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onRemover} title="Remover meta">
                <Trash2 className="h-3.5 w-3.5 text-red-500" />
              </Button>
            </div>
          )}
        </div>

        <BarraMeta label="Este mês" atual={vendido} meta={meta} cor="bg-blue-500" />

        <p className="text-xs text-slate-500">
          {atingida ? (
            <span className="font-semibold text-green-600">Meta atingida! 🎉</span>
          ) : (
            <>Faltam R$ {formatar(falta)} para a meta</>
          )}
        </p>
      </CardContent>
    </Card>
  );
}