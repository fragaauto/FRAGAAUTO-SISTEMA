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
import { Plus, Search, Upload, Pencil, Trash2, Clock, AlertTriangle, Download, CheckCircle2, XCircle } from 'lucide-react';
import * as XLSX from 'xlsx';

const STATUS_COLORS = {
  'Disponível': 'bg-green-100 text-green-700 border-green-200',
  'Em uso': 'bg-blue-100 text-blue-700 border-blue-200',
  'Manutenção': 'bg-amber-100 text-amber-700 border-amber-200',
  'Perdido': 'bg-red-100 text-red-700 border-red-200',
};

const EMPTY = { codigo: '', nome: '', categoria: 'Manual', tipo: 'Ferramenta', status: 'Disponível', localizacao: '', observacoes: '' };

const VALID_CATEGORIAS = ['Manual', 'Elétrica', 'Medição', 'Outros'];
const VALID_TIPOS = ['Ferramenta', 'Insumo'];
const VALID_STATUS = ['Disponível', 'Em uso', 'Manutenção', 'Perdido'];

function ProgressBar({ value, total }) {
  const pct = total === 0 ? 0 : Math.round((value / total) * 100);
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-slate-500">
        <span>Processando {value} de {total}...</span>
        <span>{pct}%</span>
      </div>
      <div className="w-full bg-slate-100 rounded-full h-2.5">
        <div
          className="bg-orange-500 h-2.5 rounded-full transition-all duration-200"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

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
  const [importProgress, setImportProgress] = useState({ done: 0, total: 0 });
  const [importMode, setImportMode] = useState('skip');
  const fileRef = useRef();

  const { data: ferramentas = [], isLoading } = useQuery({
    queryKey: ['ferramentas'],
    queryFn: () => base44.entities.Ferramenta.list(),
  });

  const saveMutation = useMutation({
    mutationFn: async (data) => editId ? base44.entities.Ferramenta.update(editId, data) : base44.entities.Ferramenta.create(data),
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

  // --- Download modelo ---
  const downloadModelo = () => {
    const ws = XLSX.utils.aoa_to_sheet([
      ['codigo', 'nome', 'categoria', 'tipo', 'status', 'localizacao', 'observacoes'],
      ['F001', 'Chave de Fenda', 'Manual', 'Ferramenta', 'Disponível', 'Prateleira A1', ''],
      ['F002', 'Furadeira', 'Elétrica', 'Ferramenta', 'Disponível', 'Armário 2', ''],
    ]);
    ws['!cols'] = [{ wch: 10 }, { wch: 25 }, { wch: 15 }, { wch: 12 }, { wch: 14 }, { wch: 18 }, { wch: 30 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Ferramentas');
    XLSX.writeFile(wb, 'modelo_ferramentas.xlsx');
  };

  // --- Import file parse ---
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
        const lineNum = i + 2;
        const r = {
          codigo: String(row.codigo || '').trim(),
          nome: String(row.nome || '').trim(),
          categoria: String(row.categoria || 'Manual').trim(),
          tipo: String(row.tipo || 'Ferramenta').trim(),
          status: String(row.status || 'Disponível').trim(),
          localizacao: String(row.localizacao || '').trim(),
          observacoes: String(row.observacoes || '').trim(),
          _line: lineNum,
          _errors: [],
        };
        if (!r.codigo) r._errors.push('código obrigatório');
        if (!r.nome) r._errors.push('nome obrigatório');
        if (!VALID_CATEGORIAS.includes(r.categoria)) r._errors.push(`categoria inválida "${r.categoria}" (use: ${VALID_CATEGORIAS.join(', ')})`);
        if (!VALID_TIPOS.includes(r.tipo)) r._errors.push(`tipo inválido "${r.tipo}" (use: ${VALID_TIPOS.join(', ')})`);
        if (!VALID_STATUS.includes(r.status)) r._errors.push(`status inválido "${r.status}" (use: ${VALID_STATUS.join(', ')})`);

        if (r._errors.length > 0) {
          r._errors.forEach(err => errors.push(`Linha ${lineNum}: ${err}`));
        }
        return r;
      });

      setImportPreview(preview);
      setImportErrors(errors);
      setImportReport(null);
      setImportProgress({ done: 0, total: 0 });
    };
    reader.readAsBinaryString(file);
  };

  // --- Import execute ---
  const doImport = async () => {
    const validRows = importPreview.filter(r => r._errors.length === 0);
    setImportLoading(true);
    setImportProgress({ done: 0, total: validRows.length });

    let imported = 0, updated = 0, skipped = 0;
    const rowErrors = [];

    for (let idx = 0; idx < validRows.length; idx++) {
      const row = validRows[idx];
      const { _line, _errors, ...data } = row;
      try {
        const existing = ferramentas.find(f => f.codigo === data.codigo);
        if (existing) {
          if (importMode === 'update') { await base44.entities.Ferramenta.update(existing.id, data); updated++; }
          else skipped++;
        } else {
          await base44.entities.Ferramenta.create(data); imported++;
        }
      } catch (err) {
        rowErrors.push(`Linha ${_line} (${data.nome}): ${err?.message || 'erro desconhecido'}`);
      }
      setImportProgress({ done: idx + 1, total: validRows.length });
    }

    qc.invalidateQueries({ queryKey: ['ferramentas'] });
    setImportLoading(false);
    setImportReport({ imported, updated, skipped, rowErrors, skippedByError: importPreview.length - validRows.length });
    setImportPreview([]);
    setImportErrors([]);
    if (fileRef.current) fileRef.current.value = '';
  };

  const resetImport = () => { setImportPreview([]); setImportErrors([]); setImportReport(null); setImportProgress({ done: 0, total: 0 }); };

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
            {VALID_STATUS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
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
                  <SelectContent>{VALID_CATEGORIAS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Tipo</Label>
                <Select value={form.tipo} onValueChange={v => setForm(p => ({ ...p, tipo: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{VALID_TIPOS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Status</Label>
                <Select value={form.status} onValueChange={v => setForm(p => ({ ...p, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{VALID_STATUS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Localização</Label><Input value={form.localizacao} onChange={e => setForm(p => ({ ...p, localizacao: e.target.value }))} /></div>
            </div>
            <div><Label>Observações</Label><Textarea value={form.observacoes} onChange={e => setForm(p => ({ ...p, observacoes: e.target.value }))} rows={2} /></div>
            <Button className="w-full bg-orange-500 hover:bg-orange-600 text-white" onClick={handleSave} disabled={saveMutation.isPending}>
              {saveMutation.isPending ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Import Modal */}
      <Dialog open={importModal} onOpenChange={(o) => { if (!o) resetImport(); setImportModal(o); }}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Importar Ferramentas</DialogTitle></DialogHeader>
          <div className="space-y-4">

            {/* Download modelo */}
            <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-lg px-4 py-3">
              <div>
                <p className="text-sm font-medium text-slate-700">Modelo de planilha</p>
                <p className="text-xs text-slate-400 mt-0.5">Baixe, preencha e faça upload do arquivo</p>
              </div>
              <Button variant="outline" size="sm" onClick={downloadModelo}>
                <Download className="w-4 h-4 mr-1.5" /> Baixar Modelo
              </Button>
            </div>

            <div>
              <Label className="text-sm font-medium">Selecionar arquivo (.xlsx ou .csv)</Label>
              <input ref={fileRef} type="file" accept=".xlsx,.csv" onChange={handleFile}
                className="mt-1.5 block w-full text-sm text-slate-600 file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:bg-orange-50 file:text-orange-600 hover:file:bg-orange-100 cursor-pointer" />
            </div>

            {/* Erros de validação */}
            {importErrors.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 space-y-1.5">
                <div className="flex items-center gap-1.5 text-red-700 font-medium text-sm">
                  <AlertTriangle className="w-4 h-4" /> {importErrors.length} erro(s) encontrado(s) na planilha
                </div>
                <div className="max-h-40 overflow-y-auto space-y-1">
                  {importErrors.map((e, i) => (
                    <div key={i} className="flex items-start gap-1.5 text-xs text-red-600">
                      <XCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" /> {e}
                    </div>
                  ))}
                </div>
                <p className="text-xs text-red-500 mt-1">Corrija os erros na planilha e faça o upload novamente.</p>
              </div>
            )}

            {/* Preview tabela */}
            {importPreview.length > 0 && (
              <>
                <div className="flex items-center gap-3">
                  <Label>Duplicados (mesmo código):</Label>
                  <Select value={importMode} onValueChange={setImportMode}>
                    <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="skip">Ignorar existentes</SelectItem>
                      <SelectItem value="update">Atualizar existentes</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="border rounded-lg overflow-hidden">
                  <div className="bg-slate-50 px-3 py-2 text-xs font-medium text-slate-600 flex items-center justify-between">
                    <span>{importPreview.length} registro(s) detectado(s)</span>
                    {importErrors.length > 0 && <span className="text-red-500">{importErrors.length} com erro serão ignorados</span>}
                  </div>
                  <div className="overflow-x-auto max-h-48">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b bg-white">
                          {['', 'Código', 'Nome', 'Categoria', 'Tipo', 'Status'].map(h => (
                            <th key={h} className="px-3 py-1.5 text-left text-slate-500">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {importPreview.slice(0, 30).map((r, i) => (
                          <tr key={i} className={`border-b last:border-0 ${r._errors.length > 0 ? 'bg-red-50' : ''}`}>
                            <td className="px-2 py-1.5">
                              {r._errors.length > 0
                                ? <XCircle className="w-3.5 h-3.5 text-red-400" />
                                : <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />}
                            </td>
                            <td className="px-3 py-1.5 font-mono">{r.codigo || <span className="text-red-400 italic">vazio</span>}</td>
                            <td className="px-3 py-1.5">{r.nome || <span className="text-red-400 italic">vazio</span>}</td>
                            <td className="px-3 py-1.5">{r.categoria}</td>
                            <td className="px-3 py-1.5">{r.tipo}</td>
                            <td className="px-3 py-1.5">{r.status}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Barra de progresso durante importação */}
                {importLoading && (
                  <ProgressBar value={importProgress.done} total={importProgress.total} />
                )}

                <Button
                  className="w-full bg-orange-500 hover:bg-orange-600 text-white"
                  onClick={doImport}
                  disabled={importLoading || importPreview.filter(r => r._errors.length === 0).length === 0}
                >
                  {importLoading
                    ? `Importando... (${importProgress.done}/${importProgress.total})`
                    : `Importar ${importPreview.filter(r => r._errors.length === 0).length} registro(s) válido(s)`}
                </Button>
              </>
            )}

            {/* Relatório final */}
            {importReport && (
              <div className="rounded-lg border overflow-hidden">
                <div className="bg-green-500 px-4 py-2.5 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-white" />
                  <span className="font-semibold text-white text-sm">Importação concluída!</span>
                </div>
                <div className="p-4 space-y-2 bg-white text-sm">
                  <div className="flex items-center gap-2 text-green-700">
                    <CheckCircle2 className="w-4 h-4" /> <span><b>{importReport.imported}</b> ferramenta(s) criada(s)</span>
                  </div>
                  <div className="flex items-center gap-2 text-blue-700">
                    <CheckCircle2 className="w-4 h-4" /> <span><b>{importReport.updated}</b> ferramenta(s) atualizada(s)</span>
                  </div>
                  {importReport.skipped > 0 && (
                    <div className="flex items-center gap-2 text-slate-500">
                      <CheckCircle2 className="w-4 h-4" /> <span><b>{importReport.skipped}</b> ignorada(s) (já existiam)</span>
                    </div>
                  )}
                  {importReport.skippedByError > 0 && (
                    <div className="flex items-center gap-2 text-amber-600">
                      <AlertTriangle className="w-4 h-4" /> <span><b>{importReport.skippedByError}</b> ignorada(s) por erro na planilha</span>
                    </div>
                  )}
                  {importReport.rowErrors.length > 0 && (
                    <div className="mt-3 bg-red-50 border border-red-200 rounded-lg p-3 space-y-1">
                      <div className="text-red-700 font-medium text-xs flex items-center gap-1">
                        <XCircle className="w-3.5 h-3.5" /> Erros durante importação:
                      </div>
                      {importReport.rowErrors.map((e, i) => (
                        <div key={i} className="text-xs text-red-600">{e}</div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}