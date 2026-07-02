import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, UserCheck } from 'lucide-react';
import { toast } from 'sonner';

export default function AtribuirTecnicoRapido({ atendimento, onClose }) {
  const queryClient = useQueryClient();
  const [selecionados, setSelecionados] = useState([]);

  const { data: funcionarios = [], isLoading } = useQuery({
    queryKey: ['funcionarios'],
    queryFn: () => base44.entities.Funcionario.filter({ status: 'ativo' }),
    staleTime: 5 * 60 * 1000,
  });

  const salvarMutation = useMutation({
    mutationFn: () => base44.entities.Atendimento.update(atendimento.id, {
      tecnicos_responsaveis: selecionados,
      tecnico: selecionados.map(t => t.nome).join(', '),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries(['atendimentos']);
      toast.success('Técnico atribuído com sucesso!');
      onClose();
    },
  });

  const toggle = (func) => {
    const nome = func.nome_completo || func.nome;
    setSelecionados(prev => {
      const existe = prev.find(t => t.id === func.id);
      if (existe) return prev.filter(t => t.id !== func.id);
      return [...prev, { id: func.id, nome }];
    });
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-orange-500" />
            Atribuir Técnico
          </DialogTitle>
        </DialogHeader>

        <p className="text-sm text-slate-500 -mt-2">
          OS #{atendimento.numero_os ? String(atendimento.numero_os).padStart(6, '0') : '—'} — {atendimento.placa || atendimento.cliente_nome}
        </p>

        {isLoading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="w-6 h-6 animate-spin text-orange-500" />
          </div>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {funcionarios.length === 0 && (
              <p className="text-sm text-slate-400 text-center py-4">Nenhum funcionário cadastrado.</p>
            )}
            {funcionarios.map(func => {
              const sel = !!selecionados.find(t => t.id === func.id);
              return (
                <button
                  key={func.id}
                  onClick={() => toggle(func)}
                  className={`w-full text-left px-3 py-2 rounded-lg border text-sm transition-all ${
                    sel
                      ? 'border-orange-400 bg-orange-50 text-orange-800 font-medium'
                      : 'border-slate-200 hover:border-slate-300 text-slate-700'
                  }`}
                >
                  {func.nome_completo || func.nome}
                  {func.funcao_nome && <span className="text-xs text-slate-400 ml-2">· {func.funcao_nome}</span>}
                </button>
              );
            })}
          </div>
        )}

        <div className="flex gap-2 pt-2">
          <Button variant="outline" className="flex-1" onClick={onClose}>Cancelar</Button>
          <Button
            className="flex-1 bg-orange-500 hover:bg-orange-600"
            disabled={selecionados.length === 0 || salvarMutation.isPending}
            onClick={() => salvarMutation.mutate()}
          >
            {salvarMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Salvar'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}