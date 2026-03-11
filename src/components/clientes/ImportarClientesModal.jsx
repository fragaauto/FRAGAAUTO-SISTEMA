import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { Upload, FileSpreadsheet, Loader2, CheckCircle2, XCircle, Download, AlertTriangle } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import * as XLSX from 'xlsx';

export default function ImportarClientesModal({ onClose, onImportado }) {
  const [arquivo, setArquivo] = useState(null);
  const [preview, setPreview] = useState([]);
  const [importando, setImportando] = useState(false);
  const [progresso, setProgresso] = useState(0);
  const [resultados, setResultados] = useState(null);

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setArquivo(file);

    const reader = new FileReader();
    reader.onload = (evt) => {
      const wb = XLSX.read(evt.target.result, { type: 'binary' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json(ws, { defval: '' });
      setPreview(data.slice(0, 5));
    };
    reader.readAsBinaryString(file);
  };

  const importar = async () => {
    if (!arquivo) return;
    setImportando(true);
    setProgresso(0);

    const reader = new FileReader();
    reader.onload = async (evt) => {
      const wb = XLSX.read(evt.target.result, { type: 'binary' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });

      let ok = 0, erros = 0;
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const nome = row['nome'] || row['Nome'] || row['NOME'] || '';
        const telefone = String(row['telefone'] || row['Telefone'] || row['TELEFONE'] || row['celular'] || row['Celular'] || '');
        if (!nome || !telefone) { erros++; continue; }
        try {
          await base44.entities.Cliente.create({
            nome,
            telefone,
            email: row['email'] || row['Email'] || row['EMAIL'] || '',
            cpf_cnpj: row['cpf_cnpj'] || row['CPF'] || row['CNPJ'] || '',
            data_nascimento: row['data_nascimento'] || row['Data de Nascimento'] || row['data_nascimento'] || '',
            endereco: row['endereco'] || row['Endereço'] || row['ENDERECO'] || '',
          });
          ok++;
        } catch { erros++; }
        setProgresso(Math.round(((i + 1) / rows.length) * 100));
      }
      setResultados({ ok, erros, total: rows.length });
      setImportando(false);
      if (ok > 0) onImportado();
    };
    reader.readAsBinaryString(arquivo);
  };

  const baixarModelo = () => {
    const ws = XLSX.utils.aoa_to_sheet([
      ['nome', 'telefone', 'email', 'cpf_cnpj', 'data_nascimento', 'endereco'],
      ['João Silva', '31999998888', 'joao@email.com', '123.456.789-00', '1985-06-15', 'Rua das Flores, 100'],
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Clientes');
    XLSX.writeFile(wb, 'modelo_importacao_clientes.xlsx');
  };

  return (
    <Dialog open onOpenChange={!importando ? onClose : undefined}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-green-600" />
            Importar Clientes em Massa
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-700">
            <p className="font-medium mb-1">Colunas aceitas na planilha:</p>
            <p><strong>nome</strong>, <strong>telefone</strong> (obrigatórios), email, cpf_cnpj, data_nascimento (AAAA-MM-DD), endereco</p>
            <Button size="sm" variant="ghost" className="mt-2 text-blue-700 text-xs px-0" onClick={baixarModelo}>
              <Download className="w-3 h-3 mr-1" /> Baixar planilha modelo
            </Button>
          </div>

          {!resultados && (
            <>
              <div
                className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center cursor-pointer hover:border-orange-400 transition-colors"
                onClick={() => document.getElementById('file-input-clientes').click()}
              >
                <Upload className="w-8 h-8 mx-auto mb-2 text-slate-400" />
                <p className="text-sm text-slate-600">{arquivo ? arquivo.name : 'Clique para selecionar ou arraste o arquivo'}</p>
                <p className="text-xs text-slate-400 mt-1">Excel (.xlsx, .xls) ou CSV</p>
                <input id="file-input-clientes" type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleFile} />
              </div>

              {preview.length > 0 && (
                <div>
                  <p className="text-xs text-slate-500 mb-1">Prévia (primeiras 5 linhas):</p>
                  <div className="overflow-x-auto border rounded text-xs">
                    <table className="w-full">
                      <thead className="bg-slate-50">
                        <tr>{Object.keys(preview[0]).slice(0, 5).map(k => <th key={k} className="px-2 py-1 text-left font-medium text-slate-600">{k}</th>)}</tr>
                      </thead>
                      <tbody>
                        {preview.map((row, i) => (
                          <tr key={i} className="border-t">
                            {Object.values(row).slice(0, 5).map((v, j) => <td key={j} className="px-2 py-1 text-slate-700 truncate max-w-[100px]">{String(v)}</td>)}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {importando && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm text-slate-600">
                    <span className="flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> Importando...</span>
                    <span>{progresso}%</span>
                  </div>
                  <Progress value={progresso} className="h-2" />
                </div>
              )}

              <div className="flex gap-3">
                <Button variant="outline" onClick={onClose} disabled={importando} className="flex-1">Cancelar</Button>
                <Button onClick={importar} disabled={!arquivo || importando} className="flex-1 bg-orange-500 hover:bg-orange-600">
                  {importando ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                  {importando ? 'Importando...' : 'Importar'}
                </Button>
              </div>
            </>
          )}

          {resultados && (
            <div className="space-y-3">
              <div className="flex gap-3">
                <div className="flex-1 bg-green-50 border border-green-200 rounded-lg p-3 text-center">
                  <CheckCircle2 className="w-6 h-6 text-green-600 mx-auto mb-1" />
                  <p className="text-2xl font-bold text-green-600">{resultados.ok}</p>
                  <p className="text-xs text-green-700">Importados</p>
                </div>
                {resultados.erros > 0 && (
                  <div className="flex-1 bg-red-50 border border-red-200 rounded-lg p-3 text-center">
                    <XCircle className="w-6 h-6 text-red-500 mx-auto mb-1" />
                    <p className="text-2xl font-bold text-red-500">{resultados.erros}</p>
                    <p className="text-xs text-red-600">Com erro</p>
                  </div>
                )}
              </div>
              {resultados.erros > 0 && (
                <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-700">
                  <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  Linhas sem "nome" ou "telefone" foram ignoradas.
                </div>
              )}
              <Button onClick={onClose} className="w-full bg-green-600 hover:bg-green-700">
                <CheckCircle2 className="w-4 h-4 mr-2" /> Concluído
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}