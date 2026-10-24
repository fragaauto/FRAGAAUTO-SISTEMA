import React, { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowRightLeft, Loader2, Undo2 } from 'lucide-react';
import ModalTransferirProducao from './ModalTransferirProducao';
import { garantiasDoRetorno, tecnicosDaGarantia, transferenciasPorServico, valorGarantia } from '@/lib/retornoProducao';

export default function CardRetornoProducao({ atendimento }) {
  const [aberto, setAberto] = useState(false);
  const queryClient = useQueryClient();

  const { data: origem, isLoading: carregandoOrigem } = useQuery({
    queryKey: ['atendimento-origem', atendimento.atendimento_origem_id],
    queryFn: () => base44.entities.Atendimento.get(atendimento.atendimento_origem_id),
    enabled: !!atendimento.atendimento_origem_id,
    staleTime: 2 * 60 * 1000,
  });

  const { data: transferencias = [] } = useQuery({
    queryKey: ['transferencias-producao', atendimento.id],
    queryFn: () => base44.entities.TransferenciaProducao.filter({ atendimento_id: atendimento.id }),
    staleTime: 30 * 1000,
  });

  const garantias = useMemo(() => garantiasDoRetorno(atendimento, origem), [atendimento, origem]);
  const mapa = transferenciasPorServico(transferencias);
  const valorTotal = garantias.reduce((s, g) => s + valorGarantia(g), 0);
  const valorTransferido = transferencias.reduce((s, t) => s + (Number(t.valor) || 0), 0);

  return (
    <Card className="border-red-300 bg-red-50/50">
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="flex items-center gap-2 text-red-700">
          <Undo2 className="w-5 h-5" />
          Retorno de Serviço
          {atendimento.atendimento_origem_numero && (
            <span className="text-sm font-normal text-red-600">
              · OS origem #{String(atendimento.atendimento_origem_numero).padStart(6, '0')}
            </span>
          )}
        </CardTitle>
        <Button size="sm" className="bg-red-600 hover:bg-red-700" onClick={() => setAberto(true)}>
          <ArrowRightLeft className="w-4 h-4 mr-2" />
          Transferir Produção
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {garantias.length === 0 ? (
          <p className="text-sm text-slate-500">
            A OS de origem não possui serviços cadastrados para transferir.
          </p>
        ) : (
          <>
            <p className="text-xs text-slate-600">
              Valor em garantia: <strong>R$ {valorTotal.toFixed(2)}</strong> · Transferido:{' '}
              <strong className={valorTransferido > 0 ? 'text-red-700' : 'text-slate-500'}>
                R$ {valorTransferido.toFixed(2)}
              </strong>
            </p>
            <div className="space-y-2">
              {garantias.map((garantia) => {
                const techsOrigem = carregandoOrigem
                  ? []
                  : tecnicosDaGarantia(garantia, origem).map((t) => t.nome);
                const atuais = mapa[garantia.key] || [];
                return (
                  <div
                    key={garantia.key}
                    className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 rounded-lg border border-slate-200 bg-white px-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">{garantia.nome}</p>
                      <p className="text-xs text-slate-500">
                        R$ {valorGarantia(garantia).toFixed(2)} · Origem: {techsOrigem.join(', ') || 'sem técnico'}
                      </p>
                    </div>
                    <div className="text-xs whitespace-nowrap">
                      {atuais.length > 0 ? (
                        <span className="px-2 py-0.5 rounded-full font-semibold bg-red-600 text-white">
                          → {atuais[0]?.tecnico_destino_nome}
                        </span>
                      ) : (
                        <span className="text-slate-400">Sem transferência</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {carregandoOrigem && (
          <p className="text-xs text-slate-400 flex items-center gap-1">
            <Loader2 className="w-3 h-3 animate-spin" /> Carregando OS de origem...
          </p>
        )}
      </CardContent>

      {aberto && (
        <ModalTransferirProducao
          atendimento={atendimento}
          origem={origem}
          transferencias={transferencias}
          onClose={() => setAberto(false)}
          onAtualizado={() => queryClient.invalidateQueries({ queryKey: ['transferencias-producao'] })}
        />
      )}
    </Card>
  );
}