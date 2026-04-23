import React, { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Plus, Search, Pencil, Trash2, AlertTriangle, Upload, Download, CheckCircle2, XCircle } from 'lucide-react';
import * as XLSX from 'xlsx';

const VALID_UNIDADES = ['ml', 'litro', 'unidade', 'kg', 'g'];

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

export default function InsumosTab() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ codigo: '', nome: '', unidade: 'unidade', quantidade_estoque: 0, quantidade_minima: 0 });
  const [importModal, setImportModal] = useState(false);
  const [importPreview, setImportPreview] = useState([]);
  const [importErrors, setImportErrors] = useState([]);
  const [importMode, setImportMode] = useState('soma');
  const [importReport, setImportReport] = useState(null);
  const [importLoading, setImportLoading] = useState(false);
  const [importProgress, setImportProgress] = useState({ done: 0, total: 0 });
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

  const openNew = () => { setForm({ codigo: '', nome: '', unidade: 'unidade', quantidade_estoque: 0, quantidade_minima: 0 }); setEditId(null); setModal(true); };
  const openEdit = (i) => { setForm({ codigo: i.codigo || '', nome: i.nome, unidade: i.unidade, quantidade_estoque: i.quantidade_estoque, quantidade_minima: i.quantidade_minima }); setEditId(i.id); setModal(true); };

  // --- Download modelo ---
  const downloadModelo = () => {
    const ws = XLSX.utils.aoa_to_sheet([
      ['codigo', 'nome', 'unidade', 'quantidade_estoque', 'quantidade_minima'],
      ['INS001', 'Óleo 5W30', 'litro', 10, 2],
      ['INS002', 'Luva Nitrílica', 'unidade', 100, 20],
      ['INS003', 'Removedor', 'ml', 5000, 1000],
    ]);
    ws['!cols'] = [{ wch: 10 }, { wch: 25 }, { wch: 10 }, { wch: 20 }, { wch: 18 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Insumos');
    XLSX.writeFile(wb, 'modelo_insumos.xlsx');
  };

  // --- File parse ---
  const handleFile = (e) => {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const wb = XLSX.read(ev.target.result, { type: 'binary' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });

      const errors = [];
      const preview = rows.map((row, i) => {
        const lineNum = i + 2;
        const codigo = String(row.codigo || '').trim();
        const nome = String(row.nome || '').trim();
        const unidade = String(row.unidade || 'unidade').trim().toLowerCase();
        const qtdEstoque = Number(row.quantidade_estoque);
        const qtdMinima = Number(row.quantidade_minima);
        const rowErrors = [];

        if (!codigo) rowErrors.push('código obrigatório');
        if (!nome) rowErrors.push('nome obrigatório');
        if (!VALID_UNIDADES.includes(unidade)) rowErrors.push(`unidade inválida "${unidade}" (use: ${VALID_UNIDADES.join(', ')})`);
        if (isNaN(qtdEstoque) || qtdEstoque < 0) rowErrors.push('quantidade_estoque deve ser um número >= 0');
        if (isNaN(qtdMinima) || qtdMinima < 0) rowErrors.push('quantidade_minima deve ser um número >= 0');

        rowErrors.forEach(err => errors.push(`Linha ${lineNum}: ${err}`));

        return {
          codigo,
          nome,
          unidade: VALID_UNIDADES.includes(unidade) ? unidade : 'unidade',
          quantidade_estoque: isNaN(qtdEstoque) ? 0 : Math.max(0, qtdEstoque),
          quantidade_minima: isNaN(qtdMinima) ? 0 : Math.max(0, qtdMinima),
          _line: lineNum,
          _errors: rowErrors,
        };
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

    let imported = 0, updated = 0;
    const rowErrors = [];

    for (let idx = 0; idx < validRows.length; idx++) {
      const row = validRows[idx];
      const { _line, _errors, ...data } = row;
      try {
        const existing = insumos.find(i => i.codigo && i.codigo === data.codigo);
        if (existing) {
          const novaQtd = importMode === 'soma'
            ? existing.quantidade_estoque + data.quantidade_estoque
            : data.quantidade_estoque;
          await base44.entities.Insumo.update(existing.id, { ...data, quantidade_estoque: novaQtd });
          updated++;
        } else {
          await base44.entities.Insumo.create(data);
          imported++;
        }
      } catch (err) {
        rowErrors.push(`Linha ${_line} (${data.nome}): ${err?.message || 'erro desconhecido'}`);
      }
      setImportProgress({ done: idx + 1, total: validRows.length });
    }

    qc.invalidateQueries({ queryKey: ['insumos'] });
    setImportLoading(false);
    setImportReport({ imported, updated, rowErrors, skippedByError: importPreview.length - validRows.length });
    setImportPreview([]);
    setImportErrors([]);
    if (fileRef.current) fileRef.current.value = '';
  };

  const resetImport = () => { setImportPreview([]); setImportErrors([]); setImportReport(null); setImportProgress({ done: 0, total: 0 }); };

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
                    {i.codigo && <span className="font-mono text-xs text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">{i.codigo}</span>}
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

      {/* Form Modal */}
      <Dialog open={modal} onOpenChange={setModal}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>{editId ? 'Editar' : 'Novo'} Insumo</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Código *</Label><Input value={form.codigo} onChange={e => setForm(p => ({ ...p, codigo: e.target.value }))} placeholder="Ex: INS001" /></div>
              <div><Label>Nome *</Label><Input value={form.nome} onChange={e => setForm(p => ({ ...p, nome: e.target.value }))} /></div>
            </div>
            <div>
              <Label>Unidade</Label>
              <Select value={form.unidade} onValueChange={v => setForm(p => ({ ...p, unidade: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{VALID_UNIDADES.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Qtd. Estoque</Label><Input type="number" min="0" value={form.quantidade_estoque} onChange={e => setForm(p => ({ ...p, quantidade_estoque: Math.max(0, Number(e.target.value)) }))} /></div>
              <div><Label>Qtd. Mínima</Label><Input type="number" min="0" value={form.quantidade_minima} onChange={e => setForm(p => ({ ...p, quantidade_minima: Math.max(0, Number(e.target.value)) }))} /></div>
            </div>
            <Button className="w-full bg-orange-500 hover:bg-orange-600 text-white" onClick={() => saveMutation.mutate(form)} disabled={!form.codigo || !form.nome || saveMutation.isPending}>
              {saveMutation.isPending ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Import Modal */}
      <Dialog open={importModal} onOpenChange={(o) => { if (!o) resetImport(); setImportModal(o); }}>
        <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Importar Insumos</DialogTitle></DialogHeader>
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

            {/* Preview */}
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
                  <div className="bg-slate-50 px-3 py-2 text-xs font-medium text-slate-600 flex items-center justify-between">
                    <span>{importPreview.length} registro(s) detectado(s)</span>
                    {importErrors.length > 0 && <span className="text-red-500">{importErrors.length} com erro serão ignorados</span>}
                  </div>
                  <div className="overflow-x-auto max-h-48">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b bg-white">
                          {['', 'Código', 'Nome', 'Unidade', 'Estoque', 'Mínimo'].map(h => (
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
                            <td className="px-3 py-1.5">{r.unidade}</td>
                            <td className="px-3 py-1.5">{r.quantidade_estoque}</td>
                            <td className="px-3 py-1.5">{r.quantidade_minima}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Barra de progresso */}
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
                    <CheckCircle2 className="w-4 h-4" /> <span><b>{importReport.imported}</b> insumo(s) criado(s)</span>
                  </div>
                  <div className="flex items-center gap-2 text-blue-700">
                    <CheckCircle2 className="w-4 h-4" /> <span><b>{importReport.updated}</b> insumo(s) atualizado(s)</span>
                  </div>
                  {importReport.skippedByError > 0 && (
                    <div className="flex items-center gap-2 text-amber-600">
                      <AlertTriangle className="w-4 h-4" /> <span><b>{importReport.skippedByError}</b> ignorado(s) por erro na planilha</span>
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