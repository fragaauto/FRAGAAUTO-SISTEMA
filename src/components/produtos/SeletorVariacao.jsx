import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Package, Layers } from 'lucide-react';
import { cn } from "@/lib/utils";

export default function SeletorVariacao({ produto, open, onClose, onSelect }) {
  const [selectedId, setSelectedId] = useState(null);
  const variacoes = produto?.variacoes || [];

  const handleConfirm = () => {
    const variacao = variacoes.find(v => v.id === selectedId);
    if (variacao) {
      onSelect(variacao);
      setSelectedId(null);
    }
  };

  const handleClose = () => {
    setSelectedId(null);
    onClose();
  };

  const getPreco = (v) => {
    if (v.usar_faixa_preco) {
      return `R$ ${(v.valor_minimo || 0).toFixed(2)} – R$ ${(v.valor_maximo || 0).toFixed(2)}`;
    }
    return `R$ ${(v.valor || 0).toFixed(2)}`;
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-orange-500" />
            Selecione a Variação
          </DialogTitle>
          <p className="text-sm text-slate-500 mt-1">
            {produto?.nome} — {variacoes.length} variação(ões) disponível(is)
          </p>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-2 mt-4">
          {variacoes.map(v => (
            <button
              key={v.id}
              onClick={() => setSelectedId(v.id)}
              className={cn(
                "w-full text-left p-4 rounded-xl border-2 transition-all",
                selectedId === v.id
                  ? "border-orange-500 bg-orange-50"
                  : "border-slate-200 bg-white hover:border-slate-300"
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    {selectedId === v.id && (
                      <div className="w-5 h-5 rounded-full bg-orange-500 flex items-center justify-center flex-shrink-0">
                        <Check className="w-3 h-3 text-white" />
                      </div>
                    )}
                    <p className="font-semibold text-slate-800">{v.nome}</p>
                  </div>
                  {v.descricao && (
                    <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">{v.descricao}</p>
                  )}
                  <div className="flex items-center gap-3 mt-2 flex-wrap">
                    <Badge className="bg-green-100 text-green-800 text-xs">
                      {getPreco(v)}
                    </Badge>
                    {v.composicao?.length > 0 && (
                      <Badge className="bg-indigo-100 text-indigo-800 text-xs">
                        <Package className="w-3 h-3 mr-1" />
                        {v.composicao.length} componente(s)
                      </Badge>
                    )}
                    {v.fotos?.length > 0 && (
                      <Badge className="bg-blue-100 text-blue-800 text-xs">
                        {v.fotos.length} foto(s)
                      </Badge>
                    )}
                  </div>
                  {v.fotos?.length > 0 && selectedId === v.id && (
                    <div className="flex gap-2 mt-3 overflow-x-auto pb-1">
                      {v.fotos.map((foto, i) => (
                        <img
                          key={i}
                          src={foto.url}
                          alt={foto.descricao || v.nome}
                          className="w-20 h-20 rounded-lg object-cover border border-slate-200 flex-shrink-0"
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t mt-2">
          <Button variant="outline" onClick={handleClose}>Cancelar</Button>
          <Button
            onClick={handleConfirm}
            disabled={!selectedId}
            className="bg-orange-500 hover:bg-orange-600"
          >
            <Check className="w-4 h-4 mr-1" /> Confirmar Variação
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}