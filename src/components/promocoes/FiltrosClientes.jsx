import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Users, Filter } from 'lucide-react';

export default function FiltrosClientes({
  grupos,
  gruposIds,
  onGruposChange,
  todos,
  onTodosChange,
  filtros,
  onFiltrosChange,
  totalDestinatarios,
}) {
  const f = filtros || {};
  const alterar = (campo, valor) => onFiltrosChange({ ...f, [campo]: valor });

  const alternarGrupo = (id) =>
    onGruposChange(gruposIds.includes(id) ? gruposIds.filter((i) => i !== id) : [...gruposIds, id]);

  return (
    <div className="space-y-3 border rounded-lg p-3 bg-slate-50/60">
      <div className="space-y-2">
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <Checkbox checked={todos} onCheckedChange={(v) => onTodosChange(!!v)} />
          <Users className="w-4 h-4 text-slate-400" />
          Todos os clientes com telefone (não bloqueados)
        </label>
        {grupos.map((g) => (
          <label key={g.id} className="flex items-center gap-2 text-sm text-slate-700">
            <Checkbox checked={gruposIds.includes(g.id)} onCheckedChange={() => alternarGrupo(g.id)} />
            {g.nome} ({g.cliente_ids?.length || 0} clientes)
          </label>
        ))}
        {grupos.length === 0 && (
          <p className="text-xs text-slate-500">
            Nenhum grupo cadastrado. Use os filtros abaixo para escolher quem recebe.
          </p>
        )}
      </div>

      <div className="border-t border-slate-200 pt-3 space-y-2">
        <p className="text-xs font-semibold text-slate-600 flex items-center gap-1">
          <Filter className="w-3 h-3" /> Refinar destinatários
        </p>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-xs">Código do cliente (de)</Label>
            <Input
              type="number"
              value={f.codigo_de ?? ''}
              onChange={(e) => alterar('codigo_de', e.target.value === '' ? '' : Number(e.target.value))}
              placeholder="Ex: 1"
              className="h-9"
            />
          </div>
          <div>
            <Label className="text-xs">Código do cliente (até)</Label>
            <Input
              type="number"
              value={f.codigo_ate ?? ''}
              onChange={(e) => alterar('codigo_ate', e.target.value === '' ? '' : Number(e.target.value))}
              placeholder="Ex: 500"
              className="h-9"
            />
          </div>
        </div>
        <div>
          <Label className="text-xs">Nome começa com (letras separadas por vírgula)</Label>
          <Input
            value={f.nome_iniciais ?? ''}
            onChange={(e) => alterar('nome_iniciais', e.target.value)}
            placeholder="Ex: A, B, C"
            className="h-9"
          />
        </div>
        <p className="text-xs text-slate-500">
          Os filtros são aplicados sobre os grupos marcados (ou sobre todos os clientes, quando marcado).
        </p>
        {typeof totalDestinatarios === 'number' && (
          <p className="text-xs font-medium text-orange-600">
            {totalDestinatarios} cliente(s) atendem a esta seleção
          </p>
        )}
      </div>
    </div>
  );
}