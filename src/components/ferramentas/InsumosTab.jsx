import React, { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Plus, Search, Pencil, Trash2, AlertTriangle, Upload } from 'lucide-react';
import * as XLSX from 'xlsx';

export default function InsumosTab() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ nome: '', unidade: 'unidade', quantidade_estoque: 0, quantidade_minima: 0 });
  const [importModal, setImportModal] = useState(false);
  const [importPreview, setImportPreview] = useState([]);
  const [importMode, setImportMode] = useState('soma');
  const [importReport, setImportReport] = useState(null);
  const [importLoading, setImportLoading] = useState(false);
  const fileRef = useRef();

  const { data: insumos = [], isLoading } = useQuery({ queryKey: ['insumos'], queryFn: () => base44.entities.Insumo.list() });

  const saveMutation = useMutation({
    mutationFn: (data) => editId ? base44.entities.Insumo.update(editId, data) : base44.entities.Insumo.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['insumos'] }); setModal(false); setEditId(null); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Insumo.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['insumos'] }),
  });

  const openNew = () => { setForm({ nome: '', unidade: 'unidade', quantidade_estoque: 0, quantidade_minima: 0 }); setEditId(null); setModal(true); };
  const openEdit = (i) => { setForm({ ...i }); setEditId(i.id); setModal(true); };

  const handleFile = (e) => {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const wb = XLSX.read(ev.target.result, { type: 'binary' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });
      const preview = rows.map(row => ({
        nome: String(row.nome || '').trim(),
        unidade: row.unidade || 'unidade',
        quantidade_estoque: Math.max(0, Number(row.quantidade_estoque) || 0),
        quantidade_minima: Math.max(0, Number(row.quantidade_minima) || 0),
      })).filter(r => r.nome);
      setImportPreview(preview);
      setImportReport(null);
    };
    reader.readAsBinaryString(file);
  };

  const doImport = async () => {
    setImportLoading(true);
    let imported = 0, updated = 0, errors = 0;
    for (const row of importPreview) {
      if (!row.nome) { errors++; continue; }
      const existing = insumos.find(i => i.nome.toLowerCase() === row.nome.toLowerCase());
      if (existing) {
        const novaQtd = importMode === 'soma' ? existing.quantidade_estoque + row.quantidade_estoque : row.quantidade_estoque;
        await base44.entities.Insumo.update(existing.id, { ...row, quantidade_estoque: novaQtd });
        updated++;
      } else {
        await base44.entities.Insumo.create(row);
        imported++;
      }
    }
    qc.invalidateQueries({ queryKey: ['insumos'] });
    setImportLoading(false);
    setImportReport({ imported, updated, errors });
    setImportPreview([]);
    if (fileRef.current) fileRef.current.value = '';
  };

  const filtered = insumos.filter(i => !search || i.nome?.toLowerCase().includes(search.toLowerCase()));

  return (
    <div>
      <div className="flex gap-2 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input placeholder="Buscar insumo..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Button variant="outline" size="sm" onClick={() => setImportModal(true)}><Upload className="w-4 h-4 mr-1" /> Importar</Button>
        <Button size="sm" onClick={openNew} className="bg-orange-500 hover:bg-orange-600 text-white"><Plus className="w-4 h-4 mr-1" /> Novo</Button>
      </div>

      {isLoading ? <div className="text-center py-10 text-slate-400">Carregando...</div> :
        filtered.length === 0 ? <div className="text-center py-10 text-slate-400">Nenhum insumo.</div> :
        <div className="grid gap-3">
          {filtered.map(i => {
            const baixo = i.quantidade_estoque <= i.quantidade_minima;
            return (
              <div key={i.id} className={`bg-white border rounded-xl p-4 flex items-center gap-3 ${baixo ? 'border-red-200' : 'border-slate-200'}`}>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-800">{i.nome}</span>
                    {baixo && <span className="flex items-center gap-1 text-red-600 text-xs font-medium"><AlertTriangle className="w-3.5 h-3.5" /> Estoque baixo</span>}
                  </div>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-sm text-slate-600">Estoque: <b>{i.quantidade_estoque}</b> {i.unidade}</span>
                    <span className="text-xs text-slate-400">Mín: {i.quantidade_minima}</span>
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(i)}><Pencil className="w-4 h-4" /></Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8 text-red-400 hover:text-red-600" onClick={() => { if (confirm('Excluir?')) deleteMutation.mutate(i.id); }}><Trash2 className="w-4 h-4" /></Button>
                </div>
              </div>
            );
          })}
        </div>
      }

      <Dialog open={modal} onOpenChange={setModal}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>{editId ? 'Editar' : 'Novo'} Insumo</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Nome *</Label><Input value={form.nome} onChange={e => setForm(p => ({ ...p, nome: e.target.value }))} /></div>
            <div>
              <Label>Unidade</Label>
              <Select value={form.unidade} onValueChange={v => setForm(p => ({ ...p, unidade: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['ml', 'litro', 'unidade', 'kg', 'g'].map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Qtd. Estoque</Label><Input type="number" min="0" value={form.quantidade_estoque} onChange={e => setForm(p => ({ ...p, quantidade_estoque: Math.max(0, Number(e.target.value)) }))} /></div>
              <div><Label>Qtd. Mínima</Label><Input type="number" min="0" value={form.quantidade_minima} onChange={e => setForm(p => ({ ...p, quantidade_minima: Math.max(0, Number(e.target.value)) }))} /></div>
            </div>
            <Button className="w-full bg-orange-500 hover:bg-orange-600 text-white" onClick={() => saveMutation.mutate(form)} disabled={!form.nome || saveMutation.isPending}>
              {saveMutation.isPending ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={importModal} onOpenChange={(o) => { if (!o) { setImportPreview([]); setImportReport(null); } setImportModal(o); }}>
        <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Importar Insumos</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-slate-500">Colunas: <b>nome, unidade, quantidade_estoque, quantidade_minima</b></p>
            <input ref={fileRef} type="file" accept=".xlsx,.csv" onChange={handleFile} className="block w-full text-sm text-slate-600 file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:bg-orange-50 file:text-orange-600 hover:file:bg-orange-100 cursor-pointer" />

            {importPreview.length > 0 && (
              <>
                <div className="flex items-center gap-3">
                  <Label>Para insumos existentes:</Label>
                  <Select value={importMode} onValueChange={setImportMode}>
                    <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="soma">Somar ao estoque</SelectItem>
                      <SelectItem value="sobrescrever">Sobrescrever estoque</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="border rounded-lg overflow-hidden">
                  <div className="bg-slate-50 px-3 py-2 text-xs font-medium text-slate-600">{importPreview.length} registro(s)</div>
                  <div className="overflow-x-auto max-h-48">
                    <table className="w-full text-xs">
                      <thead><tr className="border-b">{['Nome','Unidade','Estoque','Mínimo'].map(h => <th key={h} className="px-3 py-1.5 text-left text-slate-500">{h}</th>)}</tr></thead>
                      <tbody>
                        {importPreview.slice(0, 20).map((r, i) => (
                          <tr key={i} className="border-b last:border-0">
                            <td className="px-3 py-1.5">{r.nome}</td>
                            <td className="px-3 py-1.5">{r.unidade}</td>
                            <td className="px-3 py-1.5">{r.quantidade_estoque}</td>
                            <td className="px-3 py-1.5">{r.quantidade_minima}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
                <Button className="w-full bg-orange-500 hover:bg-orange-600 text-white" onClick={doImport} disabled={importLoading}>
                  {importLoading ? 'Importando...' : 'Confirmar Importação'}
                </Button>
              </>
            )}
            {importReport && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-sm space-y-1">
                <div className="font-semibold text-green-700">Importação concluída!</div>
                <div>✅ Criados: <b>{importReport.imported}</b></div>
                <div>🔄 Atualizados: <b>{importReport.updated}</b></div>
                {importReport.errors > 0 && <div>❌ Erros: <b>{importReport.errors}</b></div>}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}