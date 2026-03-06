import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TrendingUp, TrendingDown, Award, FileSpreadsheet, FileDown } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from "sonner";
import jsPDF from 'jspdf';
import 'jspdf-autotable';

export default function RelatorioRanking({ ranking = [], labelPeriodo = '' }) {
  const maisVendidos = [...ranking].sort((a, b) => b.qtd_aprovado - a.qtd_aprovado).slice(0, 15);
  const menosVendidos = [...ranking].filter(r => r.qtd_total > 0).sort((a, b) => a.qtd_aprovado - b.qtd_aprovado).slice(0, 10);
  const maiorValor = [...ranking].sort((a, b) => b.valor_total - a.valor_total).slice(0, 10);

  const BarItem = ({ item, max, index }) => {
    const pct = max > 0 ? (item.qtd_aprovado / max) * 100 : 0;
    const colors = ['bg-orange-500', 'bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-pink-500'];
    const color = colors[index % colors.length];
    return (
      <div className="flex items-center gap-3 py-2 border-b border-slate-100 last:border-0">
        <span className="w-6 text-center text-sm font-bold text-slate-400">#{index + 1}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-medium text-slate-700 truncate">{item.nome}</span>
            <span className="text-sm font-bold text-slate-800 ml-2">{item.qtd_aprovado}x</span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-2">
            <div className={`${color} h-2 rounded-full transition-all`} style={{ width: `${pct}%` }} />
          </div>
          <div className="flex gap-3 mt-0.5 text-xs text-slate-500">
            <span className="text-green-600">{item.qtd_aprovado} aprovados</span>
            <span className="text-red-500">{item.qtd_reprovado} reprovados</span>
            <span className="text-slate-400">R$ {item.valor_total.toFixed(0)}</span>
          </div>
        </div>
      </div>
    );
  };

  const exportarExcel = () => {
    const linhas = ['Serviço/Produto;Qtd Aprovado;Qtd Reprovado;Qtd Total;Valor Total;Taxa Aprovação'];
    [...ranking].sort((a, b) => b.qtd_aprovado - a.qtd_aprovado).forEach(item => {
      const taxa = item.qtd_total > 0 ? ((item.qtd_aprovado / item.qtd_total) * 100).toFixed(0) : 0;
      linhas.push([item.nome, item.qtd_aprovado, item.qtd_reprovado, item.qtd_total, item.valor_total.toFixed(2), `${taxa}%`].join(';'));
    });
    const blob = new Blob(['\ufeff' + linhas.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = `ranking_servicos_${format(new Date(), 'yyyy-MM-dd')}.csv`; link.click();
    toast.success('Exportado com sucesso!');
  };

  const exportarPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(16); doc.text('Ranking de Serviços', 14, 18);
    doc.setFontSize(10); doc.text(`Período: ${labelPeriodo}  |  Gerado em: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, 14, 26);
    doc.autoTable({
      startY: 32,
      head: [['Serviço/Produto', 'Qtd Aprovado', 'Qtd Reprovado', 'Qtd Total', 'Valor Total', 'Taxa']],
      body: [...ranking].sort((a, b) => b.qtd_aprovado - a.qtd_aprovado).map(item => {
        const taxa = item.qtd_total > 0 ? ((item.qtd_aprovado / item.qtd_total) * 100).toFixed(0) : 0;
        return [item.nome, item.qtd_aprovado, item.qtd_reprovado, item.qtd_total, `R$ ${item.valor_total.toFixed(2)}`, `${taxa}%`];
      }),
      styles: { fontSize: 8 }, headStyles: { fillColor: [249, 115, 22] },
    });
    doc.save(`ranking_servicos_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
    toast.success('PDF gerado com sucesso!');
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-end gap-2">
        <Button variant="outline" size="sm" onClick={exportarExcel}><FileSpreadsheet className="w-4 h-4 mr-2" />Excel / CSV</Button>
        <Button variant="outline" size="sm" onClick={exportarPDF}><FileDown className="w-4 h-4 mr-2" />PDF</Button>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-700">
              <TrendingUp className="w-5 h-5" />
              Mais Vendidos / Aprovados
            </CardTitle>
          </CardHeader>
          <CardContent>
            {maisVendidos.length === 0 ? (
              <p className="text-slate-500 text-sm text-center py-8">Sem dados no período</p>
            ) : (
              maisVendidos.map((item, i) => (
                <BarItem key={item.nome} item={item} max={maisVendidos[0]?.qtd_aprovado || 1} index={i} />
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <TrendingDown className="w-5 h-5" />
              Menos Vendidos / Aprovados
            </CardTitle>
          </CardHeader>
          <CardContent>
            {menosVendidos.length === 0 ? (
              <p className="text-slate-500 text-sm text-center py-8">Sem dados no período</p>
            ) : (
              menosVendidos.map((item, i) => (
                <div key={item.nome} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                  <div className="flex-1 min-w-0">
                    <span className="text-sm text-slate-700 truncate block">{item.nome}</span>
                    <div className="flex gap-3 text-xs text-slate-500 mt-0.5">
                      <span className="text-green-600">{item.qtd_aprovado} aprovados</span>
                      <span className="text-red-500">{item.qtd_reprovado} reprovados</span>
                    </div>
                  </div>
                  <span className="text-sm font-bold text-red-500 ml-2">{item.qtd_total}x total</span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="w-5 h-5 text-orange-500" />
            Top 10 — Maior Valor Faturado
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr className="border-b border-slate-200">{['Pos.','Serviço/Produto','Qtd Aprovado','Qtd Total','Valor Total','Taxa Aprovação'].map(h => <th key={h} className="text-left p-3 text-sm font-semibold text-slate-600">{h}</th>)}</tr></thead>
              <tbody>
                {maiorValor.map((item, i) => {
                  const taxa = item.qtd_total > 0 ? ((item.qtd_aprovado / item.qtd_total) * 100).toFixed(0) : 0;
                  return (
                    <tr key={item.nome} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="p-3 text-sm font-bold text-slate-400">#{i + 1}</td>
                      <td className="p-3 text-sm font-medium text-slate-800">{item.nome}</td>
                      <td className="p-3 text-sm text-green-600 font-semibold">{item.qtd_aprovado}</td>
                      <td className="p-3 text-sm text-slate-600">{item.qtd_total}</td>
                      <td className="p-3 text-sm font-bold text-slate-800">R$ {item.valor_total.toFixed(2)}</td>
                      <td className="p-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${parseInt(taxa) >= 60 ? 'bg-green-100 text-green-700' : parseInt(taxa) >= 30 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>{taxa}%</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}