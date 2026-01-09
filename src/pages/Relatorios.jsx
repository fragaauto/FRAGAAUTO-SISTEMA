import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Download,
  FileSpreadsheet,
  Calendar,
  CheckCircle,
  XCircle,
  DollarSign,
  FileText
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function Relatorios() {
  const [periodo, setPeriodo] = useState('30');

  const { data: atendimentos = [] } = useQuery({
    queryKey: ['atendimentos'],
    queryFn: () => base44.entities.Atendimento.list('-created_date'),
    staleTime: 2 * 60 * 1000
  });

  const dadosRelatorio = useMemo(() => {
    const now = new Date();
    const diasFiltro = parseInt(periodo);
    
    const atendimentosFiltrados = atendimentos.filter(a => {
      if (diasFiltro === 0) return true;
      const dataAtendimento = new Date(a.created_date);
      const diffDias = Math.floor((now - dataAtendimento) / (1000 * 60 * 60 * 24));
      return diffDias <= diasFiltro;
    });

    let servicosAprovados = 0;
    let servicosReprovados = 0;
    let valorTotalAprovado = 0;
    let valorTotalReprovado = 0;
    
    const detalhesServicos = [];

    atendimentosFiltrados.forEach(atendimento => {
      const todosItens = [...(atendimento.itens_queixa || []), ...(atendimento.itens_orcamento || [])];
      todosItens.forEach(item => {
        detalhesServicos.push({
          atendimento_placa: atendimento.placa,
          cliente: atendimento.cliente_nome,
          produto: item.nome,
          quantidade: item.quantidade,
          valor_unitario: item.valor_unitario,
          valor_total: item.valor_total,
          status: item.status_aprovacao,
          data: atendimento.created_date
        });

        if (item.status_aprovacao === 'aprovado') {
          servicosAprovados++;
          valorTotalAprovado += item.valor_total || 0;
        } else if (item.status_aprovacao === 'reprovado') {
          servicosReprovados++;
          valorTotalReprovado += item.valor_total || 0;
        }
      });
    });

    return {
      totalOrcamentos: atendimentosFiltrados.length,
      servicosAprovados,
      servicosReprovados,
      valorTotalAprovado,
      valorTotalReprovado,
      detalhesServicos,
      atendimentosFiltrados
    };
  }, [atendimentos, periodo]);

  const exportarCSV = () => {
    const linhas = [
      'Data;Placa;Cliente;Produto/Serviço;Quantidade;Valor Unit.;Valor Total;Status'
    ];

    dadosRelatorio.detalhesServicos.forEach(item => {
      linhas.push([
        format(new Date(item.data), 'dd/MM/yyyy', { locale: ptBR }),
        item.atendimento_placa,
        item.cliente || '-',
        item.produto,
        item.quantidade,
        item.valor_unitario?.toFixed(2),
        item.valor_total?.toFixed(2),
        item.status === 'aprovado' ? 'Aprovado' : item.status === 'reprovado' ? 'Reprovado' : 'Pendente'
      ].join(';'));
    });

    const csv = linhas.join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `relatorio_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
    toast.success('Relatório exportado!');
  };

  const imprimirPDF = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error('Permita pop-ups para gerar o PDF');
      return;
    }

    const hoje = format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
    const periodoTexto = periodo === '7' ? 'Últimos 7 dias' : 
                        periodo === '30' ? 'Últimos 30 dias' : 
                        periodo === '90' ? 'Últimos 90 dias' : 'Todo o período';

    printWindow.document.write(`
      <!DOCTYPE html>
      <html lang="pt-BR">
        <head>
          <meta charset="UTF-8">
          <title>Relatório Gerencial</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: Arial, sans-serif; padding: 30px; }
            h1 { color: #1e293b; margin-bottom: 10px; }
            .subtitle { color: #64748b; margin-bottom: 30px; }
            .summary { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-bottom: 30px; }
            .summary-card { background: #f8fafc; padding: 20px; border-radius: 8px; border-left: 4px solid #f97316; }
            .summary-card h3 { font-size: 14px; color: #64748b; margin-bottom: 5px; }
            .summary-card p { font-size: 24px; font-weight: bold; color: #1e293b; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { padding: 12px; text-align: left; border: 1px solid #e2e8f0; }
            th { background: #f1f5f9; font-weight: 600; }
            .aprovado { color: #16a34a; font-weight: 600; }
            .reprovado { color: #dc2626; font-weight: 600; }
            @media print { button { display: none; } }
          </style>
        </head>
        <body>
          <button onclick="window.print()" style="position: fixed; top: 20px; right: 20px; padding: 10px 20px; background: #f97316; color: white; border: none; border-radius: 8px; cursor: pointer;">🖨️ Imprimir</button>
          
          <h1>Relatório Gerencial - Fraga Auto Portas</h1>
          <p class="subtitle">Período: ${periodoTexto} | Gerado em: ${hoje}</p>
          
          <div class="summary">
            <div class="summary-card">
              <h3>Total de Orçamentos</h3>
              <p>${dadosRelatorio.totalOrcamentos}</p>
            </div>
            <div class="summary-card">
              <h3>Serviços Aprovados</h3>
              <p style="color: #16a34a;">${dadosRelatorio.servicosAprovados}</p>
            </div>
            <div class="summary-card">
              <h3>Serviços Reprovados</h3>
              <p style="color: #dc2626;">${dadosRelatorio.servicosReprovados}</p>
            </div>
            <div class="summary-card">
              <h3>Valor Aprovado</h3>
              <p style="color: #16a34a;">R$ ${dadosRelatorio.valorTotalAprovado.toFixed(2)}</p>
            </div>
            <div class="summary-card">
              <h3>Valor Reprovado</h3>
              <p style="color: #dc2626;">R$ ${dadosRelatorio.valorTotalReprovado.toFixed(2)}</p>
            </div>
            <div class="summary-card">
              <h3>Taxa de Aprovação</h3>
              <p>${dadosRelatorio.servicosAprovados + dadosRelatorio.servicosReprovados > 0 ? 
                ((dadosRelatorio.servicosAprovados / (dadosRelatorio.servicosAprovados + dadosRelatorio.servicosReprovados)) * 100).toFixed(1) : 0}%</p>
            </div>
          </div>

          <h2 style="margin-top: 30px; margin-bottom: 15px; color: #1e293b;">Detalhamento por Serviço</h2>
          <table>
            <thead>
              <tr>
                <th>Data</th>
                <th>Placa</th>
                <th>Cliente</th>
                <th>Serviço</th>
                <th>Qtd</th>
                <th>Valor Unit.</th>
                <th>Valor Total</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${dadosRelatorio.detalhesServicos.map(item => `
                <tr>
                  <td>${format(new Date(item.data), 'dd/MM/yyyy', { locale: ptBR })}</td>
                  <td>${item.atendimento_placa}</td>
                  <td>${item.cliente || '-'}</td>
                  <td>${item.produto}</td>
                  <td>${item.quantidade}</td>
                  <td>R$ ${item.valor_unitario?.toFixed(2)}</td>
                  <td>R$ ${item.valor_total?.toFixed(2)}</td>
                  <td class="${item.status}">
                    ${item.status === 'aprovado' ? 'Aprovado' : item.status === 'reprovado' ? 'Reprovado' : 'Pendente'}
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </body>
      </html>
    `);
    
    printWindow.document.close();
    toast.success('Relatório aberto para impressão');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-orange-50/30">
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-800">Relatórios Gerenciais</h1>
              <p className="text-slate-500">Análise detalhada dos atendimentos</p>
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
              <Button onClick={exportarCSV} variant="outline">
                <FileSpreadsheet className="w-4 h-4 mr-2" />
                Exportar CSV
              </Button>
              <Button onClick={imprimirPDF} className="bg-orange-500 hover:bg-orange-600">
                <Download className="w-4 h-4 mr-2" />
                Imprimir PDF
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500 mb-1">Total de Orçamentos</p>
                  <p className="text-3xl font-bold text-blue-600">{dadosRelatorio.totalOrcamentos}</p>
                </div>
                <FileText className="w-12 h-12 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500 mb-1">Serviços Aprovados</p>
                  <p className="text-3xl font-bold text-green-600">{dadosRelatorio.servicosAprovados}</p>
                </div>
                <CheckCircle className="w-12 h-12 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500 mb-1">Serviços Reprovados</p>
                  <p className="text-3xl font-bold text-red-600">{dadosRelatorio.servicosReprovados}</p>
                </div>
                <XCircle className="w-12 h-12 text-red-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500 mb-1">Valor Total Aprovado</p>
                  <p className="text-2xl font-bold text-emerald-600">
                    R$ {dadosRelatorio.valorTotalAprovado.toFixed(2)}
                  </p>
                </div>
                <DollarSign className="w-12 h-12 text-emerald-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500 mb-1">Valor Total Reprovado</p>
                  <p className="text-2xl font-bold text-red-600">
                    R$ {dadosRelatorio.valorTotalReprovado.toFixed(2)}
                  </p>
                </div>
                <DollarSign className="w-12 h-12 text-red-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500 mb-1">Taxa de Aprovação</p>
                  <p className="text-3xl font-bold text-purple-600">
                    {dadosRelatorio.servicosAprovados + dadosRelatorio.servicosReprovados > 0 ? 
                      ((dadosRelatorio.servicosAprovados / (dadosRelatorio.servicosAprovados + dadosRelatorio.servicosReprovados)) * 100).toFixed(1) : 0}%
                  </p>
                </div>
                <CheckCircle className="w-12 h-12 text-purple-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Detalhamento dos Serviços</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left p-3 text-sm font-semibold text-slate-600">Data</th>
                    <th className="text-left p-3 text-sm font-semibold text-slate-600">Placa</th>
                    <th className="text-left p-3 text-sm font-semibold text-slate-600">Cliente</th>
                    <th className="text-left p-3 text-sm font-semibold text-slate-600">Serviço</th>
                    <th className="text-right p-3 text-sm font-semibold text-slate-600">Qtd</th>
                    <th className="text-right p-3 text-sm font-semibold text-slate-600">Valor</th>
                    <th className="text-center p-3 text-sm font-semibold text-slate-600">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {dadosRelatorio.detalhesServicos.map((item, index) => (
                    <tr key={index} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="p-3 text-sm">
                        {format(new Date(item.data), 'dd/MM/yyyy', { locale: ptBR })}
                      </td>
                      <td className="p-3 text-sm font-medium">{item.atendimento_placa}</td>
                      <td className="p-3 text-sm">{item.cliente || '-'}</td>
                      <td className="p-3 text-sm">{item.produto}</td>
                      <td className="p-3 text-sm text-right">{item.quantidade}</td>
                      <td className="p-3 text-sm text-right font-semibold">
                        R$ {item.valor_total?.toFixed(2)}
                      </td>
                      <td className="p-3 text-center">
                        {item.status === 'aprovado' ? (
                          <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold">
                            Aprovado
                          </span>
                        ) : item.status === 'reprovado' ? (
                          <span className="px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-semibold">
                            Reprovado
                          </span>
                        ) : (
                          <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-semibold">
                            Pendente
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}