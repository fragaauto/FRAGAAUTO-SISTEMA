import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { brl } from '@/lib/promocao';
import { Plus, Pencil, Trash2, Sparkles } from 'lucide-react';
import ItemPersonalizadoModal from './ItemPersonalizadoModal';

export default function ItensPersonalizadosPromocao({ itens, onChange }) {
  const [aberto, setAberto] = useState(false);
  const [editando, setEditando] = useState(null);

  const abrirNovo = () => {
    setEditando(null);
    setAberto(true);
  };

  const abrirEdicao = (item) => {
    setEditando(item);
    setAberto(true);
  };

  const salvar = (item) => {
    onChange(
      editando ? itens.map((i) => (i.uid === item.uid ? item : i)) : [...itens, item]
    );
    setAberto(false);
    setEditando(null);
  };

  const remover = (uid) => onChange(itens.filter((i) => i.uid !== uid));

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-slate-800 flex items-center gap-1">
            <Sparkles className="w-4 h-4 text-orange-500" /> Itens personalizados (fora do estoque)
          </p>
          <p className="text-xs text-slate-500">
            Crie uma oferta própria com nome, valor e foto — ela aparece na página como os demais itens.
          </p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={abrirNovo}>
          <Plus className="w-4 h-4 mr-1" /> Adicionar
        </Button>
      </div>

      {itens.length > 0 && (
        <div className="border rounded-lg divide-y">
          {itens.map((item) => (
            <div key={item.uid} className="flex items-center gap-3 px-3 py-2">
              {item.foto_url ? (
                <img src={item.foto_url} alt={item.nome} className="w-9 h-9 rounded object-contain bg-white border flex-shrink-0" />
              ) : (
                <div className="w-9 h-9 rounded bg-slate-100 flex-shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-800 truncate">{item.nome}</p>
                <p className="text-xs text-slate-500 truncate">
                  Personalizado
                  {item.valor_original ? ` • de ${brl(item.valor_original)}` : ''} • {brl(item.valor_promocional)}
                </p>
              </div>
              <button type="button" onClick={() => abrirEdicao(item)} className="p-1.5 text-slate-500 hover:text-orange-600">
                <Pencil className="w-4 h-4" />
              </button>
              <button type="button" onClick={() => remover(item.uid)} className="p-1.5 text-slate-500 hover:text-red-600">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {aberto && (
        <ItemPersonalizadoModal
          item={editando}
          onClose={() => {
            setAberto(false);
            setEditando(null);
          }}
          onSaved={salvar}
        />
      )}
    </div>
  );
}