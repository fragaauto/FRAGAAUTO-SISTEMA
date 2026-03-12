import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Wrench, Check } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';

export default function AtribuirTecnicoModal({ item, onConfirm, onClose }) {
  const [tecnicoSelecionado, setTecnicoSelecionado] = useState(
    item.tecnico_id ? { id: item.tecnico_id, nome: item.tecnico_nome } : null
  );

  const { data: tecnicos = [] } = useQuery({
    queryKey: ['tecnicos'],
    queryFn: () => base44.entities.User.list(),
    staleTime: 5 * 60 * 1000,
  });

  const handleConfirm = () => {
    onConfirm(tecnicoSelecionado);
    onClose();
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wrench className="w-5 h-5 text-blue-500" />
            Atribuir Técnico ao Serviço
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-slate-50 rounded-lg p-3 border">
            <p className="text-sm font-medium text-slate-700">{item.nome}</p>
            <p className="text-xs text-slate-500 mt-1">
              {item.quantidade}x R$ {item.valor_unitario?.toFixed(2)} = R$ {item.valor_total?.toFixed(2)}
            </p>
          </div>

          {tecnicos.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-4">
              Nenhum funcionário cadastrado. Convide funcionários no menu Usuários.
            </p>
          ) : (
            <div className="space-y-2">
              <p className="text-xs text-slate-500 font-medium uppercase">Selecione o técnico:</p>
              <div className="grid grid-cols-1 gap-2 max-h-64 overflow-y-auto">
                {tecnicos.map(t => {
                  const isSelected = tecnicoSelecionado?.id === t.id;
                  return (
                    <button
                      key={t.id}
                      onClick={() => setTecnicoSelecionado({ id: t.id, nome: t.full_name || t.email })}
                      className={`flex items-center justify-between px-3 py-2 rounded-lg border transition-all ${
                        isSelected
                          ? 'bg-blue-50 border-blue-300 text-blue-800'
                          : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Wrench className={`w-4 h-4 ${isSelected ? 'text-blue-500' : 'text-slate-400'}`} />
                        <span className="text-sm font-medium">{t.full_name || t.email}</span>
                      </div>
                      {isSelected && <Check className="w-5 h-5 text-blue-600" />}
                    </button>
                  );
                })}
              </div>
              {tecnicoSelecionado && (
                <button
                  onClick={() => setTecnicoSelecionado(null)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 text-slate-600 text-sm hover:bg-slate-100 transition-all"
                >
                  Remover atribuição (serviço geral)
                </button>
              )}
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Cancelar
            </Button>
            <Button onClick={handleConfirm} className="flex-1 bg-blue-600 hover:bg-blue-700">
              <Check className="w-4 h-4 mr-2" />
              Confirmar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}