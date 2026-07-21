import React, { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Search, FileSignature, Trash2, HardHat, Loader2, User } from 'lucide-react';
import { format } from 'date-fns';

const TIPO_LABEL = { entrega: 'Entrega', devolucao: 'Devolução', termo: 'Termo de Recebimento' };
const TIPO_COLOR = {
  entrega: 'border-green-200 text-green-700 bg-green-50',
  devolucao: 'border-blue-200 text-blue-700 bg-blue-50',
  termo: 'border-amber-200 text-amber-700 bg-amber-50',
};

function gerarTermo(epi, funcionario, tipo) {
  const acao = tipo === 'devolucao' ? 'devolvi' : 'recebi';
  return `Declaro para os devidos fins que ${acao} o EPI ${epi?.nome || ''}${epi?.codigo ? ` (${epi.codigo})` : ''}${epi?.ca ? `, CA ${epi.ca}` : ''}, em perfeito estado de conservação, comprometendo-me a utilizá-lo adequadamente e a ${tipo === 'devolucao' ? 'manter a empresa ciente de seu estado' : 'devolvê-lo quando solicitado'}.`;
}

export default function FichaEPITab() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [funcionarioId, setFuncionarioId] = useState('all');
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ funcionario_id: '', funcionario_nome: '', epi_id: '', epi_nome: '', epi_codigo: '', tipo: 'entrega', termo_texto: '', observacao: '', assinatura: '' });
  const [currentUser, setCurrentUser] = useState(null);
  const canvasRef = useRef();
  const [drawing, setDrawing] = useState(false);

  useEffect(() => { base44.auth.me().then(setCurrentUser).catch(() => {}); }, []);

  const { data: fichas = [], isLoading } = useQuery({
    queryKey: ['fichas-epi'],
    queryFn: () => base44.entities.FichaEPI.list('-data'),
  });
  const { data: epis = [] } = useQuery({ queryKey: ['epis'], queryFn: () => base44.entities.EPI.list() });
  const { data: funcionarios = [] } = useQuery({ queryKey: ['funcionarios-epi'], queryFn: () => base44.entities.Funcionario.list() });
  const { data: usuarios = [] } = useQuery({ queryKey: ['usuarios'], queryFn: () => base44.entities.User.list() });

  const responsaveis = [
    ...funcionarios.map(f => ({ id: `func_${f.id}`, nome: f.nome_completo })),
    ...usuarios.map(u => ({ id: `user_${u.id}`, nome: u.full_name })),
  ];

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const ficha = await base44.entities.FichaEPI.create({ ...data, data: new Date().toISOString(), usuario_registro_nome: currentUser?.full_name || data.funcionario_nome });
      // Atualiza estoque do EPI (entrega decrementa, devolucao incrementa; termo não altera estoque)
      if (data.epi_id && data.tipo !== 'termo') {
        const epi = epis.find(e => e.id === data.epi_id);
        const atual = epi?.estoque_disponivel ?? 0;
        const nova = data.tipo === 'entrega' ? Math.max(0, atual - 1) : atual + 1;
        await base44.entities.EPI.update(data.epi_id, { estoque_disponivel: nova });
      }
      return ficha;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['fichas-epi'] }); qc.invalidateQueries({ queryKey: ['epis'] }); setModal(false); resetForm(); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.FichaEPI.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['fichas-epi'] }),
  });

  const resetForm = () => setForm({ funcionario_id: '', funcionario_nome: '', epi_id: '', epi_nome: '', epi_codigo: '', tipo: 'entrega', termo_texto: '', observacao: '', assinatura: '' });

  const openNew = () => { resetForm(); setModal(true); };

  const selectEpi = (id) => {
    const epi = epis.find(e => e.id === id);
    setForm(p => ({ ...p, epi_id: id, epi_nome: epi?.nome || '', epi_codigo: epi?.codigo || '', termo_texto: gerarTermo(epi, p.funcionario_nome, p.tipo) }));
  };
  const selectTipo = (tipo) => setForm(p => ({ ...p, tipo, termo_texto: gerarTermo(epis.find(e => e.id === p.epi_id), p.funcionario_nome, tipo) }));
  const selectFuncionario = (id) => {
    const r = responsaveis.find(x => x.id === id);
    setForm(p => ({ ...p, funcionario_id: id, funcionario_nome: r?.nome || '', termo_texto: gerarTermo(epis.find(e => e.id === p.epi_id), r?.nome, p.tipo) }));
  };

  // Canvas
  useEffect(() => {
    if (!modal || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.strokeStyle = '#1e293b'; ctx.lineWidth = 2; ctx.lineCap = 'round';
  }, [modal]);
  const getPos = (e, canvas) => { const r = canvas.getBoundingClientRect(); const src = e.touches ? e.touches[0] : e; return { x: src.clientX - r.left, y: src.clientY - r.top }; };
  const startDraw = (e) => { setDrawing(true); const ctx = canvasRef.current.getContext('2d'); const p = getPos(e, canvasRef.current); ctx.beginPath(); ctx.moveTo(p.x, p.y); };
  const draw = (e) => { if (!drawing) return; e.preventDefault(); const ctx = canvasRef.current.getContext('2d'); const p = getPos(e, canvasRef.current); ctx.lineTo(p.x, p.y); ctx.stroke(); };
  const endDraw = () => { setDrawing(false); setForm(p => ({ ...p, assinatura: canvasRef.current.toDataURL() })); };
  const clearSig = () => { canvasRef.current.getContext('2d').clearRect(0, 0, canvasRef.current.width, canvasRef.current.height); setForm(p => ({ ...p, assinatura: '' })); };

  const filtered = fichas.filter(f => {
    const matchFunc = funcionarioId === 'all' || f.funcionario_id === funcionarioId;
    const s = search.toLowerCase();
    const matchSearch = !search || f.funcionario_nome?.toLowerCase().includes(s) || f.epi_nome?.toLowerCase().includes(s);
    return matchFunc && matchSearch;
  });

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-4">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input placeholder="Buscar funcionário ou EPI..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={funcionarioId} onValueChange={setFuncionarioId}>
          <SelectTrigger className="w-52"><SelectValue placeholder="Funcionário" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {responsaveis.map(r => <SelectItem key={r.id} value={r.id}>{r.nome}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button size="sm" onClick={openNew} className="bg-orange-500 hover:bg-orange-600 text-white"><Plus className="w-4 h-4 mr-1" /> Registrar</Button>
      </div>

      {isLoading ? (
        <div className="text-center py-10 text-slate-400">Carregando...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-10 text-slate-400">Nenhum registro de EPI.</div>
      ) : (
        <div className="grid gap-3">
          {filtered.map(f => (
            <div key={f.id} className="bg-white border border-slate-200 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
                  <HardHat className="w-5 h-5 text-blue-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-slate-800">{f.epi_nome}</span>
                    {f.epi_codigo && <span className="font-mono text-xs text-slate-400">{f.epi_codigo}</span>}
                    <Badge variant="outline" className={`text-xs ${TIPO_COLOR[f.tipo] || ''}`}>{TIPO_LABEL[f.tipo] || f.tipo}</Badge>
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-1"><User className="w-3 h-3" /> {f.funcionario_nome} · {f.data ? format(new Date(f.data), 'dd/MM/yy HH:mm') : ''}</div>
                  {f.termo_texto && <p className="text-xs text-slate-600 mt-2 italic leading-relaxed">"{f.termo_texto}"</p>}
                  {f.observacao && <p className="text-xs text-slate-500 mt-1">Obs: {f.observacao}</p>}
                </div>
                {f.assinatura && (
                  <div className="flex-shrink-0">
                    <img src={f.assinatura} alt="Assinatura" className="h-14 w-28 object-contain border border-slate-200 rounded bg-white" />
                    <p className="text-[10px] text-slate-400 text-center mt-0.5">Assinatura</p>
                  </div>
                )}
                <Button size="icon" variant="ghost" className="h-8 w-8 text-red-400 hover:text-red-600 flex-shrink-0" onClick={() => { if (confirm('Excluir registro?')) deleteMutation.mutate(f.id); }}><Trash2 className="w-4 h-4" /></Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={modal} onOpenChange={setModal}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><FileSignature className="w-4 h-4 text-orange-500" /> Registrar EPI</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Funcionário *</Label>
              <Select value={form.funcionario_id} onValueChange={selectFuncionario}>
                <SelectTrigger><SelectValue placeholder="Selecionar funcionário..." /></SelectTrigger>
                <SelectContent>
                  {responsaveis.map(r => <SelectItem key={r.id} value={r.id}>{r.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Tipo</Label>
                <Select value={form.tipo} onValueChange={selectTipo}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="entrega">Entrega</SelectItem>
                    <SelectItem value="devolucao">Devolução</SelectItem>
                    <SelectItem value="termo">Termo de Recebimento</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>EPI *</Label>
                <Select value={form.epi_id} onValueChange={selectEpi}>
                  <SelectTrigger><SelectValue placeholder="Selecionar EPI..." /></SelectTrigger>
                  <SelectContent>
                    {epis.filter(e => e.ativo !== false).map(e => <SelectItem key={e.id} value={e.id}>{e.codigo} - {e.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Termo</Label>
              <Textarea value={form.termo_texto} onChange={e => setForm(p => ({ ...p, termo_texto: e.target.value }))} rows={3} />
            </div>
            <div>
              <Label>Observação</Label>
              <Textarea value={form.observacao} onChange={e => setForm(p => ({ ...p, observacao: e.target.value }))} rows={2} />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <Label>Assinatura do funcionário *</Label>
                <button onClick={clearSig} className="text-xs text-slate-400 hover:text-red-500">Limpar</button>
              </div>
              <canvas
                ref={canvasRef}
                width={380} height={110}
                className="border border-slate-300 rounded-lg w-full touch-none bg-slate-50"
                onMouseDown={startDraw} onMouseMove={draw} onMouseUp={endDraw} onMouseLeave={endDraw}
                onTouchStart={startDraw} onTouchMove={draw} onTouchEnd={endDraw}
              />
              <p className="text-xs text-slate-400 mt-0.5">Assine acima com o dedo ou mouse</p>
            </div>
            <Button
              className="w-full bg-orange-500 hover:bg-orange-600 text-white"
              onClick={() => createMutation.mutate(form)}
              disabled={!form.assinatura || !form.funcionario_id || !form.epi_id || createMutation.isPending}
            >
              {createMutation.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Salvando...</> : 'Registrar na Ficha de EPI'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}