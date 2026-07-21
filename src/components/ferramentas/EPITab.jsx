import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Search, Pencil, Trash2, HardHat } from 'lucide-react';

const EMPTY = { codigo: '', nome: '', ca: '', fabricante: '', descricao: '', estoque_total: 1, estoque_disponivel: 1, ativo: true };

export default function EPITab() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [editId, setEditId] = useState(null);

  const { data: epis = [], isLoading } = useQuery({
    queryKey: ['epis'],
    queryFn: () => base44.entities.EPI.list(),
  });

  const saveMutation = useMutation({
    mutationFn: (data) => editId ? base44.entities.EPI.update(editId, data) : base44.entities.EPI.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['epis'] }); setModal(false); setForm(EMPTY); setEditId(null); },
  });
  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.EPI.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['epis'] }),
  });

  const filtered = epis.filter(e => {
    const s = search.toLowerCase();
    return !search || e.nome?.toLowerCase().includes(s) || e.codigo?.toLowerCase().includes(s) || e.ca?.toLowerCase().includes(s);
  });

  const openEdit = (e) => { setForm({ ...e }); setEditId(e.id); setModal(true); };
  const openNew = () => { setForm(EMPTY); setEditId(null); setModal(true); };

  const handleSave = () => {
    if (!form.codigo || !form.nome) return;
    const exists = epis.some(e => e.codigo === form.codigo && e.id !== editId);
    if (exists) { alert('Código já existe!'); return; }
    saveMutation.mutate(form);
  };

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-4">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input placeholder="Buscar EPI..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Button size="sm" onClick={openNew} className="bg-orange-500 hover:bg-orange-600 text-white"><Plus className="w-4 h-4 mr-1" /> Novo EPI</Button>
      </div>

      {isLoading ? (
        <div className="text-center py-10 text-slate-400">Carregando...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-10 text-slate-400">Nenhum EPI cadastrado.</div>
      ) : (
        <div className="grid gap-3">
          {filtered.map(e => {
            const baixo = (e.estoque_disponivel ?? 0) <= 0;
            return (
              <div key={e.id} className="bg-white border border-slate-200 rounded-xl p-4 flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
                  <HardHat className="w-5 h-5 text-blue-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs text-slate-400">{e.codigo}</span>
                    <span className="font-semibold text-slate-800 truncate">{e.nome}</span>
                    {!e.ativo && <Badge variant="outline" className="text-xs text-slate-400">Inativo</Badge>}
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    {e.ca && <Badge variant="outline" className="text-xs">CA {e.ca}</Badge>}
                    {e.fabricante && <span className="text-xs text-slate-500">{e.fabricante}</span>}
                    <Badge variant="outline" className={`text-xs ${baixo ? 'border-red-300 text-red-700 bg-red-50' : 'border-green-200 text-green-700 bg-green-50'}`}>
                      {e.estoque_disponivel ?? 0}/{e.estoque_total ?? 0} disponível
                    </Badge>
                  </div>
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(e)}><Pencil className="w-4 h-4" /></Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8 text-red-400 hover:text-red-600" onClick={() => { if (confirm('Excluir EPI?')) deleteMutation.mutate(e.id); }}><Trash2 className="w-4 h-4" /></Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={modal} onOpenChange={setModal}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editId ? 'Editar' : 'Novo'} EPI</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Código *</Label><Input value={form.codigo} onChange={e => setForm(p => ({ ...p, codigo: e.target.value }))} /></div>
              <div><Label>Nome *</Label><Input value={form.nome} onChange={e => setForm(p => ({ ...p, nome: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>CA (Certificado de Aprovação)</Label><Input value={form.ca} onChange={e => setForm(p => ({ ...p, ca: e.target.value }))} placeholder="Ex: 12345" /></div>
              <div><Label>Fabricante</Label><Input value={form.fabricante} onChange={e => setForm(p => ({ ...p, fabricante: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Qtd. Total</Label>
                <Input type="number" min="1" value={form.estoque_total ?? 1} onChange={e => {
                  const total = Math.max(1, Number(e.target.value));
                  setForm(p => ({ ...p, estoque_total: total, estoque_disponivel: Math.min(p.estoque_disponivel ?? 1, total) }));
                }} />
              </div>
              <div>
                <Label>Qtd. Disponível</Label>
                <Input type="number" min="0" max={form.estoque_total ?? 1} value={form.estoque_disponivel ?? 1} onChange={e => setForm(p => ({ ...p, estoque_disponivel: Math.min(Math.max(0, Number(e.target.value)), p.estoque_total ?? 1) }))} />
              </div>
            </div>
            <div><Label>Descrição</Label><Textarea value={form.descricao} onChange={e => setForm(p => ({ ...p, descricao: e.target.value }))} rows={2} /></div>
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
              <Label>EPI ativo</Label>
              <Switch checked={form.ativo} onCheckedChange={v => setForm(p => ({ ...p, ativo: v }))} />
            </div>
            <Button className="w-full bg-orange-500 hover:bg-orange-600 text-white" onClick={handleSave} disabled={saveMutation.isPending}>
              {saveMutation.isPending ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}