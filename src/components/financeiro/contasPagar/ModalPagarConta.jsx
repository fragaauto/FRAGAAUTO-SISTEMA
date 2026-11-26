import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { CheckCircle2, Loader2 } from 'lucide-react';

const FORMAS = [
  { valor: 'pix', label: 'PIX' },
  { valor: 'dinheiro', label: 'Dinheiro' },
  { valor: 'boleto', label: 'Boleto' },
  { valor: 'transferencia', label: 'Transferência' },
  { valor: 'cartao_debito', label: 'Cartão de débito' },
  { valor: 'cartao_credito', label: 'Cartão de crédito' },
];

export default function ModalPagarConta({ conta, onClose, onPago }) {
  const qc = useQueryClient();
  const [valor, setValor] = useState(conta.valor || 0);
  const [forma, setForma] = useState(conta.forma_pagamento || 'pix');
  const [data, setData] = useState(new Date().toISOString().split('T')[0]);
  const [saving, setSaving] = useState(false);

  const confirmar = async () => {
    const v = parseFloat(valor);
    if (!v || v <= 0) return toast.error('Informe o valor pago');
    setSaving(true);
    const dataISO = new Date(data + 'T12:00:00').toISOString();

    await base44.entities.ContaPagar.update(conta.id, {
      status: 'pago',
      data_pagamento: dataISO,
      valor: v,
      forma_pagamento: forma,
    });

    await base44.entities.LancamentoFinanceiro.create({
      tipo: 'saida',
      descricao: conta.descricao,
      valor: v,
      forma_pagamento: forma,
      conta_pagar_id: conta.id,
      conta_prevista_id: conta.conta_prevista_id || '',
      data_lancamento: dataISO,
      categoria: conta.categoria || 'outros',
      unidade_id: conta.unidade_id || null,
    });

    setSaving(false);
    qc.invalidateQueries(['contas-pagar']);
    qc.invalidateQueries(['contas_pagar']);
    qc.invalidateQueries(['lancamentos']);
    qc.invalidateQueries(['lancamentos-todos']);
    qc.invalidateQueries(['lancamentos_metas_todos']);
    qc.invalidateQueries(['saidas-sem-conta-prevista']);
    toast.success('Conta paga e saída lançada no caixa!');
    onPago();
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-green-600" /> Pagar {conta.descricao}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Valor pago (R$) *</Label>
            <Input type="number" step="0.01" value={valor} onChange={(e) => setValor(e.target.value)} />
            {parseFloat(valor) > (conta.valor || 0) && (
              <p className="text-xs text-amber-600 mt-1">
                Valor acima do previsto (R$ {(parseFloat(valor) - (conta.valor || 0)).toFixed(2)} a mais).
              </p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>Forma</Label>
              <Select value={forma} onValueChange={setForma}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {FORMAS.map((f) => <SelectItem key={f.valor} value={f.valor}>{f.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Data</Label>
              <Input type="date" value={data} onChange={(e) => setData(e.target.value)} />
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <Button variant="outline" className="flex-1" onClick={onClose}>Cancelar</Button>
            <Button onClick={confirmar} disabled={saving} className="flex-1 bg-green-600 hover:bg-green-700">
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null} Confirmar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}