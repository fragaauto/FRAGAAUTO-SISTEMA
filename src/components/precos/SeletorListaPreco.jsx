import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tag } from 'lucide-react';

export default function SeletorListaPreco({ listas, value, onChange, className }) {
  if (!listas || listas.length === 0) return null;

  return (
    <Select value={value || 'padrao'} onValueChange={v => onChange(v === 'padrao' ? null : v)}>
      <SelectTrigger className={className || "h-8 text-xs"}>
        <SelectValue placeholder="Preço padrão" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="padrao">Preço padrão</SelectItem>
        {listas.map(l => (
          <SelectItem key={l.id} value={l.id}>
            <span className="flex items-center gap-1.5">
              <Tag className="w-3 h-3" />{l.nome}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}