import React, { useState, useMemo } from 'react';
import { useUnidade } from '@/lib/UnidadeContext';

const UNIDADE_AUTO_PORTAS_ID = '69ea76b72f920804f5d68eab';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { CheckCircle2, Search, Plus, Loader2 } from 'lucide-react';
import { format } from 'date-fns';

const STATUS_COLORS = {
  pendente: 'bg-yellow-100 text-yellow-800',
  pago: 'bg-green-100 text-green-800',
  vencido: 'bg-red-100 text-red-800',
  cancelado: 'bg-slate-100 text-slate-600',
};

const CATEGORIAS = ['aluguel','energia','agua','internet','folha_pagamento','manutencao','fornecedor_pecas','marketing','impostos','outros'];

export default function ContasPagarTab() {
  const qc = useQueryClient();
  const { unidadeAtual } = useUnidade();
  const [search, setSearch] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('todos');
  const [showNova, setShowNova] = useState(false);
  const [selecionada, setSelecionada] = useState(null);

  const { data: contasBrutos = [], isLoading } = useQuery({
    queryKey: ['contas-pagar'],
    queryFn: () => base44.entities.ContaPagar.list('-created_date', 300),
  });

  const contas = useMemo(() => {
    if (!unidadeAtual) return contasBrutos;
    return contasBrutos.filter(c => {
      if (c.unidade_id) return c.unidade_id === unidadeAtual.id;
      return unidadeAtual.id === UNIDADE_AUTO_PORTAS_ID;
    });
  }, [contasBrutos, unidadeAtual]);

  const pagarMutation = useMutation({
    mutationFn: async (conta) => {
      await base44.entities.ContaPagar.update(conta.id, { status: 'pago', data_pagamento: new Date().toISOString() });
      await base44.entities.LancamentoFinanceiro.create({
        tipo: 'saida', descricao: conta.descricao, valor: conta.valor,
        forma_pagamento: conta.forma_pagamento || 'pix',
        conta_pagar_id: conta.id, data_lancamento: new Date().toISOString(),
        categoria: conta.categoria || 'outros',
      });
    },
    onSuccess: () => { toast.success('Conta paga!'); qc.invalidateQueries(['contas-pagar']); setSelecionada(null); },
  });

  const hoje = new Date().toISOString();
  const filtradas = contas
    .map(c => ({ ...c, status: c.status !== 'pago' && c.status !== 'cancelado' && c.data_vencimento < hoje ? 'vencido' : c.status }))
    .filter(c => {
      const matchStatus = filtroStatus === 'todos' || c.status === filtroStatus;
      const matchSearch = !search || c.fornecedor?.toLowerCase().includes(search.toLowerCase()) || c.descricao?.toLowerCase().includes(search.toLowerCase());
      return matchStatus && matchSearch;
    });

  return (
    <div className="space-y-3">
      <div className="flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
          <Input placeholder="Buscar fornecedor..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={filtroStatus} onValueChange={setFiltroStatus}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            {['todos','pendente','vencido','pago'].map(s => <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase()+s.slice(1)}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button onClick={() => setShowNova(true)} className="bg-red-600 hover:bg-red-700">
          <Plus className="w-4 h-4 mr-1" /> Nova
        </Button>
      </div>

      <div className="text-sm text-slate-500">
        {filtradas.length} conta(s) · Total: <span className="font-semibold text-slate-800">R$ {filtradas.reduce((s,c)=>s+(c.valor||0),0).toFixed(2)}</span>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>
      ) : filtradas.length === 0 ? (
        <div className="text-center py-12 text-slate-400">Nenhuma conta encontrada</div>
      ) : (
        filtradas.map(conta => (
          <Card key={conta.id} className="cursor-pointer hover:shadow-md transition-all" onClick={() => setSelecionada(conta)}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-800 truncate">{conta.descricao}</p>
                  <p className="text-sm text-slate-500">{conta.fornecedor} · {conta.categoria}</p>
                  <p className="text-xs text-slate-400 mt-1">Vence: {conta.data_vencimento ? format(new Date(conta.data_vencimento), 'dd/MM/yyyy') : '-'}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-slate-800">R$ {(conta.valor || 0).toFixed(2)}</p>
                  <Badge className={`text-xs mt-1 ${STATUS_COLORS[conta.status]}`}>{conta.status}</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        ))
      )}

      {/* Modal detalhe */}
      <Dialog open={!!selecionada} onOpenChange={() => setSelecionada(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{selecionada?.descricao}</DialogTitle></DialogHeader>
          {selecionada && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div><span className="text-slate-500">Valor:</span> <span className="font-bold">R$ {(selecionada.valor||0).toFixed(2)}</span></div>
                <div><span className="text-slate-500">Status:</span> <Badge className={STATUS_COLORS[selecionada.status]}>{selecionada.status}</Badge></div>
                <div><span className="text-slate-500">Fornecedor:</span> <span>{selecionada.fornecedor || '-'}</span></div>
                <div><span className="text-slate-500">Categoria:</span> <span>{selecionada.categoria || '-'}</span></div>
                <div><span className="text-slate-500">Vencimento:</span> <span>{selecionada.data_vencimento ? format(new Date(selecionada.data_vencimento), 'dd/MM/yyyy') : '-'}</span></div>
              </div>
              {(selecionada.status === 'pendente' || selecionada.status === 'vencido') && (
                <Button onClick={() => pagarMutation.mutate(selecionada)} disabled={pagarMutation.isPending} className="w-full bg-green-600 hover:bg-green-700">
                  {pagarMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
                  Marcar como Pago
                </Button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <NovaContaPagarModal open={showNova} onClose={() => setShowNova(false)} onSaved={() => { setShowNova(false); qc.invalidateQueries(['contas-pagar']); }} />
    </div>
  );
}

function NovaContaPagarModal({ open, onClose, onSaved }) {
  const [form, setForm] = useState({ fornecedor: '', categoria: 'outros', descricao: '', valor: '', forma_pagamento: 'pix', data_vencimento: '', observacoes: '' });
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!form.descricao || !form.valor || !form.data_vencimento) return toast.error('Preencha os campos obrigatórios');
    setSaving(true);
    await base44.entities.ContaPagar.create({ ...form, valor: parseFloat(form.valor), status: 'pendente', data_vencimento: new Date(form.data_vencimento).toISOString() });
    setSaving(false);
    onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Nova Conta a Pagar</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Fornecedor</Label><Input value={form.fornecedor} onChange={e => setForm(p => ({ ...p, fornecedor: e.target.value }))} /></div>
          <div><Label>Descrição *</Label><Input value={form.descricao} onChange={e => setForm(p => ({ ...p, descricao: e.target.value }))} /></div>
          <div>
            <Label>Categoria</Label>
            <Select value={form.categoria} onValueChange={v => setForm(p => ({ ...p, categoria: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{CATEGORIAS.map(c => <SelectItem key={c} value={c}>{c.replace('_',' ')}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div><Label>Valor *</Label><Input type="number" value={form.valor} onChange={e => setForm(p => ({ ...p, valor: e.target.value }))} /></div>
            <div><Label>Vencimento *</Label><Input type="date" value={form.data_vencimento} onChange={e => setForm(p => ({ ...p, data_vencimento: e.target.value }))} /></div>
          </div>
          <div>
            <Label>Forma de Pagamento</Label>
            <Select value={form.forma_pagamento} onValueChange={v => setForm(p => ({ ...p, forma_pagamento: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{['dinheiro','pix','cartao_credito','cartao_debito','transferencia','boleto'].map(f => <SelectItem key={f} value={f}>{f.replace('_',' ')}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Observações</Label><Textarea value={form.observacoes} onChange={e => setForm(p => ({ ...p, observacoes: e.target.value }))} /></div>
          <Button onClick={save} disabled={saving} className="w-full bg-red-600 hover:bg-red-700">
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null} Salvar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}