import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function PaginacaoAtendimentos({ pagina, quantidade, totalRegistros, porPagina, temProxima, onMudar }) {
  if (!temProxima && pagina === 1) return null;
  const inicio = (pagina - 1) * porPagina + 1;
  const fim = inicio + quantidade - 1;
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 mt-4 px-1">
      <p className="text-sm text-muted-foreground">
        Exibindo {inicio}–{fim}{totalRegistros != null ? ` de ${totalRegistros}` : ''}
      </p>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" disabled={pagina === 1} onClick={() => onMudar(pagina - 1)}>
          <ChevronLeft className="w-4 h-4" /> Anterior
        </Button>
        <span className="text-sm text-muted-foreground">Página {pagina}</span>
        <Button variant="outline" size="sm" disabled={!temProxima} onClick={() => onMudar(pagina + 1)}>
          Próxima <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}