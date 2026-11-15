import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { brl } from '@/lib/promocao';
import { Search } from 'lucide-react';

export default function SeletorProdutosPromocao({
  produtos,
  modo,
  onModoChange,
  categorias,
  onCategoriasChange,
  candidatos,
  selecionados,
  onToggle,
  onTodos,
  precos,
  onPrecoChange,
}) {
  const [busca, setBusca] = useState('');

  const categoriasDisponiveis = [...new Set(produtos.map((p) => p.categoria).filter(Boolean))].sort();
  const termo = busca.trim().toLowerCase();
  const lista = termo
    ? candidatos.filter(
        (p) =>
          String(p.nome || '').toLowerCase().includes(termo) ||
          String(p.codigo || '').toLowerCase().includes(termo)
      )
    : candidatos;

  const alternarCategoria = (cat) => {
    onCategoriasChange(
      categorias.includes(cat) ? categorias.filter((c) => c !== cat) : [...categorias, cat]
    );
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row gap-2">
        <Select value={modo} onValueChange={onModoChange}>
          <SelectTrigger className="sm:w-64">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os produtos</SelectItem>
            <SelectItem value="categorias">Por categoria</SelectItem>
            <SelectItem value="especificos">Escolher específicos</SelectItem>
          </SelectContent>
        </Select>
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <Input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar produto ou código"
            className="pl-9"
          />
        </div>
      </div>

      {modo === 'categorias' && (
        <div className="flex flex-wrap gap-2">
          {categoriasDisponiveis.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => alternarCategoria(cat)}
              className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                categorias.includes(cat)
                  ? 'bg-orange-500 border-orange-500 text-white'
                  : 'bg-white border-slate-300 text-slate-600 hover:border-orange-400'
              }`}
            >
              {cat}
            </button>
          ))}
          {categoriasDisponiveis.length === 0 && (
            <p className="text-xs text-slate-500">Nenhuma categoria cadastrada nos produtos.</p>
          )}
        </div>
      )}

      <div className="flex items-center justify-between text-xs text-slate-500">
        <span>{selecionados.length} produto(s) na promoção</span>
        <button type="button" className="text-orange-600 font-medium" onClick={onTodos}>
          {selecionados.length === candidatos.length ? 'Desmarcar todos' : 'Marcar todos'}
        </button>
      </div>

      <div className="max-h-72 overflow-y-auto border rounded-lg divide-y">
        {lista.length === 0 && (
          <p className="p-4 text-sm text-slate-500 text-center">Nenhum produto encontrado.</p>
        )}
        {lista.map((p) => {
          const marcado = selecionados.includes(p.id);
          return (
            <div key={p.id} className="flex items-center gap-3 px-3 py-2">
              <Checkbox checked={marcado} onCheckedChange={() => onToggle(p.id)} />
              {p.fotos?.[0]?.url ? (
                <img src={p.fotos[0].url} alt={p.nome} className="w-9 h-9 rounded object-cover flex-shrink-0" />
              ) : (
                <div className="w-9 h-9 rounded bg-slate-100 flex-shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-800 truncate">{p.nome}</p>
                <p className="text-xs text-slate-500 truncate">
                  {p.codigo} • {p.categoria || 'Sem categoria'} • {brl(p.valor)}
                </p>
              </div>
              <Input
                type="number"
                step="0.01"
                min={0}
                value={precos[p.id] ?? p.valor ?? 0}
                onChange={(e) => onPrecoChange(p.id, e.target.value)}
                disabled={!marcado}
                className="w-24 h-8 text-sm"
                title="Valor promocional"
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}