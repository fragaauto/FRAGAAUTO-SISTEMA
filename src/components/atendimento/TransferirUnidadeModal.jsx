import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowRightLeft, Loader2 } from 'lucide-react';
import { toast } from "sonner";

export default function TransferirUnidadeModal({ atendimento, open, onClose }) {
  const queryClient = useQueryClient();
  const [unidadeDestino, setUnidadeDestino] = useState('');

  const { data: unidades = [] } = useQuery({
    queryKey: ['unidades'],
    queryFn: () => base44.entities.Unidade.list(),
    staleTime: 5 * 60 * 1000,
    enabled: open,
  });

  const unidadesAtivas = unidades.filter(u => u.status !== 'inativo' && u.id !== atendimento?.unidade_id);

  const transferirMutation = useMutation({
    mutationFn: () => base44.entities.Atendimento.update(atendimento.id, { unidade_id: unidadeDestino }),
    onSuccess: () => {
      queryClient.invalidateQueries(['atendimento', atendimento.id]);
      queryClient.invalidateQueries(['atendimentos']);
      const destino = unidades.find(u => u.id === unidadeDestino);
      toast.success(`OS transferida para ${destino?.nome || 'outra unidade'}!`);
      onClose();
    },
    onError: () => {
      toast.error('Erro ao transferir. Tente novamente.');
    }
  });

  const unidadeAtualNome = unidades.find(u => u.id === atendimento?.unidade_id)?.nome || 'Unidade atual';

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowRightLeft className="w-5 h-5 text-orange-500" />
            Transferir OS para Outra Unidade
          </DialogTitle>
          <DialogDescription>
            A OS será movida e ficará visível apenas na unidade de destino.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-sm">
            <p className="text-slate-500 mb-1">OS de origem</p>
            <p className="font-semibold text-slate-800">
              {atendimento?.numero_os ? `OS #${String(atendimento.numero_os).padStart(6, '0')} — ` : ''}
              {atendimento?.placa || atendimento?.cliente_nome || '—'}
            </p>
            <p className="text-xs text-slate-500 mt-0.5">Unidade: {unidadeAtualNome}</p>
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700 mb-1.5 block">Unidade de destino</label>
            <Select value={unidadeDestino} onValueChange={setUnidadeDestino}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione a unidade..." />
              </SelectTrigger>
              <SelectContent>
                {unidadesAtivas.map(u => (
                  <SelectItem key={u.id} value={u.id}>{u.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {unidadesAtivas.length === 0 && (
              <p className="text-xs text-slate-400 mt-1">Nenhuma outra unidade disponível.</p>
            )}
          </div>

          <div className="flex gap-2 pt-2">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Cancelar
            </Button>
            <Button
              onClick={() => transferirMutation.mutate()}
              disabled={!unidadeDestino || transferirMutation.isPending}
              className="flex-1 bg-orange-500 hover:bg-orange-600"
            >
              {transferirMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <ArrowRightLeft className="w-4 h-4 mr-2" />
              )}
              Transferir
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}