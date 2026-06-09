import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { format, startOfDay, endOfDay, subDays, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import {
  DollarSign, TrendingUp, TrendingDown, AlertTriangle, CheckCircle2,
  Clock, Plus, Filter, Search, Loader2, ArrowUpCircle, ArrowDownCircle,
  CreditCard, Banknote, Wallet, Calendar
} from 'lucide-react';
import FluxoCaixaChart from '@/components/financeiro/FluxoCaixaChart';
import ContasReceberTab from '@/components/financeiro/ContasReceberTab.jsx';
import ContasPagarTab from '@/components/financeiro/ContasPagarTab.jsx';
import FluxoCaixaTab from '@/components/financeiro/FluxoCaixaTab.jsx';
import ModuloBloqueado from '@/components/ModuloBloqueado';
import { paginaPermitida } from '@/components/modulos';
import { useUnidade } from '@/lib/UnidadeContext';

const TABS = [
  { id: 'dashboard', label: '📊 Dashboard' },
  { id: 'receber', label: '💚 A Receber' },
  { id: 'pagar', label: '🔴 A Pagar' },
  { id: 'caixa', label: '💰 Fluxo de Caixa' },
];

const FILTROS_RAPIDOS = [
  { value: 'hoje', label: 'Hoje' },
  { value: 'ontem', label: 'Ontem' },
  { value: 'semana', label: 'Essa Semana' },
  { value: 'mes', label: 'Esse Mês' },
  { value: 'mes_passado', label: 'Mês Passado' },
];

const UNIDADE_AUTO_PORTAS_ID = '69ea76b72f920804f5d68eab';

function filtrarPorUnidade(lista, unidadeAtual) {
  if (!unidadeAtual) return lista;
  return lista.filter(item => {
    if (item.unidade_id) return item.unidade_id === unidadeAtual.id;
    return unidadeAtual.id === UNIDADE_AUTO_PORTAS_ID;
  });
}

export default function Financeiro() {
  const { unidadeAtual } = useUnidade();
  const { data: configs = [] } = useQuery({
    queryKey: ['configuracoes'],
    queryFn: () => base44.entities.Configuracao.list(),
    staleTime: 5 * 60 * 1000,
  });

  const [tab, setTab] = useState('dashboard');
  const [periodo, setPeriodo] = useState('mes');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [filtroGlobal, setFiltroGlobal] = useState('mes');

  const modulosAtivos = configs[0]?.modulos_ativos ?? null;

  const { data: lancamentosBrutos = [] } = useQuery({
    queryKey: ['lancamentos'],
    queryFn: () => base44.entities.LancamentoFinanceiro.list('-data_lancamento', 1000),
    staleTime: 2 * 60 * 1000,
  });
  const lancamentos = filtrarPorUnidade(lancamentosBrutos, unidadeAtual);

  const { data: contasReceberBrutos = [] } = useQuery({
    queryKey: ['contas_receber'],
    queryFn: () => base44.entities.ContaReceber.list('-created_date', 500),
    staleTime: 2 * 60 * 1000,
  });
  const contasReceber = filtrarPorUnidade(contasReceberBrutos, unidadeAtual);

  const { data: contasPagarBrutos = [] } = useQuery({
    queryKey: ['contas_pagar'],
    queryFn: () => base44.entities.ContaPagar.list('-created_date', 500),
    staleTime: 2 * 60 * 1000,
  });
  const contasPagar = filtrarPorUnidade(contasPagarBrutos, unidadeAtual);

  if (!paginaPermitida(modulosAtivos, 'Financeiro')) {
    return <ModuloBloqueado nomeModulo="Financeiro" />;
  }

  const hoje = new Date();

  // Calcular filtros globais de data (botões rápidos)
  function calcularIntervalo(filtro) {
    if (filtro === 'hoje') return { inicio: startOfDay(hoje), fim: endOfDay(hoje) };
    if (filtro === 'ontem') return { inicio: startOfDay(subDays(hoje, 1)), fim: endOfDay(subDays(hoje, 1)) };
    if (filtro === 'semana') return { inicio: startOfDay(subDays(hoje, hoje.getDay() === 0 ? 6 : hoje.getDay() - 1)), fim: endOfDay(hoje) };
    if (filtro === 'mes_passado') { const mp = subMonths(hoje, 1); return { inicio: startOfMonth(mp), fim: endOfMonth(mp) }; }
    // mes (default)
    return { inicio: startOfMonth(hoje), fim: endOfMonth(hoje) };
  }
  const { inicio: inicioGlobal, fim: fimGlobal } = filtroGlobal ? calcularIntervalo(filtroGlobal) : { inicio: null, fim: null };
  const filtroDataProps = filtroGlobal ? { inicio: inicioGlobal, fim: fimGlobal } : null;

  // Calcular filtros de data do dashboard (usa filtroGlobal como base)
  const inicioFiltro = inicioGlobal;
  const fimFiltro = fimGlobal;

  const lancNaoEstornados = lancamentos.filter(l => !l.estornado);

  // Lançamentos do período
  const lancPeriodo = lancNaoEstornados.filter(l => {
    if (!inicioFiltro || !fimFiltro) return true;
    const data = new Date(l.data_lancamento || l.created_date);
    return data >= inicioFiltro && data <= fimFiltro;
  });

  // Lançamentos anteriores ao período (para saldo anterior)
  const lancAnteriores = lancNaoEstornados.filter(l => {
    if (!inicioFiltro) return false;
    const data = new Date(l.data_lancamento || l.created_date);
    return data < inicioFiltro;
  });

  const entradas = lancPeriodo.filter(l => l.tipo === 'entrada').reduce((s, l) => s + (l.valor || 0), 0);
  const saidas = lancPeriodo.filter(l => l.tipo === 'saida').reduce((s, l) => s + (l.valor || 0), 0);
  const saldoAnterior = lancAnteriores.reduce((s, l) => l.tipo === 'entrada' ? s + (l.valor || 0) : s - (l.valor || 0), 0);
  const saldoAtual = saldoAnterior + entradas - saidas;

  const recebPendente = contasReceber.filter(c => c.status === 'pendente' || c.status === 'parcial').reduce((s, c) => s + ((c.valor_total || 0) - (c.valor_pago || 0)), 0);
  const pagarPendente = contasPagar.filter(c => c.status === 'pendente').reduce((s, c) => s + (c.valor || 0), 0);
  const contasVencidas = contasPagar.filter(c => c.status === 'pendente' && new Date(c.data_vencimento) < hoje).length;

  const ticketMedio = lancPeriodo.filter(l => l.tipo === 'entrada' && l.atendimento_id).length > 0
    ? entradas / lancPeriodo.filter(l => l.tipo === 'entrada' && l.atendimento_id).length
    : 0;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-green-600" />
              Financeiro
            </h1>
            {/* Botões de filtro rápido de data */}
            <div className="flex gap-1.5 overflow-x-auto">
              {FILTROS_RAPIDOS.map(f => (
                <button
                  key={f.value}
                  onClick={() => setFiltroGlobal(prev => prev === f.value ? null : f.value)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all border ${
                    filtroGlobal === f.value
                      ? 'bg-green-600 text-white border-green-600'
                      : 'bg-white text-slate-600 border-slate-200 hover:border-green-400 hover:text-green-700'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-1 overflow-x-auto pb-1">
            {TABS.map(t => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                  tab === t.id ? 'bg-green-600 text-white' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-4">
        {tab === 'dashboard' && (
          <div className="space-y-4">
            {/* Label do período ativo */}
            <div className="flex items-center gap-2 p-3 bg-white rounded-xl border border-slate-200">
              <Calendar className="w-4 h-4 text-slate-500" />
              <span className="text-sm font-medium text-slate-600">
                {filtroGlobal ? FILTROS_RAPIDOS.find(f => f.value === filtroGlobal)?.label : 'Todos os períodos'}
              </span>
              {inicioFiltro && fimFiltro && (
                <span className="text-xs text-slate-400 ml-auto">
                  {format(inicioFiltro, 'dd/MM/yyyy')} – {format(fimFiltro, 'dd/MM/yyyy')}
                </span>
              )}
            </div>

            {/* Saldo do Caixa */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <Card className="bg-slate-50 border-slate-200 col-span-1">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Wallet className="w-4 h-4 text-slate-500" />
                    <span className="text-xs text-slate-500">Saldo Anterior</span>
                  </div>
                  <p className={`font-bold text-lg ${saldoAnterior >= 0 ? 'text-slate-700' : 'text-red-600'}`}>
                    R$ {saldoAnterior.toFixed(2)}
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-green-50 border-0">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <ArrowUpCircle className="w-4 h-4 text-green-600" />
                    <span className="text-xs text-slate-500">Entradas</span>
                  </div>
                  <p className="font-bold text-lg text-green-700">R$ {entradas.toFixed(2)}</p>
                </CardContent>
              </Card>

              <Card className="bg-red-50 border-0">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <ArrowDownCircle className="w-4 h-4 text-red-500" />
                    <span className="text-xs text-slate-500">Saídas</span>
                  </div>
                  <p className="font-bold text-lg text-red-600">R$ {saidas.toFixed(2)}</p>
                </CardContent>
              </Card>

              <Card className={`border-2 ${saldoAtual >= 0 ? 'bg-emerald-50 border-emerald-300' : 'bg-red-50 border-red-300'}`}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <DollarSign className={`w-4 h-4 ${saldoAtual >= 0 ? 'text-emerald-600' : 'text-red-600'}`} />
                    <span className="text-xs text-slate-500 font-semibold">Saldo Atual</span>
                  </div>
                  <p className={`font-bold text-xl ${saldoAtual >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                    R$ {saldoAtual.toFixed(2)}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Outros KPIs */}
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
              <KpiCard icon={<Clock className="w-5 h-5 text-orange-500" />} label="A Receber" value={`R$ ${recebPendente.toFixed(2)}`} color="orange" small />
              <KpiCard icon={<TrendingDown className="w-5 h-5 text-red-500" />} label="A Pagar" value={`R$ ${pagarPendente.toFixed(2)}`} color="red" small />
              <KpiCard icon={<Wallet className="w-5 h-5 text-purple-600" />} label="Ticket Médio" value={`R$ ${ticketMedio.toFixed(2)}`} color="purple" small />
            </div>

            {contasVencidas > 0 && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700">
                <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                <span className="text-sm font-medium">{contasVencidas} conta{contasVencidas > 1 ? 's' : ''} vencida{contasVencidas > 1 ? 's' : ''}!</span>
              </div>
            )}

            {/* Gráfico */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Entradas x Saídas — Últimos 30 dias</CardTitle>
              </CardHeader>
              <CardContent>
                <FluxoCaixaChart lancamentos={lancamentos.slice(-200)} />
              </CardContent>
            </Card>
          </div>
        )}

        {tab === 'receber' && <ContasReceberTab filtroData={filtroDataProps} />}
        {tab === 'pagar' && <ContasPagarTab filtroData={filtroDataProps} />}
        {tab === 'caixa' && <FluxoCaixaTab filtroData={filtroDataProps} />}
      </div>
    </div>
  );
}

function KpiCard({ icon, label, value, color, small }) {
  const colors = {
    green: 'bg-green-50',
    blue: 'bg-blue-50',
    orange: 'bg-orange-50',
    red: 'bg-red-50',
    emerald: 'bg-emerald-50',
    purple: 'bg-purple-50',
  };
  return (
    <Card className={`${colors[color] || 'bg-white'} border-0`}>
      <CardContent className={`${small ? 'p-3' : 'p-4'}`}>
        <div className="flex items-center gap-2 mb-1">
          {icon}
          <span className="text-xs text-slate-500">{label}</span>
        </div>
        <p className={`font-bold text-slate-800 ${small ? 'text-sm' : 'text-lg'}`}>{value}</p>
      </CardContent>
    </Card>
  );
}