import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, Plus, Package } from 'lucide-react';
import { cn } from "@/lib/utils";

const CATEGORIA_COLORS = {
  eletrica: 'bg-yellow-100 text-yellow-800',
  portas: 'bg-blue-100 text-blue-800',
  acessorios: 'bg-purple-100 text-purple-800',
  estetica: 'bg-pink-100 text-pink-800',
  seguranca: 'bg-red-100 text-red-800',
  vidros: 'bg-cyan-100 text-cyan-800',
  limpeza: 'bg-green-100 text-green-800',
  outros: 'bg-gray-100 text-gray-800'
};

export default function SeletorProdutos({ open, onClose, produtos, onSelect }) {
  const [search, setSearch] = useState('');
  const [categoriaFilter, setCategoriaFilter] = useState('');

  const filteredProdutos = produtos.filter(p => {
    const matchSearch = p.nome.toLowerCase().includes(search.toLowerCase());
    const matchCategoria = !categoriaFilter || p.categoria === categoriaFilter;
    return matchSearch && matchCategoria && p.ativo !== false;
  });

  const categorias = [...new Set(produtos.map(p => p.categoria))];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            Adicionar Produto/Serviço
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <Input
              placeholder="Buscar produto ou serviço..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 h-12 text-base"
            />
          </div>

          {/* Category filters */}
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant={categoriaFilter === '' ? 'default' : 'outline'}
              onClick={() => setCategoriaFilter('')}
              className="h-8"
            >
              Todos
            </Button>
            {categorias.map(cat => (
              <Button
                key={cat}
                size="sm"
                variant={categoriaFilter === cat ? 'default' : 'outline'}
                onClick={() => setCategoriaFilter(cat)}
                className="h-8 capitalize"
              >
                {cat}
              </Button>
            ))}
          </div>
        </div>

        {/* Products list */}
        <div className="flex-1 overflow-y-auto mt-4 space-y-2">
          {filteredProdutos.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              Nenhum produto encontrado
            </div>
          ) : (
            filteredProdutos.map(produto => (
              <button
                key={produto.id}
                onClick={() => onSelect(produto)}
                className="w-full p-4 flex items-center justify-between bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200 transition-all text-left"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-800">{produto.nome}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge className={cn("text-xs capitalize", CATEGORIA_COLORS[produto.categoria])}>
                      {produto.categoria}
                    </Badge>
                    {produto.descricao && (
                      <span className="text-xs text-slate-500 truncate">{produto.descricao}</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3 ml-4">
                  <span className="font-bold text-green-600 whitespace-nowrap">
                    R$ {produto.valor?.toFixed(2)}
                  </span>
                  <Plus className="w-5 h-5 text-slate-400" />
                </div>
              </button>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}