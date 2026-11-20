import React from 'react';
import { CheckCircle2 } from 'lucide-react';
import { compatibilidadesEncontradas } from '@/lib/produtoSearch';

// Balãozinho que explica por que o produto apareceu na busca quando o
// casamento veio dos modelos compatíveis cadastrados.
export default function SeloCompatibilidade({ produto, termo }) {
  const modelos = compatibilidadesEncontradas(produto, termo);
  if (modelos.length === 0) return null;

  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-yellow-100 border border-yellow-300 text-yellow-800 text-[11px] font-medium px-2 py-0.5 leading-tight">
      <CheckCircle2 className="w-3 h-3 shrink-0" />
      Compatível com {modelos.join(', ')}
    </span>
  );
}