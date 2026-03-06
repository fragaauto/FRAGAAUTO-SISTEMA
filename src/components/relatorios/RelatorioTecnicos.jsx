import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, Award, FileSpreadsheet, FileDown } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from "sonner";
import jsPDF from 'jspdf';

export default function RelatorioTecnicos({ atendimentos = [], config = {}, labelPeriodo = '' }) {
  const taxasMap = useMemo(() => {
    const map = {};
    (config.taxas_pagamento || []).forEach(t => { map[t.forma] = t.taxa_percentual || 0; });
    return map;
  }, [config]);

  const totalImpostos = useMemo(() => {
    return (config.impostos || []).filter(i => i.ativo).reduce((sum, i) => sum + (i.percentual || 0), 0);
  }, [config]);

  const dadosTecnicos = useMemo(() => {
    const tecnicos = {};

    atendimentos.forEach(a => {
      if (!a.tecnico) return;
      
      // Suporte a múltiplos técnicos (separados por vírgula)
      const listaTecnicos = a.tecnico.split(',').map(t => t.trim()).filter(Boolean);
      const numTecnicos = listaTecnicos.length || 1;

      const valorBruto = a.valor_final || a.subtotal || 0;

      // Calcula taxa de pagamento (média ou pela forma principal)
      let taxaPagamento = 0;
      if (a.formas_pagamento?.length > 0) {
        let totalComTaxa = 0;
        a.formas_pagamento.forEach(fp => {
          const taxa = taxasMap[fp.forma] || 0;
          totalComTaxa += (fp.valor || 0) * (taxa / 100);
        });
        taxaPagamento = valorBruto > 0 ? (totalComTaxa / valorBruto) * 100 : 0;
      }

      const valorAposImpostos = valorBruto * (1 - totalImpostos / 100);
      const valorLiquido = valorAposImpostos * (1 - taxaPagamento / 100);
      const valorPorTecnico = valorLiquido / numTecnicos;

      listaTecnicos.forEach(nomeTecnico => {
        if (!tecnicos[nomeTecnico]) {
          tecnicos[nomeTecnico] = { nome: nomeTecnico, qtdAtendimentos: 0, valorBrutoTotal: 0, valorLiquidoTotal: 0, atendimentosConcluidos: 0 };
        }
        tecnicos[nomeTecnico].qtdAtendimentos++;
        tecnicos[nomeTecnico].valorBrutoTotal += valorBruto / numTecnicos;
        tecnicos[nomeTecnico].valorLiquidoTotal += valorPorTecnico;
        if (a.status === 'concluido') tecnicos[nomeTecnico].atendimentosConcluidos++;
      });
    });

    return Object.values(tecnicos).sort((a, b) => b.valorLiquidoTotal - a.valorLiquidoTotal);
  }, [atendimentos, taxasMap, totalImpostos]);

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
    });
    const blob = new Blob(['\ufeff' + linhas.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = `producao_tecnicos_${format(new Date(), 'yyyy-MM-dd')}.csv`; link.click();
    toast.success('Exportado com sucesso!');
  };

  const exportarPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(16); doc.text('Produção por Técnico', 14, 18);
    doc.setFontSize(10); doc.text(`Período: ${labelPeriodo}  |  Gerado em: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, 14, 26);
    if (totalImpostos > 0) doc.text(`Impostos descontados: ${totalImpostos}%`, 14, 33);
    doc.autoTable({
      startY: totalImpostos > 0 ? 39 : 32,
      head: [['Técnico', 'Atendimentos', 'Concluídos', 'Valor Bruto', 'Valor Líquido']],
      body: dadosTecnicos.map(t => [t.nome, t.qtdAtendimentos, t.atendimentosConcluidos, `R$ ${t.valorBrutoTotal.toFixed(2)}`, `R$ ${t.valorLiquidoTotal.toFixed(2)}`]),
      styles: { fontSize: 9 }, headStyles: { fillColor: [249, 115, 22] },
    });
    doc.save(`producao_tecnicos_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
    toast.success('PDF gerado com sucesso!');
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-end gap-2">
        <Button variant="outline" size="sm" onClick={exportarExcel}><FileSpreadsheet className="w-4 h-4 mr-2" />Excel / CSV</Button>
        <Button variant="outline" size="sm" onClick={exportarPDF}><FileDown className="w-4 h-4 mr-2" />PDF</Button>
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
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}