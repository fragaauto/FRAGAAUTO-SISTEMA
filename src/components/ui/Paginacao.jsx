import React from 'react';
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function Paginacao({ paginaAtual, totalPaginas, onMudar, totalRegistros, porPagina }) {
  if (totalPaginas <= 1) return null;

  const inicio = (paginaAtual - 1) * porPagina + 1;
  const fim = Math.min(paginaAtual * porPagina, totalRegistros);

  const paginas = [];
  for (let i = 1; i <= totalPaginas; i++) {
    if (i === 1 || i === totalPaginas || (i >= paginaAtual - 1 && i <= paginaAtual + 1)) {
      paginas.push(i);
    } else if (paginas[paginas.length - 1] !== '...') {
      paginas.push('...');
    }
  }

  return (
    <div className="flex items-center justify-between mt-4 px-1">
      <p className="text-sm text-slate-500">
        Exibindo {inicio}–{fim} de {totalRegistros}
      </p>
      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          onClick={() => onMudar(paginaAtual - 1)}
          disabled={paginaAtual === 1}
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>
        {paginas.map((p, i) =>
          p === '...' ? (
            <span key={`ellipsis-${i}`} className="px-2 text-slate-400 text-sm">…</span>
          ) : (
            <Button
              key={p}
              variant={p === paginaAtual ? 'default' : 'outline'}
              size="icon"
              className={`h-8 w-8 text-sm ${p === paginaAtual ? 'bg-orange-500 hover:bg-orange-600 border-orange-500' : ''}`}
              onClick={() => onMudar(p)}
            >
              {p}
            </Button>
          )
        )}
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          onClick={() => onMudar(paginaAtual + 1)}
          disabled={paginaAtual === totalPaginas}
        >
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}