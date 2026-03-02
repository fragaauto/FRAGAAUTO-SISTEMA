import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { ShoppingCart, Plus, Package, AlertTriangle, Check, Loader2, Trash2 } from 'lucide-react';
import { format } from 'date-fns';

const TABS = [
  { id: 'lista', label: '📋 Lista de Compras' },
  { id: 'historico', label: '📦 Histórico' },
  { id: 'estoque', label: '⚠️ Estoque Baixo' },
];

export default function Compras() {
  const [tab, setTab] = useState('lista');
  const qc = useQueryClient();
  const [showNova, setShowNova] = useState(false);

  const { data: produtos = [] } = useQuery({
    queryKey: ['produtos-estoque'],
    queryFn: () => base44.entities.Produto.filter({ ativo: true }),
    staleTime: 60 * 1000,
  });

  const { data: compras = [], isLoading } = useQuery({
    queryKey: ['compras'],
    queryFn: () => base44.entities.Compra.list('-created_date', 100),
    staleTime: 60 * 1000,
  });

  const estoqueBaixo = produtos.filter(p => p.controla_estoque && (p.estoque_atual || 0) <= (p.estoque_minimo || 0));
  const estouqueZerado = produtos.filter(p => p.controla_estoque && (p.estoque_atual || 0) <= 0);

  const confirmarCompraMutation = useMutation({
    mutationFn: async (compra) => {
      // Dar entrada no estoque
      const movimentos = compra.itens.map(item => ({
        produto_id: item.produto_id,
        produto_nome: item.produto_nome,
        tipo: 'entrada',
        quantidade: item.quantidade,
        custo_unitario: item.valor_unitario,
        compra_id: compra.id,
        data_movimento: new Date().toISOString(),
      }));
      await base44.entities.MovimentoEstoque.bulkCreate(movimentos);

      // Atualizar estoque dos produtos
      for (const item of compra.itens) {
        if (item.produto_id) {
          const prod = produtos.find(p => p.id === item.produto_id);
          if (prod?.controla_estoque) {
            const novoEstoque = (prod.estoque_atual || 0) + item.quantidade;
            const novoCusto = prod.custo
              ? ((prod.custo * (prod.estoque_atual || 0)) + (item.valor_unitario * item.quantidade)) / novoEstoque
              : item.valor_unitario;
            await base44.entities.Produto.update(item.produto_id, { estoque_atual: novoEstoque, custo: novoCusto });
          }
        }
      }

      // Gerar conta a pagar
      await base44.entities.ContaPagar.create({
        fornecedor: compra.fornecedor,
        descricao: `Compra NF: ${compra.numero_nf || 'S/N'} - ${compra.fornecedor}`,
        valor: compra.valor_total,
        data_vencimento: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'pendente',
        compra_id: compra.id,
        categoria: 'fornecedor_pecas',
      });

      await base44.entities.Compra.update(compra.id, { status: 'confirmada' });
    },
    onSuccess: () => {
      toast.success('Entrada no estoque confirmada! Conta a pagar gerada.');
      qc.invalidateQueries(['compras']);
      qc.invalidateQueries(['produtos-estoque']);
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2 mb-3">
            <ShoppingCart className="w-5 h-5 text-blue-600" />
            Compras & Estoque
          </h1>
          <div className="flex gap-1 overflow-x-auto pb-1">
            {TABS.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${tab === t.id ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}>
                {t.label}
                {t.id === 'estoque' && estoqueBaixo.length > 0 && (
                  <span className="ml-1 bg-red-500 text-white text-xs rounded-full px-1.5">{estoqueBaixo.length}</span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-4">
        {tab === 'lista' && (
          <div className="space-y-4">
            <Button onClick={() => setShowNova(true)} className="w-full bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-2" /> Nova Compra / Entrada de Estoque
            </Button>

            <div className="space-y-3">
              {isLoading ? (
                <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>
              ) : compras.filter(c => c.status === 'rascunho').length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                  <Package className="w-12 h-12 mx-auto mb-2 text-slate-300" />
                  <p>Nenhuma compra em rascunho</p>
                </div>
              ) : (
                compras.filter(c => c.status === 'rascunho').map(compra => (
                  <Card key={compra.id} className="border-2 border-blue-100">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="font-semibold text-slate-800">{compra.fornecedor}</p>
                          <p className="text-sm text-slate-500">{compra.numero_nf ? `NF: ${compra.numero_nf}` : 'Sem NF'} · {compra.itens?.length || 0} itens</p>
                          <p className="text-xs text-slate-400">{compra.created_date ? format(new Date(compra.created_date), 'dd/MM/yyyy') : ''}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-lg text-slate-800">R$ {(compra.valor_total || 0).toFixed(2)}</p>
                          <Badge className="bg-yellow-100 text-yellow-800">Rascunho</Badge>
                        </div>
                      </div>
                      <div className="space-y-1 mb-3">
                        {(compra.itens || []).map((item, i) => (
                          <div key={i} className="flex justify-between text-sm text-slate-600">
                            <span>{item.produto_nome} x{item.quantidade}</span>
                            <span>R$ {(item.valor_total || 0).toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                      <Button
                        onClick={() => confirmarCompraMutation.mutate(compra)}
                        disabled={confirmarCompraMutation.isPending}
                        className="w-full bg-green-600 hover:bg-green-700"
                        size="sm"
                      >
                        {confirmarCompraMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Check className="w-4 h-4 mr-2" />}
                        Confirmar Entrada no Estoque
                      </Button>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>
        )}

        {tab === 'historico' && (
          <div className="space-y-3">
            {compras.filter(c => c.status === 'confirmada').map(compra => (
              <Card key={compra.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold text-slate-800">{compra.fornecedor}</p>
                      <p className="text-sm text-slate-500">{compra.numero_nf ? `NF: ${compra.numero_nf}` : 'Sem NF'} · {compra.itens?.length || 0} itens</p>
                      <p className="text-xs text-slate-400">{compra.created_date ? format(new Date(compra.created_date), 'dd/MM/yyyy') : ''}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-slate-800">R$ {(compra.valor_total || 0).toFixed(2)}</p>
                      <Badge className="bg-green-100 text-green-800">Confirmada</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            {compras.filter(c => c.status === 'confirmada').length === 0 && (
              <div className="text-center py-12 text-slate-400">Nenhuma compra confirmada</div>
            )}
          </div>
        )}

        {tab === 'estoque' && (
          <div className="space-y-3">
            {estoqueBaixo.length === 0 ? (
              <div className="text-center py-12 text-green-600">
                <Check className="w-12 h-12 mx-auto mb-2" />
                <p className="font-semibold">Estoque em dia!</p>
              </div>
            ) : (
              estoqueBaixo.map(prod => (
                <Card key={prod.id} className={`border-2 ${(prod.estoque_atual || 0) <= 0 ? 'border-red-200 bg-red-50' : 'border-orange-200 bg-orange-50'}`}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-slate-800">{prod.nome}</p>
                        <p className="text-sm text-slate-500">{prod.codigo} · {prod.categoria}</p>
                      </div>
                      <div className="text-right">
                        <p className={`font-bold text-lg ${(prod.estoque_atual || 0) <= 0 ? 'text-red-600' : 'text-orange-600'}`}>
                          {prod.estoque_atual || 0}
                        </p>
                        <p className="text-xs text-slate-500">mín: {prod.estoque_minimo || 0}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}
      </div>

      <NovaCompraModal
        open={showNova}
        onClose={() => setShowNova(false)}
        produtos={produtos}
        onSaved={() => { setShowNova(false); qc.invalidateQueries(['compras']); }}
      />
    </div>
  );
}

function NovaCompraModal({ open, onClose, produtos, onSaved }) {
  const [form, setForm] = useState({ fornecedor: '', numero_nf: '', itens: [] });
  const [saving, setSaving] = useState(false);
  const [busca, setBusca] = useState('');

  const produtosFiltrados = produtos.filter(p => p.nome.toLowerCase().includes(busca.toLowerCase()) || p.codigo.toLowerCase().includes(busca.toLowerCase()));

  const addItem = (prod) => {
    setForm(prev => {
      const existing = prev.itens.find(i => i.produto_id === prod.id);
      if (existing) {
        return { ...prev, itens: prev.itens.map(i => i.produto_id === prod.id ? { ...i, quantidade: i.quantidade + 1, valor_total: (i.quantidade + 1) * i.valor_unitario } : i) };
      }
      return { ...prev, itens: [...prev.itens, { produto_id: prod.id, produto_nome: prod.nome, quantidade: 1, valor_unitario: prod.custo || prod.valor || 0, valor_total: prod.custo || prod.valor || 0 }] };
    });
    setBusca('');
  };

  const updateItem = (i, field, val) => {
    setForm(prev => {
      const itens = [...prev.itens];
      itens[i] = { ...itens[i], [field]: parseFloat(val) || 0 };
      itens[i].valor_total = itens[i].quantidade * itens[i].valor_unitario;
      return { ...prev, itens };
    });
  };

  const total = form.itens.reduce((s, i) => s + (i.valor_total || 0), 0);

  const save = async () => {
    if (!form.fornecedor || form.itens.length === 0) return toast.error('Informe fornecedor e ao menos 1 item');
    setSaving(true);
    await base44.entities.Compra.create({ ...form, valor_total: total, status: 'rascunho', data_compra: new Date().toISOString() });
    setSaving(false);
    setForm({ fornecedor: '', numero_nf: '', itens: [] });
    onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Nova Entrada de Compra</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div><Label>Fornecedor *</Label><Input value={form.fornecedor} onChange={e => setForm(p => ({ ...p, fornecedor: e.target.value }))} /></div>
            <div><Label>Nº NF</Label><Input value={form.numero_nf} onChange={e => setForm(p => ({ ...p, numero_nf: e.target.value }))} /></div>
          </div>

          <div>
            <Label>Buscar Produto</Label>
            <Input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Digite o nome ou código..." />
            {busca && (
              <div className="mt-1 border rounded-lg max-h-40 overflow-y-auto bg-white shadow-lg">
                {produtosFiltrados.slice(0, 8).map(p => (
                  <button key={p.id} onClick={() => addItem(p)}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50 border-b last:border-0">
                    <span className="font-medium">{p.nome}</span>
                    <span className="text-slate-400 ml-2">{p.codigo}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {form.itens.length > 0 && (
            <div className="space-y-2">
              {form.itens.map((item, i) => (
                <div key={i} className="flex gap-2 items-center p-2 bg-slate-50 rounded-lg">
                  <span className="text-sm flex-1 truncate">{item.produto_nome}</span>
                  <Input type="number" value={item.quantidade} onChange={e => updateItem(i, 'quantidade', e.target.value)} className="w-16 text-center" min={1} />
                  <Input type="number" value={item.valor_unitario} onChange={e => updateItem(i, 'valor_unitario', e.target.value)} className="w-24" placeholder="R$" />
                  <Button size="icon" variant="ghost" onClick={() => setForm(p => ({ ...p, itens: p.itens.filter((_, idx) => idx !== i) }))}>
                    <Trash2 className="w-4 h-4 text-red-400" />
                  </Button>
                </div>
              ))}
              <div className="text-right font-bold text-sm">Total: R$ {total.toFixed(2)}</div>
            </div>
          )}

          <Button onClick={save} disabled={saving} className="w-full bg-blue-600 hover:bg-blue-700">
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Salvar como Rascunho
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}