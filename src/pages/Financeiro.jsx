import React, { useState } from 'react';
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
import {
  DollarSign, TrendingUp, TrendingDown, AlertTriangle, CheckCircle2,
  Clock, Plus, Filter, Search, Loader2, ArrowUpCircle, ArrowDownCircle,
  CreditCard, Banknote, Wallet
} from 'lucide-react';
import FluxoCaixaChart from '@/components/financeiro/FluxoCaixaChart';
import ContasReceberTab from '@/components/financeiro/ContasReceberTab';
import ContasPagarTab from '@/components/financeiro/ContasPagarTab';
import FluxoCaixaTab from '@/components/financeiro/FluxoCaixaTab';

const TABS = [
  { id: 'dashboard', label: '📊 Dashboard' },
  { id: 'receber', label: '💚 A Receber' },
  { id: 'pagar', label: '🔴 A Pagar' },
  { id: 'caixa', label: '💰 Fluxo de Caixa' },
];

export default function Financeiro() {
  const [tab, setTab] = useState('dashboard');

  const hoje = new Date();
  const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1).toISOString();
  const fimMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0, 23, 59, 59).toISOString();

  const { data: lancamentos = [] } = useQuery({
    queryKey: ['lancamentos-mes'],
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

  // Filtrar por mês atual
  const lancMes = lancamentos.filter(l => l.data_lancamento >= inicioMes && l.data_lancamento <= fimMes);
  const lancHoje = lancamentos.filter(l => l.data_lancamento >= new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate()).toISOString());

  const entradasMes = lancMes.filter(l => l.tipo === 'entrada').reduce((s, l) => s + (l.valor || 0), 0);
  const saidasMes = lancMes.filter(l => l.tipo === 'saida').reduce((s, l) => s + (l.valor || 0), 0);
  const faturamentoHoje = lancHoje.filter(l => l.tipo === 'entrada').reduce((s, l) => s + (l.valor || 0), 0);

  const recebPendente = contasReceber.filter(c => c.status === 'pendente' || c.status === 'vencido').reduce((s, c) => s + (c.valor_total || 0), 0);
  const pagarPendente = contasPagar.filter(c => c.status === 'pendente' || c.status === 'vencido').reduce((s, c) => s + (c.valor || 0), 0);
  const contasVencidas = contasReceber.filter(c => c.status === 'vencido').length + contasPagar.filter(c => c.status === 'vencido').length;

  const ticketMedio = lancMes.filter(l => l.tipo === 'entrada' && l.atendimento_id).length > 0
    ? entradasMes / lancMes.filter(l => l.tipo === 'entrada' && l.atendimento_id).length
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
            {/* KPIs */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <KpiCard icon={<ArrowUpCircle className="w-5 h-5 text-green-600" />} label="Hoje" value={`R$ ${faturamentoHoje.toFixed(2)}`} color="green" />
              <KpiCard icon={<TrendingUp className="w-5 h-5 text-blue-600" />} label="Mês" value={`R$ ${entradasMes.toFixed(2)}`} color="blue" />
              <KpiCard icon={<Clock className="w-5 h-5 text-orange-500" />} label="A Receber" value={`R$ ${recebPendente.toFixed(2)}`} color="orange" />
              <KpiCard icon={<ArrowDownCircle className="w-5 h-5 text-red-500" />} label="A Pagar" value={`R$ ${pagarPendente.toFixed(2)}`} color="red" />
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
              <KpiCard icon={<TrendingDown className="w-5 h-5 text-red-500" />} label="Saídas Mês" value={`R$ ${saidasMes.toFixed(2)}`} color="red" small />
              <KpiCard icon={<DollarSign className="w-5 h-5 text-emerald-600" />} label="Lucro Est." value={`R$ ${(entradasMes - saidasMes).toFixed(2)}`} color="emerald" small />
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