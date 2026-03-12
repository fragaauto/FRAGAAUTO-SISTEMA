import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Package, FileSpreadsheet, FileDown, Search } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from "sonner";
import jsPDF from 'jspdf';

export default function RelatorioProdutos({ atendimentos = [], labelPeriodo = '' }) {
  const [busca, setBusca] = useState('');

  const produtos = useMemo(() => {
    const map = {};
    atendimentos.forEach(a => {
      // Só considerar atendimentos concluídos e pagos
      if (a.status !== 'concluido' || !a.status_pagamento || a.status_pagamento === 'pendente') return;
      
      const todosItens = [...(a.itens_queixa || []), ...(a.itens_orcamento || [])];
      todosItens.forEach(item => {
        if (item.status_aprovacao !== 'aprovado') return;
        if (!item.nome) return;
        const key = item.codigo_produto || item.nome;
        if (!map[key]) {
          map[key] = {
            codigo: item.codigo_produto || '-',
            nome: item.nome,
            quantidade: 0,
            valor_total: 0,
          };
        }
        map[key].quantidade += item.quantidade || 1;
        map[key].valor_total += item.valor_total || 0;
      });
    });
    return Object.values(map).sort((a, b) => b.quantidade - a.quantidade);
  }, [atendimentos]);

  const produtosFiltrados = useMemo(() => {
    if (!busca.trim()) return produtos;
    const q = busca.toLowerCase();
    return produtos.filter(p => p.nome.toLowerCase().includes(q) || p.codigo.toLowerCase().includes(q));
  }, [produtos, busca]);

  const totalQtd = produtosFiltrados.reduce((s, p) => s + p.quantidade, 0);
  const totalValor = produtosFiltrados.reduce((s, p) => s + p.valor_total, 0);

  const exportarExcel = () => {
    const linhas = ['Código;Nome do Produto;Quantidade Vendida;Valor Total'];
    produtos.forEach(p => {
      linhas.push([p.codigo, p.nome, p.quantidade, p.valor_total.toFixed(2)].join(';'));
    });
    linhas.push(['', 'TOTAL', totalQtd, totalValor.toFixed(2)].join(';'));
    const blob = new Blob(['\ufeff' + linhas.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `produtos_vendidos_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
    toast.success('Exportado com sucesso!');
  };

  const exportarPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text('Relatório — Produtos Vendidos', 14, 18);
    doc.setFontSize(10);
    doc.text(`Período: ${labelPeriodo}  |  Gerado em: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, 14, 26);

    const rows = produtos.map(p => [p.codigo, p.nome, p.quantidade, `R$ ${p.valor_total.toFixed(2)}`]);
    rows.push(['', 'TOTAL', totalQtd, `R$ ${totalValor.toFixed(2)}`]);

    doc.autoTable({
      startY: 32,
      head: [['Código', 'Nome do Produto', 'Qtd Vendida', 'Valor Total']],
      body: rows,
      styles: { fontSize: 9 },
      headStyles: { fillColor: [249, 115, 22] },
      didParseCell: (data) => {
        if (data.row.index === rows.length - 1) {
          data.cell.styles.fontStyle = 'bold';
        }
      },
    });
    doc.save(`produtos_vendidos_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
    toast.success('PDF gerado com sucesso!');
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end gap-2">
        <Button variant="outline" size="sm" onClick={exportarExcel}>
          <FileSpreadsheet className="w-4 h-4 mr-2" />Excel / CSV
        </Button>
        <Button variant="outline" size="sm" onClick={exportarPDF}>
          <FileDown className="w-4 h-4 mr-2" />PDF
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input
          placeholder="Buscar produto ou serviço pelo nome ou código..."
          value={busca}
          onChange={e => setBusca(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card><CardContent className="pt-5"><p className="text-sm text-slate-500">Produtos distintos</p><p className="text-3xl font-bold text-blue-600 mt-1">{produtosFiltrados.length}</p></CardContent></Card>
        <Card><CardContent className="pt-5"><p className="text-sm text-slate-500">Total de itens vendidos</p><p className="text-3xl font-bold text-green-600 mt-1">{totalQtd}</p></CardContent></Card>
        <Card><CardContent className="pt-5"><p className="text-sm text-slate-500">Valor total</p><p className="text-2xl font-bold text-orange-600 mt-1">R$ {totalValor.toFixed(2)}</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="w-5 h-5 text-orange-500" />
            Produtos / Serviços Vendidos no Período
          </CardTitle>
        </CardHeader>
        <CardContent>
          {produtosFiltrados.length === 0 ? (
            <p className="text-slate-500 text-sm text-center py-12">{busca ? 'Nenhum produto encontrado para a busca' : 'Nenhum produto vendido (aprovado) no período'}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200">
                    {['#', 'Código', 'Nome do Produto / Serviço', 'Qtd Vendida', 'Valor Total'].map(h => (
                      <th key={h} className="text-left p-3 text-sm font-semibold text-slate-600">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {produtosFiltrados.map((p, i) => (
                    <tr key={i} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="p-3 text-sm text-slate-400 font-bold">#{i + 1}</td>
                      <td className="p-3 text-sm font-mono text-slate-600">{p.codigo}</td>
                      <td className="p-3 text-sm font-medium text-slate-800">{p.nome}</td>
                      <td className="p-3 text-sm font-bold text-green-600">{p.quantidade}</td>
                      <td className="p-3 text-sm font-bold text-slate-800">R$ {p.valor_total.toFixed(2)}</td>
                    </tr>
                  ))}
                  <tr className="bg-slate-50 border-t-2 border-slate-300">
                    <td colSpan={3} className="p-3 text-sm font-bold text-slate-700 text-right">TOTAL</td>
                    <td className="p-3 text-sm font-bold text-green-700">{totalQtd}</td>
                    <td className="p-3 text-sm font-bold text-slate-900">R$ {totalValor.toFixed(2)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}