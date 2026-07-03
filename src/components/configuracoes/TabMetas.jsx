import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useUnidade } from '@/lib/UnidadeContext';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Target, Save, Plus, Trash2, ChevronDown, ChevronUp, Lock } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Switch } from "@/components/ui/switch";

const META_VAZIA = { nome: '', meta_dia: '', meta_semana: '', meta_mes: '' };

function MetaForm({ meta, idx, onChange, onDelete, onSave, isSaving }) {
  const [expanded, setExpanded] = useState(!meta.id); // nova meta começa expandida

  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 bg-slate-50 cursor-pointer hover:bg-slate-100 transition-colors"
        onClick={() => setExpanded(e => !e)}
      >
        <div className="flex items-center gap-2">
          <Target className="w-4 h-4 text-blue-500" />
          <span className="font-semibold text-slate-800 text-sm">
            {meta.nome || `Meta ${idx + 1}`}
          </span>
          {meta.id && (
            <span className="text-xs text-slate-400 bg-slate-200 px-2 py-0.5 rounded-full">Salva</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="p-1 text-slate-400 hover:text-red-500 transition-colors"
            title="Remover meta"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          {expanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </div>
      </div>

      {/* Body */}
      {expanded && (
        <div className="p-4 space-y-4">
          <div className="space-y-1.5">
            <Label>Nome da Meta</Label>
            <Input
              placeholder="Ex: Meta Principal, Meta Lava Jato..."
              value={meta.nome}
              onChange={e => onChange('nome', e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label>Meta do Dia (R$)</Label>
              <Input
                type="number"
                placeholder="Ex: 1500"
                value={meta.meta_dia}
                onChange={e => onChange('meta_dia', e.target.value)}
                min="0"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Meta da Semana (R$)</Label>
              <Input
                type="number"
                placeholder="Ex: 8000"
                value={meta.meta_semana}
                onChange={e => onChange('meta_semana', e.target.value)}
                min="0"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Meta do Mês (R$)</Label>
              <Input
                type="number"
                placeholder="Ex: 30000"
                value={meta.meta_mes}
                onChange={e => onChange('meta_mes', e.target.value)}
                min="0"
              />
            </div>
          </div>

          <div className="flex justify-end pt-2 border-t">
            <Button
              onClick={onSave}
              disabled={isSaving || !meta.nome}
              className="bg-orange-500 hover:bg-orange-600 text-white gap-2 text-sm"
              size="sm"
            >
              <Save className="w-3.5 h-3.5" />
              {isSaving ? 'Salvando...' : 'Salvar esta meta'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function TabMetas({ formData, onChange, onSave, isSaving }) {
  const { unidadeAtual } = useUnidade();
  const queryClient = useQueryClient();

  // Estado local: lista de metas com edições pendentes
  const [localMetas, setLocalMetas] = useState([]);
  const [savingId, setSavingId] = useState(null);

  const { data: metas = [], isLoading } = useQuery({
    queryKey: ['metas_vendas', unidadeAtual?.id],
    queryFn: () => base44.entities.MetaVendas.filter({ unidade_id: unidadeAtual?.id }),
    enabled: !!unidadeAtual,
    onSuccess: (data) => setLocalMetas(data.map(m => ({ ...m }))),
  });

  // Sincroniza quando os dados chegam do servidor
  React.useEffect(() => {
    setLocalMetas(metas.map(m => ({ ...m })));
  }, [metas.length, unidadeAtual?.id]);

  const saveMutation = useMutation({
    mutationFn: async ({ meta }) => {
      const payload = {
        nome: meta.nome,
        meta_dia: Number(meta.meta_dia) || 0,
        meta_semana: Number(meta.meta_semana) || 0,
        meta_mes: Number(meta.meta_mes) || 0,
        ativa: true,
        unidade_id: unidadeAtual?.id,
      };
      return meta.id
        ? base44.entities.MetaVendas.update(meta.id, payload)
        : base44.entities.MetaVendas.create(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['metas_vendas'] });
      toast.success('Meta salva!');
    },
    onError: () => toast.error('Erro ao salvar meta'),
    onSettled: () => setSavingId(null),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.MetaVendas.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['metas_vendas'] });
      toast.success('Meta removida!');
    },
    onError: () => toast.error('Erro ao remover meta'),
  });

  const handleChange = (idx, field, value) => {
    setLocalMetas(prev => prev.map((m, i) => i === idx ? { ...m, [field]: value } : m));
  };

  const handleAddMeta = () => {
    setLocalMetas(prev => [...prev, { ...META_VAZIA, _tempId: Date.now() }]);
  };

  const handleDelete = (idx) => {
    const meta = localMetas[idx];
    if (meta.id) {
      deleteMutation.mutate(meta.id);
    } else {
      setLocalMetas(prev => prev.filter((_, i) => i !== idx));
    }
  };

  const handleSave = (idx) => {
    const meta = localMetas[idx];
    const key = meta.id || meta._tempId;
    setSavingId(key);
    saveMutation.mutate({ meta });
  };

  return (
    <div className="space-y-4 max-w-2xl">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-700">
        <div className="flex items-center gap-2 font-semibold mb-1">
          <Target className="w-4 h-4" />
          Metas de faturamento — {unidadeAtual?.nome}
        </div>
        Crie até quantas metas quiser. Cada meta aparece como um card separado na tela inicial.
      </div>

      {/* Controle de período da produção individual */}
      <div className="border border-slate-200 rounded-xl bg-white p-4 space-y-3">
        <div className="flex items-center gap-2 font-semibold text-slate-800">
          <Lock className="w-4 h-4 text-orange-500" />
          Período de visualização da produção individual
        </div>
        <p className="text-sm text-slate-500">
          Quando ativado, usuários comuns (com permissão de ver próprio relatório) só conseguem visualizar a produção dentro deste período fixo. Administradores não são afetados.
        </p>
        <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
          <div>
            <Label className="font-medium">Restringir período da produção individual</Label>
            <p className="text-xs text-slate-500">Trava o período visível para usuários comuns</p>
          </div>
          <Switch
            checked={!!formData?.restringir_periodo_producao_proprio}
            onCheckedChange={v => onChange('restringir_periodo_producao_proprio', v)}
          />
        </div>
        {formData?.restringir_periodo_producao_proprio && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Data inicial</Label>
              <Input
                type="date"
                value={formData?.periodo_producao_proprio_inicio || ''}
                onChange={e => onChange('periodo_producao_proprio_inicio', e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Data final</Label>
              <Input
                type="date"
                value={formData?.periodo_producao_proprio_fim || ''}
                onChange={e => onChange('periodo_producao_proprio_fim', e.target.value)}
              />
            </div>
          </div>
        )}
        <div className="flex justify-end pt-2 border-t">
          <Button onClick={onSave} disabled={isSaving} className="bg-orange-500 hover:bg-orange-600 text-white gap-2 text-sm" size="sm">
            <Save className="w-3.5 h-3.5" />
            {isSaving ? 'Salvando...' : 'Salvar período'}
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-slate-400 text-sm">Carregando metas...</div>
      ) : (
        <div className="space-y-3">
          {localMetas.map((meta, idx) => (
            <MetaForm
              key={meta.id || meta._tempId || idx}
              meta={meta}
              idx={idx}
              onChange={(field, value) => handleChange(idx, field, value)}
              onDelete={() => handleDelete(idx)}
              onSave={() => handleSave(idx)}
              isSaving={savingId === (meta.id || meta._tempId) && saveMutation.isPending}
            />
          ))}
        </div>
      )}

      <Button
        variant="outline"
        onClick={handleAddMeta}
        className="w-full border-dashed border-2 border-blue-300 text-blue-600 hover:bg-blue-50 gap-2"
      >
        <Plus className="w-4 h-4" />
        Adicionar nova meta
      </Button>
    </div>
  );
}