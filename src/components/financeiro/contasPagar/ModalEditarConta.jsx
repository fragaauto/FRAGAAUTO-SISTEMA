import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Loader2 } from 'lucide-react';

export default function ModalEditarConta({ conta, onClose, onSalvo }) {
  const qc = useQueryClient();
  const [valor, setValor] = useState(conta.valor || 0);
  const [vencimento, setVencimento] = useState(
    conta.data_vencimento ? new Date(conta.data_vencimento).toISOString().split('T')[0] : ''
  );
  const [observacoes, setObservacoes] = useState(conta.observacoes || '');
  const [saving, setSaving] = useState(false);

  const salvar = async () => {
    const v = parseFloat(valor);
    if (!v || v <= 0) return toast.error('Informe um valor válido');
    if (!vencimento) return toast.error('Informe o vencimento');
    setSaving(true);
    await base44.entities.ContaPagar.update(conta.id, {
      valor: v,
      data_vencimento: new Date(vencimento + 'T12:00:00').toISOString(),
      observacoes,
    });
    setSaving(false);
    qc.invalidateQueries(['contas-pagar']);
    qc.invalidateQueries(['contas_pagar']);
    toast.success('Conta atualizada!');
    onSalvo();
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>Editar {conta.descricao}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>Valor (R$)</Label>
              <Input type="number" step="0.01" value={valor} onChange={(e) => setValor(e.target.value)} />
            </div>
            <div>
              <Label>Vencimento</Label>
              <Input type="date" value={vencimento} onChange={(e) => setVencimento(e.target.value)} />
            </div>
          </div>
          <div>
            <Label>Observações</Label>
            <Textarea value={observacoes} onChange={(e) => setObservacoes(e.target.value)} className="min-h-[60px]" />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={onClose}>Cancelar</Button>
            <Button onClick={salvar} disabled={saving} className="flex-1 bg-green-600 hover:bg-green-700">
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null} Salvar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}