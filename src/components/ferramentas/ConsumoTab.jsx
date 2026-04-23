import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Plus, Search, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';

export default function ConsumoTab() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ insumo_id: '', insumo_nome: '', quantidade: 1, responsavel_id: '', responsavel_nome: '', atendimento_id: '', atendimento_numero: '' });
  const [atendSearch, setAtendSearch] = useState('');

  const { data: consumos = [], isLoading } = useQuery({ queryKey: ['consumos'], queryFn: () => base44.entities.ConsumoInsumo.list('-data', 200) });
  const { data: insumos = [] } = useQuery({ queryKey: ['insumos'], queryFn: () => base44.entities.Insumo.list() });
  const { data: usuarios = [] } = useQuery({ queryKey: ['usuarios'], queryFn: () => base44.entities.User.list() });
  const { data: atendimentos = [] } = useQuery({
    queryKey: ['atendimentos-abertos'],
    queryFn: () => base44.entities.Atendimento.filter({ status: ['rascunho', 'queixa_pendente', 'queixa_aprovada', 'em_diagnostico', 'checklist_aprovado', 'em_execucao'] }),
  });

  const insumoSelecionado = insumos.find(i => i.id === form.insumo_id);
  const semEstoque = insumoSelecionado && form.quantidade > insumoSelecionado.quantidade_estoque;

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (!insumoSelecionado) throw new Error('Insumo não encontrado');
      const novaQtd = insumoSelecionado.quantidade_estoque - data.quantidade;
      if (novaQtd < 0) throw new Error('Estoque insuficiente');
      await base44.entities.Insumo.update(data.insumo_id, { quantidade_estoque: novaQtd });
      return base44.entities.ConsumoInsumo.create({ ...data, data: new Date().toISOString() });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['consumos'] }); qc.invalidateQueries({ queryKey: ['insumos'] }); setModal(false); resetForm(); },
  });

  const resetForm = () => setForm({ insumo_id: '', insumo_nome: '', quantidade: 1, responsavel_id: '', responsavel_nome: '', atendimento_id: '', atendimento_numero: '' });

  const filteredAtend = atendimentos.filter(a => {
    if (!atendSearch) return true;
    return String(a.numero_os).includes(atendSearch) || a.cliente_nome?.toLowerCase().includes(atendSearch.toLowerCase()) || a.placa?.toLowerCase().includes(atendSearch.toLowerCase());
  });

  const filtered = consumos.filter(c => !search || c.insumo_nome?.toLowerCase().includes(search.toLowerCase()) || c.responsavel_nome?.toLowerCase().includes(search.toLowerCase()));

  return (
    <div>
      <div className="flex gap-2 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input placeholder="Buscar consumo..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Button size="sm" onClick={() => { resetForm(); setModal(true); }} className="bg-orange-500 hover:bg-orange-600 text-white"><Plus className="w-4 h-4 mr-1" /> Registrar</Button>
      </div>

      {isLoading ? <div className="text-center py-10 text-slate-400">Carregando...</div> :
        filtered.length === 0 ? <div className="text-center py-10 text-slate-400">Nenhum consumo registrado.</div> :
        <div className="grid gap-2">
          {filtered.map(c => (
            <div key={c.id} className="bg-white border border-slate-200 rounded-xl p-3 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-sm text-slate-800">{c.insumo_nome}</span>
                  <span className="text-sm text-slate-600">— {c.quantidade} {insumos.find(i => i.id === c.insumo_id)?.unidade || ''}</span>
                </div>
                <div className="text-xs text-slate-500 mt-0.5 flex flex-wrap gap-2">
                  <span>👤 {c.responsavel_nome}</span>
                  {c.atendimento_numero && <span>OS #{c.atendimento_numero}</span>}
                  {c.data && <span>{format(new Date(c.data), 'dd/MM/yy HH:mm')}</span>}
                </div>
              </div>
            </div>
          ))}
        </div>
      }

      <Dialog open={modal} onOpenChange={setModal}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Registrar Consumo</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Insumo</Label>
              <Select value={form.insumo_id} onValueChange={v => { const i = insumos.find(x => x.id === v); setForm(p => ({ ...p, insumo_id: v, insumo_nome: i?.nome || '' })); }}>
                <SelectTrigger><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                <SelectContent>
                  {insumos.map(i => (
                    <SelectItem key={i.id} value={i.id}>
                      {i.nome} <span className="text-slate-400 ml-1">(estoque: {i.quantidade_estoque} {i.unidade})</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Quantidade</Label>
              <Input type="number" min="0.1" step="0.1" value={form.quantidade} onChange={e => setForm(p => ({ ...p, quantidade: Number(e.target.value) }))} />
              {insumoSelecionado && (
                <p className="text-xs mt-1 text-slate-400">Disponível: {insumoSelecionado.quantidade_estoque} {insumoSelecionado.unidade}</p>
              )}
              {semEstoque && (
                <p className="text-xs mt-1 text-red-500 flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5" /> Quantidade maior que o estoque disponível</p>
              )}
            </div>

            <div>
              <Label>Responsável</Label>
              <Select value={form.responsavel_id} onValueChange={v => { const u = usuarios.find(u => u.id === v); setForm(p => ({ ...p, responsavel_id: v, responsavel_nome: u?.full_name || '' })); }}>
                <SelectTrigger><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                <SelectContent>
                  {usuarios.map(u => <SelectItem key={u.id} value={u.id}>{u.full_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Atendimento (OS em aberto)</Label>
              <Input placeholder="Buscar OS por número, cliente ou placa..." value={atendSearch} onChange={e => setAtendSearch(e.target.value)} className="mb-1" />
              <Select value={form.atendimento_id} onValueChange={v => { const a = atendimentos.find(x => x.id === v); setForm(p => ({ ...p, atendimento_id: v, atendimento_numero: String(a?.numero_os || '') })); }}>
                <SelectTrigger><SelectValue placeholder="Selecionar OS..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhuma</SelectItem>
                  {filteredAtend.slice(0, 30).map(a => (
                    <SelectItem key={a.id} value={a.id}>OS #{a.numero_os} — {a.cliente_nome} {a.placa ? `(${a.placa})` : ''}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button
              className="w-full bg-orange-500 hover:bg-orange-600 text-white"
              onClick={() => saveMutation.mutate(form)}
              disabled={!form.insumo_id || !form.responsavel_id || form.quantidade <= 0 || semEstoque || saveMutation.isPending}
            >
              {saveMutation.isPending ? 'Registrando...' : 'Registrar Consumo'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}