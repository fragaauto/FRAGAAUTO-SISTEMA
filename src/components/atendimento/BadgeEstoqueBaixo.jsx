import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { estoqueBaixo } from '@/components/atendimento/AlertaEstoqueBaixo';

export default function BadgeEstoqueBaixo({ produto, onClick, className }) {
  if (!estoqueBaixo(produto)) return null;
  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); e.preventDefault(); onClick?.(produto); }}
      className={`inline-flex items-center gap-1 text-xs font-semibold text-amber-700 bg-amber-100 border border-amber-300 rounded-full px-2 py-0.5 hover:bg-amber-200 transition ${className || ''}`}
      title={`Estoque baixo — atual: ${produto.estoque_atual || 0} / mín: ${produto.estoque_minimo || 0}${produto.estoque_desejado ? ` / desejado: ${produto.estoque_desejado}` : ''}`}
    >
      <AlertTriangle className="w-3 h-3" />
      Estoque baixo
    </button>
  );
}