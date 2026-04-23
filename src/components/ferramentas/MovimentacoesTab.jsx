import React, { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Plus, ArrowUpFromLine, ArrowDownToLine, CheckCircle2, Search } from 'lucide-react';
import { format } from 'date-fns';

export default function MovimentacoesTab() {
  const qc = useQueryClient();
  const [modal, setModal] = useState(false);
  const [search, setSearch] = useState('');
  const [tipoFilter, setTipoFilter] = useState('all');
  const [form, setForm] = useState({ tipo: 'Retirada', item_tipo: 'Ferramenta', ferramenta_id: '', kit_id: '', responsavel_id: '', responsavel_nome: '', observacao: '', assinatura: '' });
  const canvasRef = useRef();
  const [drawing, setDrawing] = useState(false);

  const { data: movs = [], isLoading } = useQuery({ queryKey: ['movimentacoes'], queryFn: () => base44.entities.MovimentacaoFerramenta.list('-data_hora', 200) });
  const { data: ferramentas = [] } = useQuery({ queryKey: ['ferramentas'], queryFn: () => base44.entities.Ferramenta.list() });
  const { data: kits = [] } = useQuery({ queryKey: ['kits'], queryFn: () => base44.entities.KitFerramentas.list() });
  const { data: usuarios = [] } = useQuery({ queryKey: ['usuarios'], queryFn: () => base44.entities.User.list() });

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      const mov = await base44.entities.MovimentacaoFerramenta.create({ ...data, data_hora: new Date().toISOString(), status: 'Aberto' });
      // Update ferramenta/kit status
      if (data.item_tipo === 'Ferramenta' && data.ferramenta_id) {
        const update = data.tipo === 'Retirada'
          ? { status: 'Em uso', responsavel_atual_id: data.responsavel_id, responsavel_atual_nome: data.responsavel_nome, data_retirada: new Date().toISOString() }
          : { status: 'Disponível', responsavel_atual_id: '', responsavel_atual_nome: '' };
        await base44.entities.Ferramenta.update(data.ferramenta_id, update);
      } else if (data.item_tipo === 'Kit' && data.kit_id) {
        const update = data.tipo === 'Retirada'
          ? { status: 'Em uso', responsavel_atual_id: data.responsavel_id, responsavel_atual_nome: data.responsavel_nome, data_retirada: new Date().toISOString() }
          : { status: 'Disponível', responsavel_atual_id: '', responsavel_atual_nome: '' };
        await base44.entities.KitFerramentas.update(data.kit_id, update);
      }
      // Finaliza devolução
      if (data.tipo === 'Devolução' && data.item_tipo === 'Ferramenta' && data.ferramenta_id) {
        const open = movs.find(m => m.tipo === 'Retirada' && m.status === 'Aberto' && m.ferramenta_id === data.ferramenta_id);
        if (open) await base44.entities.MovimentacaoFerramenta.update(open.id, { status: 'Finalizado' });
      }
      return mov;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['movimentacoes'] }); qc.invalidateQueries({ queryKey: ['ferramentas'] }); qc.invalidateQueries({ queryKey: ['kits'] }); setModal(false); resetForm(); },
  });

  const resetForm = () => setForm({ tipo: 'Retirada', item_tipo: 'Ferramenta', ferramenta_id: '', kit_id: '', responsavel_id: '', responsavel_nome: '', observacao: '', assinatura: '' });

  // Canvas drawing
  useEffect(() => {
    if (!modal || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.strokeStyle = '#1e293b'; ctx.lineWidth = 2; ctx.lineCap = 'round';
  }, [modal]);

  const getPos = (e, canvas) => {
    const r = canvas.getBoundingClientRect();
    const src = e.touches ? e.touches[0] : e;
    return { x: src.clientX - r.left, y: src.clientY - r.top };
  };

  const startDraw = (e) => { setDrawing(true); const canvas = canvasRef.current; const ctx = canvas.getContext('2d'); const p = getPos(e, canvas); ctx.beginPath(); ctx.moveTo(p.x, p.y); };
  const draw = (e) => { if (!drawing) return; e.preventDefault(); const canvas = canvasRef.current; const ctx = canvas.getContext('2d'); const p = getPos(e, canvas); ctx.lineTo(p.x, p.y); ctx.stroke(); };
  const endDraw = () => { setDrawing(false); setForm(p => ({ ...p, assinatura: canvasRef.current.toDataURL() })); };
  const clearSig = () => { const canvas = canvasRef.current; canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height); setForm(p => ({ ...p, assinatura: '' })); };

  const filtered = movs.filter(m => {
    const matchSearch = !search || m.responsavel_nome?.toLowerCase().includes(search.toLowerCase()) || m.ferramenta_nome?.toLowerCase().includes(search.toLowerCase()) || m.kit_nome?.toLowerCase().includes(search.toLowerCase());
    const matchTipo = tipoFilter === 'all' || m.tipo === tipoFilter;
    return matchSearch && matchTipo;
  });

  const ferramentasDisponiveis = form.tipo === 'Retirada' ? ferramentas.filter(f => f.status === 'Disponível') : ferramentas.filter(f => f.status === 'Em uso');
  const kitsDisponiveis = form.tipo === 'Retirada' ? kits.filter(k => k.status === 'Disponível') : kits.filter(k => k.status === 'Em uso');

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-4">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input placeholder="Buscar..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={tipoFilter} onValueChange={setTipoFilter}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="Retirada">Retiradas</SelectItem>
            <SelectItem value="Devolução">Devoluções</SelectItem>
          </SelectContent>
        </Select>
        <Button size="sm" onClick={() => { resetForm(); setModal(true); }} className="bg-orange-500 hover:bg-orange-600 text-white"><Plus className="w-4 h-4 mr-1" /> Nova</Button>
      </div>

      {isLoading ? <div className="text-center py-10 text-slate-400">Carregando...</div> :
        filtered.length === 0 ? <div className="text-center py-10 text-slate-400">Nenhuma movimentação.</div> :
        <div className="grid gap-2">
          {filtered.map(m => (
            <div key={m.id} className="bg-white border border-slate-200 rounded-xl p-3 flex items-center gap-3">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${m.tipo === 'Retirada' ? 'bg-blue-50' : 'bg-green-50'}`}>
                {m.tipo === 'Retirada' ? <ArrowUpFromLine className="w-4 h-4 text-blue-500" /> : <ArrowDownToLine className="w-4 h-4 text-green-500" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-sm text-slate-800">{m.tipo}</span>
                  <span className="text-sm text-slate-600">{m.ferramenta_nome || m.kit_nome}</span>
                  <Badge variant="outline" className={`text-xs ${m.status === 'Aberto' ? 'text-amber-600 border-amber-300' : 'text-green-600 border-green-300'}`}>{m.status}</Badge>
                </div>
                <div className="text-xs text-slate-500 mt-0.5">👤 {m.responsavel_nome} · {m.data_hora ? format(new Date(m.data_hora), 'dd/MM/yy HH:mm') : ''}</div>
              </div>
              {m.assinatura && <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />}
            </div>
          ))}
        </div>
      }

      <Dialog open={modal} onOpenChange={setModal}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Nova Movimentação</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Tipo</Label>
                <Select value={form.tipo} onValueChange={v => setForm(p => ({ ...p, tipo: v, ferramenta_id: '', kit_id: '' }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Retirada">Retirada</SelectItem>
                    <SelectItem value="Devolução">Devolução</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Item</Label>
                <Select value={form.item_tipo} onValueChange={v => setForm(p => ({ ...p, item_tipo: v, ferramenta_id: '', kit_id: '' }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Ferramenta">Ferramenta</SelectItem>
                    <SelectItem value="Kit">Kit</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {form.item_tipo === 'Ferramenta' ? (
              <div>
                <Label>Ferramenta ({form.tipo === 'Retirada' ? 'disponíveis' : 'em uso'})</Label>
                <Select value={form.ferramenta_id} onValueChange={v => { const f = ferramentas.find(x => x.id === v); setForm(p => ({ ...p, ferramenta_id: v, ferramenta_nome: f?.nome || '' })); }}>
                  <SelectTrigger><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                  <SelectContent>
                    {ferramentasDisponiveis.map(f => <SelectItem key={f.id} value={f.id}>{f.codigo} - {f.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div>
                <Label>Kit ({form.tipo === 'Retirada' ? 'disponíveis' : 'em uso'})</Label>
                <Select value={form.kit_id} onValueChange={v => { const k = kits.find(x => x.id === v); setForm(p => ({ ...p, kit_id: v, kit_nome: k?.nome || '' })); }}>
                  <SelectTrigger><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                  <SelectContent>
                    {kitsDisponiveis.map(k => <SelectItem key={k.id} value={k.id}>{k.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}

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
              <Label>Observação</Label>
              <Textarea value={form.observacao} onChange={e => setForm(p => ({ ...p, observacao: e.target.value }))} rows={2} />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <Label>Assinatura *</Label>
                <button onClick={clearSig} className="text-xs text-slate-400 hover:text-red-500">Limpar</button>
              </div>
              <canvas
                ref={canvasRef}
                width={380} height={100}
                className="border border-slate-300 rounded-lg w-full touch-none bg-slate-50"
                onMouseDown={startDraw} onMouseMove={draw} onMouseUp={endDraw} onMouseLeave={endDraw}
                onTouchStart={startDraw} onTouchMove={draw} onTouchEnd={endDraw}
              />
              <p className="text-xs text-slate-400 mt-0.5">Assine acima com o dedo ou mouse</p>
            </div>

            <Button
              className="w-full bg-orange-500 hover:bg-orange-600 text-white"
              onClick={() => saveMutation.mutate(form)}
              disabled={!form.assinatura || !form.responsavel_id || (!form.ferramenta_id && !form.kit_id) || saveMutation.isPending}
            >
              {saveMutation.isPending ? 'Salvando...' : 'Confirmar'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}