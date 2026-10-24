import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Undo2, Percent, ArrowRightLeft, DollarSign, FileSpreadsheet, FileDown, Users } from 'lucide-react';
import { format } from 'date-fns';
import jsPDF from 'jspdf';
import { toast } from 'sonner';
import RelatorioRetornosTabela from './RelatorioRetornosTabela';
import LogTransferenciasProducao from './LogTransferenciasProducao';
import { garantiasDoRetorno, tecnicosDaGarantia, valorGarantia } from '@/lib/retornoProducao';

export default function RelatorioRetornos({ atendimentos = [], labelPeriodo = '' }) {
  const hoje = new Date();
  const primeiroDiaMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1).toISOString().slice(0, 10);
  const [dataInicio, setDataInicio] = useState(primeiroDiaMes);
  const [dataFim, setDataFim] = useState(hoje.toISOString().slice(0, 10));
  const [tecnicoFiltro, setTecnicoFiltro] = useState('todos');
  const [busca, setBusca] = useState('');

  const { data: transferencias = [] } = useQuery({
    queryKey: ['transferencias-producao'],
    queryFn: () => base44.entities.TransferenciaProducao.list('-created_date', 3000),
    staleTime: 2 * 60 * 1000,
  });

  const dentroPeriodo = (valor) => {
    if (!valor) return false;
    const data = new Date(valor);
    if (dataInicio && data < new Date(`${dataInicio}T00:00:00`)) return false;
    if (dataFim && data > new Date(`${dataFim}T23:59:59`)) return false;
    return true;
  };

  const atendimentosPorId = useMemo(() => {
    const mapa = {};
    (atendimentos || []).forEach((a) => { mapa[a.id] = a; });
    return mapa;
  }, [atendimentos]);

  const transferenciasPorAtendimento = useMemo(() => {
    const mapa = {};
    (transferencias || []).forEach((t) => {
      if (!t?.atendimento_id) return;
      if (!mapa[t.atendimento_id]) mapa[t.atendimento_id] = [];
      mapa[t.atendimento_id].push(t);
    });
    return mapa;
  }, [transferencias]);

  const linhas = useMemo(() => {
    return (atendimentos || [])
      .filter((a) => a.retorno_servico && dentroPeriodo(a.data_entrada || a.created_date))
      .map((a) => {
        const origem = a.atendimento_origem_id ? atendimentosPorId[a.atendimento_origem_id] : null;
        const garantias = garantiasDoRetorno(a, origem);
        const valor = garantias.reduce((s, g) => s + valorGarantia(g), 0);
        const tecnicosOrigem = Array.from(
          new Set(garantias.flatMap((g) => tecnicosDaGarantia(g, origem).map((t) => t.nome))),
        );
        const transf = transferenciasPorAtendimento[a.id] || [];
        const tecnicosDestino = Array.from(new Set(transf.map((t) => t.tecnico_destino_nome).filter(Boolean)));
        return {
          atendimento: a,
          origem,
          garantias,
          valor,
          tecnicosOrigem,
          transferencias: transf,
          tecnicosDestino,
          transferido: transf.reduce((s, t) => s + (Number(t.valor) || 0), 0),
        };
      })
      .sort((x, y) => new Date(y.atendimento.data_entrada || y.atendimento.created_date) - new Date(x.atendimento.data_entrada || x.atendimento.created_date));
  }, [atendimentos, atendimentosPorId, transferenciasPorAtendimento, dataInicio, dataFim]);

  const opcoesTecnicos = useMemo(() => {
    const nomes = new Set();
    linhas.forEach((l) => {
      l.tecnicosOrigem.forEach((n) => nomes.add(n));
      l.tecnicosDestino.forEach((n) => nomes.add(n));
    });
    return Array.from(nomes).sort();
  }, [linhas]);

  const linhasFiltradas = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return linhas.filter((l) => {
      if (tecnicoFiltro !== 'todos' && !l.tecnicosOrigem.includes(tecnicoFiltro) && !l.tecnicosDestino.includes(tecnicoFiltro)) return false;
      if (!termo) return true;
      return String(l.atendimento.numero_os || '').includes(termo)
        || String(l.atendimento.atendimento_origem_numero || '').includes(termo)
        || String(l.atendimento.cliente_nome || '').toLowerCase().includes(termo)
        || String(l.atendimento.placa || '').toLowerCase().includes(termo);
    });
  }, [linhas, tecnicoFiltro, busca]);

  const transferenciasFiltradas = useMemo(() => {
    const ids = new Set(linhasFiltradas.map((l) => l.atendimento.id));
    return (transferencias || [])
      .filter((t) => ids.has(t.atendimento_id) && dentroPeriodo(t.data_transferencia))
      .sort((x, y) => new Date(y.data_transferencia) - new Date(x.data_transferencia));
  }, [transferencias, linhasFiltradas, dataInicio, dataFim]);

  const desempenho = useMemo(() => {
    const mapa = {};
    const obter = (nome) => {
      if (!mapa[nome]) mapa[nome] = { nome, retornosOrigem: 0, valorPerdido: 0, retornosRefeitos: 0, valorRecebido: 0 };
      return mapa[nome];
    };
    linhasFiltradas.forEach((l) => {
      const qtdOrigem = l.tecnicosOrigem.length || 1;
      l.tecnicosOrigem.forEach((nome) => {
        const t = obter(nome);
        t.retornosOrigem += 1;
        t.valorPerdido += l.valor / qtdOrigem;
      });
      l.tecnicosDestino.forEach((nome) => { obter(nome).retornosRefeitos += 1; });
      l.transferencias.forEach((tr) => {
        if (!tr.tecnico_destino_nome) return;
        obter(tr.tecnico_destino_nome).valorRecebido += Number(tr.valor) || 0;
      });
    });
    return Object.values(mapa).sort((a, b) => b.valorPerdido - a.valorPerdido);
  }, [linhasFiltradas]);

  const totalRetornos = linhasFiltradas.length;
  const valorGarantiaTotal = linhasFiltradas.reduce((s, l) => s + l.valor, 0);
  const valorTransferidoTotal = linhasFiltradas.reduce((s, l) => s + l.transferido, 0);
  const totalOsPeriodo = (atendimentos || []).filter((a) => !a.retorno_servico && dentroPeriodo(a.data_entrada || a.created_date)).length;
  const taxaRetorno = totalOsPeriodo > 0 ? (totalRetornos / totalOsPeriodo) * 100 : 0;

  const exportarCSV = () => {
    const linhasCsv = [
      'OS Retorno;Data;OS Origem;Cliente;Placa;Servicos em Garantia;Valor;Tecnicos Origem;Tecnicos que Refez;Valor Transferido',
    ];
    linhasFiltradas.forEach((l) => {
      linhasCsv.push([
        l.atendimento.numero_os || '',
        format(new Date(l.atendimento.data_entrada || l.atendimento.created_date), 'dd/MM/yyyy'),
        l.atendimento.atendimento_origem_numero || '',
        l.atendimento.cliente_nome || '',
        l.atendimento.placa || '',
        l.garantias.map((g) => g.nome).join(' | '),
        l.valor.toFixed(2),
        l.tecnicosOrigem.join(' | '),
        l.tecnicosDestino.join(' | '),
        l.transferido.toFixed(2),
      ].join(';'));
    });
    if (transferenciasFiltradas.length > 0) {
      linhasCsv.push('');
      linhasCsv.push('LOG DE TRANSFERENCIAS');
      linhasCsv.push('Data;OS Retorno;OS Origem;Servico;Tecnico Origem;Tecnico Destino;Valor;Usuario');
      transferenciasFiltradas.forEach((t) => {
        linhasCsv.push([
          t.data_transferencia ? format(new Date(t.data_transferencia), 'dd/MM/yyyy HH:mm') : '',
          t.numero_os || '',
          t.atendimento_origem_numero || '',
          t.servico_nome || '',
          t.tecnico_origem_nome || '',
          t.tecnico_destino_nome || '',
          (Number(t.valor) || 0).toFixed(2),
          t.usuario_nome || '',
        ].join(';'));
      });
    }
    const blob = new Blob(['\ufeff' + linhasCsv.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `relatorio_retornos_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
    toast.success('Exportado com sucesso!');
  };

  const exportarPDF = () => {
    const doc = new jsPDF({ orientation: 'landscape' });
    doc.setFontSize(16);
    doc.text('Relatorio de Retornos de Servico', 14, 18);
    doc.setFontSize(9);
    doc.text(
      `Periodo: ${dataInicio ? format(new Date(`${dataInicio}T00:00:00`), 'dd/MM/yyyy') : '-'} a ${dataFim ? format(new Date(`${dataFim}T00:00:00`), 'dd/MM/yyyy') : '-'}  |  Gerado em: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`,
      14,
      26,
    );
    doc.text(
      `Retornos: ${totalRetornos}  |  Valor em garantia: R$ ${valorGarantiaTotal.toFixed(2)}  |  Valor transferido: R$ ${valorTransferidoTotal.toFixed(2)}  |  Taxa de retorno: ${taxaRetorno.toFixed(1)}%`,
      14,
      32,
    );

    const headers = ['OS Ret.', 'Data', 'OS Orig.', 'Cliente', 'Placa', 'Valor', 'Tec. Origem', 'Tec. que Refez'];
    const colW = [20, 20, 20, 50, 22, 24, 45, 45];
    let y = 40;
    const totalW = colW.reduce((s, w) => s + w, 0);
    doc.setFillColor(220, 38, 38);
    doc.rect(14, y, totalW, 7, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8);
    let x = 14;
    headers.forEach((h, i) => { doc.text(h, x + 1, y + 5); x += colW[i]; });
    doc.setTextColor(0, 0, 0);
    y += 9;

    linhasFiltradas.forEach((l, idx) => {
      if (y > 190) { doc.addPage(); y = 14; }
      if (idx % 2 === 0) { doc.setFillColor(254, 242, 242); doc.rect(14, y - 1, totalW, 7, 'F'); }
      const row = [
        String(l.atendimento.numero_os || ''),
        format(new Date(l.atendimento.data_entrada || l.atendimento.created_date), 'dd/MM/yy'),
        String(l.atendimento.atendimento_origem_numero || ''),
        (l.atendimento.cliente_nome || '-').substring(0, 26),
        l.atendimento.placa || '-',
        `R$ ${l.valor.toFixed(2)}`,
        (l.tecnicosOrigem.join(', ') || '-').substring(0, 26),
        (l.tecnicosDestino.join(', ') || 'nao transferido').substring(0, 26),
      ];
      x = 14;
      row.forEach((v, i) => { doc.text(String(v), x + 1, y + 4); x += colW[i]; });
      y += 7;
    });

    doc.save(`relatorio_retornos_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
    toast.success('PDF gerado com sucesso!');
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="w-4 h-4" />
            Filtros do Relatório de Retornos
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Data Início</Label>
              <Input type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} className="h-9" />
            </div>
            <div>
              <Label className="text-xs">Data Fim</Label>
              <Input type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} className="h-9" />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Técnico (origem ou destino)</Label>
              <Select value={tecnicoFiltro} onValueChange={setTecnicoFiltro}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os técnicos</SelectItem>
                  {opcoesTecnicos.map((nome) => (
                    <SelectItem key={nome} value={nome}>{nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Buscar</Label>
              <Input
                placeholder="OS, OS origem, cliente ou placa..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="h-9"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <Button variant="outline" size="sm" onClick={exportarCSV}>
          <FileSpreadsheet className="w-4 h-4 mr-2" />Excel / CSV
        </Button>
        <Button variant="outline" size="sm" onClick={exportarPDF}>
          <FileDown className="w-4 h-4 mr-2" />PDF
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-5">
            <p className="text-sm text-slate-500 flex items-center gap-1"><Undo2 className="w-4 h-4 text-red-500" /> Retornos</p>
            <p className="text-3xl font-bold text-red-600 mt-1">{totalRetornos}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <p className="text-sm text-slate-500 flex items-center gap-1"><DollarSign className="w-4 h-4 text-orange-500" /> Valor em Garantia</p>
            <p className="text-2xl font-bold text-orange-600 mt-1">R$ {valorGarantiaTotal.toFixed(2)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <p className="text-sm text-slate-500 flex items-center gap-1"><ArrowRightLeft className="w-4 h-4 text-blue-500" /> Produção Transferida</p>
            <p className="text-2xl font-bold text-blue-600 mt-1">R$ {valorTransferidoTotal.toFixed(2)}</p>
            <p className="text-xs text-slate-400 mt-1">{transferenciasFiltradas.length} transferência(s)</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <p className="text-sm text-slate-500 flex items-center gap-1"><Percent className="w-4 h-4 text-purple-500" /> Taxa de Retorno</p>
            <p className="text-3xl font-bold text-purple-600 mt-1">{taxaRetorno.toFixed(1)}%</p>
            <p className="text-xs text-slate-400 mt-1">{totalOsPeriodo} OS não-retorno no período</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-orange-500" />
            Desempenho por Técnico — Retornos
          </CardTitle>
        </CardHeader>
        <CardContent>
          {desempenho.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-500">Sem dados de retorno para o período.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200">
                    {['Técnico', 'Retornos na Origem', 'Valor Perdido', 'Retornos Refeitos', 'Valor Recebido'].map((h) => (
                      <th key={h} className="text-left p-3 text-sm font-semibold text-slate-600 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {desempenho.map((t) => (
                    <tr key={t.nome} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="p-3 text-sm font-medium text-slate-800">{t.nome}</td>
                      <td className="p-3 text-sm text-center">{t.retornosOrigem}</td>
                      <td className="p-3 text-sm text-right font-semibold text-red-600">
                        {t.valorPerdido > 0 ? `- R$ ${t.valorPerdido.toFixed(2)}` : 'R$ 0,00'}
                      </td>
                      <td className="p-3 text-sm text-center">{t.retornosRefeitos}</td>
                      <td className="p-3 text-sm text-right font-semibold text-green-600">
                        {t.valorRecebido > 0 ? `+ R$ ${t.valorRecebido.toFixed(2)}` : 'R$ 0,00'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <RelatorioRetornosTabela linhas={linhasFiltradas} />

      <LogTransferenciasProducao transferencias={transferenciasFiltradas} />
    </div>
  );
}