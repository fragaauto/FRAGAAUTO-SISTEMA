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
import { toast } from "sonner";
import { CheckCircle2, Clock, AlertTriangle, Search, Plus, Loader2, X } from 'lucide-react';
import { format } from 'date-fns';

const STATUS_COLORS = {
  pendente: 'bg-yellow-100 text-yellow-800',
  pago: 'bg-green-100 text-green-800',
  parcial: 'bg-blue-100 text-blue-800',
  vencido: 'bg-red-100 text-red-800',
  cancelado: 'bg-slate-100 text-slate-600',
};

const STATUS_LABELS = { pendente: 'Pendente', pago: 'Pago', parcial: 'Parcial', vencido: 'Vencido', cancelado: 'Cancelado' };

export default function ContasReceberTab() {
  const qc = useQueryClient();
  const { unidadeAtual } = useUnidade();
  const [search, setSearch] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('todos');
  const [showNova, setShowNova] = useState(false);
  const [selecionada, setSelecionada] = useState(null);

  const { data: contasBrutos = [], isLoading } = useQuery({
    queryKey: ['contas-receber'],
    queryFn: () => base44.entities.ContaReceber.list('-created_date', 300),
  });

  const contas = useMemo(() => {
    if (!unidadeAtual) return contasBrutos;
    return contasBrutos.filter(c => {
      if (c.unidade_id) return c.unidade_id === unidadeAtual.id;
      return unidadeAtual.id === UNIDADE_AUTO_PORTAS_ID;
    });
  }, [contasBrutos, unidadeAtual]);

  const baixarMutation = useMutation({
    mutationFn: async (conta) => {
      await base44.entities.ContaReceber.update(conta.id, { status: 'pago', valor_pago: conta.valor_total, data_pagamento: new Date().toISOString() });
      await base44.entities.LancamentoFinanceiro.create({
        tipo: 'entrada', descricao: `Baixa: ${conta.descricao}`,
        valor: conta.valor_total, forma_pagamento: conta.forma_pagamento || 'pix',
        conta_receber_id: conta.id, data_lancamento: new Date().toISOString(), categoria: 'servico',
      });
    },
    onSuccess: () => { toast.success('Marcado como pago!'); qc.invalidateQueries(['contas-receber']); setSelecionada(null); },
  });

  // Auto-marcar vencidas
  const hoje = new Date().toISOString();
  const filtradas = contas
    .map(c => ({ ...c, status: c.status !== 'pago' && c.status !== 'cancelado' && c.data_vencimento < hoje ? 'vencido' : c.status }))
    .filter(c => {
      const matchStatus = filtroStatus === 'todos' || c.status === filtroStatus;
      const matchSearch = !search || c.cliente_nome?.toLowerCase().includes(search.toLowerCase()) || c.descricao?.toLowerCase().includes(search.toLowerCase());
      return matchStatus && matchSearch;
    });

  const totalFiltrado = filtradas.reduce((s, c) => s + (c.valor_total || 0), 0);

  return (
    <div className="space-y-3">
      <div className="flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
          <Input placeholder="Buscar cliente..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={filtroStatus} onValueChange={setFiltroStatus}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            <SelectItem value="pendente">Pendente</SelectItem>
            <SelectItem value="vencido">Vencido</SelectItem>
            <SelectItem value="parcial">Parcial</SelectItem>
            <SelectItem value="pago">Pago</SelectItem>
          </SelectContent>
        </Select>
        <Button onClick={() => setShowNova(true)} className="bg-green-600 hover:bg-green-700">
          <Plus className="w-4 h-4 mr-1" /> Nova
        </Button>
      </div>

      <div className="text-sm text-slate-500 font-medium">
        {filtradas.length} conta(s) · Total: <span className="text-slate-800">R$ {totalFiltrado.toFixed(2)}</span>
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
                  <p className="font-semibold text-slate-800 truncate">{conta.cliente_nome}</p>
                  <p className="text-sm text-slate-500 truncate">{conta.descricao}</p>
                  <p className="text-xs text-slate-400 mt-1">
                    Vence: {conta.data_vencimento ? format(new Date(conta.data_vencimento), 'dd/MM/yyyy') : '-'}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="font-bold text-slate-800">R$ {(conta.valor_total || 0).toFixed(2)}</p>
                  <Badge className={`text-xs mt-1 ${STATUS_COLORS[conta.status]}`}>{STATUS_LABELS[conta.status]}</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        ))
      )}

      {/* Modal detalhe */}
      <Dialog open={!!selecionada} onOpenChange={() => setSelecionada(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{selecionada?.cliente_nome}</DialogTitle></DialogHeader>
          {selecionada && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div><span className="text-slate-500">Valor:</span> <span className="font-bold">R$ {(selecionada.valor_total || 0).toFixed(2)}</span></div>
                <div><span className="text-slate-500">Status:</span> <Badge className={STATUS_COLORS[selecionada.status]}>{STATUS_LABELS[selecionada.status]}</Badge></div>
                <div><span className="text-slate-500">Vencimento:</span> <span>{selecionada.data_vencimento ? format(new Date(selecionada.data_vencimento), 'dd/MM/yyyy') : '-'}</span></div>
                <div><span className="text-slate-500">Forma:</span> <span>{selecionada.forma_pagamento || '-'}</span></div>
              </div>
              {selecionada.descricao && <p className="text-sm text-slate-600">{selecionada.descricao}</p>}
              {(selecionada.status === 'pendente' || selecionada.status === 'vencido' || selecionada.status === 'parcial') && (
                <Button
                  onClick={() => baixarMutation.mutate(selecionada)}
                  disabled={baixarMutation.isPending}
                  className="w-full bg-green-600 hover:bg-green-700"
                >
                  {baixarMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
                  Dar Baixa (Marcar como Pago)
                </Button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <NovaContaReceberModal open={showNova} onClose={() => setShowNova(false)} onSaved={() => { setShowNova(false); qc.invalidateQueries(['contas-receber']); }} />
    </div>
  );
}

function NovaContaReceberModal({ open, onClose, onSaved }) {
  const [form, setForm] = useState({ cliente_nome: '', descricao: '', valor_total: '', forma_pagamento: 'pix', data_vencimento: '', observacoes: '' });
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!form.cliente_nome || !form.valor_total || !form.data_vencimento) return toast.error('Preencha os campos obrigatórios');
    setSaving(true);
    await base44.entities.ContaReceber.create({ ...form, valor_total: parseFloat(form.valor_total), status: 'pendente', data_vencimento: new Date(form.data_vencimento).toISOString() });
    setSaving(false);
    onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Nova Conta a Receber</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Cliente *</Label><Input value={form.cliente_nome} onChange={e => setForm(p => ({ ...p, cliente_nome: e.target.value }))} /></div>
          <div><Label>Descrição</Label><Input value={form.descricao} onChange={e => setForm(p => ({ ...p, descricao: e.target.value }))} /></div>
          <div className="grid grid-cols-2 gap-2">
            <div><Label>Valor *</Label><Input type="number" value={form.valor_total} onChange={e => setForm(p => ({ ...p, valor_total: e.target.value }))} /></div>
            <div><Label>Vencimento *</Label><Input type="date" value={form.data_vencimento} onChange={e => setForm(p => ({ ...p, data_vencimento: e.target.value }))} /></div>
          </div>
          <div>
            <Label>Forma de Pagamento</Label>
            <Select value={form.forma_pagamento} onValueChange={v => setForm(p => ({ ...p, forma_pagamento: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {['dinheiro','pix','cartao_credito','cartao_debito','transferencia','boleto','faturado'].map(f => <SelectItem key={f} value={f}>{f.replace('_',' ')}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={save} disabled={saving} className="w-full bg-green-600 hover:bg-green-700">
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null} Salvar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}