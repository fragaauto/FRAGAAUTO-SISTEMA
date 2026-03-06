import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Download, FileSpreadsheet, Calendar, CheckCircle, XCircle, DollarSign, FileText, Users, TrendingUp, Award } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from "sonner";
import ModuloBloqueado from '@/components/ModuloBloqueado';
import { paginaPermitida } from '@/components/modulos';
import RelatorioTecnicos from '@/components/relatorios/RelatorioTecnicos';
import RelatorioRanking from '@/components/relatorios/RelatorioRanking';

export default function Relatorios() {
  const { data: configs = [] } = useQuery({
    queryKey: ['configuracoes'],
    queryFn: () => base44.entities.Configuracao.list(),
    staleTime: 5 * 60 * 1000,
  });
  const modulosAtivos = configs[0]?.modulos_ativos ?? null;
  if (!paginaPermitida(modulosAtivos, 'Relatorios')) return <ModuloBloqueado nomeModulo="Relatórios" />;

  const config = configs[0] || {};
  const [periodo, setPeriodo] = useState('30');
  const [dataEspecifica, setDataEspecifica] = useState({ from: null, to: null });

  const { data: atendimentos = [] } = useQuery({
    queryKey: ['atendimentos'],
    queryFn: () => base44.entities.Atendimento.list('-created_date', 500),
    staleTime: 2 * 60 * 1000
  });

  const dadosRelatorio = useMemo(() => {
    const now = new Date();

    const atendimentosFiltrados = atendimentos.filter(a => {
      const dataAtendimento = new Date(a.created_date);
      dataAtendimento.setHours(0, 0, 0, 0);

      if (periodo === 'especifica') {
        if (!dataEspecifica.from) return true;
        const from = new Date(dataEspecifica.from); from.setHours(0, 0, 0, 0);
        if (dataEspecifica.to) {
          const to = new Date(dataEspecifica.to); to.setHours(23, 59, 59, 999);
          return dataAtendimento >= from && dataAtendimento <= to;
        }
        return dataAtendimento.toDateString() === from.toDateString();
      }
      const diasFiltro = parseInt(periodo);
      if (diasFiltro === 0) return true;
      const diff = Math.floor((now - dataAtendimento) / (1000 * 60 * 60 * 24));
      return diff <= diasFiltro;
    });

    let servicosAprovados = 0, servicosReprovados = 0, valorTotalAprovado = 0, valorTotalReprovado = 0;
    const detalhesServicos = [];
    const rankingServicos = {};

    atendimentosFiltrados.forEach(a => {
      const todosItens = [...(a.itens_queixa || []), ...(a.itens_orcamento || [])];
      todosItens.forEach(item => {
        detalhesServicos.push({ atendimento_placa: a.placa, cliente: a.cliente_nome, produto: item.nome, quantidade: item.quantidade, valor_unitario: item.valor_unitario, valor_total: item.valor_total, status: item.status_aprovacao, data: a.created_date });
        if (item.status_aprovacao === 'aprovado') { servicosAprovados++; valorTotalAprovado += item.valor_total || 0; }
        else if (item.status_aprovacao === 'reprovado') { servicosReprovados++; valorTotalReprovado += item.valor_total || 0; }
        if (item.nome) {
          if (!rankingServicos[item.nome]) rankingServicos[item.nome] = { nome: item.nome, qtd_total: 0, qtd_aprovado: 0, qtd_reprovado: 0, valor_total: 0 };
          rankingServicos[item.nome].qtd_total++;
          rankingServicos[item.nome].valor_total += item.valor_total || 0;
          if (item.status_aprovacao === 'aprovado') rankingServicos[item.nome].qtd_aprovado++;
          else if (item.status_aprovacao === 'reprovado') rankingServicos[item.nome].qtd_reprovado++;
        }
      });
    });

    const rankingArray = Object.values(rankingServicos).sort((a, b) => b.qtd_aprovado - a.qtd_aprovado);

    return { totalOrcamentos: atendimentosFiltrados.length, servicosAprovados, servicosReprovados, valorTotalAprovado, valorTotalReprovado, detalhesServicos, atendimentosFiltrados, rankingServicos: rankingArray };
  }, [atendimentos, periodo, dataEspecifica]);

  const exportarCSV = () => {
    const linhas = ['Data;Placa;Cliente;Produto/Serviço;Quantidade;Valor Unit.;Valor Total;Status'];
    dadosRelatorio.detalhesServicos.forEach(item => {
      linhas.push([format(new Date(item.data), 'dd/MM/yyyy', { locale: ptBR }), item.atendimento_placa, item.cliente || '-', item.produto, item.quantidade, item.valor_unitario?.toFixed(2), item.valor_total?.toFixed(2), item.status === 'aprovado' ? 'Aprovado' : item.status === 'reprovado' ? 'Reprovado' : 'Pendente'].join(';'));
    });
    const blob = new Blob(['\ufeff' + linhas.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = `relatorio_${format(new Date(), 'yyyy-MM-dd')}.csv`; link.click();
    toast.success('Relatório exportado!');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-orange-50/30">
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-800">Relatórios Gerenciais</h1>
              <p className="text-slate-500">Análise detalhada dos atendimentos e produção</p>
            </div>
            <div className="flex items-center gap-3">
              <Select value={periodo} onValueChange={setPeriodo}>
                <SelectTrigger className="w-48"><Calendar className="w-4 h-4 mr-2" /><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">Últimos 7 dias</SelectItem>
                  <SelectItem value="30">Últimos 30 dias</SelectItem>
                  <SelectItem value="90">Últimos 90 dias</SelectItem>
                  <SelectItem value="0">Todo o período</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={exportarCSV} variant="outline"><FileSpreadsheet className="w-4 h-4 mr-2" />Exportar CSV</Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <Tabs defaultValue="geral">
          <TabsList className="mb-6">
            <TabsTrigger value="geral" className="flex items-center gap-2"><FileText className="w-4 h-4" />Geral</TabsTrigger>
            <TabsTrigger value="ranking" className="flex items-center gap-2"><TrendingUp className="w-4 h-4" />Ranking Serviços</TabsTrigger>
            <TabsTrigger value="tecnicos" className="flex items-center gap-2"><Users className="w-4 h-4" />Produção Técnicos</TabsTrigger>
          </TabsList>

          <TabsContent value="geral">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
              {[
                { label: 'Total de Orçamentos', value: dadosRelatorio.totalOrcamentos, icon: FileText, color: 'text-blue-600', bg: 'text-blue-500' },
                { label: 'Serviços Aprovados', value: dadosRelatorio.servicosAprovados, icon: CheckCircle, color: 'text-green-600', bg: 'text-green-500' },
                { label: 'Serviços Reprovados', value: dadosRelatorio.servicosReprovados, icon: XCircle, color: 'text-red-600', bg: 'text-red-500' },
              ].map((card, i) => (
                <Card key={i}><CardContent className="pt-6"><div className="flex items-center justify-between"><div><p className="text-sm text-slate-500 mb-1">{card.label}</p><p className={`text-3xl font-bold ${card.color}`}>{card.value}</p></div><card.icon className={`w-12 h-12 ${card.bg}`} /></div></CardContent></Card>
              ))}
              <Card><CardContent className="pt-6"><div className="flex items-center justify-between"><div><p className="text-sm text-slate-500 mb-1">Valor Total Aprovado</p><p className="text-2xl font-bold text-emerald-600">R$ {dadosRelatorio.valorTotalAprovado.toFixed(2)}</p></div><DollarSign className="w-12 h-12 text-emerald-500" /></div></CardContent></Card>
              <Card><CardContent className="pt-6"><div className="flex items-center justify-between"><div><p className="text-sm text-slate-500 mb-1">Valor Total Reprovado</p><p className="text-2xl font-bold text-red-600">R$ {dadosRelatorio.valorTotalReprovado.toFixed(2)}</p></div><DollarSign className="w-12 h-12 text-red-500" /></div></CardContent></Card>
              <Card><CardContent className="pt-6"><div className="flex items-center justify-between"><div><p className="text-sm text-slate-500 mb-1">Taxa de Aprovação</p><p className="text-3xl font-bold text-purple-600">{dadosRelatorio.servicosAprovados + dadosRelatorio.servicosReprovados > 0 ? ((dadosRelatorio.servicosAprovados / (dadosRelatorio.servicosAprovados + dadosRelatorio.servicosReprovados)) * 100).toFixed(1) : 0}%</p></div><CheckCircle className="w-12 h-12 text-purple-500" /></div></CardContent></Card>
            </div>

            <Card>
              <CardHeader><CardTitle>Detalhamento dos Serviços</CardTitle></CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead><tr className="border-b border-slate-200">{['Data','Placa','Cliente','Serviço','Qtd','Valor','Status'].map(h => <th key={h} className="text-left p-3 text-sm font-semibold text-slate-600">{h}</th>)}</tr></thead>
                    <tbody>
                      {dadosRelatorio.detalhesServicos.map((item, i) => (
                        <tr key={i} className="border-b border-slate-100 hover:bg-slate-50">
                          <td className="p-3 text-sm">{format(new Date(item.data), 'dd/MM/yyyy', { locale: ptBR })}</td>
                          <td className="p-3 text-sm font-medium">{item.atendimento_placa}</td>
                          <td className="p-3 text-sm">{item.cliente || '-'}</td>
                          <td className="p-3 text-sm">{item.produto}</td>
                          <td className="p-3 text-sm text-right">{item.quantidade}</td>
                          <td className="p-3 text-sm text-right font-semibold">R$ {item.valor_total?.toFixed(2)}</td>
                          <td className="p-3 text-center">
                            {item.status === 'aprovado' ? <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold">Aprovado</span> :
                             item.status === 'reprovado' ? <span className="px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-semibold">Reprovado</span> :
                             <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-semibold">Pendente</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="ranking">
            <RelatorioRanking ranking={dadosRelatorio.rankingServicos} />
          </TabsContent>

          <TabsContent value="tecnicos">
            <RelatorioTecnicos atendimentos={dadosRelatorio.atendimentosFiltrados} config={config} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}