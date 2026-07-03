import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { FileSpreadsheet, Calendar, CheckCircle, XCircle, DollarSign, FileText, Users, TrendingUp, Package, FileDown, Search, X, Loader2 } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import RelatorioProdutos from '@/components/relatorios/RelatorioProdutos';
import jsPDF from 'jspdf';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from "sonner";
import ModuloBloqueado from '@/components/ModuloBloqueado';
import { paginaPermitida } from '@/components/modulos';
import RelatorioTecnicos from '@/components/relatorios/RelatorioTecnicos';
import RelatorioRanking from '@/components/relatorios/RelatorioRanking';
import { useUnidade } from '@/lib/UnidadeContext';

export default function Relatorios() {
  const { data: configs = [] } = useQuery({
    queryKey: ['configuracoes'],
    queryFn: () => base44.entities.Configuracao.list(),
    staleTime: 5 * 60 * 1000,
  });

  const [user, setUser] = useState(null);
  useEffect(() => { base44.auth.me().then(setUser).catch(() => setUser(null)); }, []);
  const { data: funcoes = [] } = useQuery({
    queryKey: ['funcoes'],
    queryFn: () => base44.entities.FuncaoFuncionario.list(),
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });

  const [periodo, setPeriodo] = useState('30');
  const [dataEspecifica, setDataEspecifica] = useState({ from: null, to: null });

  const [inputCliente, setInputCliente] = useState('');
  const [inputVeiculo, setInputVeiculo] = useState('');
  const [inputProduto, setInputProduto] = useState('');

  const modulosAtivos = configs[0]?.modulos_ativos ?? null;
  const config = configs[0] || {};

  const { unidadeAtual } = useUnidade();
  const UNIDADE_AUTO_PORTAS_ID = '69ea76b72f920804f5d68eab';

  const { data: atendimentosBrutos = [] } = useQuery({
    queryKey: ['atendimentos'],
    queryFn: () => base44.entities.Atendimento.list('-created_date', 5000),
    staleTime: 2 * 60 * 1000
  });

  const atendimentos = useMemo(() => {
    if (!unidadeAtual) return atendimentosBrutos;
    return atendimentosBrutos.filter(a => {
      if (a.unidade_id) return a.unidade_id === unidadeAtual.id;
      return unidadeAtual.id === UNIDADE_AUTO_PORTAS_ID;
    });
  }, [atendimentosBrutos, unidadeAtual]);

  const temFiltroAtivo = inputCliente.trim() || inputVeiculo.trim() || inputProduto.trim();

  const aplicarFiltros = () => {}; // filtros são em tempo real

  const limparFiltros = () => {
    setInputCliente('');
    setInputVeiculo('');
    setInputProduto('');
  };

  const dadosRelatorio = useMemo(() => {
    const now = new Date();

    const atendimentosFiltrados = atendimentos.filter(a => {
      const dataAtendimento = new Date(a.data_entrada || a.created_date);
      dataAtendimento.setHours(0, 0, 0, 0);

      // Filtro de período
      if (periodo === 'especifica') {
        if (!dataEspecifica.from) return true;
        const from = new Date(dataEspecifica.from); from.setHours(0, 0, 0, 0);
        if (dataEspecifica.to) {
          const to = new Date(dataEspecifica.to); to.setHours(23, 59, 59, 999);
          if (!(dataAtendimento >= from && dataAtendimento <= to)) return false;
        } else {
          if (dataAtendimento.toDateString() !== from.toDateString()) return false;
        }
      } else {
        const diasFiltro = parseInt(periodo);
        if (diasFiltro !== 0) {
          const diff = Math.floor((now - dataAtendimento) / (1000 * 60 * 60 * 24));
          if (diff > diasFiltro) return false;
        }
      }

      // Filtro de cliente (contém, sem distinção maiúsculas)
      const fc = inputCliente.trim();
      if (fc) {
        const nome = String(a.cliente_nome || '').toLowerCase();
        if (!nome.includes(fc.toLowerCase())) return false;
      }

      // Filtro de veículo — placa ou modelo (contém)
      const fv = inputVeiculo.trim();
      if (fv) {
        const placa = String(a.placa || '').toLowerCase();
        const modelo = String(a.modelo || '').toLowerCase();
        const busca = fv.toLowerCase();
        if (!placa.includes(busca) && !modelo.includes(busca)) return false;
      }

      // Filtro de produto/serviço — verifica se algum item contém o texto
      const fp = inputProduto.trim();
      if (fp) {
        const todosItens = [...(a.itens_queixa || []), ...(a.itens_orcamento || [])];
        const busca = fp.toLowerCase();
        const temProduto = todosItens.some(item => String(item.nome || '').toLowerCase().includes(busca));
        if (!temProduto) return false;
      }

      return true;
    });

    let servicosAprovados = 0, servicosReprovados = 0, valorTotalAprovado = 0, valorTotalReprovado = 0;
    const detalhesServicos = [];
    const rankingServicos = {};

    atendimentosFiltrados.forEach(a => {
      const atendimentoConcluido = a.status === 'concluido' && a.status_pagamento && a.status_pagamento !== 'pendente';
      
      const todosItens = [...(a.itens_queixa || []), ...(a.itens_orcamento || [])];
      todosItens.forEach(item => {
        detalhesServicos.push({ numero_os: a.numero_os, atendimento_placa: a.placa, modelo: a.modelo, cliente: a.cliente_nome, produto: item.nome, quantidade: item.quantidade, valor_unitario: item.valor_unitario, valor_total: item.valor_total, status: item.status_aprovacao, data: a.data_entrada || a.created_date, atendimento_concluido: atendimentoConcluido });
        
        if (item.nome) {
          if (!rankingServicos[item.nome]) rankingServicos[item.nome] = { nome: item.nome, qtd_total: 0, qtd_aprovado: 0, qtd_reprovado: 0, valor_total: 0 };
          rankingServicos[item.nome].qtd_total++;
          if (item.status_aprovacao === 'reprovado') {
            rankingServicos[item.nome].qtd_reprovado++;
          }
          if (item.status_aprovacao === 'aprovado' && atendimentoConcluido) {
            servicosAprovados++;
            valorTotalAprovado += item.valor_total || 0;
            rankingServicos[item.nome].qtd_aprovado++;
            rankingServicos[item.nome].valor_total += item.valor_total || 0;
          } else if (item.status_aprovacao === 'reprovado') {
            servicosReprovados++;
            valorTotalReprovado += item.valor_total || 0;
          }
        }
      });
    });

    const rankingArray = Object.values(rankingServicos).sort((a, b) => b.qtd_aprovado - a.qtd_aprovado);

    return { totalOrcamentos: atendimentosFiltrados.length, servicosAprovados, servicosReprovados, valorTotalAprovado, valorTotalReprovado, detalhesServicos, atendimentosFiltrados, rankingServicos: rankingArray };
  }, [atendimentos, periodo, dataEspecifica, inputCliente, inputVeiculo, inputProduto]);

  // Atendimentos filtrados APENAS por período e unidade (sem filtros de cliente/veículo/produto)
  // Usado na aba de técnicos para não distorcer os totais de produção
  const atendimentosPorPeriodo = useMemo(() => {
    const now = new Date();
    return atendimentos.filter(a => {
      const dataAtendimento = new Date(a.data_entrada || a.created_date);
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
  }, [atendimentos, periodo, dataEspecifica]);

  const isAdmin = user?.role === 'admin';
  const funcaoUsuario = user?.funcao_id ? funcoes.find(f => f.id === user.funcao_id) : null;
  const podeVerRelatorioProprio = !!funcaoUsuario?.pode_ver_relatorio_proprio;
  // Usuários comuns só veem seu próprio relatório de produção; admin vê tudo.
  const verApenasProprio = !isAdmin && podeVerRelatorioProprio;

  // Período fixo (pré-configurado) para visualização da produção individual
  const periodoFixoConfig = (config.restringir_periodo_producao_proprio && verApenasProprio && config.periodo_producao_proprio_inicio)
    ? { inicio: config.periodo_producao_proprio_inicio, fim: config.periodo_producao_proprio_fim || config.periodo_producao_proprio_inicio }
    : null;

  // Aguarda carregar o usuário antes de decidir permissões
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  if (!paginaPermitida(modulosAtivos, 'Relatorios')) return <ModuloBloqueado nomeModulo="Relatórios" />;
  // Não-admin sem permissão de ver próprio relatório não acessa relatórios
  if (!isAdmin && !podeVerRelatorioProprio) return <ModuloBloqueado nomeModulo="Relatórios" />;

  const labelPeriodo = periodo === 'especifica'
    ? (dataEspecifica.from ? (dataEspecifica.to ? `${format(dataEspecifica.from, 'dd/MM/yyyy')} - ${format(dataEspecifica.to, 'dd/MM/yyyy')}` : format(dataEspecifica.from, 'dd/MM/yyyy')) : 'Data específica')
    : periodo === '0' ? 'Todo o período' : `Últimos ${periodo} dias`;

  const exportarGeralCSV = () => {
    const linhas = ['OS;Data;Placa;Modelo;Cliente;Produto/Serviço;Quantidade;Valor Unit.;Valor Total;Status'];
    dadosRelatorio.detalhesServicos.forEach(item => {
      linhas.push([item.numero_os || '-', format(new Date(item.data), 'dd/MM/yyyy', { locale: ptBR }), item.atendimento_placa || '-', item.modelo || '-', item.cliente || '-', item.produto, item.quantidade, item.valor_unitario?.toFixed(2), item.valor_total?.toFixed(2), item.status === 'aprovado' ? 'Aprovado' : item.status === 'reprovado' ? 'Reprovado' : 'Pendente'].join(';'));
    });
    const blob = new Blob(['\ufeff' + linhas.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = `relatorio_geral_${format(new Date(), 'yyyy-MM-dd')}.csv`; link.click();
    toast.success('Exportado com sucesso!');
  };

  const exportarGeralPDF = () => {
    const doc = new jsPDF({ orientation: 'landscape' });
    doc.setFontSize(16); doc.text('Relatório Geral de Atendimentos', 14, 18);
    doc.setFontSize(9); doc.text(`Período: ${labelPeriodo}  |  Gerado em: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, 14, 26);
    const headers = ['Data', 'Placa', 'Modelo', 'Cliente', 'Produto/Serviço', 'Qtd', 'Valor Total', 'Status'];
    const colW = [20, 18, 28, 28, 58, 10, 22, 18];
    let y = 34;
    const totalW = colW.reduce((s, w) => s + w, 0);
    doc.setFillColor(249, 115, 22); doc.rect(14, y, totalW, 7, 'F');
    doc.setTextColor(255,255,255); doc.setFontSize(8);
    let x = 14; headers.forEach((h, i) => { doc.text(h, x + 1, y + 5); x += colW[i]; });
    doc.setTextColor(0,0,0); y += 9;
    dadosRelatorio.detalhesServicos.forEach((item, idx) => {
      if (y > 190) { doc.addPage(); y = 14; }
      if (idx % 2 === 0) { doc.setFillColor(248,250,252); doc.rect(14, y - 1, totalW, 7, 'F'); }
      const row = [
        format(new Date(item.data), 'dd/MM/yy', { locale: ptBR }),
        item.atendimento_placa || '',
        (item.modelo || '-').substring(0, 14),
        (item.cliente || '-').substring(0, 15),
        (item.produto || '').substring(0, 32),
        String(item.quantidade || ''),
        `R$ ${(item.valor_total || 0).toFixed(2)}`,
        item.status === 'aprovado' ? 'Aprovado' : item.status === 'reprovado' ? 'Reprovado' : 'Pendente',
      ];
      x = 14; row.forEach((v, i) => { doc.text(String(v), x + 1, y + 4); x += colW[i]; });
      y += 7;
    });
    doc.save(`relatorio_geral_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
    toast.success('PDF gerado com sucesso!');
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
              <Select value={periodo} onValueChange={(v) => { setPeriodo(v); if (v !== 'especifica') setDataEspecifica({ from: null, to: null }); }}>
                <SelectTrigger className="w-48"><Calendar className="w-4 h-4 mr-2" /><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">Últimos 7 dias</SelectItem>
                  <SelectItem value="30">Últimos 30 dias</SelectItem>
                  <SelectItem value="90">Últimos 90 dias</SelectItem>
                  <SelectItem value="0">Todo o período</SelectItem>
                  <SelectItem value="especifica">Data específica</SelectItem>
                </SelectContent>
              </Select>
              {periodo === 'especifica' && (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-64">
                      <Calendar className="w-4 h-4 mr-2" />
                      {dataEspecifica.from
                        ? dataEspecifica.to
                          ? `${format(dataEspecifica.from, 'dd/MM/yyyy')} - ${format(dataEspecifica.to, 'dd/MM/yyyy')}`
                          : format(dataEspecifica.from, 'dd/MM/yyyy')
                        : 'Selecionar período'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <CalendarComponent
                      mode="range"
                      selected={dataEspecifica}
                      onSelect={(range) => setDataEspecifica(range || { from: null, to: null })}
                      initialFocus
                      numberOfMonths={2}
                      locale={ptBR}
                    />
                  </PopoverContent>
                </Popover>
              )}
              {/* export buttons shown per tab */}
            </div>
          </div>
        </div>
      </div>

      {/* Painel de filtros adicionais (oculto no modo pessoal) */}
      {!verApenasProprio && (
      <div className="bg-slate-50 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex flex-wrap items-center gap-3">
            <Search className="w-4 h-4 text-slate-500 flex-shrink-0" />
            <Input
              placeholder="Nome do cliente..."
              value={inputCliente}
              onChange={e => setInputCliente(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && aplicarFiltros()}
              className="w-44 h-9 text-sm"
            />
            <Input
              placeholder="Placa ou modelo..."
              value={inputVeiculo}
              onChange={e => setInputVeiculo(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && aplicarFiltros()}
              className="w-40 h-9 text-sm"
            />
            <Input
              placeholder="Produto ou serviço..."
              value={inputProduto}
              onChange={e => setInputProduto(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && aplicarFiltros()}
              className="w-44 h-9 text-sm"
            />
            <Button size="sm" onClick={aplicarFiltros} className="h-9 bg-orange-500 hover:bg-orange-600">
              <Search className="w-4 h-4 mr-1" /> Aplicar Filtros
            </Button>
            {temFiltroAtivo && (
              <Button variant="ghost" size="sm" onClick={limparFiltros} className="h-9 text-slate-500 hover:text-red-600">
                <X className="w-4 h-4 mr-1" /> Limpar
              </Button>
            )}
            {temFiltroAtivo && (
              <span className="text-xs text-orange-600 font-semibold bg-orange-50 px-2 py-1 rounded-full border border-orange-200">
                {dadosRelatorio.atendimentosFiltrados.length} atendimento(s) encontrado(s)
              </span>
            )}
          </div>
        </div>
      </div>
      )}

      <div className="max-w-7xl mx-auto px-4 py-6">
        {verApenasProprio ? (
          <RelatorioTecnicos atendimentos={atendimentos} config={config} labelPeriodo={labelPeriodo} modoPessoal usuarioLogado={user} periodoFixo={periodoFixoConfig} />
        ) : (
        <Tabs defaultValue="geral">
          <TabsList className="mb-6">
            <TabsTrigger value="geral" className="flex items-center gap-2"><FileText className="w-4 h-4" />Geral</TabsTrigger>
            <TabsTrigger value="produtos" className="flex items-center gap-2"><Package className="w-4 h-4" />Produtos Vendidos</TabsTrigger>
            <TabsTrigger value="ranking" className="flex items-center gap-2"><TrendingUp className="w-4 h-4" />Ranking Serviços</TabsTrigger>
            <TabsTrigger value="tecnicos" className="flex items-center gap-2"><Users className="w-4 h-4" />Produção Técnicos</TabsTrigger>
          </TabsList>

          <TabsContent value="geral">
            <div className="flex justify-end gap-2 mb-4">
              <Button variant="outline" size="sm" onClick={exportarGeralCSV}><FileSpreadsheet className="w-4 h-4 mr-2" />Excel / CSV</Button>
              <Button variant="outline" size="sm" onClick={exportarGeralPDF}><FileDown className="w-4 h-4 mr-2" />PDF</Button>
            </div>
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
                    <thead><tr className="border-b border-slate-200">{['OS','Data','Placa','Modelo','Cliente','Serviço','Qtd','Valor','Status'].map(h => <th key={h} className="text-left p-3 text-sm font-semibold text-slate-600">{h}</th>)}</tr></thead>
                    <tbody>
                      {dadosRelatorio.detalhesServicos.map((item, i) => (
                        <tr key={i} className="border-b border-slate-100 hover:bg-slate-50">
                          <td className="p-3 text-sm text-slate-500">{item.numero_os ? String(item.numero_os).padStart(4,'0') : '-'}</td>
                          <td className="p-3 text-sm">{format(new Date(item.data), 'dd/MM/yyyy', { locale: ptBR })}</td>
                          <td className="p-3 text-sm font-medium">{item.atendimento_placa || '-'}</td>
                          <td className="p-3 text-sm text-slate-600">{item.modelo || '-'}</td>
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

          <TabsContent value="produtos">
            <RelatorioProdutos atendimentos={dadosRelatorio.atendimentosFiltrados} labelPeriodo={labelPeriodo} />
          </TabsContent>

          <TabsContent value="ranking">
            <RelatorioRanking ranking={dadosRelatorio.rankingServicos} labelPeriodo={labelPeriodo} />
          </TabsContent>

          <TabsContent value="tecnicos">
            <RelatorioTecnicos atendimentos={atendimentos} config={config} labelPeriodo={labelPeriodo} />
          </TabsContent>
        </Tabs>
        )}
      </div>
    </div>
  );
}