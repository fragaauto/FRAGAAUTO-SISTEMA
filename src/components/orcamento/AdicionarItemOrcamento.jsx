import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Search, Plus, Trash2, Save, Loader2 } from 'lucide-react';
import { toast } from "sonner";

export default function AdicionarItemOrcamento({ atendimento, produtos, user, onSave, isLoading }) {
  const [search, setSearch] = useState('');
  const [itensLocais, setItensLocais] = useState([]);
  const [aberto, setAberto] = useState(false);

  const pagamentoLancado = !!atendimento?.status_pagamento;

  if (pagamentoLancado) return null;

  const itensOrcamentoExistentes = atendimento?.itens_orcamento || [];

  const produtosFiltrados = search.length >= 2
    ? produtos.filter(p => {
        const s = search.toLowerCase();
        return (p.nome?.toLowerCase().includes(s) || p.codigo?.toLowerCase().includes(s)) && p.ativo !== false;
      }).slice(0, 10)
    : [];

  const adicionarItem = (produto) => {
    const jaExiste = itensLocais.some(i => i.produto_id === produto.id);
    if (jaExiste) { toast.error('Produto já adicionado'); return; }
    setItensLocais(prev => [...prev, {
      produto_id: produto.id,
      codigo_produto: produto.codigo || '',
      nome: produto.nome,
      quantidade: 1,
      valor_unitario: Number(produto.valor) || 0,
      valor_total: Number(produto.valor) || 0,
      vantagens: produto.vantagens || '',
      desvantagens: produto.desvantagens || '',
      status_aprovacao: 'pendente',
      status_servico: 'aguardando_autorizacao',
      observacao_item: '',
      origem: 'manual',
    }]);
    setSearch('');
  };

  const adicionarItemLivre = () => {
    setItensLocais(prev => [...prev, {
      produto_id: null,
      nome: '',
      quantidade: 1,
      valor_unitario: 0,
      valor_total: 0,
      status_aprovacao: 'pendente',
      status_servico: 'aguardando_autorizacao',
      observacao_item: '',
      origem: 'manual',
    }]);
  };

  const atualizarItem = (idx, field, val) => {
    setItensLocais(prev => {
      const novo = [...prev];
      if (field === 'quantidade') val = Math.max(1, parseInt(val) || 1);
      if (field === 'valor_unitario') val = parseFloat(val) || 0;
      novo[idx] = { ...novo[idx], [field]: val };
      if (field === 'quantidade' || field === 'valor_unitario') {
        novo[idx].valor_total = (novo[idx].quantidade || 1) * (novo[idx].valor_unitario || 0);
      }
      return novo;
    });
  };

  const removerItem = (idx) => setItensLocais(prev => prev.filter((_, i) => i !== idx));

  const handleSalvar = () => {
    for (const item of itensLocais) {
      if (!item.nome?.trim()) { toast.error('Informe o nome de todos os itens'); return; }
      if (item.valor_unitario <= 0) { toast.error(`Informe o valor de "${item.nome}"`); return; }
    }
    const todos = [...itensOrcamentoExistentes, ...itensLocais];
    onSave(todos);
    setItensLocais([]);
    setAberto(false);
  };

  return (
    <Card className="border-blue-200 bg-blue-50/40">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold text-blue-800 flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Adicionar Produtos / Serviços ao Orçamento
          </CardTitle>
          {!aberto && (
            <Button size="sm" onClick={() => setAberto(true)} className="bg-blue-600 hover:bg-blue-700 h-8 text-xs">
              <Plus className="w-3 h-3 mr-1" /> Adicionar
            </Button>
          )}
        </div>
      </CardHeader>

      {aberto && (
        <CardContent className="space-y-4">
          {/* Busca produto */}
          <div>
            <Label className="text-xs text-slate-600 mb-1 block">Buscar produto cadastrado</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                className="pl-9 text-sm"
                placeholder="Digite o nome ou código..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            {produtosFiltrados.length > 0 && (
              <div className="mt-1 border rounded-lg bg-white shadow-sm max-h-48 overflow-y-auto">
                {produtosFiltrados.map(p => (
                  <button
                    key={p.id}
                    onClick={() => adicionarItem(p)}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 flex items-center justify-between border-b last:border-b-0"
                  >
                    <span>
                      {p.codigo && <span className="text-slate-400 mr-1">{p.codigo} -</span>}
                      {p.nome}
                    </span>
                    <span className="text-green-700 font-semibold text-xs ml-2 whitespace-nowrap">R$ {p.valor?.toFixed(2)}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <div className="flex-1 h-px bg-slate-200" />
            <span className="text-xs text-slate-400">ou</span>
            <div className="flex-1 h-px bg-slate-200" />
          </div>

          <Button size="sm" variant="outline" onClick={adicionarItemLivre} className="w-full text-xs border-dashed">
            <Plus className="w-3 h-3 mr-1" /> Adicionar item livre (sem cadastro)
          </Button>

          {/* Itens a adicionar */}
          {itensLocais.length > 0 && (
            <div className="space-y-3">
              <p className="text-xs font-semibold text-slate-600">Itens a adicionar ({itensLocais.length})</p>
              {itensLocais.map((item, idx) => (
                <div key={idx} className="p-3 bg-white border border-slate-200 rounded-lg space-y-2">
                  <div className="flex items-center justify-between">
                    {item.produto_id ? (
                      <p className="text-sm font-medium text-slate-800">{item.nome}</p>
                    ) : (
                      <Input
                        className="text-sm h-8 flex-1 mr-2"
                        placeholder="Nome do serviço / produto"
                        value={item.nome}
                        onChange={e => atualizarItem(idx, 'nome', e.target.value)}
                      />
                    )}
                    <Button size="icon" variant="ghost" onClick={() => removerItem(idx)} className="h-7 w-7 text-red-400 flex-shrink-0">
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs">Qtd</Label>
                      <Input type="number" min="1" value={item.quantidade}
                        onChange={e => atualizarItem(idx, 'quantidade', e.target.value)}
                        className="h-8 text-sm" />
                    </div>
                    <div>
                      <Label className="text-xs">Valor Unitário (R$)</Label>
                      <Input type="number" step="0.01" min="0" value={item.valor_unitario}
                        onChange={e => atualizarItem(idx, 'valor_unitario', e.target.value)}
                        className="h-8 text-sm" />
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <Input
                      className="text-xs h-7 flex-1 mr-2"
                      placeholder="Observações..."
                      value={item.observacao_item}
                      onChange={e => atualizarItem(idx, 'observacao_item', e.target.value)}
                    />
                    <span className="text-xs font-bold text-green-700 whitespace-nowrap">
                      R$ {item.valor_total?.toFixed(2)}
                    </span>
                  </div>
                </div>
              ))}

              <div className="flex items-center justify-between pt-2 border-t">
                <span className="text-sm font-bold text-slate-700">
                  Total a adicionar: R$ {itensLocais.reduce((s, i) => s + (i.valor_total || 0), 0).toFixed(2)}
                </span>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => { setItensLocais([]); setAberto(false); }}>
                    Cancelar
                  </Button>
                  <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={handleSalvar} disabled={isLoading}>
                    {isLoading ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Save className="w-3 h-3 mr-1" />}
                    Salvar no Orçamento
                  </Button>
                </div>
              </div>
            </div>
          )}

          {itensLocais.length === 0 && (
            <div className="flex justify-end">
              <Button size="sm" variant="ghost" className="text-xs" onClick={() => setAberto(false)}>Fechar</Button>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}