import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Loader2 } from 'lucide-react';
import { CATEGORIAS, MESES, MESES_TODOS, mesesDaConta } from './utils';

export default function FormContaPrevista({ conta, unidadeId, onClose, onSaved }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    nome: conta?.nome || '',
    categoria: conta?.categoria || 'outros',
    valor_previsto: conta?.valor_previsto ?? '',
    dia_vencimento: conta?.dia_vencimento ?? 5,
    tipo: conta?.tipo || 'fixa',
    meses_cobranca: conta ? mesesDaConta(conta) : MESES_TODOS,
    ativo: conta ? conta.ativo !== false : true,
    observacoes: conta?.observacoes || '',
  });
  const [saving, setSaving] = useState(false);

  const toggleMes = (m) =>
    setForm((p) => ({
      ...p,
      meses_cobranca: p.meses_cobranca.includes(m)
        ? p.meses_cobranca.filter((x) => x !== m)
        : [...p.meses_cobranca, m].sort((a, b) => a - b),
    }));

  const salvar = async () => {
    if (!form.nome.trim()) return toast.error('Informe o nome da conta');
    if (form.tipo === 'fixa' && !form.meses_cobranca.length) return toast.error('Selecione ao menos um mês de cobrança');
    setSaving(true);
    const dados = {
      nome: form.nome.trim(),
      categoria: form.categoria,
      valor_previsto: parseFloat(form.valor_previsto) || 0,
      dia_vencimento: Math.min(Math.max(parseInt(form.dia_vencimento) || 1, 1), 31),
      tipo: form.tipo,
      meses_cobranca: form.tipo === 'variavel' ? MESES_TODOS : form.meses_cobranca,
      ativo: form.ativo,
      observacoes: form.observacoes,
      unidade_id: conta?.unidade_id || unidadeId || null,
    };
    if (conta) await base44.entities.ContaPagarPrevista.update(conta.id, dados);
    else await base44.entities.ContaPagarPrevista.create(dados);
    setSaving(false);
    qc.invalidateQueries(['contas-previstas']);
    toast.success(conta ? 'Conta prevista atualizada!' : 'Conta prevista criada!');
    onSaved();
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{conta ? 'Editar conta prevista' : 'Nova conta prevista'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Nome da conta *</Label>
            <Input
              value={form.nome}
              onChange={(e) => setForm((p) => ({ ...p, nome: e.target.value }))}
              placeholder="Ex: ALUGUEL, VIVO, 13º SALÁRIO"
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
              <Label>Tipo</Label>
              <Select value={form.tipo} onValueChange={(v) => setForm((p) => ({ ...p, tipo: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="fixa">Fixa (mesmo valor)</SelectItem>
                  <SelectItem value="variavel">Variável (muda todo mês)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>Valor previsto (R$) *</Label>
              <Input
                type="number"
                step="0.01"
                value={form.valor_previsto}
                onChange={(e) => setForm((p) => ({ ...p, valor_previsto: e.target.value }))}
                placeholder="0,00"
              />
            </div>
            <div>
              <Label>Dia do vencimento *</Label>
              <Input
                type="number"
                min={1}
                max={31}
                value={form.dia_vencimento}
                onChange={(e) => setForm((p) => ({ ...p, dia_vencimento: e.target.value }))}
              />
            </div>
          </div>

          {form.tipo === 'fixa' ? (
            <div>
              <Label>Meses em que é cobrada</Label>
              <div className="flex flex-wrap gap-1 mt-1">
                {MESES.map((m, i) => {
                  const mes = i + 1;
                  const ativo = form.meses_cobranca.includes(mes);
                  return (
                    <button
                      key={mes}
                      type="button"
                      onClick={() => toggleMes(mes)}
                      className={`px-2 py-1 rounded-md text-xs font-semibold border transition-all ${
                        ativo ? 'bg-green-600 text-white border-green-600' : 'bg-white text-slate-500 border-slate-200'
                      }`}
                    >
                      {m}
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Conta fixa: entra em todos os meses marcados. Para o 13º salário, marque só Nov e Dez.
              </p>
            </div>
          ) : (
            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              Conta variável: não é gerada automaticamente. O valor real de cada mês é cadastrado manualmente na lista de contas do mês.
            </p>
          )}

          <div className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2">
            <span className="text-sm text-slate-700">
              {form.tipo === 'fixa' ? 'Conta ativa (entra na geração mensal)' : 'Conta ativa (aparece na lista de variáveis)'}
            </span>
            <Switch checked={form.ativo} onCheckedChange={(v) => setForm((p) => ({ ...p, ativo: v }))} />
          </div>

          <div>
            <Label>Observações</Label>
            <Textarea
              value={form.observacoes}
              onChange={(e) => setForm((p) => ({ ...p, observacoes: e.target.value }))}
              placeholder="Anotações sobre esta conta..."
              className="min-h-[60px]"
            />
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