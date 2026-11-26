import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Loader2, Plus } from 'lucide-react';
import { CATEGORIAS, labelCompetencia } from './utils';

export default function ModalNovaContaMes({ competencia, unidadeId, previstas = [], onClose, onSalvo }) {
  const qc = useQueryClient();
  const [previstaId, setPrevistaId] = useState('');
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    descricao: '',
    categoria: 'outros',
    valor: '',
    data_vencimento: `${competencia}-${String(new Date().getDate()).padStart(2, '0')}`,
    observacoes: '',
  });

  const [ano, mes] = competencia.split('-').map(Number);

  const dataComDia = (dia) => {
    const ultimoDia = new Date(ano, mes, 0).getDate();
    const d = Math.min(Math.max(Number(dia) || 1, 1), ultimoDia);
    return `${competencia}-${String(d).padStart(2, '0')}`;
  };

  const escolherPrevista = (id) => {
    setPrevistaId(id);
    const p = previstas.find((x) => x.id === id);
    if (!p) return;
    setForm((atual) => ({
      ...atual,
      descricao: p.nome,
      categoria: p.categoria || 'outros',
      valor: p.valor_previsto ?? '',
      data_vencimento: dataComDia(p.dia_vencimento),
    }));
  };

  const salvar = async () => {
    if (!form.descricao.trim()) return toast.error('Informe a descrição da conta');
    const v = parseFloat(form.valor);
    if (!v || v <= 0) return toast.error('Informe o valor da conta');
    if (!form.data_vencimento) return toast.error('Informe o vencimento');

    setSaving(true);
    await base44.entities.ContaPagar.create({
      unidade_id: unidadeId || null,
      fornecedor: form.descricao.trim(),
      descricao: form.descricao.trim(),
      categoria: form.categoria,
      valor: v,
      data_vencimento: new Date(`${form.data_vencimento}T12:00:00`).toISOString(),
      status: 'pendente',
      conta_prevista_id: previstaId || '',
      competencia,
      observacoes: form.observacoes,
    });
    setSaving(false);
    qc.invalidateQueries(['contas-pagar']);
    qc.invalidateQueries(['contas_pagar']);
    toast.success(`Conta lançada em ${labelCompetencia(competencia)}!`);
    onSalvo();
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5 text-green-600" /> Nova conta em {labelCompetencia(competencia)}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          {previstas.length > 0 && (
            <div>
              <Label>Conta variável (opcional)</Label>
              <Select value={previstaId} onValueChange={escolherPrevista}>
                <SelectTrigger><SelectValue placeholder="Lançar sem vínculo" /></SelectTrigger>
                <SelectContent>
                  {previstas.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-slate-400 mt-1">Escolher a conta variável já preenche o valor previsto.</p>
            </div>
          )}

          <div>
            <Label>Descrição *</Label>
            <Input
              value={form.descricao}
              onChange={(e) => setForm((p) => ({ ...p, descricao: e.target.value }))}
              placeholder="Ex: BOLETO FORNECEDOR, GASTO EXTRA"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>Categoria *</Label>
              <Select value={form.categoria} onValueChange={(v) => setForm((p) => ({ ...p, categoria: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIAS.map((c) => <SelectItem key={c.valor} value={c.valor}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Valor (R$) *</Label>
              <Input
                type="number"
                step="0.01"
                value={form.valor}
                onChange={(e) => setForm((p) => ({ ...p, valor: e.target.value }))}
                placeholder="0,00"
              />
            </div>
          </div>

          <div>
            <Label>Vencimento *</Label>
            <Input
              type="date"
              value={form.data_vencimento}
              onChange={(e) => setForm((p) => ({ ...p, data_vencimento: e.target.value }))}
            />
          </div>

          <div>
            <Label>Observações</Label>
            <Textarea
              value={form.observacoes}
              onChange={(e) => setForm((p) => ({ ...p, observacoes: e.target.value }))}
              className="min-h-[60px]"
            />
          </div>

          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={onClose}>Cancelar</Button>
            <Button onClick={salvar} disabled={saving} className="flex-1 bg-green-600 hover:bg-green-700">
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null} Lançar conta
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}