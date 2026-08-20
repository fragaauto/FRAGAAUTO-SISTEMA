import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { X, Save, Tag, MapPin, Building2, Package, Plus, Loader2, Pencil, Check } from 'lucide-react';

export default function EditarProdutoItemCard({ it, idx, produtos, onUpdateItem, onRemoveItem, onProdutoAtualizado }) {
  const prod = produtos.find(p => p.id === it.produto_id);
  const [editandoLocal, setEditandoLocal] = useState(false);
  const [editandoEstoque, setEditandoEstoque] = useState(false);
  const [novaLocal, setNovaLocal] = useState(prod?.localizacao_estoque || '');
  const [novoEstoque, setNovoEstoque] = useState(prod?.estoque_atual || 0);
  const [salvandoLocal, setSalvandoLocal] = useState(false);
  const [salvandoEstoque, setSalvandoEstoque] = useState(false);

  const [addForn, setAddForn] = useState(false);
  const [novoForn, setNovoForn] = useState({ nome: '', codigo: '', preco: '' });
  const [salvandoForn, setSalvandoForn] = useState(false);

  const salvarLocal = async () => {
    if (!prod) return;
    setSalvandoLocal(true);
    try {
      await base44.entities.Produto.update(prod.id, { localizacao_estoque: novaLocal.trim() });
      toast.success('Localização atualizada!');
      setEditandoLocal(false);
      if (onProdutoAtualizado) onProdutoAtualizado();
    } catch (e) {
      toast.error('Erro ao salvar localização');
    }
    setSalvandoLocal(false);
  };

  const salvarEstoque = async () => {
    if (!prod) return;
    setSalvandoEstoque(true);
    try {
      await base44.entities.Produto.update(prod.id, { estoque_atual: parseInt(novoEstoque) || 0 });
      toast.success('Estoque atualizado!');
      setEditandoEstoque(false);
      if (onProdutoAtualizado) onProdutoAtualizado();
    } catch (e) {
      toast.error('Erro ao salvar estoque');
    }
    setSalvandoEstoque(false);
  };

  const salvarFornecedor = async () => {
    if (!prod) return;
    if (!novoForn.codigo.trim()) return toast.error('Informe o código do fornecedor');
    setSalvandoForn(true);
    try {
      const fns = [...(prod.fornecedores || [])];
      const item = {
        fornecedor_nome: novoForn.nome.trim(),
        codigo_fornecedor: novoForn.codigo.trim(),
        principal: fns.length === 0,
      };
      if (novoForn.preco) {
        const preco = parseFloat(novoForn.preco.replace(',', '.'));
        if (preco > 0) item.preco_compra = preco;
      }
      fns.push(item);
      await base44.entities.Produto.update(prod.id, { fornecedores: fns });
      toast.success('Fornecedor adicionado!');
      setAddForn(false);
      setNovoForn({ nome: '', codigo: '', preco: '' });
      if (onProdutoAtualizado) onProdutoAtualizado();
    } catch (e) {
      toast.error('Erro ao salvar fornecedor');
    }
    setSalvandoForn(false);
  };

  return (
    <div className="bg-white border rounded-lg p-2.5 space-y-2.5">
      {/* Nome + remover */}
      <div className="flex items-start justify-between gap-2">
        <span className="text-sm font-medium break-words flex-1 min-w-0">{it.produto_nome}</span>
        <button onClick={() => onRemoveItem(idx)} className="flex-shrink-0 mt-0.5">
          <X className="w-4 h-4 text-red-400 hover:text-red-600" />
        </button>
      </div>

      {/* Código + Localização + Estoque */}
      <div className="flex flex-wrap gap-x-3 gap-y-1.5 text-xs">
        {prod?.codigo && (
          <span className="flex items-center gap-1 text-slate-600">
            <Tag className="w-3 h-3" /> Cód: <strong>{prod.codigo}</strong>
          </span>
        )}
        {/* Localização editável */}
        {editandoLocal ? (
          <span className="flex items-center gap-1">
            <MapPin className="w-3 h-3 text-blue-600" />
            <Input
              value={novaLocal}
              onChange={e => setNovaLocal(e.target.value)}
              className="h-7 w-28 text-xs px-1.5"
              placeholder="Localização"
              autoFocus
            />
            <button onClick={salvarLocal} disabled={salvandoLocal} className="text-green-600 hover:text-green-800">
              {salvandoLocal ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
            </button>
            <button onClick={() => { setEditandoLocal(false); setNovaLocal(prod?.localizacao_estoque || ''); }} className="text-slate-400 hover:text-red-400">
              <X className="w-3.5 h-3.5" />
            </button>
          </span>
        ) : (
          <button onClick={() => { setEditandoLocal(true); setNovaLocal(prod?.localizacao_estoque || ''); }} className="flex items-center gap-1 text-blue-600 hover:text-blue-800">
            <MapPin className="w-3 h-3" />
            {prod?.localizacao_estoque || 'Definir localização'}
            <Pencil className="w-2.5 h-2.5 opacity-60" />
          </button>
        )}
        {/* Estoque editável */}
        {editandoEstoque ? (
          <span className="flex items-center gap-1">
            <Package className="w-3 h-3 text-amber-600" />
            <Input
              type="number"
              min={0}
              value={novoEstoque}
              onChange={e => setNovoEstoque(e.target.value)}
              className="h-7 w-16 text-xs px-1.5 text-center"
              autoFocus
            />
            <button onClick={salvarEstoque} disabled={salvandoEstoque} className="text-green-600 hover:text-green-800">
              {salvandoEstoque ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
            </button>
            <button onClick={() => { setEditandoEstoque(false); setNovoEstoque(prod?.estoque_atual || 0); }} className="text-slate-400 hover:text-red-400">
              <X className="w-3.5 h-3.5" />
            </button>
          </span>
        ) : (
          <button onClick={() => { setEditandoEstoque(true); setNovoEstoque(prod?.estoque_atual || 0); }} className="flex items-center gap-1 text-amber-600 hover:text-amber-800">
            <Package className="w-3 h-3" />
            Estoque: <strong>{prod?.estoque_atual ?? 0}</strong>
            <Pencil className="w-2.5 h-2.5 opacity-60" />
          </button>
        )}
      </div>

      {/* Fornecedores */}
      <div className="space-y-1">
        {(prod?.fornecedores || []).filter(f => f.codigo_fornecedor).length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {(prod?.fornecedores || []).filter(f => f.codigo_fornecedor).map((f, i) => (
              <span key={i} className="flex items-center gap-1 text-xs text-purple-700 bg-purple-50 border border-purple-200 rounded px-1.5 py-0.5">
                <Building2 className="w-3 h-3" />
                {f.fornecedor_nome && <strong>{f.fornecedor_nome}</strong>}
                <span>Cód: <strong>{f.codigo_fornecedor}</strong></span>
                {f.preco_compra > 0 && <span className="text-green-700 font-semibold">· R$ {f.preco_compra.toFixed(2)}</span>}
              </span>
            ))}
          </div>
        )}
        {/* Adicionar fornecedor */}
        {addForn ? (
          <div className="flex flex-wrap items-center gap-1.5 bg-slate-50 border border-orange-200 rounded-lg p-2">
            <Input
              className="h-7 flex-1 min-w-[100px] text-xs px-1.5"
              placeholder="Nome fornecedor"
              value={novoForn.nome}
              onChange={e => setNovoForn(p => ({ ...p, nome: e.target.value }))}
              autoFocus
            />
            <Input
              className="h-7 w-24 text-xs px-1.5"
              placeholder="Cód. fornecedor"
              value={novoForn.codigo}
              onChange={e => setNovoForn(p => ({ ...p, codigo: e.target.value }))}
            />
            <Input
              className="h-7 w-20 text-xs px-1.5"
              placeholder="Preço"
              value={novoForn.preco}
              onChange={e => setNovoForn(p => ({ ...p, preco: e.target.value }))}
              onKeyDown={e => e.key === 'Enter' && salvarFornecedor()}
            />
            <button onClick={salvarFornecedor} disabled={salvandoForn} className="text-green-600 hover:text-green-800 flex-shrink-0">
              {salvandoForn ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            </button>
            <button onClick={() => { setAddForn(false); setNovoForn({ nome: '', codigo: '', preco: '' }); }} className="text-slate-400 hover:text-red-400 flex-shrink-0">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => setAddForn(true)}
            className="flex items-center gap-1 text-xs text-orange-500 hover:text-orange-700 underline underline-offset-2"
          >
            <Plus className="w-3 h-3" /> Adicionar fornecedor
          </button>
        )}
      </div>

      {/* Qtd + Obs */}
      <div className="flex gap-2 items-center pt-1 border-t border-slate-100">
        <Input type="number" min={1} value={it.quantidade}
          onChange={e => onUpdateItem(idx, 'quantidade', parseInt(e.target.value) || 1)}
          className="w-16 text-center h-8 flex-shrink-0" />
        <Input value={it.obs || ''} onChange={e => onUpdateItem(idx, 'obs', e.target.value)} placeholder="Obs..." className="flex-1 min-w-0 h-8 text-xs" />
      </div>
    </div>
  );
}