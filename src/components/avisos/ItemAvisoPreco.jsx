import React from 'react';
import { brl } from '@/lib/avisoPreco';

export default function ItemAvisoPreco({ item }) {
  const antigo = Number(item.preco_antigo || 0);
  const novo = Number(item.preco_novo || 0);

  return (
    <div className="flex items-center justify-between gap-3 py-2.5 border-b border-slate-100 last:border-0">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-slate-800">{item.nome}</p>
        <p className="text-xs text-slate-400">{item.codigo || 'Sem código'}</p>
      </div>
      <div className="text-right shrink-0">
        <p className="text-base font-bold text-green-600">{brl(novo)}</p>
        {antigo > 0 ? (
          <p className="text-xs text-slate-400 line-through">{brl(antigo)}</p>
        ) : (
          <p className="text-xs text-blue-600 font-semibold">produto novo</p>
        )}
      </div>
    </div>
  );
}