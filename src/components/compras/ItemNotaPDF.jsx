import React, { useState } from 'react';
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Check, Link2, Search, Unlink, X } from 'lucide-react';
import { filtrarProdutos, codigosIguais } from '@/lib/produtoSearch';

const money = (v) => `R$ ${(Number(v) || 0).toFixed(2)}`;

export default function ItemNotaPDF({ item, produtos, fornecedor, onChange, onVincular, onDesvincular, onIgnorar }) {
  const [busca, setBusca] = useState('');
  const [abrirBusca, setAbrirBusca] = useState(false);
  const produto = produtos.find((p) => p.id === item.produto_id) || null;

  const custoAtual = Number(produto?.custo) || 0;
  const custoNovo = Number(item.custo_unitario) || 0;
  const custoMudou = !!produto && custoAtual > 0 && Math.abs(custoNovo - custoAtual) >= 0.01;
  const codigoJaCadastrado =
    !!produto &&
    !!item.codigo &&
    (produto.fornecedores || []).some((f) => codigosIguais(f.codigo_fornecedor, item.codigo));

  const resultados = busca.trim()
    ? filtrarProdutos(produtos, busca).slice(0, 12)
    : produtos.slice(0, 12);

  return (
    <div className={`rounded-xl border-2 p-3 ${item.ignorar ? 'border-slate-200 bg-slate-50 opacity-60' : custoMudou ? 'border-amber-300 bg-amber-50/50' : produto ? 'border-green-200 bg-white' : 'border-red-200 bg-red-50/40'}`}>
      <div className="flex flex-col lg:flex-row gap-3">
        {/* Item da nota */}
        <div className="flex-1 min-w-0">
          <p className="font-medium text-slate-800 text-sm leading-snug">{item.descricao}</p>
          <p className="text-xs text-slate-500 mt-0.5">
            {item.codigo ? `Cód. fornecedor: ${item.codigo}` : 'Sem código na nota'}
            {codigoJaCadastrado && <span className="text-green-600 font-medium"> · já cadastrado no produto</span>}
          </p>
          {fornecedor && (
            <p className="text-xs text-slate-400 mt-0.5">Fornecedor: {fornecedor}</p>
          )}
          {custoMudou && (
            <p className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-amber-700 bg-amber-100 rounded-md px-2 py-0.5">
              <AlertTriangle className="w-3 h-3" />
              Custo diferente do cadastro ({money(custoAtual)})
            </p>
          )}
        </div>

        {/* Quantidade e custo */}
        <div className="flex gap-2 lg:w-56 flex-shrink-0">
          <div className="w-20">
            <label className="text-[10px] uppercase tracking-wide text-slate-400">Qtd</label>
            <Input
              type="number"
              min="0"
              step="1"
              value={item.quantidade}
              onChange={(e) => onChange('quantidade', e.target.value)}
              className="h-9 text-sm"
            />
          </div>
          <div className="flex-1">
            <label className="text-[10px] uppercase tracking-wide text-slate-400">Custo un.</label>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={item.custo_unitario}
              onChange={(e) => onChange('custo_unitario', e.target.value)}
              className="h-9 text-sm"
            />
          </div>
        </div>

        {/* Produto vinculado / preço de venda */}
        <div className="lg:w-72 flex-shrink-0 space-y-1.5">
          {produto ? (
            <>
              <div className="flex items-center gap-1.5 text-xs">
                <Badge className="bg-green-100 text-green-700 hover:bg-green-100 whitespace-normal text-left leading-snug items-start py-1">
                  <Link2 className="w-3 h-3 mr-1 mt-0.5 flex-shrink-0" /> {produto.nome}
                </Badge>
                <span className="text-slate-400">Est. {produto.estoque_atual || 0}</span>
                <button onClick={onDesvincular} className="text-slate-400 hover:text-red-500 ml-auto">
                  <Unlink className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-[10px] uppercase tracking-wide text-slate-400 whitespace-nowrap">Venda</label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={item.preco_venda}
                  onChange={(e) => onChange('preco_venda', e.target.value)}
                  className="h-8 text-sm"
                />
              </div>
              <p className="text-[10px] text-slate-400 leading-tight">
                Grava custo, venda, fornecedor e código dele no cadastro
              </p>
            </>
          ) : (
            <div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setAbrirBusca((v) => !v)}
                className="w-full justify-start text-slate-600 h-8"
              >
                <Search className="w-3.5 h-3.5 mr-1.5" /> Relacionar produto
              </Button>
              {abrirBusca && (
                <div className="mt-1.5 border border-slate-200 rounded-lg bg-white shadow-sm p-1.5">
                  <Input
                    autoFocus
                    value={busca}
                    onChange={(e) => setBusca(e.target.value)}
                    placeholder="Nome ou código..."
                    className="h-8 text-sm mb-1"
                  />
                  <div className="max-h-72 overflow-y-auto">
                    {resultados.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => { onVincular(p); setAbrirBusca(false); setBusca(''); }}
                        className="w-full text-left px-2 py-2 rounded-md hover:bg-blue-50 text-xs border-b border-slate-100 last:border-0"
                      >
                        <p className="font-medium text-slate-800 leading-snug break-words">{p.nome}</p>
                        <p className="text-slate-500 mt-0.5 leading-snug">
                          Cód: {p.codigo} · Custo: {money(p.custo)} · Venda: {money(p.valor)}
                          {p.estoque_atual !== undefined && ` · Est: ${p.estoque_atual}`}
                          {p.localizacao_estoque ? ` · Local: ${p.localizacao_estoque}` : ''}
                        </p>
                      </button>
                    ))}
                    {resultados.length === 0 && (
                      <p className="text-center text-slate-400 text-xs py-2">Nenhum produto encontrado</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          <button
            type="button"
            onClick={onIgnorar}
            className={`text-[11px] flex items-center gap-1 ${item.ignorar ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
          >
            {item.ignorar ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
            {item.ignorar ? 'Incluir novamente' : 'Ignorar este item'}
          </button>
        </div>
      </div>
    </div>
  );
}