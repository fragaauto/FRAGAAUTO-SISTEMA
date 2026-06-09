import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useUnidade } from '@/lib/UnidadeContext';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Target, Save } from 'lucide-react';
import { toast } from 'sonner';

export default function TabMetas() {
  const { unidadeAtual } = useUnidade();
  const queryClient = useQueryClient();

  const [form, setForm] = useState({ meta_dia: '', meta_semana: '', meta_mes: '' });
  const [metaId, setMetaId] = useState(null);

  const { data: metas = [] } = useQuery({
    queryKey: ['metas_vendas', unidadeAtual?.id],
    queryFn: () => base44.entities.MetaVendas.list(),
    enabled: !!unidadeAtual,
  });

  useEffect(() => {
    const meta = metas.find(m => m.unidade_id === unidadeAtual?.id) || metas[0];
    if (meta) {
      setMetaId(meta.id);
      setForm({
        meta_dia: meta.meta_dia || '',
        meta_semana: meta.meta_semana || '',
        meta_mes: meta.meta_mes || '',
      });
    }
  }, [metas, unidadeAtual]);

  const saveMutation = useMutation({
    mutationFn: (data) => {
      const payload = {
        ...data,
        meta_dia: Number(data.meta_dia) || 0,
        meta_semana: Number(data.meta_semana) || 0,
        meta_mes: Number(data.meta_mes) || 0,
        unidade_id: unidadeAtual?.id,
      };
      return metaId
        ? base44.entities.MetaVendas.update(metaId, payload)
        : base44.entities.MetaVendas.create(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['metas_vendas'] });
      toast.success('Metas salvas com sucesso!');
    },
    onError: () => toast.error('Erro ao salvar metas'),
  });

  return (
    <div className="space-y-6 max-w-lg">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-700">
        <div className="flex items-center gap-2 font-semibold mb-1">
          <Target className="w-4 h-4" />
          Configure as metas de faturamento
        </div>
        Defina os valores-alvo para cada período. O progresso será exibido na tela inicial conforme os atendimentos concluídos.
      </div>

      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label>Meta do Dia (R$)</Label>
          <Input
            type="number"
            placeholder="Ex: 1500"
            value={form.meta_dia}
            onChange={e => setForm(p => ({ ...p, meta_dia: e.target.value }))}
            min="0"
          />
        </div>

        <div className="space-y-1.5">
          <Label>Meta da Semana (R$)</Label>
          <Input
            type="number"
            placeholder="Ex: 8000"
            value={form.meta_semana}
            onChange={e => setForm(p => ({ ...p, meta_semana: e.target.value }))}
            min="0"
          />
        </div>

        <div className="space-y-1.5">
          <Label>Meta do Mês (R$)</Label>
          <Input
            type="number"
            placeholder="Ex: 30000"
            value={form.meta_mes}
            onChange={e => setForm(p => ({ ...p, meta_mes: e.target.value }))}
            min="0"
          />
        </div>
      </div>

      <div className="flex justify-end pt-2 border-t">
        <Button
          onClick={() => saveMutation.mutate(form)}
          disabled={saveMutation.isPending}
          className="bg-orange-500 hover:bg-orange-600 text-white gap-2"
        >
          <Save className="w-4 h-4" />
          {saveMutation.isPending ? 'Salvando...' : 'Salvar Metas'}
        </Button>
      </div>
    </div>
  );
}