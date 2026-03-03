import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  TrendingUp,
  TrendingDown,
  FileText,
  CheckCircle,
  XCircle,
  DollarSign,
  Calendar,
  Users
} from 'lucide-react';
import AgendaHoje from '../components/agenda/AgendaHoje';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function Dashboard() {
  const [periodo, setPeriodo] = useState('30');

  const { data: atendimentos = [] } = useQuery({
    queryKey: ['atendimentos'],
    queryFn: () => base44.entities.Atendimento.list('-created_date'),
    staleTime: 2 * 60 * 1000
  });

  const stats = useMemo(() => {
    const now = new Date();
    const diasFiltro = parseInt(periodo);
    
    const atendimentosFiltrados = atendimentos.filter(a => {
      if (diasFiltro === 0) return true;
      const dataAtendimento = new Date(a.created_date);
      const diffDias = Math.floor((now - dataAtendimento) / (1000 * 60 * 60 * 24));
      return diffDias <= diasFiltro;
    });

    const totalOrcamentos = atendimentosFiltrados.length;
    
    let servicosAprovados = 0;
    let servicosReprovados = 0;
    let valorTotalAprovado = 0;
    
    atendimentosFiltrados.forEach(atendimento => {
      const todosItens = [...(atendimento.itens_queixa || []), ...(atendimento.itens_orcamento || [])];
      todosItens.forEach(item => {
        if (item.status_aprovacao === 'aprovado') {
          servicosAprovados++;
          valorTotalAprovado += item.valor_total || 0;
        } else if (item.status_aprovacao === 'reprovado') {
          servicosReprovados++;
        }
      });
    });

    const concluidos = atendimentosFiltrados.filter(a => a.status === 'concluido').length;
    const emAndamento = atendimentosFiltrados.filter(a => 
      ['queixa_pendente', 'em_diagnostico', 'aguardando_aprovacao_checklist', 'em_execucao'].includes(a.status)
    ).length;

    return {
      totalOrcamentos,
      servicosAprovados,
      servicosReprovados,
      valorTotalAprovado,
      concluidos,
      emAndamento
    };
  }, [atendimentos, periodo]);

  const cards = [
    {
      title: 'Total de Orçamentos',
      value: stats.totalOrcamentos,
      icon: FileText,
      color: 'bg-blue-500',
      textColor: 'text-blue-600'
    },
    {
      title: 'Serviços Aprovados',
      value: stats.servicosAprovados,
      icon: CheckCircle,
      color: 'bg-green-500',
      textColor: 'text-green-600'
    },
    {
      title: 'Serviços Reprovados',
      value: stats.servicosReprovados,
      icon: XCircle,
      color: 'bg-red-500',
      textColor: 'text-red-600'
    },
    {
      title: 'Valor Aprovado',
      value: `R$ ${stats.valorTotalAprovado.toFixed(2)}`,
      icon: DollarSign,
      color: 'bg-emerald-500',
      textColor: 'text-emerald-600'
    },
    {
      title: 'Concluídos',
      value: stats.concluidos,
      icon: CheckCircle,
      color: 'bg-purple-500',
      textColor: 'text-purple-600'
    },
    {
      title: 'Em Andamento',
      value: stats.emAndamento,
      icon: TrendingUp,
      color: 'bg-orange-500',
      textColor: 'text-orange-600'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-orange-50/30">
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-800">Dashboard</h1>
              <p className="text-slate-500">Visão geral dos atendimentos</p>
            </div>
            <div className="flex items-center gap-3">
              <Select value={periodo} onValueChange={setPeriodo}>
                <SelectTrigger className="w-48">
                  <Calendar className="w-4 h-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">Últimos 7 dias</SelectItem>
                  <SelectItem value="30">Últimos 30 dias</SelectItem>
                  <SelectItem value="90">Últimos 90 dias</SelectItem>
                  <SelectItem value="0">Todo o período</SelectItem>
                </SelectContent>
              </Select>
              <Link to={createPageUrl('Relatorios')}>
                <Button variant="outline">
                  <FileText className="w-4 h-4 mr-2" />
                  Relatórios
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {cards.map((card, index) => (
            <Card key={index} className="hover:shadow-lg transition-shadow">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-500 mb-1">{card.title}</p>
                    <p className={`text-3xl font-bold ${card.textColor}`}>
                      {card.value}
                    </p>
                  </div>
                  <div className={`w-14 h-14 ${card.color} rounded-xl flex items-center justify-center`}>
                    <card.icon className="w-7 h-7 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Atendimentos Recentes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {atendimentos.slice(0, 5).map((atendimento) => (
                <Link 
                  key={atendimento.id}
                  to={createPageUrl(`VerAtendimento?id=${atendimento.id}`)}
                  className="flex items-center justify-between p-3 hover:bg-slate-50 rounded-lg transition-colors"
                >
                  <div>
                    <p className="font-semibold text-slate-800">
                      {atendimento.placa} - {atendimento.modelo}
                    </p>
                    <p className="text-sm text-slate-500">{atendimento.cliente_nome}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-green-600">
                      R$ {atendimento.valor_final?.toFixed(2) || '0.00'}
                    </p>
                    <p className="text-xs text-slate-500">
                      {new Date(atendimento.created_date).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}