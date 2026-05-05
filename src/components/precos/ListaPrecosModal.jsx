import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Search, Check, X, Plus, Minus } from 'lucide-react';
import { toast } from "sonner";
import { useUnidade } from '@/lib/UnidadeContext';

export default function ListaPrecosModal({ lista, onSave, onClose, isSaving }) {
  const { unidadeAtual } = useUnidade();

  const [formData, setFormData] = useState({
    nome: '',
    descricao: '',
    tipo: 'geral',
    ajuste_tipo: 'percentual',
    ajuste_valor: 0,
    itens: [],
    cliente_ids: [],
    grupo_ids: [],
    ativa: true,
  });

  const [searchProduto, setSearchProduto] = useState('');
  const [searchCliente, setSearchCliente] = useState('');

  useEffect(() => {
    if (lista) {
      setFormData({
        nome: lista.nome || '',
        descricao: lista.descricao || '',
        tipo: lista.tipo || 'geral',
        ajuste_tipo: lista.ajuste_tipo || 'percentual',
        ajuste_valor: lista.ajuste_valor ?? 0,
        itens: lista.itens || [],
        cliente_ids: lista.cliente_ids || [],
        grupo_ids: lista.grupo_ids || [],
        ativa: lista.ativa !== false,
      });
    }
  }, [lista]);

  const { data: produtos = [] } = useQuery({
    queryKey: ['produtos'],
    queryFn: () => base44.entities.Produto.list('', 3000),
    staleTime: 5 * 60 * 1000,
  });

  const { data: clientes = [] } = useQuery({
    queryKey: ['clientes'],
    queryFn: () => base44.entities.Cliente.list('-created_date'),
    staleTime: 5 * 60 * 1000,
  });

  const { data: grupos = [] } = useQuery({
    queryKey: ['grupos-clientes', unidadeAtual?.id],
    queryFn: () => base44.entities.GrupoClientes.filter({ unidade_id: unidadeAtual?.id }),
    enabled: !!unidadeAtual?.id,
  });

  const produtosFiltrados = produtos.filter(p =>
    !searchProduto || p.nome?.toLowerCase().includes(searchProduto.toLowerCase()) || p.codigo?.toLowerCase().includes(searchProduto.toLowerCase())
  );

  const clientesFiltrados = clientes.filter(c =>
    !searchCliente || c.nome?.toLowerCase().includes(searchCliente.toLowerCase()) || c.telefone?.includes(searchCliente)
  );

  const toggleProduto = (produto) => {
    const exists = formData.itens.find(i => i.produto_id === produto.id);
    if (exists) {
      setFormData(p => ({ ...p, itens: p.itens.filter(i => i.produto_id !== produto.id) }));
    } else {
      setFormData(p => ({
        ...p,
        itens: [...p.itens, {
          produto_id: produto.id,
          produto_nome: produto.nome,
          produto_codigo: produto.codigo || '',
          preco_original: produto.valor,
          preco_customizado: produto.valor,
        }]
      }));
    }
  };

  const updatePrecoItem = (produto_id, preco) => {
    setFormData(p => ({
      ...p,
      itens: p.itens.map(i => i.produto_id === produto_id ? { ...i, preco_customizado: parseFloat(preco) || 0 } : i)
    }));
  };

  const toggleCliente = (id) => {
    setFormData(p => ({
      ...p,
      cliente_ids: p.cliente_ids.includes(id) ? p.cliente_ids.filter(c => c !== id) : [...p.cliente_ids, id]
    }));
  };

  const toggleGrupo = (id) => {
    setFormData(p => ({
      ...p,
      grupo_ids: p.grupo_ids.includes(id) ? p.grupo_ids.filter(g => g !== id) : [...p.grupo_ids, id]
    }));
  };

  const handleSave = () => {
    if (!formData.nome) return toast.error('Informe o nome da lista');
    if (formData.tipo === 'selecionados' && formData.itens.length === 0) return toast.error('Selecione ao menos um produto');
    onSave(formData);
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{lista ? 'Editar Lista de Preços' : 'Nova Lista de Preços'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {/* Dados básicos */}
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2"><Label>Nome *</Label><Input value={formData.nome} onChange={e => setFormData(p => ({ ...p, nome: e.target.value }))} placeholder="Ex: Tabela VIP" /></div>
            <div className="col-span-2"><Label>Descrição</Label><Input value={formData.descricao} onChange={e => setFormData(p => ({ ...p, descricao: e.target.value }))} placeholder="Descrição opcional" /></div>
          </div>

          {/* Tipo de lista */}
          <div>
            <Label>Tipo da Lista</Label>
            <div className="grid grid-cols-2 gap-2 mt-1">
              <button type="button" onClick={() => setFormData(p => ({ ...p, tipo: 'geral' }))}
                className={`py-3 px-4 rounded-lg border-2 text-sm font-medium transition-all text-left ${formData.tipo === 'geral' ? 'border-orange-500 bg-orange-50 text-orange-700' : 'border-slate-200 text-slate-500'}`}>
                <p className="font-semibold">🌐 Geral</p>
                <p className="text-xs font-normal mt-0.5">Aplica ajuste a todos os produtos</p>
              </button>
              <button type="button" onClick={() => setFormData(p => ({ ...p, tipo: 'selecionados' }))}
                className={`py-3 px-4 rounded-lg border-2 text-sm font-medium transition-all text-left ${formData.tipo === 'selecionados' ? 'border-orange-500 bg-orange-50 text-orange-700' : 'border-slate-200 text-slate-500'}`}>
                <p className="font-semibold">📋 Produtos Selecionados</p>
                <p className="text-xs font-normal mt-0.5">Escolha produtos e defina preços individuais</p>
              </button>
            </div>
          </div>

          {/* Configuração GERAL */}
          {formData.tipo === 'geral' && (
            <div className="p-4 bg-slate-50 rounded-lg border space-y-3">
              <p className="text-sm font-semibold text-slate-700">Ajuste de Preço</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Tipo de Ajuste</Label>
                  <Select value={formData.ajuste_tipo} onValueChange={v => setFormData(p => ({ ...p, ajuste_tipo: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percentual">Percentual (%)</SelectItem>
                      <SelectItem value="fixo">Valor Fixo (R$)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Valor (negativo = desconto)</Label>
                  <Input type="number" step="0.01" value={formData.ajuste_valor}
                    onChange={e => setFormData(p => ({ ...p, ajuste_valor: parseFloat(e.target.value) || 0 }))}
                    placeholder="-10 = 10% de desconto" />
                </div>
              </div>
              {formData.ajuste_valor !== 0 && (
                <p className="text-xs text-slate-500">
                  Exemplo: produto R$ 100,00 → R$ {formData.ajuste_tipo === 'percentual'
                    ? (100 * (1 + formData.ajuste_valor / 100)).toFixed(2)
                    : (100 + formData.ajuste_valor).toFixed(2)}
                </p>
              )}
            </div>
          )}

          {/* Configuração SELECIONADOS */}
          {formData.tipo === 'selecionados' && (
            <div className="space-y-2">
              <Label>Produtos ({formData.itens.length} selecionado(s))</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input placeholder="Buscar produto..." value={searchProduto} onChange={e => setSearchProduto(e.target.value)} className="pl-9" />
              </div>
              <div className="max-h-40 overflow-y-auto border rounded-lg divide-y">
                {produtosFiltrados.map(p => {
                  const selecionado = formData.itens.find(i => i.produto_id === p.id);
                  return (
                    <button key={p.id} type="button" onClick={() => toggleProduto(p)}
                      className={`w-full text-left px-3 py-2 flex items-center justify-between hover:bg-slate-50 ${selecionado ? 'bg-orange-50' : ''}`}>
                      <div>
                        <p className="text-sm font-medium">{p.nome}</p>
                        <p className="text-xs text-slate-500">{p.codigo} · R$ {p.valor?.toFixed(2)}</p>
                      </div>
                      {selecionado && <Check className="w-4 h-4 text-orange-500 flex-shrink-0" />}
                    </button>
                  );
                })}
              </div>

              {formData.itens.length > 0 && (
                <div className="border rounded-lg divide-y mt-2">
                  <div className="px-3 py-2 bg-slate-50 text-xs font-semibold text-slate-600 flex justify-between">
                    <span>Produto</span><span>Preço Customizado</span>
                  </div>
                  {formData.itens.map(item => (
                    <div key={item.produto_id} className="px-3 py-2 flex items-center justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{item.produto_nome}</p>
                        <p className="text-xs text-slate-500">Original: R$ {item.preco_original?.toFixed(2)}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-400">R$</span>
                        <Input type="number" step="0.01" min="0" value={item.preco_customizado}
                          onChange={e => updatePrecoItem(item.produto_id, e.target.value)}
                          className="w-24 h-8 text-sm" />
                        <button type="button" onClick={() => toggleProduto({ id: item.produto_id })} className="text-red-400 hover:text-red-600">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Vincular a Clientes e Grupos */}
          <div className="space-y-3">
            <p className="text-sm font-semibold text-slate-700">Vincular a Clientes / Grupos</p>

            {/* Grupos */}
            {grupos.length > 0 && (
              <div>
                <Label className="text-xs text-slate-500">Grupos de Clientes</Label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {grupos.map(g => {
                    const sel = formData.grupo_ids.includes(g.id);
                    return (
                      <button key={g.id} type="button" onClick={() => toggleGrupo(g.id)}
                        className={`text-xs px-3 py-1.5 rounded-full border transition-all ${sel ? 'bg-orange-500 border-orange-500 text-white' : 'border-slate-200 text-slate-600 hover:border-orange-300'}`}>
                        👥 {g.nome}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Clientes individuais */}
            <div>
              <Label className="text-xs text-slate-500">Clientes Individuais ({formData.cliente_ids.length} selecionado(s))</Label>
              <div className="relative mt-1 mb-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input placeholder="Buscar cliente..." value={searchCliente} onChange={e => setSearchCliente(e.target.value)} className="pl-9 h-8 text-sm" />
              </div>
              <div className="max-h-36 overflow-y-auto border rounded-lg divide-y">
                {clientesFiltrados.map(c => {
                  const sel = formData.cliente_ids.includes(c.id);
                  return (
                    <button key={c.id} type="button" onClick={() => toggleCliente(c.id)}
                      className={`w-full text-left px-3 py-2 flex items-center justify-between hover:bg-slate-50 ${sel ? 'bg-orange-50' : ''}`}>
                      <div>
                        <p className="text-sm font-medium">{c.nome}</p>
                        <p className="text-xs text-slate-500">{c.telefone}</p>
                      </div>
                      {sel && <Check className="w-4 h-4 text-orange-500" />}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave} disabled={isSaving} className="bg-orange-500 hover:bg-orange-600">
            {isSaving ? 'Salvando...' : 'Salvar Lista'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}