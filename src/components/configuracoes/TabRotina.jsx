import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useUnidade } from '@/lib/UnidadeContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Pencil, Trash2, ExternalLink, X, GripVertical } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const DIAS = [
  { idx: 1, label: 'Seg' },
  { idx: 2, label: 'Ter' },
  { idx: 3, label: 'Qua' },
  { idx: 4, label: 'Qui' },
  { idx: 5, label: 'Sex' },
  { idx: 6, label: 'Sáb' },
  { idx: 0, label: 'Dom' },
];

const FORM_EMPTY = {
  titulo: '',
  descricao: '',
  funcao_id: '',
  funcao_nome: '',
  dias_semana: [],
  links: [],
  ordem: 0,
  ativa: true,
};

export default function TabRotina() {
  const { unidadeAtual } = useUnidade();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(FORM_EMPTY);
  const [novoLink, setNovoLink] = useState({ label: '', url: '' });

  const { data: funcoes = [] } = useQuery({
    queryKey: ['funcoes'],
    queryFn: () => base44.entities.FuncaoFuncionario.list(),
  });

  const { data: tarefas = [], isLoading } = useQuery({
    queryKey: ['tarefas_rotina', unidadeAtual?.id],
    queryFn: () => base44.entities.TarefaRotina.list(),
  });

  const tarefasDaUnidade = tarefas
    .filter(t => !t.unidade_id || t.unidade_id === unidadeAtual?.id)
    .sort((a, b) => (a.funcao_nome || '').localeCompare(b.funcao_nome || '') || (a.ordem || 0) - (b.ordem || 0));

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.TarefaRotina.create({ ...data, unidade_id: unidadeAtual?.id }),
    onSuccess: () => { queryClient.invalidateQueries(['tarefas_rotina']); toast.success('Tarefa criada!'); setOpen(false); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.TarefaRotina.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries(['tarefas_rotina']); toast.success('Tarefa atualizada!'); setOpen(false); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.TarefaRotina.delete(id),
    onSuccess: () => { queryClient.invalidateQueries(['tarefas_rotina']); toast.success('Tarefa removida!'); },
  });

  const openNew = () => { setEditing(null); setForm(FORM_EMPTY); setNovoLink({ label: '', url: '' }); setOpen(true); };
  const openEdit = (t) => { setEditing(t); setForm({ ...FORM_EMPTY, ...t }); setNovoLink({ label: '', url: '' }); setOpen(true); };

  const handleSave = () => {
    if (!form.titulo.trim()) return toast.error('Informe o título');
    if (!form.funcao_id) return toast.error('Selecione a função');
    if (!form.dias_semana.length) return toast.error('Selecione ao menos um dia');
    const funcao = funcoes.find(f => f.id === form.funcao_id);
    const payload = { ...form, funcao_nome: funcao?.nome || '' };
    if (editing) updateMutation.mutate({ id: editing.id, data: payload });
    else createMutation.mutate(payload);
  };

  const toggleDia = (idx) => {
    setForm(prev => ({
      ...prev,
      dias_semana: prev.dias_semana.includes(idx)
        ? prev.dias_semana.filter(d => d !== idx)
        : [...prev.dias_semana, idx]
    }));
  };

  const addLink = () => {
    if (!novoLink.url.trim()) return;
    setForm(prev => ({ ...prev, links: [...(prev.links || []), { label: novoLink.label || novoLink.url, url: novoLink.url }] }));
    setNovoLink({ label: '', url: '' });
  };

  const removeLink = (idx) => {
    setForm(prev => ({ ...prev, links: prev.links.filter((_, i) => i !== idx) }));
  };

  // Agrupa por função para exibição
  const porFuncao = {};
  tarefasDaUnidade.forEach(t => {
    const key = t.funcao_id || '__sem__';
    if (!porFuncao[key]) porFuncao[key] = { nome: t.funcao_nome || 'Sem função', itens: [] };
    porFuncao[key].itens.push(t);
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-slate-800">Tarefas da Rotina</h3>
          <p className="text-sm text-slate-500">Cadastre as tarefas por função e dia da semana.</p>
        </div>
        <Button onClick={openNew} className="bg-orange-500 hover:bg-orange-600">
          <Plus className="w-4 h-4 mr-1" /> Nova Tarefa
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-slate-400">Carregando...</div>
      ) : tarefasDaUnidade.length === 0 ? (
        <div className="text-center py-10 border-2 border-dashed border-slate-200 rounded-lg">
          <p className="text-slate-400">Nenhuma tarefa cadastrada.</p>
          <Button variant="outline" className="mt-3" onClick={openNew}>
            <Plus className="w-4 h-4 mr-1" /> Cadastrar primeira tarefa
          </Button>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(porFuncao).map(([funcaoId, grupo]) => (
            <div key={funcaoId}>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 bg-slate-100 px-2 py-1 rounded">
                  {grupo.nome}
                </span>
                <span className="text-xs text-slate-400">{grupo.itens.length} tarefa{grupo.itens.length !== 1 ? 's' : ''}</span>
              </div>
              <div className="space-y-2">
                {grupo.itens.map(t => (
                  <Card key={t.id} className={cn('border', !t.ativa && 'opacity-50')}>
                    <CardContent className="p-3 flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-sm text-slate-800">{t.titulo}</span>
                          {!t.ativa && <Badge variant="outline" className="text-xs text-slate-400">Inativa</Badge>}
                        </div>
                        {t.descricao && <p className="text-xs text-slate-500 mt-0.5 truncate">{t.descricao}</p>}
                        <div className="flex gap-1 mt-1.5 flex-wrap">
                          {DIAS.map(d => (
                            <span
                              key={d.idx}
                              className={cn(
                                'text-[10px] px-1.5 py-0.5 rounded font-medium',
                                (t.dias_semana || []).includes(d.idx)
                                  ? 'bg-orange-100 text-orange-700'
                                  : 'bg-slate-100 text-slate-300'
                              )}
                            >{d.label}</span>
                          ))}
                        </div>
                        {t.links?.length > 0 && (
                          <div className="flex gap-1 mt-1.5 flex-wrap">
                            {t.links.map((l, i) => (
                              <span key={i} className="text-[10px] text-blue-600 flex items-center gap-0.5">
                                <ExternalLink className="w-2.5 h-2.5" />{l.label}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(t)}>
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          size="icon" variant="ghost"
                          className="h-7 w-7 text-red-400 hover:text-red-600 hover:bg-red-50"
                          onClick={() => deleteMutation.mutate(t.id)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar Tarefa' : 'Nova Tarefa'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            {/* Título */}
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1 block">Título *</label>
              <Input
                value={form.titulo}
                onChange={e => setForm(p => ({ ...p, titulo: e.target.value }))}
                placeholder="Ex: Verificar abertura do caixa"
              />
            </div>

            {/* Descrição */}
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1 block">Descrição</label>
              <textarea
                className="w-full border border-input rounded-md px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-ring"
                rows={3}
                value={form.descricao}
                onChange={e => setForm(p => ({ ...p, descricao: e.target.value }))}
                placeholder="Detalhes sobre como executar a tarefa..."
              />
            </div>

            {/* Função */}
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1 block">Função responsável *</label>
              <select
                className="w-full border border-input rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring bg-background"
                value={form.funcao_id}
                onChange={e => setForm(p => ({ ...p, funcao_id: e.target.value }))}
              >
                <option value="">Selecione a função...</option>
                {funcoes.map(f => <option key={f.id} value={f.id}>{f.nome}</option>)}
              </select>
            </div>

            {/* Dias da semana */}
            <div>
              <label className="text-sm font-medium text-slate-700 mb-2 block">Dias da semana *</label>
              <div className="flex gap-2 flex-wrap">
                {DIAS.map(d => (
                  <button
                    key={d.idx}
                    type="button"
                    onClick={() => toggleDia(d.idx)}
                    className={cn(
                      'px-3 py-1.5 rounded-lg text-xs font-medium border transition-all',
                      form.dias_semana.includes(d.idx)
                        ? 'bg-orange-500 text-white border-orange-500'
                        : 'bg-white text-slate-600 border-slate-300 hover:border-orange-400'
                    )}
                  >{d.label}</button>
                ))}
              </div>
            </div>

            {/* Links */}
            <div>
              <label className="text-sm font-medium text-slate-700 mb-2 block">Links / Ferramentas</label>
              <div className="space-y-2 mb-2">
                {(form.links || []).map((link, idx) => (
                  <div key={idx} className="flex items-center gap-2 p-2 bg-blue-50 border border-blue-200 rounded-lg text-sm">
                    <ExternalLink className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                    <span className="font-medium text-blue-700 truncate">{link.label}</span>
                    <span className="text-blue-400 text-xs truncate flex-1">{link.url}</span>
                    <button onClick={() => removeLink(idx)} className="text-red-400 hover:text-red-600 shrink-0">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="Nome do link (ex: Planilha de Caixa)"
                  value={novoLink.label}
                  onChange={e => setNovoLink(p => ({ ...p, label: e.target.value }))}
                  className="text-sm"
                />
                <Input
                  placeholder="URL"
                  value={novoLink.url}
                  onChange={e => setNovoLink(p => ({ ...p, url: e.target.value }))}
                  className="text-sm flex-1"
                />
                <Button type="button" variant="outline" size="sm" onClick={addLink} className="shrink-0">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Ordem + Ativa */}
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="text-sm font-medium text-slate-700 mb-1 block">Ordem</label>
                <Input
                  type="number"
                  value={form.ordem}
                  onChange={e => setForm(p => ({ ...p, ordem: Number(e.target.value) }))}
                  min={0}
                />
              </div>
              <div className="flex items-end pb-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.ativa}
                    onChange={e => setForm(p => ({ ...p, ativa: e.target.checked }))}
                    className="w-4 h-4 accent-orange-500"
                  />
                  <span className="text-sm font-medium text-slate-700">Ativa</span>
                </label>
              </div>
            </div>

            <div className="flex gap-2 pt-2 border-t">
              <Button variant="outline" className="flex-1" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button
                className="flex-1 bg-orange-500 hover:bg-orange-600"
                onClick={handleSave}
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {(createMutation.isPending || updateMutation.isPending) ? 'Salvando...' : 'Salvar'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}