import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Plus, Search, Pencil, Trash2, Package, X } from 'lucide-react';

const STATUS_COLORS = {
  'Disponível': 'bg-green-100 text-green-700 border-green-200',
  'Em uso': 'bg-blue-100 text-blue-700 border-blue-200',
};

export default function KitsTab() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ codigo: '', nome: '', ferramentas: [], responsavel_atual_id: '', responsavel_atual_nome: '', status: 'Disponível' });
  const [ferrSearch, setFerrSearch] = useState('');

  const { data: kits = [], isLoading } = useQuery({ queryKey: ['kits'], queryFn: () => base44.entities.KitFerramentas.list() });
  const { data: ferramentas = [] } = useQuery({ queryKey: ['ferramentas'], queryFn: () => base44.entities.Ferramenta.list() });
  const { data: usuarios = [] } = useQuery({ queryKey: ['usuarios'], queryFn: () => base44.entities.User.list() });

  const saveMutation = useMutation({
    mutationFn: (data) => editId ? base44.entities.KitFerramentas.update(editId, data) : base44.entities.KitFerramentas.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['kits'] }); setModal(false); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.KitFerramentas.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['kits'] }),
  });

  const openNew = () => { setForm({ codigo: '', nome: '', ferramentas: [], responsavel_atual_id: '', responsavel_atual_nome: '', status: 'Disponível' }); setEditId(null); setModal(true); };
  const openEdit = (k) => { setForm({ ...k, ferramentas: k.ferramentas || [] }); setEditId(k.id); setModal(true); };

  const addFerramenta = (f) => {
    if (form.ferramentas.find(x => x.ferramenta_id === f.id)) return;
    setForm(p => ({ ...p, ferramentas: [...p.ferramentas, { ferramenta_id: f.id, ferramenta_nome: f.nome, ferramenta_codigo: f.codigo }] }));
  };

  const removeFerramenta = (id) => setForm(p => ({ ...p, ferramentas: p.ferramentas.filter(x => x.ferramenta_id !== id) }));

  const filtered = kits.filter(k => !search || k.nome?.toLowerCase().includes(search.toLowerCase()) || k.codigo?.toLowerCase().includes(search.toLowerCase()));
  const ferrFiltradas = ferramentas.filter(f => !ferrSearch || f.nome?.toLowerCase().includes(ferrSearch.toLowerCase()) || f.codigo?.toLowerCase().includes(ferrSearch.toLowerCase()));

  return (
    <div>
      <div className="flex gap-2 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input placeholder="Buscar kit..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Button size="sm" onClick={openNew} className="bg-orange-500 hover:bg-orange-600 text-white"><Plus className="w-4 h-4 mr-1" /> Novo Kit</Button>
      </div>

      {isLoading ? <div className="text-center py-10 text-slate-400">Carregando...</div> :
        filtered.length === 0 ? <div className="text-center py-10 text-slate-400">Nenhum kit encontrado.</div> :
        <div className="grid gap-3">
          {filtered.map(k => (
            <div key={k.id} className="bg-white border border-slate-200 rounded-xl p-4 flex items-start gap-3">
              <div className="w-9 h-9 bg-orange-50 rounded-lg flex items-center justify-center flex-shrink-0">
                <Package className="w-5 h-5 text-orange-500" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  {k.codigo && <span className="font-mono text-xs text-slate-400">{k.codigo}</span>}
                  <span className="font-semibold text-slate-800">{k.nome}</span>
                  <Badge className={`text-xs border ${STATUS_COLORS[k.status] || ''}`}>{k.status}</Badge>
                </div>
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {(k.ferramentas || []).map(f => (
                    <span key={f.ferramenta_id} className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{f.ferramenta_nome}</span>
                  ))}
                </div>
                {k.responsavel_atual_nome && <p className="text-xs text-slate-500 mt-1">👤 {k.responsavel_atual_nome}</p>}
              </div>
              <div className="flex gap-1">
                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(k)}><Pencil className="w-4 h-4" /></Button>
                <Button size="icon" variant="ghost" className="h-8 w-8 text-red-400 hover:text-red-600" onClick={() => { if (confirm('Excluir?')) deleteMutation.mutate(k.id); }}><Trash2 className="w-4 h-4" /></Button>
              </div>
            </div>
          ))}
        </div>
      }

      <Dialog open={modal} onOpenChange={setModal}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editId ? 'Editar' : 'Novo'} Kit</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Código</Label><Input value={form.codigo} onChange={e => setForm(p => ({ ...p, codigo: e.target.value }))} /></div>
              <div><Label>Nome *</Label><Input value={form.nome} onChange={e => setForm(p => ({ ...p, nome: e.target.value }))} /></div>
            </div>
            <div>
              <Label>Status</Label>
              <Select value={form.status} onValueChange={v => setForm(p => ({ ...p, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Disponível">Disponível</SelectItem>
                  <SelectItem value="Em uso">Em uso</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Responsável</Label>
              <Select value={form.responsavel_atual_id || ''} onValueChange={v => { const u = usuarios.find(u => u.id === v); setForm(p => ({ ...p, responsavel_atual_id: v, responsavel_atual_nome: u?.full_name || '' })); }}>
                <SelectTrigger><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum</SelectItem>
                  {usuarios.map(u => <SelectItem key={u.id} value={u.id}>{u.full_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Ferramentas do Kit</Label>
              <div className="mt-1 mb-2 flex flex-wrap gap-1">
                {form.ferramentas.map(f => (
                  <span key={f.ferramenta_id} className="flex items-center gap-1 text-xs bg-orange-50 text-orange-700 border border-orange-200 px-2 py-0.5 rounded-full">
                    {f.ferramenta_nome}
                    <button onClick={() => removeFerramenta(f.ferramenta_id)}><X className="w-3 h-3" /></button>
                  </span>
                ))}
              </div>
              <Input placeholder="Buscar ferramenta..." value={ferrSearch} onChange={e => setFerrSearch(e.target.value)} className="mb-1" />
              <div className="border rounded-lg max-h-32 overflow-y-auto">
                {ferrFiltradas.slice(0, 30).map(f => (
                  <button key={f.id} className="w-full text-left text-sm px-3 py-1.5 hover:bg-slate-50 flex items-center gap-2" onClick={() => addFerramenta(f)}>
                    <span className="font-mono text-xs text-slate-400">{f.codigo}</span>{f.nome}
                  </button>
                ))}
              </div>
            </div>
            <Button className="w-full bg-orange-500 hover:bg-orange-600 text-white" onClick={() => saveMutation.mutate(form)} disabled={!form.nome || saveMutation.isPending}>
              {saveMutation.isPending ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}