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
import { format, startOfDay, endOfDay, subDays, startOfMonth, endOfMonth } from 'date-fns';
import {
  DollarSign, TrendingUp, TrendingDown, AlertTriangle, CheckCircle2,
  Clock, Plus, Filter, Search, Loader2, ArrowUpCircle, ArrowDownCircle,
  CreditCard, Banknote, Wallet, Calendar
} from 'lucide-react';
import FluxoCaixaChart from '@/components/financeiro/FluxoCaixaChart';
import ContasReceberTab from '@/components/financeiro/ContasReceberTab.jsx';
import ContasPagarTab from '@/components/financeiro/ContasPagarTab.jsx';
import FluxoCaixaTab from '@/components/financeiro/FluxoCaixaTab.jsx';

const TABS = [
  { id: 'dashboard', label: '📊 Dashboard' },
  { id: 'receber', label: '💚 A Receber' },
  { id: 'pagar', label: '🔴 A Pagar' },
  { id: 'caixa', label: '💰 Fluxo de Caixa' },
];

// Opções de período para o filtro
const PERIODOS = [
  { value: 'hoje', label: 'Hoje' },
  { value: '7', label: 'Últimos 7 dias' },
  { value: 'mes', label: 'Mês atual' },
  { value: '30', label: 'Últimos 30 dias' },
  { value: '90', label: 'Últimos 90 dias' },
  { value: 'personalizado', label: 'Período personalizado' },
];

export default function Financeiro() {
  const [tab, setTab] = useState('dashboard');
  const [periodo, setPeriodo] = useState('mes');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');

  const hoje = new Date();

  const { data: lancamentos = [] } = useQuery({
    queryKey: ['lancamentos-financeiro'],
    queryFn: () => base44.entities.LancamentoFinanceiro.filter({ estornado: false }),
    staleTime: 2 * 60 * 1000,
  });

  const { data: contasReceber = [] } = useQuery({
    queryKey: ['contas-receber'],
    queryFn: () => base44.entities.ContaReceber.list('-created_date', 200),
    staleTime: 2 * 60 * 1000,
  });

  const { data: contasPagar = [] } = useQuery({
    queryKey: ['contas-pagar'],
    queryFn: () => base44.entities.ContaPagar.list('-created_date', 200),
    staleTime: 2 * 60 * 1000,
  });

  // Calcular intervalo de datas do filtro selecionado
  const { inicioFiltro, fimFiltro } = useMemo(() => {
    if (periodo === 'personalizado' && dataInicio && dataFim) {
      return {
        inicioFiltro: startOfDay(new Date(dataInicio)),
        fimFiltro: endOfDay(new Date(dataFim)),
      };
    }
    if (periodo === 'hoje') return { inicioFiltro: startOfDay(hoje), fimFiltro: endOfDay(hoje) };
    if (periodo === 'mes') return { inicioFiltro: startOfMonth(hoje), fimFiltro: endOfMonth(hoje) };
    if (periodo === '7') return { inicioFiltro: startOfDay(subDays(hoje, 6)), fimFiltro: endOfDay(hoje) };
    if (periodo === '30') return { inicioFiltro: startOfDay(subDays(hoje, 29)), fimFiltro: endOfDay(hoje) };
    if (periodo === '90') return { inicioFiltro: startOfDay(subDays(hoje, 89)), fimFiltro: endOfDay(hoje) };
    return { inicioFiltro: startOfMonth(hoje), fimFiltro: endOfMonth(hoje) };
  }, [periodo, dataInicio, dataFim]);

  // Lançamentos do período selecionado
  const lancPeriodo = useMemo(() => lancamentos.filter(l => {
    if (!l.data_lancamento) return false;
    const d = new Date(l.data_lancamento);
    return d >= inicioFiltro && d <= fimFiltro;
  }), [lancamentos, inicioFiltro, fimFiltro]);

  // Lançamentos ANTES do período = saldo anterior
  const saldoAnterior = useMemo(() => {
    return lancamentos
      .filter(l => l.data_lancamento && new Date(l.data_lancamento) < inicioFiltro)
      .reduce((s, l) => s + (l.tipo === 'entrada' ? (l.valor || 0) : -(l.valor || 0)), 0);
  }, [lancamentos, inicioFiltro]);

  const entradas = lancPeriodo.filter(l => l.tipo === 'entrada').reduce((s, l) => s + (l.valor || 0), 0);
  const saidas = lancPeriodo.filter(l => l.tipo === 'saida').reduce((s, l) => s + (l.valor || 0), 0);
  const saldoAtual = saldoAnterior + entradas - saidas;

  const recebPendente = contasReceber.filter(c => c.status === 'pendente' || c.status === 'vencido').reduce((s, c) => s + (c.valor_total || 0), 0);
  const pagarPendente = contasPagar.filter(c => c.status === 'pendente' || c.status === 'vencido').reduce((s, c) => s + (c.valor || 0), 0);
  const contasVencidas = contasReceber.filter(c => c.status === 'vencido').length + contasPagar.filter(c => c.status === 'vencido').length;

  const ticketMedio = lancPeriodo.filter(l => l.tipo === 'entrada' && l.atendimento_id).length > 0
    ? entradas / lancPeriodo.filter(l => l.tipo === 'entrada' && l.atendimento_id).length
    : 0;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2 mb-3">
            <DollarSign className="w-5 h-5 text-green-600" />
            Financeiro
          </h1>
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
            {/* Filtro de período */}
            <div className="flex flex-wrap items-center gap-3 p-3 bg-white rounded-xl border border-slate-200">
              <Calendar className="w-4 h-4 text-slate-500" />
              <Select value={periodo} onValueChange={setPeriodo}>
                <SelectTrigger className="w-48 h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PERIODOS.map(p => (
                    <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {periodo === 'personalizado' && (
                <>
                  <Input
                    type="date"
                    value={dataInicio}
                    onChange={e => setDataInicio(e.target.value)}
                    className="h-8 text-sm w-36"
                  />
                  <span className="text-slate-400 text-sm">até</span>
                  <Input
                    type="date"
                    value={dataFim}
                    onChange={e => setDataFim(e.target.value)}
                    className="h-8 text-sm w-36"
                  />
                </>
              )}
              <span className="text-xs text-slate-400 ml-auto">
                {format(inicioFiltro, 'dd/MM/yyyy')} – {format(fimFiltro, 'dd/MM/yyyy')}
              </span>
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

        {tab === 'receber' && <ContasReceberTab />}
        {tab === 'pagar' && <ContasPagarTab />}
        {tab === 'caixa' && <FluxoCaixaTab />}
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