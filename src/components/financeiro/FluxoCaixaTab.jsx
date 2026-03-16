import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ArrowUpCircle, ArrowDownCircle, Plus, Loader2, Trash2, Download, FileSpreadsheet, CalendarRange, Pencil } from 'lucide-react';
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { format, subDays, startOfDay, parseISO } from 'date-fns';
import FluxoCaixaChart from './FluxoCaixaChart';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

const FORMAS_LABELS = {
  dinheiro: 'Dinheiro', pix: 'PIX', cartao_credito: 'Crédito',
  cartao_debito: 'Débito', transferencia: 'Transferência', boleto: 'Boleto', faturado: 'Faturado'
};

export default function FluxoCaixaTab() {
  const qc = useQueryClient();
  const [periodo, setPeriodo] = useState('30');
  const [filtroForma, setFiltroForma] = useState('todos');
  const [showNovo, setShowNovo] = useState(false);
  const [exportando, setExportando] = useState(false);
  const [dataInicioPers, setDataInicioPers] = useState('');
  const [dataFimPers, setDataFimPers] = useState('');
  const [selecionados, setSelecionados] = useState(new Set());
  const [deletandoMultiplos, setDeletandoMultiplos] = useState(false);
  const [editando, setEditando] = useState(null); // lançamento sendo editado

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.LancamentoFinanceiro.delete(id),
    onSuccess: () => { toast.success('Movimentação excluída'); qc.invalidateQueries(['lancamentos-todos']); },
    onError: () => toast.error('Erro ao excluir'),
  });

  const deletarSelecionados = async () => {
    if (selecionados.size === 0) return;
    setDeletandoMultiplos(true);
    try {
      await Promise.all([...selecionados].map(id => base44.entities.LancamentoFinanceiro.delete(id)));
      toast.success(`${selecionados.size} lançamento(s) excluído(s)`);
      setSelecionados(new Set());
      qc.invalidateQueries(['lancamentos-todos']);
    } catch {
      toast.error('Erro ao excluir lançamentos');
    } finally {
      setDeletandoMultiplos(false);
    }
  };

  const toggleSelecionado = (id) => {
    setSelecionados(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleTodos = () => {
    if (selecionados.size === filtrados.length) {
      setSelecionados(new Set());
    } else {
      setSelecionados(new Set(filtrados.map(l => l.id)));
    }
  };

  const { data: lancamentos = [], isLoading } = useQuery({
    queryKey: ['lancamentos-todos'],
    queryFn: () => base44.entities.LancamentoFinanceiro.filter({ estornado: false }),
    staleTime: 60 * 1000,
  });

  const { data: atendimentos = [] } = useQuery({
    queryKey: ['atendimentos-export'],
    queryFn: () => base44.entities.Atendimento.list(),
    staleTime: 60 * 1000,
  });

  const dataInicio = periodo === 'custom'
    ? (dataInicioPers ? new Date(dataInicioPers + 'T00:00:00').toISOString() : null)
    : subDays(new Date(), parseInt(periodo)).toISOString();
  const dataFim = periodo === 'custom'
    ? (dataFimPers ? new Date(dataFimPers + 'T23:59:59').toISOString() : null)
    : null;

  const filtrados = lancamentos.filter(l => {
    const data = l.data_lancamento || '';
    const dentroPeriodo = periodo === 'custom'
      ? (!dataInicio || data >= dataInicio) && (!dataFim || data <= dataFim)
      : data >= dataInicio;
    const matchForma = filtroForma === 'todos' || l.forma_pagamento === filtroForma;
    return dentroPeriodo && matchForma;
  });

  const entradas = filtrados.filter(l => l.tipo === 'entrada').reduce((s, l) => s + (l.valor || 0), 0);
  const saidas = filtrados.filter(l => l.tipo === 'saida').reduce((s, l) => s + (l.valor || 0), 0);
  const saldo = entradas - saidas;

  const exportarPDF = async () => {
    setExportando(true);
    try {
      const doc = new jsPDF();
      
      // Título
      doc.setFontSize(18);
      doc.text('Extrato do Fluxo de Caixa', 14, 20);
      
      // Período
      doc.setFontSize(10);
      const labelPeriodoDoc = periodo === 'custom'
        ? `${dataInicioPers || '?'} até ${dataFimPers || '?'}`
        : `Últimos ${periodo} dias`;
      doc.text(`Período: ${labelPeriodoDoc}`, 14, 28);
      doc.text(`Gerado em: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, 14, 33);
      
      // Preparar dados
      const dados = filtrados
        .sort((a, b) => (b.data_lancamento || '') > (a.data_lancamento || '') ? 1 : -1)
        .map(l => {
          const atendimento = atendimentos.find(a => a.id === l.atendimento_id);
          return [
            l.data_lancamento ? format(new Date(l.data_lancamento), 'dd/MM/yyyy') : '-',
            atendimento?.cliente_nome || '-',
            atendimento?.modelo || '-',
            atendimento?.placa || '-',
            l.descricao || '-',
            `R$ ${(l.valor || 0).toFixed(2)}`,
            FORMAS_LABELS[l.forma_pagamento] || l.forma_pagamento || '-',
            atendimento?.tecnico || '-'
          ];
        });
      
      // Tabela
      doc.autoTable({
        startY: 38,
        head: [['Data', 'Cliente', 'Carro', 'Placa', 'Detalhes', 'Valor', 'Forma', 'Técnico']],
        body: dados,
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [249, 115, 22], textColor: 255 },
        columnStyles: {
          5: { halign: 'right' }
        },
        margin: { left: 14, right: 14 }
      });
      
      // Totais
      const finalY = doc.lastAutoTable.finalY + 10;
      doc.setFontSize(10);
      doc.text(`Total Entradas: R$ ${entradas.toFixed(2)}`, 14, finalY);
      doc.text(`Total Saídas: R$ ${saidas.toFixed(2)}`, 14, finalY + 5);
      doc.setFontSize(12);
      doc.setFont(undefined, 'bold');
      doc.text(`Saldo: R$ ${saldo.toFixed(2)}`, 14, finalY + 12);
      
      doc.save(`extrato-fluxo-caixa-${format(new Date(), 'dd-MM-yyyy')}.pdf`);
      toast.success('PDF exportado com sucesso!');
    } catch (error) {
      toast.error('Erro ao exportar PDF');
    } finally {
      setExportando(false);
    }
  };

  const exportarExcel = async () => {
    setExportando(true);
    try {
      const periodoTexto = `01/${format(new Date(), 'MM/yyyy')} - ${format(new Date(), 'dd/MM/yyyy')}`;
      
      const dados = filtrados
        .sort((a, b) => (b.data_lancamento || '') > (a.data_lancamento || '') ? 1 : -1)
        .map(l => {
          const atendimento = atendimentos.find(a => a.id === l.atendimento_id);
          const historico = atendimento ? `Ref. a ordem de serviço nº ${atendimento.numero_os || atendimento.id.slice(0, 8)} | ${l.descricao || ''}` : l.descricao || '';
          
          return {
            'Data': l.data_lancamento ? format(new Date(l.data_lancamento), 'dd/MM/yyyy') : '',
            'Cliente/Fornecedor': atendimento?.cliente_nome || '',
            'CPF/CNPJ': atendimento?.cliente_cpf || '',
            'Categoria': l.categoria || '',
            'Histórico': historico,
            'Tipo': l.tipo === 'entrada' ? 'C' : 'D',
            'Valor': (l.valor || 0).toFixed(0),
            'Banco': FORMAS_LABELS[l.forma_pagamento] || l.forma_pagamento || 'Caixa',
            'Período': periodoTexto,
            'Id': l.id || '',
            'Técnico Responsável': atendimento?.tecnico || ''
          };
        });
      
      const headers = Object.keys(dados[0]).join(';');
      const rows = dados.map(d => Object.values(d).join(';')).join('\n');
      const csv = '\ufeff' + headers + '\n' + rows;
      
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `extrato-fluxo-caixa-${format(new Date(), 'dd-MM-yyyy')}.csv`;
      link.click();
      
      toast.success('Excel exportado com sucesso!');
    } catch (error) {
      toast.error('Erro ao exportar Excel');
    } finally {
      setExportando(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="flex gap-2 flex-wrap">
        <Select value={periodo} onValueChange={setPeriodo}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Últimos 7 dias</SelectItem>
            <SelectItem value="15">Últimos 15 dias</SelectItem>
            <SelectItem value="30">Últimos 30 dias</SelectItem>
            <SelectItem value="90">Últimos 90 dias</SelectItem>
            <SelectItem value="custom">📅 Período personalizado</SelectItem>
          </SelectContent>
        </Select>

        {periodo === 'custom' && (
          <div className="flex items-center gap-2">
            <Input
              type="date"
              value={dataInicioPers}
              onChange={e => setDataInicioPers(e.target.value)}
              className="w-36 h-9 text-sm"
            />
            <span className="text-slate-400 text-sm">até</span>
            <Input
              type="date"
              value={dataFimPers}
              onChange={e => setDataFimPers(e.target.value)}
              className="w-36 h-9 text-sm"
            />
          </div>
        )}

        <Select value={filtroForma} onValueChange={setFiltroForma}>
          <SelectTrigger className="w-36"><SelectValue placeholder="Forma" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todas as formas</SelectItem>
            {Object.entries(FORMAS_LABELS).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="ml-auto flex gap-2">
          <Button onClick={exportarPDF} disabled={exportando || filtrados.length === 0} variant="outline" className="gap-1">
            <Download className="w-4 h-4" /> PDF
          </Button>
          <Button onClick={exportarExcel} disabled={exportando || filtrados.length === 0} variant="outline" className="gap-1">
            <FileSpreadsheet className="w-4 h-4" /> Excel
          </Button>
          <Button onClick={() => setShowNovo(true)} variant="outline">
            <Plus className="w-4 h-4 mr-1" /> Lançamento Manual
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="bg-green-50 border-0">
          <CardContent className="p-3">
            <div className="flex items-center gap-1 mb-1"><ArrowUpCircle className="w-4 h-4 text-green-600" /><span className="text-xs text-slate-500">Entradas</span></div>
            <p className="font-bold text-green-700">R$ {entradas.toFixed(2)}</p>
          </CardContent>
        </Card>
        <Card className="bg-red-50 border-0">
          <CardContent className="p-3">
            <div className="flex items-center gap-1 mb-1"><ArrowDownCircle className="w-4 h-4 text-red-500" /><span className="text-xs text-slate-500">Saídas</span></div>
            <p className="font-bold text-red-600">R$ {saidas.toFixed(2)}</p>
          </CardContent>
        </Card>
        <Card className={`${saldo >= 0 ? 'bg-blue-50' : 'bg-orange-50'} border-0`}>
          <CardContent className="p-3">
            <div className="flex items-center gap-1 mb-1"><span className="text-xs text-slate-500">Saldo</span></div>
            <p className={`font-bold ${saldo >= 0 ? 'text-blue-700' : 'text-orange-700'}`}>R$ {saldo.toFixed(2)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Gráfico */}
      <Card>
        <CardContent className="pt-4">
          <FluxoCaixaChart lancamentos={filtrados} />
        </CardContent>
      </Card>

      {/* Lista */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={filtrados.length > 0 && selecionados.size === filtrados.length}
              onChange={toggleTodos}
              className="w-4 h-4 rounded cursor-pointer"
            />
            <h3 className="text-sm font-semibold text-slate-700">Movimentações ({filtrados.length})</h3>
          </div>
          {selecionados.size > 0 && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button size="sm" variant="destructive" disabled={deletandoMultiplos} className="gap-1">
                  {deletandoMultiplos ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                  Excluir {selecionados.size} selecionado(s)
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Excluir {selecionados.size} lançamento(s)?</AlertDialogTitle>
                  <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={deletarSelecionados} className="bg-red-600 hover:bg-red-700">Excluir</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>

        {isLoading ? (
          <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-slate-400" /></div>
        ) : (
          [...filtrados].sort((a, b) => (b.data_lancamento || '') > (a.data_lancamento || '') ? 1 : -1).map(l => (
            <div
              key={l.id}
              className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-colors ${selecionados.has(l.id) ? 'bg-blue-50 border-blue-300' : 'bg-white border-slate-100'}`}
              onClick={() => toggleSelecionado(l.id)}
            >
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={selecionados.has(l.id)}
                  onChange={() => toggleSelecionado(l.id)}
                  onClick={e => e.stopPropagation()}
                  className="w-4 h-4 rounded cursor-pointer flex-shrink-0"
                />
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${l.tipo === 'entrada' ? 'bg-green-100' : 'bg-red-100'}`}>
                  {l.tipo === 'entrada'
                    ? <ArrowUpCircle className="w-4 h-4 text-green-600" />
                    : <ArrowDownCircle className="w-4 h-4 text-red-500" />}
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-800 truncate max-w-[180px]">{l.descricao}</p>
                  <p className="text-xs text-slate-400">
                    {l.data_lancamento ? format(new Date(l.data_lancamento), 'dd/MM HH:mm') : '-'} · {FORMAS_LABELS[l.forma_pagamento] || l.forma_pagamento}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                <p className={`font-bold text-sm ${l.tipo === 'entrada' ? 'text-green-600' : 'text-red-500'}`}>
                  {l.tipo === 'entrada' ? '+' : '-'} R$ {(l.valor || 0).toFixed(2)}
                </p>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button size="icon" variant="ghost" className="w-7 h-7 text-slate-400 hover:text-red-500">
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Excluir movimentação?</AlertDialogTitle>
                      <AlertDialogDescription>
                        "{l.descricao}" — R$ {(l.valor || 0).toFixed(2)}<br />Esta ação não pode ser desfeita.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction onClick={() => deleteMutation.mutate(l.id)} className="bg-red-600 hover:bg-red-700">
                        Excluir
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          ))
        )}
      </div>

      <NovoLancamentoModal open={showNovo} onClose={() => setShowNovo(false)} onSaved={() => { setShowNovo(false); qc.invalidateQueries(['lancamentos-todos']); }} />
    </div>
  );
}

function NovoLancamentoModal({ open, onClose, onSaved }) {
  const hoje = new Date().toISOString().split('T')[0];
  const [form, setForm] = useState({ tipo: 'entrada', descricao: '', valor: '', forma_pagamento: 'dinheiro', categoria: '', observacoes: '', data: hoje });
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!form.descricao || !form.valor) return toast.error('Preencha descrição e valor');
    if (!form.data) return toast.error('Selecione a data do lançamento');
    setSaving(true);
    const dataLancamento = new Date(form.data + 'T12:00:00').toISOString();
    await base44.entities.LancamentoFinanceiro.create({ ...form, valor: parseFloat(form.valor), data_lancamento: dataLancamento });
    setSaving(false);
    onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Lançamento Manual</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="flex gap-2">
            <Button size="sm" className={`flex-1 ${form.tipo==='entrada'?'bg-green-600 text-white':'outline'}`} variant={form.tipo==='entrada'?'default':'outline'} onClick={() => setForm(p=>({...p,tipo:'entrada'}))}>Entrada</Button>
            <Button size="sm" className={`flex-1 ${form.tipo==='saida'?'bg-red-600 text-white':''}`} variant={form.tipo==='saida'?'default':'outline'} onClick={() => setForm(p=>({...p,tipo:'saida'}))}>Saída</Button>
          </div>
          <div><Label>Descrição *</Label><Input value={form.descricao} onChange={e => setForm(p=>({...p,descricao:e.target.value}))} /></div>
          <div className="grid grid-cols-2 gap-2">
            <div><Label>Valor *</Label><Input type="number" value={form.valor} onChange={e => setForm(p=>({...p,valor:e.target.value}))} /></div>
            <div>
              <Label>Forma</Label>
              <Select value={form.forma_pagamento} onValueChange={v => setForm(p=>({...p,forma_pagamento:v}))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(FORMAS_LABELS).map(([v,l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Data do Lançamento *</Label>
            <Input type="date" value={form.data} onChange={e => setForm(p=>({...p, data: e.target.value}))} />
          </div>
          <Button onClick={save} disabled={saving} className="w-full">
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null} Salvar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}