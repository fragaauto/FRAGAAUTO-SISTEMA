import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Wrench, Check, Users } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';

export default function AtribuirTecnicoModal({ item, onConfirm, onClose }) {
  const [tecnicosSelecionados, setTecnicosSelecionados] = useState(
    item.tecnicos?.length > 0 ? item.tecnicos : []
  );

  const { data: usuarios = [] } = useQuery({
    queryKey: ['usuarios'],
    queryFn: () => base44.entities.User.list(),
    staleTime: 5 * 60 * 1000,
  });

  const { data: funcionarios = [] } = useQuery({
    queryKey: ['funcionarios_atribuicao'],
    queryFn: () => base44.entities.Funcionario.list(),
    staleTime: 5 * 60 * 1000,
  });

  // Mesclar usuários e funcionários ativos
  const tecnicos = [
    ...usuarios.map(u => ({ id: u.id, nome: u.full_name || u.email, tipo: 'usuario' })),
    ...funcionarios.filter(f => f.status === 'ativo').map(f => ({ id: f.id, nome: f.nome_completo, tipo: 'funcionario' }))
  ];

  const toggleTecnico = (tecnico) => {
    const existe = tecnicosSelecionados.find(t => t.id === tecnico.id);
    if (existe) {
      setTecnicosSelecionados(tecnicosSelecionados.filter(t => t.id !== tecnico.id));
    } else {
      setTecnicosSelecionados([...tecnicosSelecionados, { id: tecnico.id, nome: tecnico.nome }]);
    }
  };

  const handleConfirm = () => {
    onConfirm(tecnicosSelecionados);
    onClose();
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-500" />
            Atribuir Técnicos ao Serviço
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
            <div className="space-y-3">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-xs text-blue-700">
                  <strong>Divisão de valor:</strong> Ao selecionar múltiplos técnicos, o valor será dividido igualmente entre eles.
                </p>
              </div>
              
              {tecnicosSelecionados.length > 0 && (
                <div className="bg-slate-50 rounded-lg p-3 border">
                  <p className="text-xs font-medium text-slate-600 mb-2">Técnicos selecionados ({tecnicosSelecionados.length}):</p>
                  <div className="flex flex-wrap gap-1">
                    {tecnicosSelecionados.map(t => (
                      <Badge key={t.id} className="bg-blue-100 text-blue-700 border-blue-300">
                        {t.nome}
                      </Badge>
                    ))}
                  </div>
                  <p className="text-xs text-slate-500 mt-2">
                    Valor por técnico: R$ {tecnicosSelecionados.length > 0 ? ((item.valor_total || 0) / tecnicosSelecionados.length).toFixed(2) : '0.00'}
                  </p>
                </div>
              )}

              <p className="text-xs text-slate-500 font-medium uppercase">Selecione os técnicos:</p>
              <div className="grid grid-cols-1 gap-2 max-h-64 overflow-y-auto">
                {tecnicos.map(t => {
                  const isSelected = tecnicosSelecionados.find(sel => sel.id === t.id);
                  return (
                    <button
                      key={t.id}
                      onClick={() => toggleTecnico(t)}
                      className={`flex items-center justify-between px-3 py-2 rounded-lg border transition-all ${
                        isSelected
                          ? 'bg-blue-50 border-blue-300 text-blue-800'
                          : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Wrench className={`w-4 h-4 ${isSelected ? 'text-blue-500' : 'text-slate-400'}`} />
                        <span className="text-sm font-medium">{t.nome}</span>
                      </div>
                      {isSelected && <Check className="w-5 h-5 text-blue-600" />}
                    </button>
                  );
                })}
              </div>
              {tecnicosSelecionados.length > 0 && (
                <button
                  onClick={() => setTecnicosSelecionados([])}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 text-slate-600 text-sm hover:bg-slate-100 transition-all"
                >
                  Limpar seleção
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