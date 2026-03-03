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
import { ArrowUpCircle, ArrowDownCircle, Plus, Loader2, Trash2 } from 'lucide-react';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { format, subDays, startOfDay } from 'date-fns';
import FluxoCaixaChart from './FluxoCaixaChart';

const FORMAS_LABELS = {
  dinheiro: 'Dinheiro', pix: 'PIX', cartao_credito: 'Crédito',
  cartao_debito: 'Débito', transferencia: 'Transferência', boleto: 'Boleto', faturado: 'Faturado'
};

export default function FluxoCaixaTab() {
  const qc = useQueryClient();
  const [periodo, setPeriodo] = useState('30');
  const [filtroForma, setFiltroForma] = useState('todos');
  const [showNovo, setShowNovo] = useState(false);

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.LancamentoFinanceiro.delete(id),
    onSuccess: () => { toast.success('Movimentação excluída'); qc.invalidateQueries(['lancamentos-todos']); },
    onError: () => toast.error('Erro ao excluir'),
  });

  const { data: lancamentos = [], isLoading } = useQuery({
    queryKey: ['lancamentos-todos'],
    queryFn: () => base44.entities.LancamentoFinanceiro.filter({ estornado: false }),
    staleTime: 60 * 1000,
  });

  const dataInicio = subDays(new Date(), parseInt(periodo)).toISOString();
  const filtrados = lancamentos.filter(l => {
    const dentroPeriodo = l.data_lancamento >= dataInicio;
    const matchForma = filtroForma === 'todos' || l.forma_pagamento === filtroForma;
    return dentroPeriodo && matchForma;
  });

  const entradas = filtrados.filter(l => l.tipo === 'entrada').reduce((s, l) => s + (l.valor || 0), 0);
  const saidas = filtrados.filter(l => l.tipo === 'saida').reduce((s, l) => s + (l.valor || 0), 0);
  const saldo = entradas - saidas;

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="flex gap-2 flex-wrap">
        <Select value={periodo} onValueChange={setPeriodo}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Últimos 7 dias</SelectItem>
            <SelectItem value="15">Últimos 15 dias</SelectItem>
            <SelectItem value="30">Últimos 30 dias</SelectItem>
            <SelectItem value="90">Últimos 90 dias</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filtroForma} onValueChange={setFiltroForma}>
          <SelectTrigger className="w-36"><SelectValue placeholder="Forma" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todas as formas</SelectItem>
            {Object.entries(FORMAS_LABELS).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button onClick={() => setShowNovo(true)} variant="outline" className="ml-auto">
          <Plus className="w-4 h-4 mr-1" /> Lançamento Manual
        </Button>
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
        <h3 className="text-sm font-semibold text-slate-700">Movimentações ({filtrados.length})</h3>
        {isLoading ? (
          <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-slate-400" /></div>
        ) : (
          [...filtrados].sort((a, b) => (b.data_lancamento || '') > (a.data_lancamento || '') ? 1 : -1).map(l => (
            <div key={l.id} className="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-100">
              <div className="flex items-center gap-3">
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
              <div className="flex items-center gap-2">
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
  const [form, setForm] = useState({ tipo: 'entrada', descricao: '', valor: '', forma_pagamento: 'dinheiro', categoria: '', observacoes: '' });
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!form.descricao || !form.valor) return toast.error('Preencha descrição e valor');
    setSaving(true);
    await base44.entities.LancamentoFinanceiro.create({ ...form, valor: parseFloat(form.valor), data_lancamento: new Date().toISOString() });
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
          <Button onClick={save} disabled={saving} className="w-full">
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null} Salvar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}