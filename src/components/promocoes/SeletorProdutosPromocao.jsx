import React, { useEffect, useMemo, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { brl } from '@/lib/promocao';
import { Search, Loader2 } from 'lucide-react';

const POR_PAGINA = 40;

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
  precoReferencia,
  carregando,
}) {
  const [busca, setBusca] = useState('');
  const [limite, setLimite] = useState(POR_PAGINA);

  const referenciar = precoReferencia || ((p) => Number(p.valor) || 0);

  const categoriasDisponiveis = useMemo(
    () => [...new Set(produtos.map((p) => p.categoria).filter(Boolean))].sort(),
    [produtos]
  );

  const termo = busca.trim().toLowerCase();
  const lista = useMemo(() => {
    if (!termo) return candidatos;
    return candidatos.filter(
      (p) =>
        String(p.nome || '').toLowerCase().includes(termo) ||
        String(p.codigo || '').toLowerCase().includes(termo)
    );
  }, [candidatos, termo]);

  useEffect(() => {
    setLimite(POR_PAGINA);
  }, [termo, modo, candidatos.length]);

  const visiveis = lista.slice(0, limite);
  const selecionadosSet = useMemo(() => new Set(selecionados), [selecionados]);

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
        {carregando && (
          <div className="p-6 flex items-center justify-center gap-2 text-sm text-slate-500">
            <Loader2 className="w-4 h-4 animate-spin" /> Carregando produtos...
          </div>
        )}
        {!carregando && lista.length === 0 && (
          <p className="p-4 text-sm text-slate-500 text-center">Nenhum produto encontrado.</p>
        )}
        {visiveis.map((p) => {
          const marcado = selecionadosSet.has(p.id);
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
                  {p.codigo} • {p.categoria || 'Sem categoria'} • {brl(referenciar(p))}
                </p>
              </div>
              <Input
                type="number"
                step="0.01"
                min={0}
                value={precos[p.id] ?? referenciar(p)}
                onChange={(e) => onPrecoChange(p.id, e.target.value)}
                disabled={!marcado}
                className="w-24 h-8 text-sm"
                title="Valor promocional"
              />
            </div>
          );
        })}
        {lista.length > visiveis.length && (
          <button
            type="button"
            onClick={() => setLimite((v) => v + POR_PAGINA * 2)}
            className="w-full py-2 text-xs font-medium text-orange-600 hover:bg-orange-50"
          >
            Mostrar mais ({visiveis.length} de {lista.length}) — refine a busca para achar mais rápido
          </button>
        )}
      </div>
    </div>
  );
}