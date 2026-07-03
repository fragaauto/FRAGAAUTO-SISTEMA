import React, { useMemo, useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, Award, FileSpreadsheet, FileDown, Filter, ChevronDown, ChevronUp, Eye, ArrowRightLeft, Trash2, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from "sonner";
import jsPDF from 'jspdf';
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { base44 } from '@/api/base44Client';
import { queryClientInstance } from '@/lib/query-client';
import { useQuery } from '@tanstack/react-query';
import { useUnidade } from '@/lib/UnidadeContext';

export default function RelatorioTecnicos({ atendimentos = [], config = {}, labelPeriodo = '', modoPessoal = false, usuarioLogado = null, periodoFixo = null }) {
  const [filtroTecnico, setFiltroTecnico] = useState('todos');
  const [filtroProduto, setFiltroProduto] = useState('');
  // Default: primeiro dia do mês atual até hoje, exceto quando há período fixo pré-configurado
  const hoje = new Date();
  const primeiroDiaMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1).toISOString().slice(0, 10);
  const hojeStr = hoje.toISOString().slice(0, 10);
  const [filtroDataInicio, setFiltroDataInicio] = useState(periodoFixo?.inicio || primeiroDiaMes);
  const [filtroDataFim, setFiltroDataFim] = useState(periodoFixo?.fim || hojeStr);
  const [tecnicoExpandido, setTecnicoExpandido] = useState(null);
  const [incluirDetalhes, setIncluirDetalhes] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [editandoKey, setEditandoKey] = useState(null);

  useEffect(() => {
    base44.auth.me()
      .then(u => setIsAdmin(u?.role === 'admin'))
      .catch(() => setIsAdmin(false));
  }, []);

  // Funcionários ativos (para listar todos os técnicos possíveis na transferência)
  const { unidadeAtual } = useUnidade();
  const { data: funcionarios = [] } = useQuery({
    queryKey: ['funcionarios', unidadeAtual?.id],
    queryFn: () => base44.entities.Funcionario.list(),
    staleTime: 5 * 60 * 1000,
  });

  // Mapa nome -> id de todos os técnicos conhecidos (funcionários ativos + técnicos já presentes nos atendimentos)
  const tecnicosComId = useMemo(() => {
    const map = {};
    (funcionarios || [])
      .filter(f => (f.status || 'ativo') === 'ativo' && f.nome_completo)
      .forEach(f => { map[f.nome_completo] = f.id; });
    atendimentos.forEach(a => {
      (a.tecnicos_responsaveis || []).forEach(t => { if (t.nome && !map[t.nome]) map[t.nome] = t.id || t.nome; });
      if (a.tecnico) a.tecnico.split(',').map(s => s.trim()).forEach(n => { if (n && !map[n]) map[n] = n; });
      [...(a.itens_queixa || []), ...(a.itens_orcamento || [])].forEach(item => {
        (item.tecnicos || []).forEach(t => { if (t.nome && !map[t.nome]) map[t.nome] = t.id || t.nome; });
      });
    });
    return map;
  }, [atendimentos, funcionarios]);

  // Modo pessoal: identificar o técnico correspondente ao usuário logado e travar o filtro nele
  const nomeTecnicoUsuario = useMemo(() => {
    if (!modoPessoal || !usuarioLogado) return null;
    const func = (funcionarios || []).find(f => f.email && f.email.toLowerCase() === (usuarioLogado.email || '').toLowerCase());
    return func?.nome_completo || usuarioLogado.full_name || null;
  }, [modoPessoal, usuarioLogado, funcionarios]);

  useEffect(() => {
    if (modoPessoal && nomeTecnicoUsuario) setFiltroTecnico(nomeTecnicoUsuario);
  }, [modoPessoal, nomeTecnicoUsuario]);

  // Controles administrativos (edição/transferência de técnicos) só fora do modo pessoal
  const podeEditarTecnicos = isAdmin && !modoPessoal;

  // Transferir ou remover atribuição de técnico em um item (admin)
  const atualizarTecnicoItem = async (srv, acao) => {
    const srvKey = `${srv.atendimentoId}-${srv.itemSource}-${srv.itemIndex}-${srv.tecnicoId}`;
    setEditandoKey(srvKey);
    try {
      const atendimento = atendimentos.find(a => a.id === srv.atendimentoId);
      if (!atendimento) { toast.error('Atendimento não encontrado'); return; }
      const campo = srv.itemSource === 'queixa' ? 'itens_queixa' : 'itens_orcamento';
      const itens = JSON.parse(JSON.stringify(atendimento[campo] || []));
      const item = itens[srv.itemIndex];
      if (!item) { toast.error('Item não encontrado'); return; }
      // Se o item não tinha técnicos próprios (veio do fallback do atendimento), materializa
      if (!item.tecnicos || item.tecnicos.length === 0) {
        item.tecnicos = (atendimento.tecnicos_responsaveis || []).map(t => ({ id: t.id || t.nome, nome: t.nome }));
        if (item.tecnicos.length === 0 && atendimento.tecnico) {
          item.tecnicos = atendimento.tecnico.split(',').map(s => s.trim()).filter(s => s).map(s => ({ id: s, nome: s }));
        }
      }
      if (acao === '__remover__') {
        item.tecnicos = item.tecnicos.filter(t => (t.id || t.nome) !== srv.tecnicoId);
      } else {
        const novoId = tecnicosComId[acao] || acao;
        item.tecnicos = item.tecnicos.map(t =>
          (t.id || t.nome) === srv.tecnicoId ? { id: novoId, nome: acao } : t
        );
      }
      await base44.entities.Atendimento.update(srv.atendimentoId, { [campo]: itens });
      await queryClientInstance.invalidateQueries({ queryKey: ['atendimentos'] });
      toast.success(acao === '__remover__' ? 'Atribuição removida' : 'Técnico transferido');
    } catch (e) {
      toast.error('Erro: ' + (e.message || e));
    } finally {
      setEditandoKey(null);
    }
  };
  
  // Nota: O relatório captura os nomes dos técnicos diretamente dos atendimentos (a.tecnicos_responsaveis ou itens_*.tecnicos)
  // Não é necessário buscar listas de usuarios/funcionarios aqui, pois os dados já estão salvos no atendimento
  const taxasMap = useMemo(() => {
    const map = {};
    (config.taxas_pagamento || []).forEach(t => { map[t.forma] = t.taxa_percentual || 0; });
    return map;
  }, [config]);

  const totalImpostos = useMemo(() => {
    return (config.impostos || []).filter(i => i.ativo).reduce((sum, i) => sum + (i.percentual || 0), 0);
  }, [config]);

  const atendimentosFiltradosPorData = useMemo(() => {
    // Sempre filtra por data — padrão é o mês atual
    return atendimentos.filter(a => {
      const dataAtendimento = new Date(a.data_entrada || a.created_date);
      // Período fixo pré-configurado: limite máximo de visualização (hard boundary)
      if (periodoFixo) {
        const fInicio = new Date(periodoFixo.inicio + 'T00:00:00');
        if (dataAtendimento < fInicio) return false;
        const fFim = new Date(periodoFixo.fim + 'T23:59:59');
        if (dataAtendimento > fFim) return false;
      }
      if (filtroDataInicio) {
        const inicio = new Date(filtroDataInicio + 'T00:00:00');
        if (dataAtendimento < inicio) return false;
      }
      if (filtroDataFim) {
        const fim = new Date(filtroDataFim + 'T23:59:59');
        if (dataAtendimento > fim) return false;
      }
      return true;
    });
  }, [atendimentos, filtroDataInicio, filtroDataFim, periodoFixo]);

  // Detecta se o período selecionado pelo usuário está totalmente fora do período fixo
  const foraDoPeriodoFixo = periodoFixo && (() => {
    const uIni = filtroDataInicio ? new Date(filtroDataInicio + 'T00:00:00') : null;
    const uFim = filtroDataFim ? new Date(filtroDataFim + 'T23:59:59') : null;
    const fIni = new Date(periodoFixo.inicio + 'T00:00:00');
    const fFim = new Date(periodoFixo.fim + 'T23:59:59');
    if (uIni && uFim) return uFim < fIni || uIni > fFim;
    return false;
  })();

  const dadosTecnicos = useMemo(() => {
    const tecnicos = {};

    const atendimentosFiltrados = atendimentosFiltradosPorData.filter(a => {
      if (!filtroProduto) return true;
      const todosItens = [...(a.itens_queixa || []), ...(a.itens_orcamento || [])];
      return todosItens.some(item => item.nome?.toLowerCase().includes(filtroProduto.toLowerCase()));
    });

    atendimentosFiltrados.forEach(a => {
      // Técnicos responsáveis do atendimento (fallback legado)
      let tecnicosResponsaveis = a.tecnicos_responsaveis?.length > 0
        ? a.tecnicos_responsaveis
        : (a.tecnico ? a.tecnico.split(',').map(t => ({ nome: t.trim(), id: t.trim() })).filter(t => t.nome) : []);

      // Se não há técnicos no nível do atendimento, coleta dos itens (orçamento/queixa)
      if (tecnicosResponsaveis.length === 0) {
        const todosItensFallback = [...(a.itens_queixa || []), ...(a.itens_orcamento || [])];
        const nomesVistos = new Set();
        const tecnicosItens = [];
        todosItensFallback.forEach(item => {
          (item.tecnicos || []).forEach(tec => {
            if (tec.nome && !nomesVistos.has(tec.nome)) {
              nomesVistos.add(tec.nome);
              tecnicosItens.push({ nome: tec.nome, id: tec.id || tec.nome });
            }
          });
        });
        tecnicosResponsaveis = tecnicosItens;
      }

      if (tecnicosResponsaveis.length === 0) return;

      // Itens do atendimento com identificação de origem (para transferência entre técnicos)
      const itensComSource = [
        ...(a.itens_queixa || []).map((item, index) => ({ item, source: 'queixa', index })),
        ...(a.itens_orcamento || []).map((item, index) => ({ item, source: 'orcamento', index })),
      ];

      // Valor bruto total do atendimento para calcular % de taxa de pagamento
      const valorBrutoAtendimento = Number(a.valor_final) || Number(a.subtotal) ||
        itensComSource.reduce((s, e) => s + (Number(e.item.valor_total) || 0), 0);

      // Taxa de pagamento efetiva (percentual sobre o total)
      let percTaxaPagamento = 0;
      if (a.formas_pagamento_lancamento?.length > 0 && valorBrutoAtendimento > 0) {
        const totalTaxas = a.formas_pagamento_lancamento.reduce((s, fp) => {
          return s + (fp.valor || 0) * ((taxasMap[fp.forma] || 0) / 100);
        }, 0);
        percTaxaPagamento = (totalTaxas / valorBrutoAtendimento) * 100;
      }

      // Fator líquido: aplica impostos e taxas de pagamento
      const fatorLiquido = (1 - totalImpostos / 100) * (1 - percTaxaPagamento / 100);

      // Acumulador por técnico para este atendimento
      const acumPorTecnico = {}; // key: nome do técnico

      const garantirTecnico = (nome) => {
        if (!acumPorTecnico[nome]) acumPorTecnico[nome] = { valorBruto: 0, servicos: [] };
      };

      if (itensComSource.length === 0) {
        // Sem itens: atribui o valor_final dividido entre técnicos responsáveis
        const valorPorTec = valorBrutoAtendimento / tecnicosResponsaveis.length;
        tecnicosResponsaveis.forEach(t => {
          garantirTecnico(t.nome);
          acumPorTecnico[t.nome].valorBruto += valorPorTec;
          acumPorTecnico[t.nome].servicos.push({
            atendimentoId: a.id, numeroOS: a.numero_os, placa: a.placa,
            cliente: a.cliente_nome, servico: 'Atendimento geral',
            valorTecnico: valorPorTec, data: a.data_entrada || a.created_date,
          });
        });
      } else {
        // Para cada item, distribui o valor entre os técnicos atribuídos ao item
        // Se o item não tem técnico específico, distribui entre os técnicos responsáveis do atendimento
        itensComSource.forEach(({ item, source, index }) => {
          const temTecnicosItem = item.tecnicos?.length > 0;
          const tecnicosItem = temTecnicosItem ? item.tecnicos : tecnicosResponsaveis;
          const valorItem = Number(item.valor_total) || 0;
          const valorPorTec = valorItem / tecnicosItem.length;
          const nomesTecnicosItem = tecnicosItem.map(t => t.nome);

          tecnicosItem.forEach(tec => {
            garantirTecnico(tec.nome);
            acumPorTecnico[tec.nome].valorBruto += valorPorTec;
            acumPorTecnico[tec.nome].servicos.push({
              atendimentoId: a.id,
              numeroOS: a.numero_os,
              placa: a.placa,
              cliente: a.cliente_nome,
              servico: item.nome,
              quantidade: item.quantidade || 1,
              valorTotal: valorItem,
              valorTecnico: valorPorTec,
              compartilhadoCom: tecnicosItem.length > 1
                ? nomesTecnicosItem.filter(n => n !== tec.nome).join(', ')
                : null,
              data: a.data_entrada || a.created_date,
              itemSource: source,
              itemIndex: index,
              tecnicoId: tec.id || tec.nome,
              tecnicoNome: tec.nome,
            });
          });
        });
      }

      // Registrar no acumulador global de técnicos
      Object.entries(acumPorTecnico).forEach(([nome, dados]) => {
        if (!tecnicos[nome]) {
          tecnicos[nome] = { nome, qtdAtendimentos: 0, valorBrutoTotal: 0, valorLiquidoTotal: 0, atendimentosConcluidos: 0, servicos: [] };
        }
        tecnicos[nome].qtdAtendimentos++;
        tecnicos[nome].valorBrutoTotal += dados.valorBruto;
        tecnicos[nome].valorLiquidoTotal += dados.valorBruto * fatorLiquido;
        if (a.status === 'concluido') tecnicos[nome].atendimentosConcluidos++;
        tecnicos[nome].servicos.push(...dados.servicos);
      });
    });

    const todosTecnicos = Object.values(tecnicos).sort((a, b) => b.valorLiquidoTotal - a.valorLiquidoTotal);
    if (filtroTecnico !== 'todos') return todosTecnicos.filter(t => t.nome === filtroTecnico);
    return todosTecnicos;
  }, [atendimentosFiltradosPorData, taxasMap, totalImpostos, filtroTecnico, filtroProduto]);

  // Lista de todos os técnicos para o filtro
  const listaTecnicos = useMemo(() => {
    const nomes = new Set();
    atendimentosFiltradosPorData.forEach(a => {
      const lista = a.tecnicos_responsaveis?.length > 0
        ? a.tecnicos_responsaveis
        : (a.tecnico ? a.tecnico.split(',').map(t => ({ nome: t.trim() })) : []);
      lista.forEach(t => nomes.add(t.nome));
      
      const todosItens = [...(a.itens_queixa || []), ...(a.itens_orcamento || [])];
      todosItens.forEach(item => {
        if (item.tecnicos?.length > 0) {
          item.tecnicos.forEach(tec => nomes.add(tec.nome));
        }
      });
    });
    return Array.from(nomes).sort();
  }, [atendimentos]);

  if (dadosTecnicos.length === 0) {
    return (
      <Card>
        <CardContent className="py-16 text-center">
          <Users className="w-12 h-12 mx-auto mb-4 text-slate-300" />
          <p className="text-slate-500">{foraDoPeriodoFixo ? 'Não há registros nesse período' : (modoPessoal ? 'Você ainda não tem atendimentos atribuídos no período selecionado' : 'Nenhum atendimento com técnico atribuído no período')}</p>
          {!modoPessoal && !foraDoPeriodoFixo && <p className="text-sm text-slate-400 mt-1">Atribua técnicos nos atendimentos para ver a produção</p>}
        </CardContent>
      </Card>
    );
  }

  const totalBruto = dadosTecnicos.reduce((sum, t) => sum + t.valorBrutoTotal, 0);
  const totalLiquido = dadosTecnicos.reduce((sum, t) => sum + t.valorLiquidoTotal, 0);
  const totalSemTecnico = atendimentosFiltradosPorData.filter(a => {
    const t = a.tecnicos_responsaveis?.length > 0 ? a.tecnicos_responsaveis : (a.tecnico ? a.tecnico.split(',').map(n=>({nome:n.trim()})).filter(n=>n.nome) : []);
    if (t.length > 0) return false;
    // Verifica técnicos nos itens
    const todosItens = [...(a.itens_queixa || []), ...(a.itens_orcamento || [])];
    return !todosItens.some(i => i.tecnicos?.length > 0);
  });
  const semTecnicoConcluidos = totalSemTecnico.filter(a => a.status === 'concluido');
  const valorSemTecnico = totalSemTecnico.reduce((s,a)=>s+(Number(a.valor_final)||0),0);
  const valorSemTecnicoConcluido = semTecnicoConcluidos.reduce((s,a)=>s+(Number(a.valor_final)||0),0);

  const exportarExcel = () => {
    const linhas = ['Técnico;Atendimentos;Concluídos;Valor Bruto;Valor Líquido'];
    dadosTecnicos.forEach(t => {
      linhas.push([t.nome, t.qtdAtendimentos, t.atendimentosConcluidos, t.valorBrutoTotal.toFixed(2), t.valorLiquidoTotal.toFixed(2)].join(';'));
      
      if (incluirDetalhes && t.servicos && t.servicos.length > 0) {
        linhas.push(';;OS;Placa;Cliente;Serviço;Qtd;Valor Técnico;Compartilhado;Data');
        t.servicos.forEach(srv => {
          const dataFormatada = srv.data ? (() => { try { return format(new Date(srv.data), 'dd/MM/yyyy'); } catch { return ''; } })() : '';
          linhas.push([
            '',
            '',
            srv.numeroOS || '',
            srv.placa || '',
            srv.cliente || '',
            srv.servico || '',
            srv.quantidade || '',
            (srv.valorTecnico || 0).toFixed(2),
            srv.compartilhadoCom || '',
            dataFormatada
          ].join(';'));
        });
        linhas.push('');
      }
    });
    const blob = new Blob(['\ufeff' + linhas.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = `producao_tecnicos_${format(new Date(), 'yyyy-MM-dd')}.csv`; link.click();
    toast.success('Exportado com sucesso!');
  };

  const exportarPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(16); doc.text('Produção por Técnico', 14, 18);
    doc.setFontSize(9); doc.text(`Período: ${labelPeriodo}  |  Gerado em: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, 14, 26);
    let y = 32;
    if (totalImpostos > 0) { doc.text(`Impostos descontados: ${totalImpostos}%`, 14, y); y += 7; }
    
    const headers = ['Técnico', 'Atendimentos', 'Concluídos', 'Valor Bruto', 'Valor Líquido'];
    const colW = [70, 28, 26, 32, 32];
    doc.setFillColor(249, 115, 22); doc.rect(14, y, 181, 7, 'F');
    doc.setTextColor(255,255,255); doc.setFontSize(8);
    let x = 14; headers.forEach((h, i) => { doc.text(h, x + 1, y + 5); x += colW[i]; });
    doc.setTextColor(0,0,0); y += 9;
    
    dadosTecnicos.forEach((t, idx) => {
      if (y > 270) { doc.addPage(); y = 14; }
      if (idx % 2 === 0) { doc.setFillColor(248,250,252); doc.rect(14, y - 1, 181, 7, 'F'); }
      const row = [t.nome.substring(0,36), String(t.qtdAtendimentos), String(t.atendimentosConcluidos), `R$ ${t.valorBrutoTotal.toFixed(2)}`, `R$ ${t.valorLiquidoTotal.toFixed(2)}`];
      x = 14; row.forEach((v, i) => { doc.text(String(v), x + 1, y + 4); x += colW[i]; });
      y += 7;
      
      // Adicionar detalhes se solicitado
      if (incluirDetalhes && t.servicos && t.servicos.length > 0) {
        y += 3;
        doc.setFontSize(7);
        doc.setTextColor(100, 100, 100);
        doc.text(`Detalhes dos serviços de ${t.nome}:`, 16, y);
        y += 5;
        
        t.servicos.forEach((srv, srvIdx) => {
          if (y > 275) { doc.addPage(); y = 14; }
          const dataFormatada = srv.data ? (() => { try { return format(new Date(srv.data), 'dd/MM/yy'); } catch { return ''; } })() : '';
          const compartilhado = srv.compartilhadoCom ? ` (c/ ${srv.compartilhadoCom.substring(0, 15)})` : '';
          const linha = `  OS#${srv.numeroOS || ''} ${srv.placa || ''} - ${(srv.servico || '').substring(0, 30)} ${srv.quantidade > 1 ? 'x'+srv.quantidade : ''} R$ ${(srv.valorTecnico || 0).toFixed(2)}${compartilhado}`;
          doc.text(linha, 16, y);
          y += 4;
        });
        
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(8);
        y += 3;
      }
    });
    
    doc.save(`producao_tecnicos_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
    toast.success('PDF gerado com sucesso!');
  };

  return (
    <div className="space-y-6">
      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Filter className="w-4 h-4" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
            <div>
              <Label className="text-xs">Data Início</Label>
              <Input type="date" value={filtroDataInicio} onChange={e => setFiltroDataInicio(e.target.value)} className="h-9" />
            </div>
            <div>
              <Label className="text-xs">Data Fim</Label>
              <Input type="date" value={filtroDataFim} onChange={e => setFiltroDataFim(e.target.value)} className="h-9" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Técnico</Label>
              {modoPessoal ? (
                <div className="h-10 px-3 flex items-center rounded-md border bg-slate-50 text-sm font-medium text-slate-700">
                  {nomeTecnicoUsuario || 'Você'}
                </div>
              ) : (
                <Select value={filtroTecnico} onValueChange={setFiltroTecnico}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos os técnicos</SelectItem>
                    {listaTecnicos.map(nome => (
                      <SelectItem key={nome} value={nome}>{nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            <div>
              <Label className="text-xs">Produto/Serviço</Label>
              <Input
                placeholder="Buscar por nome do serviço..."
                value={filtroProduto}
                onChange={e => setFiltroProduto(e.target.value)}
                className="h-10"
              />
            </div>
          </div>
          {(filtroTecnico !== 'todos' || filtroProduto) && (
            <div className="flex gap-2 flex-wrap">
              {!modoPessoal && filtroTecnico !== 'todos' && (
                <Badge variant="outline" className="gap-1">
                  Técnico: {filtroTecnico}
                  <button onClick={() => setFiltroTecnico('todos')} className="ml-1 hover:text-red-600">×</button>
                </Badge>
              )}
              {filtroProduto && (
                <Badge variant="outline" className="gap-1">
                  Serviço: {filtroProduto}
                  <button onClick={() => setFiltroProduto('')} className="ml-1 hover:text-red-600">×</button>
                </Badge>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Checkbox
            id="incluir-detalhes"
            checked={incluirDetalhes}
            onCheckedChange={setIncluirDetalhes}
          />
          <Label htmlFor="incluir-detalhes" className="text-sm cursor-pointer">
            Incluir detalhes dos serviços nos relatórios (Excel/PDF)
          </Label>
        </div>
        {isAdmin && (
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={exportarExcel}>
            <FileSpreadsheet className="w-4 h-4 mr-2" />Excel / CSV
          </Button>
          <Button variant="outline" size="sm" onClick={exportarPDF}>
            <FileDown className="w-4 h-4 mr-2" />PDF
          </Button>
        </div>
        )}
      </div>
      {isAdmin && totalImpostos > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-700">
          Impostos configurados: <strong>{totalImpostos}%</strong> já descontados do valor líquido.
        </div>
      )}

      {podeEditarTecnicos && semTecnicoConcluidos.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-800">
          ⚠️ <strong>{semTecnicoConcluidos.length} atendimento(s) CONCLUÍDOS sem técnico atribuído</strong> — R$ {valorSemTecnicoConcluido.toLocaleString('pt-BR', {minimumFractionDigits:2})} não estão sendo contabilizados na produção. Acesse esses atendimentos e atribua o técnico responsável para que o valor apareça aqui.
          {totalSemTecnico.length > semTecnicoConcluidos.length && (
            <span className="block mt-1 text-red-600">+ {totalSemTecnico.length - semTecnicoConcluidos.length} atendimento(s) em aberto também sem técnico (R$ {(valorSemTecnico - valorSemTecnicoConcluido).toLocaleString('pt-BR', {minimumFractionDigits:2})}).</span>
          )}
        </div>
      )}
      {isAdmin && (
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card><CardContent className="pt-5"><p className="text-sm text-slate-500">Técnicos no período</p><p className="text-3xl font-bold text-blue-600 mt-1">{dadosTecnicos.length}</p></CardContent></Card>
        <Card><CardContent className="pt-5"><p className="text-sm text-slate-500">Total Produção Bruta</p><p className="text-2xl font-bold text-green-600 mt-1">R$ {totalBruto.toFixed(2)}</p></CardContent></Card>
        <Card><CardContent className="pt-5"><p className="text-sm text-slate-500">Total Líquido (c/ impostos)</p><p className="text-2xl font-bold text-emerald-600 mt-1">R$ {totalLiquido.toFixed(2)}</p></CardContent></Card>
        <Card><CardContent className="pt-5"><p className="text-sm text-slate-500">Média por Técnico</p><p className="text-2xl font-bold text-orange-600 mt-1">R$ {dadosTecnicos.length > 0 ? (totalBruto / dadosTecnicos.length).toFixed(2) : '0.00'}</p></CardContent></Card>
      </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="w-5 h-5 text-orange-500" />
            Produção por Técnico — Valor Líquido
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {dadosTecnicos.map((tecnico, i) => {
              const pct = totalLiquido > 0 ? (tecnico.valorLiquidoTotal / totalLiquido) * 100 : 0;
              const colors = ['bg-orange-500', 'bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-pink-500', 'bg-teal-500'];
              const color = colors[i % colors.length];
              return (
                <div key={tecnico.nome} className="border border-slate-100 rounded-xl p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 ${color} rounded-full flex items-center justify-center text-white font-bold text-sm`}>
                        {i + 1}
                      </div>
                      <div>
                        <h3 className="font-semibold text-slate-800">{tecnico.nome}</h3>
                        <div className="flex gap-3 text-xs text-slate-500 mt-0.5">
                          <span>{tecnico.qtdAtendimentos} atendimento{tecnico.qtdAtendimentos !== 1 ? 's' : ''}</span>
                          <span className="text-green-600">{tecnico.atendimentosConcluidos} concluídos</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-slate-800">R$ {tecnico.valorLiquidoTotal.toFixed(2)}</p>
                      <p className="text-xs text-slate-400">Bruto: R$ {tecnico.valorBrutoTotal.toFixed(2)}</p>
                    </div>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2">
                    <div className={`${color} h-2 rounded-full transition-all`} style={{ width: `${pct}%` }} />
                  </div>
                  <p className="text-xs text-slate-400 mt-1">{pct.toFixed(1)}% da produção total do período</p>
                  
                  {/* Botão Ver Detalhes */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setTecnicoExpandido(tecnicoExpandido === tecnico.nome ? null : tecnico.nome)}
                    className="w-full mt-3 h-8 text-xs"
                  >
                    {tecnicoExpandido === tecnico.nome ? (
                      <><ChevronUp className="w-3 h-3 mr-1" />Ocultar detalhes</>
                    ) : (
                      <><Eye className="w-3 h-3 mr-1" />Ver detalhes dos serviços ({tecnico.servicos?.length || 0})</>
                    )}
                  </Button>

                  {/* Detalhes expandidos */}
                  {tecnicoExpandido === tecnico.nome && tecnico.servicos && tecnico.servicos.length > 0 && (
                    <div className="mt-3 space-y-2 border-t pt-3">
                      <p className="text-xs font-semibold text-slate-700 mb-2">Serviços realizados:</p>
                      {tecnico.servicos.map((srv, idx) => (
                        <div key={idx} className="bg-slate-50 rounded-lg p-3 text-xs space-y-1">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1">
                              <p className="font-semibold text-slate-800">
                                OS #{srv.numeroOS} - {srv.placa}
                              </p>
                              <p className="text-slate-600">{srv.cliente}</p>
                              <p className="text-slate-500 mt-1">
                                <span className="font-medium text-slate-700">{srv.servico}</span>
                                {srv.quantidade > 1 && <span className="text-slate-400"> x{srv.quantidade}</span>}
                              </p>
                              {srv.compartilhadoCom && (
                                <p className="text-blue-600 mt-1">
                                  Compartilhado com: {srv.compartilhadoCom}
                                </p>
                              )}
                              {srv.data && (
                                <p className="text-slate-400 mt-1">
                                  {(() => {
                                    try {
                                      return format(new Date(srv.data), 'dd/MM/yyyy');
                                    } catch {
                                      return '';
                                    }
                                  })()}
                                </p>
                              )}
                            </div>
                            <div className="text-right">
                              <p className="font-bold text-green-700">R$ {(srv.valorTecnico || 0).toFixed(2)}</p>
                              {srv.valorTotal !== srv.valorTecnico && srv.valorTotal != null && (
                                <p className="text-xs text-slate-400">
                                  Total: R$ {(srv.valorTotal || 0).toFixed(2)}
                                </p>
                              )}
                            </div>
                          </div>
                          {podeEditarTecnicos && srv.itemSource && (() => {
                            const srvKey = `${srv.atendimentoId}-${srv.itemSource}-${srv.itemIndex}-${srv.tecnicoId}`;
                            return (
                              <div className="mt-2 pt-2 border-t border-slate-200 flex items-center gap-2 flex-wrap">
                                <span className="text-xs text-slate-600 font-medium">Técnico: {srv.tecnicoNome}</span>
                                <Select onValueChange={(nome) => atualizarTecnicoItem(srv, nome)} disabled={editandoKey === srvKey}>
                                  <SelectTrigger className="h-7 text-xs w-44 gap-1">
                                    <ArrowRightLeft className="w-3 h-3" />
                                    <span className="text-slate-400">Transferir para...</span>
                                  </SelectTrigger>
                                  <SelectContent>
                                    {Object.keys(tecnicosComId).filter(n => n !== srv.tecnicoNome).map(nome => (
                                      <SelectItem key={nome} value={nome}>{nome}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <Button size="sm" variant="ghost" className="h-7 px-2 text-xs text-red-600 hover:text-red-700 hover:bg-red-50" disabled={editandoKey === srvKey} onClick={() => atualizarTecnicoItem(srv, '__remover__')}>
                                  <Trash2 className="w-3 h-3" /> Remover
                                </Button>
                                {editandoKey === srvKey && <Loader2 className="w-3 h-3 animate-spin text-orange-500" />}
                              </div>
                            );
                          })()}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}