import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, Award, FileSpreadsheet, FileDown, Filter, ChevronDown, ChevronUp, Eye } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from "sonner";
import jsPDF from 'jspdf';
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";

export default function RelatorioTecnicos({ atendimentos = [], config = {}, labelPeriodo = '' }) {
  const [filtroTecnico, setFiltroTecnico] = useState('todos');
  const [filtroProduto, setFiltroProduto] = useState('');
  const [filtroDataInicio, setFiltroDataInicio] = useState('');
  const [filtroDataFim, setFiltroDataFim] = useState('');
  const [tecnicoExpandido, setTecnicoExpandido] = useState(null);
  const [incluirDetalhes, setIncluirDetalhes] = useState(false);
  
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
    if (!filtroDataInicio && !filtroDataFim) return atendimentos;
    return atendimentos.filter(a => {
      const dataAtendimento = new Date(a.data_entrada || a.created_date);
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
  }, [atendimentos, filtroDataInicio, filtroDataFim]);

  const dadosTecnicos = useMemo(() => {
    const tecnicos = {};
    const atendimentosFiltrados = atendimentosFiltradosPorData.filter(a => {
      if (filtroProduto) {
        const todosItens = [...(a.itens_queixa || []), ...(a.itens_orcamento || [])];
        const temProduto = todosItens.some(item => 
          item.nome?.toLowerCase().includes(filtroProduto.toLowerCase())
        );
        if (!temProduto) return false;
      }
      return true;
    });

    atendimentosFiltrados.forEach(a => {
      // Usar tecnicos_responsaveis (novo) ou fallback para campo tecnico (legado)
      const listaTecnicos = a.tecnicos_responsaveis?.length > 0
        ? a.tecnicos_responsaveis
        : (a.tecnico ? a.tecnico.split(',').map(t => ({ nome: t.trim() })).filter(t => t.nome) : []);

      if (listaTecnicos.length === 0) return;

      // Buscar itens aprovados com técnico atribuído
      const itensQueixa = (a.itens_queixa || []).filter(i => i.status_aprovacao === 'aprovado');
      const itensOrcamento = (a.itens_orcamento || []).filter(i => i.status_aprovacao === 'aprovado');
      const todosItens = [...itensQueixa, ...itensOrcamento];

      // Calcular taxas de pagamento
      let taxaPagamento = 0;
      const valorBrutoTotal = todosItens.reduce((s, i) => s + (i.valor_total || 0), 0) || a.valor_final || a.subtotal || 0;
      if (a.formas_pagamento_lancamento?.length > 0) {
        let totalComTaxa = 0;
        a.formas_pagamento_lancamento.forEach(fp => {
          const taxa = taxasMap[fp.forma] || 0;
          totalComTaxa += (fp.valor || 0) * (taxa / 100);
        });
        taxaPagamento = valorBrutoTotal > 0 ? (totalComTaxa / valorBrutoTotal) * 100 : 0;
      }

      // Agrupar serviços por técnico COM DETALHAMENTO
      const servicosPorTecnico = {};
      todosItens.forEach(item => {
        const tecnicosItem = item.tecnicos?.length > 0 ? item.tecnicos : null;
        
        if (tecnicosItem && tecnicosItem.length > 0) {
          // Dividir valor entre técnicos atribuídos
          const valorPorTecnico = (item.valor_total || 0) / tecnicosItem.length;
          tecnicosItem.forEach(tec => {
            if (!servicosPorTecnico[tec.id]) {
              servicosPorTecnico[tec.id] = { nome: tec.nome, valorBruto: 0, servicos: [] };
            }
            servicosPorTecnico[tec.id].valorBruto += valorPorTecnico;
            servicosPorTecnico[tec.id].servicos.push({
              atendimentoId: a.id,
              numeroOS: a.numero_os,
              placa: a.placa,
              cliente: a.cliente_nome,
              servico: item.nome,
              quantidade: item.quantidade || 1,
              valorTotal: item.valor_total || 0,
              valorTecnico: valorPorTecnico,
              compartilhadoCom: tecnicosItem.length > 1 ? tecnicosItem.filter(t => t.id !== tec.id).map(t => t.nome).join(', ') : null,
              data: a.data_entrada || a.created_date,
            });
          });
        } else {
          // Sem técnico atribuído (geral)
          if (!servicosPorTecnico['geral']) {
            servicosPorTecnico['geral'] = { nome: 'Geral', valorBruto: 0, servicos: [] };
          }
          servicosPorTecnico['geral'].valorBruto += item.valor_total || 0;
          servicosPorTecnico['geral'].servicos.push({
            atendimentoId: a.id,
            numeroOS: a.numero_os,
            placa: a.placa,
            cliente: a.cliente_nome,
            servico: item.nome,
            quantidade: item.quantidade || 1,
            valorTotal: item.valor_total || 0,
            valorTecnico: item.valor_total || 0,
            compartilhadoCom: null,
            data: a.data_entrada || a.created_date,
          });
        }
      });

      // Se não há distribuição por item, dividir igualmente entre técnicos responsáveis
      if (Object.keys(servicosPorTecnico).length === 0 || servicosPorTecnico['geral']) {
        const valorPorTecnico = valorBrutoTotal / listaTecnicos.length;
        listaTecnicos.forEach(t => {
          const nome = t.nome;
          const valorBruto = valorPorTecnico;
          const valorAposImpostos = valorBruto * (1 - totalImpostos / 100);
          const valorLiquido = valorAposImpostos * (1 - taxaPagamento / 100);

          if (!tecnicos[nome]) {
            tecnicos[nome] = { nome, qtdAtendimentos: 0, valorBrutoTotal: 0, valorLiquidoTotal: 0, atendimentosConcluidos: 0, servicos: [] };
          }
          tecnicos[nome].qtdAtendimentos++;
          tecnicos[nome].valorBrutoTotal += valorBruto;
          tecnicos[nome].valorLiquidoTotal += valorLiquido;
          if (a.status === 'concluido') tecnicos[nome].atendimentosConcluidos++;
          
          // Adicionar registro de serviço genérico
          tecnicos[nome].servicos.push({
            atendimentoId: a.id,
            numeroOS: a.numero_os,
            placa: a.placa,
            cliente: a.cliente_nome,
            servico: 'Atendimento geral',
            valorTecnico: valorPorTecnico,
            data: a.data_entrada || a.created_date,
          });
        });
      } else {
        // Distribuir conforme atribuição dos serviços COM DETALHAMENTO
        Object.entries(servicosPorTecnico).forEach(([tecnicoId, dados]) => {
          const nome = dados.nome;
          const valorBruto = dados.valorBruto;
          const valorAposImpostos = valorBruto * (1 - totalImpostos / 100);
          const valorLiquido = valorAposImpostos * (1 - taxaPagamento / 100);

          if (!tecnicos[nome]) {
            tecnicos[nome] = { nome, qtdAtendimentos: 0, valorBrutoTotal: 0, valorLiquidoTotal: 0, atendimentosConcluidos: 0, servicos: [] };
          }
          tecnicos[nome].qtdAtendimentos++;
          tecnicos[nome].valorBrutoTotal += valorBruto;
          tecnicos[nome].valorLiquidoTotal += valorLiquido;
          if (a.status === 'concluido') tecnicos[nome].atendimentosConcluidos++;
          
          // Adicionar serviços detalhados
          tecnicos[nome].servicos.push(...dados.servicos);
        });
      }
    });

    const todosTecnicos = Object.values(tecnicos).sort((a, b) => b.valorLiquidoTotal - a.valorLiquidoTotal);
    
    // Aplicar filtro de técnico
    if (filtroTecnico !== 'todos') {
      return todosTecnicos.filter(t => t.nome === filtroTecnico);
    }
    
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
          <p className="text-slate-500">Nenhum atendimento com técnico atribuído no período</p>
          <p className="text-sm text-slate-400 mt-1">Atribua técnicos nos atendimentos para ver a produção</p>
        </CardContent>
      </Card>
    );
  }

  const totalLiquido = dadosTecnicos.reduce((sum, t) => sum + t.valorLiquidoTotal, 0);

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
              {filtroTecnico !== 'todos' && (
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
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={exportarExcel}>
            <FileSpreadsheet className="w-4 h-4 mr-2" />Excel / CSV
          </Button>
          <Button variant="outline" size="sm" onClick={exportarPDF}>
            <FileDown className="w-4 h-4 mr-2" />PDF
          </Button>
        </div>
      </div>
      {totalImpostos > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-700">
          Impostos configurados: <strong>{totalImpostos}%</strong> já descontados do valor líquido.
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card><CardContent className="pt-5"><p className="text-sm text-slate-500">Técnicos no período</p><p className="text-3xl font-bold text-blue-600 mt-1">{dadosTecnicos.length}</p></CardContent></Card>
        <Card><CardContent className="pt-5"><p className="text-sm text-slate-500">Total Produção Líquida</p><p className="text-2xl font-bold text-green-600 mt-1">R$ {totalLiquido.toFixed(2)}</p></CardContent></Card>
        <Card><CardContent className="pt-5"><p className="text-sm text-slate-500">Média por Técnico</p><p className="text-2xl font-bold text-orange-600 mt-1">R$ {dadosTecnicos.length > 0 ? (totalLiquido / dadosTecnicos.length).toFixed(2) : '0.00'}</p></CardContent></Card>
      </div>

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