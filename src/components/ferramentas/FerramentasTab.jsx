import React, { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Search, Upload, Pencil, Trash2, Clock, AlertTriangle } from 'lucide-react';
import * as XLSX from 'xlsx';

const STATUS_COLORS = {
  'Disponível': 'bg-green-100 text-green-700 border-green-200',
  'Em uso': 'bg-blue-100 text-blue-700 border-blue-200',
  'Manutenção': 'bg-amber-100 text-amber-700 border-amber-200',
  'Perdido': 'bg-red-100 text-red-700 border-red-200',
};

const EMPTY = { codigo: '', nome: '', categoria: 'Manual', tipo: 'Ferramenta', status: 'Disponível', localizacao: '', observacoes: '' };

export default function FerramentasTab() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [editId, setEditId] = useState(null);
  const [importModal, setImportModal] = useState(false);
  const [importPreview, setImportPreview] = useState([]);
  const [importErrors, setImportErrors] = useState([]);
  const [importReport, setImportReport] = useState(null);
  const [importLoading, setImportLoading] = useState(false);
  const [importMode, setImportMode] = useState('skip'); // 'skip' | 'update'
  const fileRef = useRef();

  const { data: ferramentas = [], isLoading } = useQuery({
    queryKey: ['ferramentas'],
    queryFn: () => base44.entities.Ferramenta.list(),
  });

  const { data: usuarios = [] } = useQuery({
    queryKey: ['usuarios'],
    queryFn: () => base44.entities.User.list(),
  });

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (editId) return base44.entities.Ferramenta.update(editId, data);
      return base44.entities.Ferramenta.create(data);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['ferramentas'] }); setModal(false); setForm(EMPTY); setEditId(null); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Ferramenta.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ferramentas'] }),
  });

  const now = new Date();
  const filtered = ferramentas.filter(f => {
    const matchSearch = !search || f.nome?.toLowerCase().includes(search.toLowerCase()) || f.codigo?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || f.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const openEdit = (f) => { setForm({ ...f }); setEditId(f.id); setModal(true); };
  const openNew = () => { setForm(EMPTY); setEditId(null); setModal(true); };

  const handleSave = () => {
    if (!form.codigo || !form.nome) return;
    const codigoExists = ferramentas.some(f => f.codigo === form.codigo && f.id !== editId);
    if (codigoExists) { alert('Código já existe!'); return; }
    saveMutation.mutate(form);
  };

  // --- Import ---
  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const wb = XLSX.read(ev.target.result, { type: 'binary' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });
      const errors = [];
      const preview = rows.map((row, i) => {
        const r = { codigo: String(row.codigo || '').trim(), nome: String(row.nome || '').trim(), categoria: row.categoria || 'Manual', tipo: row.tipo || 'Ferramenta', status: row.status || 'Disponível', localizacao: row.localizacao || '', observacoes: row.observacoes || '' };
        if (!r.codigo) errors.push(`Linha ${i + 2}: código obrigatório`);
        if (!r.nome) errors.push(`Linha ${i + 2}: nome obrigatório`);
        return r;
      });
      setImportPreview(preview);
      setImportErrors(errors);
      setImportReport(null);
    };
    reader.readAsBinaryString(file);
  };

  const doImport = async () => {
    setImportLoading(true);
    let imported = 0, updated = 0, skipped = 0, errors = 0;
    for (const row of importPreview) {
      if (!row.codigo || !row.nome) { errors++; continue; }
      const existing = ferramentas.find(f => f.codigo === row.codigo);
      if (existing) {
        if (importMode === 'update') { await base44.entities.Ferramenta.update(existing.id, row); updated++; }
        else skipped++;
      } else {
        await base44.entities.Ferramenta.create(row); imported++;
      }
    }
    qc.invalidateQueries({ queryKey: ['ferramentas'] });
    setImportLoading(false);
    setImportReport({ imported, updated, skipped, errors });
    setImportPreview([]);
    fileRef.current.value = '';
  };

  return (
    <div>
      {/* Toolbar */}
      <div className="flex flex-wrap gap-2 mb-4">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input placeholder="Buscar ferramenta..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            <SelectItem value="Disponível">Disponível</SelectItem>
            <SelectItem value="Em uso">Em uso</SelectItem>
            <SelectItem value="Manutenção">Manutenção</SelectItem>
            <SelectItem value="Perdido">Perdido</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={() => setImportModal(true)}><Upload className="w-4 h-4 mr-1" /> Importar</Button>
        <Button size="sm" onClick={openNew} className="bg-orange-500 hover:bg-orange-600 text-white"><Plus className="w-4 h-4 mr-1" /> Nova</Button>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="text-center py-10 text-slate-400">Carregando...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-10 text-slate-400">Nenhuma ferramenta encontrada.</div>
      ) : (
        <div className="grid gap-3">
          {filtered.map(f => {
            const emUsoLongo = f.status === 'Em uso' && f.data_retirada && (now - new Date(f.data_retirada)) > 24 * 3600 * 1000;
            return (
              <div key={f.id} className={`bg-white border rounded-xl p-4 flex items-center gap-3 ${f.status === 'Em uso' ? 'border-blue-200' : 'border-slate-200'}`}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs text-slate-400">{f.codigo}</span>
                    <span className="font-semibold text-slate-800 truncate">{f.nome}</span>
                    {emUsoLongo && <span className="flex items-center gap-1 text-amber-600 text-xs font-medium"><Clock className="w-3 h-3" /> +24h</span>}
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    <Badge className={`text-xs border ${STATUS_COLORS[f.status] || ''}`}>{f.status}</Badge>
                    <Badge variant="outline" className="text-xs">{f.categoria}</Badge>
                    {f.localizacao && <span className="text-xs text-slate-500">{f.localizacao}</span>}
                    {f.responsavel_atual_nome && <span className="text-xs text-slate-500">👤 {f.responsavel_atual_nome}</span>}
                  </div>
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(f)}><Pencil className="w-4 h-4" /></Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8 text-red-400 hover:text-red-600" onClick={() => { if (confirm('Excluir?')) deleteMutation.mutate(f.id); }}><Trash2 className="w-4 h-4" /></Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Form Modal */}
      <Dialog open={modal} onOpenChange={setModal}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editId ? 'Editar' : 'Nova'} Ferramenta</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Código *</Label><Input value={form.codigo} onChange={e => setForm(p => ({ ...p, codigo: e.target.value }))} /></div>
              <div><Label>Nome *</Label><Input value={form.nome} onChange={e => setForm(p => ({ ...p, nome: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Categoria</Label>
                <Select value={form.categoria} onValueChange={v => setForm(p => ({ ...p, categoria: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['Manual', 'Elétrica', 'Medição', 'Outros'].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Tipo</Label>
                <Select value={form.tipo} onValueChange={v => setForm(p => ({ ...p, tipo: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Ferramenta">Ferramenta</SelectItem>
                    <SelectItem value="Insumo">Insumo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Status</Label>
                <Select value={form.status} onValueChange={v => setForm(p => ({ ...p, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['Disponível', 'Em uso', 'Manutenção', 'Perdido'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Localização</Label><Input value={form.localizacao} onChange={e => setForm(p => ({ ...p, localizacao: e.target.value }))} /></div>
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
            <div><Label>Observações</Label><Textarea value={form.observacoes} onChange={e => setForm(p => ({ ...p, observacoes: e.target.value }))} rows={2} /></div>
            <Button className="w-full bg-orange-500 hover:bg-orange-600 text-white" onClick={handleSave} disabled={saveMutation.isPending}>
              {saveMutation.isPending ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Import Modal */}
      <Dialog open={importModal} onOpenChange={(o) => { if (!o) { setImportPreview([]); setImportErrors([]); setImportReport(null); } setImportModal(o); }}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Importar Ferramentas</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-slate-500">Colunas aceitas: <b>codigo, nome, categoria, tipo, status, localizacao, observacoes</b></p>
            <input ref={fileRef} type="file" accept=".xlsx,.csv" onChange={handleFile} className="block w-full text-sm text-slate-600 file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:bg-orange-50 file:text-orange-600 hover:file:bg-orange-100 cursor-pointer" />

            {importPreview.length > 0 && (
              <>
                <div className="flex items-center gap-3">
                  <Label>Duplicados:</Label>
                  <Select value={importMode} onValueChange={setImportMode}>
                    <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="skip">Ignorar existentes</SelectItem>
                      <SelectItem value="update">Atualizar existentes</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {importErrors.length > 0 && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700 space-y-1">
                    <div className="font-medium flex items-center gap-1"><AlertTriangle className="w-4 h-4" /> Erros encontrados:</div>
                    {importErrors.map((e, i) => <div key={i}>{e}</div>)}
                  </div>
                )}
                <div className="border rounded-lg overflow-hidden">
                  <div className="bg-slate-50 px-3 py-2 text-xs font-medium text-slate-600">{importPreview.length} registro(s) para importar</div>
                  <div className="overflow-x-auto max-h-48">
                    <table className="w-full text-xs">
                      <thead><tr className="border-b">{['Código','Nome','Categoria','Tipo','Status'].map(h => <th key={h} className="px-3 py-1.5 text-left text-slate-500">{h}</th>)}</tr></thead>
                      <tbody>
                        {importPreview.slice(0, 20).map((r, i) => (
                          <tr key={i} className="border-b last:border-0">
                            <td className="px-3 py-1.5 font-mono">{r.codigo}</td>
                            <td className="px-3 py-1.5">{r.nome}</td>
                            <td className="px-3 py-1.5">{r.categoria}</td>
                            <td className="px-3 py-1.5">{r.tipo}</td>
                            <td className="px-3 py-1.5">{r.status}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
                <Button className="w-full bg-orange-500 hover:bg-orange-600 text-white" onClick={doImport} disabled={importLoading || importErrors.length > 0}>
                  {importLoading ? 'Importando...' : 'Confirmar Importação'}
                </Button>
              </>
            )}

            {importReport && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-sm space-y-1">
                <div className="font-semibold text-green-700">Importação concluída!</div>
                <div>✅ Importados: <b>{importReport.imported}</b></div>
                <div>🔄 Atualizados: <b>{importReport.updated}</b></div>
                <div>⏭️ Ignorados: <b>{importReport.skipped}</b></div>
                {importReport.errors > 0 && <div>❌ Erros: <b>{importReport.errors}</b></div>}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}