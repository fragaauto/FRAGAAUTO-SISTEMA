import React, { useState, useEffect, useRef, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { AlertTriangle, CheckCircle2, ChevronLeft, ChevronRight, Clock, Loader2, Plus, RefreshCw, Wallet } from 'lucide-react';
import { useUnidade } from '@/lib/UnidadeContext';
import ContasDoMes from './contasPagar/ContasDoMes';
import PlanejamentoContas from './contasPagar/PlanejamentoContas';
import AvisoSaidasSemConta from './contasPagar/AvisoSaidasSemConta';
import RelatorioWhatsApp from './contasPagar/RelatorioWhatsApp';
import FormContaPrevista from './contasPagar/FormContaPrevista';
import ModalNovaContaMes from './contasPagar/ModalNovaContaMes';
import {
  competenciaDe,
  labelCompetencia,
  mudarCompetencia,
  intervaloCompetencia,
  contaNoMes,
  filtrarPorUnidade,
  gerarContasDoMes,
  fmtMoeda,
} from './contasPagar/utils';

export default function ContasAPagarTab() {
  const qc = useQueryClient();
  const { unidadeAtual } = useUnidade();
  const [competencia, setCompetencia] = useState(competenciaDe());
  const [formAberto, setFormAberto] = useState(null); // null | 'nova' | conta
  const [gerando, setGerando] = useState(false);
  const [novaConta, setNovaConta] = useState(false);
  const geradoRef = useRef('');

  const { data: configs = [] } = useQuery({
    queryKey: ['configuracoes'],
    queryFn: () => base44.entities.Configuracao.list(),
    staleTime: 5 * 60 * 1000,
  });

  const { data: contasPrevistas = [] } = useQuery({
    queryKey: ['contas-previstas'],
    queryFn: () => base44.entities.ContaPagarPrevista.list('-created_date', 500),
    staleTime: 30 * 1000,
  });

  const { data: contasBrutas = [] } = useQuery({
    queryKey: ['contas-pagar'],
    queryFn: () => base44.entities.ContaPagar.list('-created_date', 500),
    staleTime: 30 * 1000,
  });

  const { data: lembretes = [] } = useQuery({
    queryKey: ['lembrete-contas'],
    queryFn: () => base44.entities.LembreteContasPagar.list(),
    staleTime: 60 * 1000,
  });

  const { inicio, fim } = intervaloCompetencia(competencia);
  const { data: saidasSemConta = [] } = useQuery({
    queryKey: ['saidas-sem-conta-prevista', competencia, unidadeAtual?.id],
    queryFn: async () => {
      const lista = await base44.entities.LancamentoFinanceiro.filter({
        tipo: 'saida',
        estornado: false,
        data_lancamento: { $gte: inicio.toISOString(), $lte: fim.toISOString() },
      });
      return filtrarPorUnidade(lista, unidadeAtual).filter((l) => !l.conta_prevista_id);
    },
    staleTime: 60 * 1000,
  });

  const contasPrevistasUnidade = useMemo(
    () => filtrarPorUnidade(contasPrevistas, unidadeAtual),
    [contasPrevistas, unidadeAtual]
  );

  const contasDoMes = useMemo(
    () => filtrarPorUnidade(contasBrutas, unidadeAtual).filter((c) => contaNoMes(c, competencia)),
    [contasBrutas, unidadeAtual, competencia]
  );

  const invalidarContas = () => {
    qc.invalidateQueries(['contas-pagar']);
    qc.invalidateQueries(['contas_pagar']);
  };

  // Gera automaticamente as contas do mês a partir do planejamento
  useEffect(() => {
    if (!contasPrevistasUnidade.length || gerando) return;
    if (geradoRef.current === competencia) return;
    geradoRef.current = competencia;
    (async () => {
      setGerando(true);
      try {
        const n = await gerarContasDoMes({
          contasPrevistas: contasPrevistasUnidade,
          competencia,
          unidadeId: unidadeAtual?.id,
        });
        if (n > 0) {
          toast.success(`${n} conta(s) de ${labelCompetencia(competencia)} geradas pelo planejamento.`);
          invalidarContas();
        }
      } finally {
        setGerando(false);
      }
    })();
  }, [competencia, contasPrevistasUnidade, gerando]);

  const gerarAgora = async () => {
    setGerando(true);
    try {
      const n = await gerarContasDoMes({
        contasPrevistas: contasPrevistasUnidade,
        competencia,
        unidadeId: unidadeAtual?.id,
      });
      invalidarContas();
      toast.success(
        n > 0
          ? `${n} conta(s) geradas para ${labelCompetencia(competencia)}.`
          : 'Todas as contas previstas deste mês já foram geradas.'
      );
    } finally {
      setGerando(false);
    }
  };

  const excluirPrevista = async (conta) => {
    await base44.entities.ContaPagarPrevista.delete(conta.id);
    qc.invalidateQueries(['contas-previstas']);
    toast.success('Conta prevista excluída!');
  };

  const soma = (lista) => lista.reduce((s, c) => s + (Number(c.valor) || 0), 0);
  const hoje = new Date();
  const emAberto = contasDoMes.filter((c) => c.status !== 'pago' && c.status !== 'cancelado');
  const pagas = contasDoMes.filter((c) => c.status === 'pago');
  const vencidas = emAberto.filter((c) => c.data_vencimento && new Date(c.data_vencimento) < hoje);

  return (
    <div className="space-y-4">
      {/* Navegação do mês */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg px-1 py-1">
          <button onClick={() => setCompetencia(mudarCompetencia(competencia, -1))} className="p-1 text-slate-500 hover:text-slate-800">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm font-semibold text-slate-800 px-2 min-w-[70px] text-center">{labelCompetencia(competencia)}</span>
          <button onClick={() => setCompetencia(mudarCompetencia(competencia, 1))} className="p-1 text-slate-500 hover:text-slate-800">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        {competencia !== competenciaDe() && (
          <Button variant="outline" size="sm" onClick={() => setCompetencia(competenciaDe())}>Mês atual</Button>
        )}
        <Button variant="outline" size="sm" onClick={gerarAgora} disabled={gerando} className="gap-1">
          {gerando ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
          Gerar contas do mês
        </Button>
        <Button size="sm" onClick={() => setNovaConta(true)} className="gap-1 bg-green-600 hover:bg-green-700">
          <Plus className="w-3.5 h-3.5" /> Nova conta do mês
        </Button>
      </div>

      {/* Resumo do mês */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="bg-slate-50 border-slate-200">
          <CardContent className="p-3">
            <div className="flex items-center gap-1 mb-1"><Wallet className="w-4 h-4 text-slate-500" /><span className="text-xs text-slate-500">Previsto no mês</span></div>
            <p className="font-bold text-slate-800">R$ {fmtMoeda(soma(contasDoMes))}</p>
          </CardContent>
        </Card>
        <Card className="bg-green-50 border-0">
          <CardContent className="p-3">
            <div className="flex items-center gap-1 mb-1"><CheckCircle2 className="w-4 h-4 text-green-600" /><span className="text-xs text-slate-500">Pago</span></div>
            <p className="font-bold text-green-700">R$ {fmtMoeda(soma(pagas))}</p>
          </CardContent>
        </Card>
        <Card className="bg-yellow-50 border-0">
          <CardContent className="p-3">
            <div className="flex items-center gap-1 mb-1"><Clock className="w-4 h-4 text-yellow-600" /><span className="text-xs text-slate-500">Em aberto</span></div>
            <p className="font-bold text-yellow-700">R$ {fmtMoeda(soma(emAberto))}</p>
          </CardContent>
        </Card>
        <Card className={vencidas.length ? 'bg-red-50 border-0' : 'bg-slate-50 border-0'}>
          <CardContent className="p-3">
            <div className="flex items-center gap-1 mb-1"><AlertTriangle className={`w-4 h-4 ${vencidas.length ? 'text-red-500' : 'text-slate-400'}`} /><span className="text-xs text-slate-500">Vencidas</span></div>
            <p className={`font-bold ${vencidas.length ? 'text-red-600' : 'text-slate-700'}`}>
              {vencidas.length} · R$ {fmtMoeda(soma(vencidas))}
            </p>
          </CardContent>
        </Card>
      </div>

      <RelatorioWhatsApp
        competencia={competencia}
        contas={contasDoMes}
        lembrete={lembretes[0]}
        empresa={configs[0]?.nome_empresa}
        unidadeId={unidadeAtual?.id}
      />

      <AvisoSaidasSemConta saidas={saidasSemConta} contasPrevistas={contasPrevistasUnidade} />

      <ContasDoMes contas={contasDoMes} />

      <PlanejamentoContas
        contas={contasPrevistasUnidade}
        onNova={() => setFormAberto('nova')}
        onEditar={(c) => setFormAberto(c)}
        onExcluir={excluirPrevista}
      />

      {novaConta && (
        <ModalNovaContaMes
          competencia={competencia}
          unidadeId={unidadeAtual?.id}
          previstas={contasPrevistasUnidade.filter((c) => c.tipo === 'variavel' && c.ativo !== false)}
          onClose={() => setNovaConta(false)}
          onSalvo={() => {
            setNovaConta(false);
            invalidarContas();
          }}
        />
      )}

      {formAberto && (
        <FormContaPrevista
          conta={formAberto === 'nova' ? null : formAberto}
          unidadeId={unidadeAtual?.id}
          onClose={() => setFormAberto(null)}
          onSaved={() => setFormAberto(null)}
        />
      )}
    </div>
  );
}