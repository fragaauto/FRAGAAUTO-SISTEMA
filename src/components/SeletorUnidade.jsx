import React from 'react';
import { useUnidade } from '@/lib/UnidadeContext';
import { Building2, ChevronDown } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export default function SeletorUnidade() {
  const { unidades, unidadeAtual, setUnidadeAtual, isAdmin, loading } = useUnidade();

  if (loading || !unidadeAtual) return null;

  // Operacional: só exibe o nome, sem seletor
  if (!isAdmin) {
    return (
      <div className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-50 border border-orange-200 rounded-lg text-sm text-orange-700 font-medium">
        <Building2 className="w-4 h-4" />
        <span>{unidadeAtual.nome}</span>
      </div>
    );
  }

  // Admin: seletor completo
  return (
    <Select
      value={unidadeAtual.id}
      onValueChange={(id) => {
        const uni = unidades.find(u => u.id === id);
        if (uni) setUnidadeAtual(uni);
      }}
    >
      <SelectTrigger className="h-8 text-sm border-orange-200 bg-orange-50 text-orange-700 font-medium w-auto min-w-[160px] gap-1">
        <Building2 className="w-4 h-4 flex-shrink-0" />
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {unidades.map(u => (
          <SelectItem key={u.id} value={u.id}>
            {u.nome}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}