import React, { useState, useMemo, useCallback } from 'react';
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
import { CheckCircle2, Clock, AlertTriangle, Search, Plus, Loader2, X, Trash2, CheckSquare, Square } from 'lucide-react';
import { Checkbox } from "@/components/ui/checkbox";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { format } from 'date-fns';

const STATUS_COLORS = {
  pendente: 'bg-yellow-100 text-yellow-800',
  pago: 'bg-green-100 text-green-800',
  parcial: 'bg-blue-100 text-blue-800',
  vencido: 'bg-red-100 text-red-800',
  cancelado: 'bg-slate-100 text-slate-600',
};

const STATUS_LABELS = { pendente: 'Pendente', pago: 'Pago', parcial: 'Parcial', vencido: 'Vencido', cancelado: 'Cancelado' };

export default function ContasReceberTab({ filtroData }) {
  const qc = useQueryClient();
  const { unidadeAtual } = useUnidade();
  const [search, setSearch] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('todos');
  const [showNova, setShowNova] = useState(false);
  const [selecionada, setSelecionada] = useState(null);
  const [selecionadas, setSelecionadas] = useState(new Set());
  const [showConfirmLote, setShowConfirmLote] = useState(false);
  const [deletandoLote, setDeletandoLote] = useState(false);

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

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.ContaReceber.delete(id),
    onSuccess: () => { toast.success('Conta excluída!'); qc.invalidateQueries(['contas-receber']); },
    onError: () => toast.error('Erro ao excluir conta'),
  });

  const toggleSelecionada = useCallback((id) => {
    setSelecionadas(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const toggleTodas = useCallback(() => {
    setSelecionadas(prev => prev.size === filtradas.length ? new Set() : new Set(filtradas.map(c => c.id)));
  }, [filtradas]);

  const deletarLote = async () => {
    setDeletandoLote(true);
    await Promise.all([...selecionadas].map(id => base44.entities.ContaReceber.delete(id)));
    setDeletandoLote(false);
    setShowConfirmLote(false);
    setSelecionadas(new Set());
    toast.success(`${selecionadas.size} conta(s) excluída(s)!`);
    qc.invalidateQueries(['contas-receber']);
  };

  const baixarMutation = useMutation({
    mutationFn: async ({ conta, formaPagamento }) => {
      const agora = new Date().toISOString();
      await base44.entities.ContaReceber.update(conta.id, {
        status: 'pago',
        valor_pago: conta.valor_total,
        data_pagamento: agora,
        forma_pagamento: formaPagamento || conta.forma_pagamento || 'pix',
      });
      await base44.entities.LancamentoFinanceiro.create({
        tipo: 'entrada',
        descricao: `Recebimento: ${conta.descricao}`,
        valor: conta.valor_total,
        forma_pagamento: formaPagamento || conta.forma_pagamento || 'pix',
        conta_receber_id: conta.id,
        atendimento_id: conta.atendimento_id || null,
        data_lancamento: agora,
        categoria: 'servico',
      });
      // Se veio de um atendimento faturado, marcar como pago
      if (conta.atendimento_id) {
        await base44.entities.Atendimento.update(conta.atendimento_id, {
          status_pagamento: 'pago',
          data_pagamento: agora,
        });
      }
    },
    onSuccess: () => {
      toast.success('Recebimento registrado! Atendimento marcado como pago.');
      qc.invalidateQueries(['contas-receber']);
      qc.invalidateQueries(['atendimentos']);
      qc.invalidateQueries(['atendimento']);
      setSelecionada(null);
    },
  });

  // Auto-marcar vencidas
  const hoje = new Date().toISOString();
  const filtradas = contas
    .map(c => ({ ...c, status: c.status !== 'pago' && c.status !== 'cancelado' && c.data_vencimento < hoje ? 'vencido' : c.status }))
    .filter(c => {
      const matchStatus = filtroStatus === 'todos' || c.status === filtroStatus;
      const matchSearch = !search || c.cliente_nome?.toLowerCase().includes(search.toLowerCase()) || c.descricao?.toLowerCase().includes(search.toLowerCase());
      const matchData = !filtroData || (() => {
        const data = new Date(c.data_vencimento || c.created_date);
        return data >= filtroData.inicio && data <= filtroData.fim;
      })();
      return matchStatus && matchSearch && matchData;
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

      <div className="flex items-center justify-between">
        <div className="text-sm text-slate-500 font-medium">
          {filtradas.length} conta(s) · Total: <span className="text-slate-800">R$ {totalFiltrado.toFixed(2)}</span>
        </div>
        {filtradas.length > 0 && (
          <button onClick={toggleTodas} className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1">
            <Checkbox checked={selecionadas.size === filtradas.length && filtradas.length > 0} onCheckedChange={toggleTodas} className="w-3.5 h-3.5" />
            Selecionar todos
          </button>
        )}
      </div>

      {selecionadas.size > 0 && (
        <div className="flex items-center justify-between bg-red-50 border border-red-200 rounded-lg px-4 py-2">
          <span className="text-sm font-medium text-red-700">{selecionadas.size} selecionada(s)</span>
          <div className="flex gap-2">
            <Button size="sm" variant="ghost" onClick={() => setSelecionadas(new Set())} className="text-slate-500 h-7 text-xs">Cancelar</Button>
            <Button size="sm" onClick={() => setShowConfirmLote(true)} className="bg-red-600 hover:bg-red-700 h-7 text-xs gap-1">
              <Trash2 className="w-3 h-3" /> Excluir {selecionadas.size}
            </Button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>
      ) : filtradas.length === 0 ? (
        <div className="text-center py-12 text-slate-400">Nenhuma conta encontrada</div>
      ) : (
        filtradas.map(conta => (
          <Card key={conta.id} className={`hover:shadow-md transition-all ${selecionadas.has(conta.id) ? 'ring-2 ring-red-400 bg-red-50/30' : ''}`}>
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <Checkbox
                  checked={selecionadas.has(conta.id)}
                  onCheckedChange={() => toggleSelecionada(conta.id)}
                  className="mt-1 flex-shrink-0"
                />
                <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setSelecionada(conta)}>
                  <p className="font-semibold text-slate-800 truncate">{conta.cliente_nome}</p>
                  <p className="text-sm text-slate-500 truncate">{conta.descricao}</p>
                  <p className="text-xs text-slate-400 mt-1">
                    Vence: {conta.data_vencimento ? format(new Date(conta.data_vencimento), 'dd/MM/yyyy') : '-'}
                  </p>
                </div>
                <div className="flex items-start gap-2 flex-shrink-0">
                  <div className="text-right cursor-pointer" onClick={() => setSelecionada(conta)}>
                    <p className="font-bold text-slate-800">R$ {(conta.valor_total || 0).toFixed(2)}</p>
                    <Badge className={`text-xs mt-1 ${STATUS_COLORS[conta.status]}`}>{STATUS_LABELS[conta.status]}</Badge>
                  </div>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button size="icon" variant="ghost" className="w-7 h-7 text-slate-400 hover:text-red-500 flex-shrink-0">
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Excluir conta?</AlertDialogTitle>
                        <AlertDialogDescription>{conta.cliente_nome} — R$ {(conta.valor_total||0).toFixed(2)}<br />Esta ação não pode ser desfeita.</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={() => deleteMutation.mutate(conta.id)} className="bg-red-600 hover:bg-red-700">Excluir</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </CardContent>
          </Card>
        ))
      )}

      {/* Modal detalhe */}
      {selecionada && <DetalheContaModal
        conta={selecionada}
        onClose={() => setSelecionada(null)}
        onBaixar={(formaPagamento) => baixarMutation.mutate({ conta: selecionada, formaPagamento })}
        isLoading={baixarMutation.isPending}
      />}

      <NovaContaReceberModal open={showNova} onClose={() => setShowNova(false)} onSaved={() => { setShowNova(false); qc.invalidateQueries(['contas-receber']); }} />

      <AlertDialog open={showConfirmLote} onOpenChange={setShowConfirmLote}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir {selecionadas.size} conta(s)?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita. Todas as contas selecionadas serão removidas permanentemente.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletandoLote}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={deletarLote} disabled={deletandoLote} className="bg-red-600 hover:bg-red-700">
              {deletandoLote ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Excluir todos
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function DetalheContaModal({ conta, onClose, onBaixar, isLoading }) {
  const [formaPagamento, setFormaPagamento] = useState(conta.forma_pagamento !== 'faturado' ? (conta.forma_pagamento || 'pix') : 'pix');
  const isPendente = conta.status === 'pendente' || conta.status === 'vencido' || conta.status === 'parcial';

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>{conta.cliente_nome}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div><span className="text-slate-500">Valor:</span> <span className="font-bold">R$ {(conta.valor_total || 0).toFixed(2)}</span></div>
            <div><span className="text-slate-500">Status:</span> <Badge className={STATUS_COLORS[conta.status]}>{STATUS_LABELS[conta.status]}</Badge></div>
            <div><span className="text-slate-500">Vencimento:</span> <span>{conta.data_vencimento ? format(new Date(conta.data_vencimento), 'dd/MM/yyyy') : '-'}</span></div>
            <div><span className="text-slate-500">Origem:</span> <span>{conta.atendimento_id ? 'Atendimento' : 'Manual'}</span></div>
          </div>
          {conta.descricao && <p className="text-sm text-slate-600">{conta.descricao}</p>}
          {isPendente && (
            <div className="space-y-2 pt-2 border-t">
              <Label className="text-sm font-medium">Forma de Recebimento</Label>
              <div className="flex flex-wrap gap-1">
                {['dinheiro','pix','cartao_credito','cartao_debito','transferencia','boleto'].map(f => (
                  <button
                    key={f}
                    onClick={() => setFormaPagamento(f)}
                    className={`px-2 py-1 rounded text-xs border transition-all ${formaPagamento === f ? 'bg-green-600 text-white border-green-600' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                  >
                    {f.replace('_', ' ')}
                  </button>
                ))}
              </div>
              <Button
                onClick={() => onBaixar(formaPagamento)}
                disabled={isLoading}
                className="w-full bg-green-600 hover:bg-green-700"
              >
                {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
                Confirmar Recebimento
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
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