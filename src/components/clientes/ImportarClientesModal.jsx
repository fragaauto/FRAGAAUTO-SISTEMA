import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { Upload, FileSpreadsheet, Loader2, CheckCircle2, XCircle, Download, AlertTriangle, RefreshCw, SkipForward } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import * as XLSX from 'xlsx';

// Converte data em qualquer formato para AAAA-MM-DD
function parseDateToISO(val) {
  if (!val) return '';
  // Date object (quando cellDates: true)
  if (val instanceof Date) {
    const yyyy = val.getUTCFullYear();
    const mm = String(val.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(val.getUTCDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }
  const str = String(val).trim();
  // Serial numérico do Excel (ex: 28537)
  const num = Number(str);
  if (!isNaN(num) && num > 10000 && /^\d+$/.test(str)) {
    const date = new Date((num - 25569) * 86400 * 1000);
    const yyyy = date.getUTCFullYear();
    const mm = String(date.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(date.getUTCDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }
  // Formato dd/MM/AAAA
  const ddMMYYYY = str.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (ddMMYYYY) return `${ddMMYYYY[3]}-${ddMMYYYY[2]}-${ddMMYYYY[1]}`;
  // Formato AAAA-MM-DD
  const isoDate = str.match(/^\d{4}-\d{2}-\d{2}$/);
  if (isoDate) return str;
  return '';
}

function extrairDados(row) {
  return {
    nome: row['nome'] || row['Nome'] || row['NOME'] || '',
    telefone: String(row['telefone'] || row['Telefone'] || row['TELEFONE'] || row['celular'] || row['Celular'] || ''),
    email: row['email'] || row['Email'] || row['EMAIL'] || '',
    cpf_cnpj: row['cpf_cnpj'] || row['CPF'] || row['CNPJ'] || '',
    data_nascimento: parseDateToISO(row['data_nascimento'] || row['Data de Nascimento'] || row['data_nascimento'] || ''),
    endereco: row['endereco'] || row['Endereço'] || row['ENDERECO'] || '',
  };
}

export default function ImportarClientesModal({ onClose, onImportado }) {
  const [arquivo, setArquivo] = useState(null);
  const [preview, setPreview] = useState([]);
  const [rows, setRows] = useState([]);
  const [etapa, setEtapa] = useState('upload'); // upload | confirmar | importando | resultado
  const [duplicatas, setDuplicatas] = useState([]); // [{rowData, clienteExistente}]
  const [progresso, setProgresso] = useState(0);
  const [resultados, setResultados] = useState(null);
  const [resolucao, setResolucao] = useState(null); // 'atualizar' | 'ignorar'
  const [verificando, setVerificando] = useState(false);

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
      setRows(data);
    };
    reader.readAsBinaryString(file);
  };

  const verificarDuplicatas = async () => {
    setVerificando(true);
    try {
      const clientes = await base44.entities.Cliente.list();
      const telefonesMap = {};
      clientes.forEach(c => {
        const tel = (c.telefone || '').replace(/\D/g, '');
        if (tel) telefonesMap[tel] = c;
      });

      const dups = [];
      rows.forEach(row => {
        const dados = extrairDados(row);
        if (!dados.nome || !dados.telefone) return;
        const tel = dados.telefone.replace(/\D/g, '');
        if (telefonesMap[tel]) {
          dups.push({ dados, clienteExistente: telefonesMap[tel] });
        }
      });

      setDuplicatas(dups);
      if (dups.length > 0) {
        setEtapa('confirmar');
      } else {
        await executarImportacao('ignorar', []);
      }
    } catch (e) {
      toast.error('Erro ao verificar duplicatas');
    } finally {
      setVerificando(false);
    }
  };

  const executarImportacao = async (resolucaoEscolhida, dups) => {
    setEtapa('importando');
    setProgresso(0);

    const clientes = dups.length > 0 ? await base44.entities.Cliente.list() : [];
    const telefonesMap = {};
    clientes.forEach(c => {
      const tel = (c.telefone || '').replace(/\D/g, '');
      if (tel) telefonesMap[tel] = c;
    });

    let ok = 0, atualizados = 0, ignorados = 0, erros = 0;
    for (let i = 0; i < rows.length; i++) {
      const dados = extrairDados(rows[i]);
      if (!dados.nome || !dados.telefone) { erros++; setProgresso(Math.round(((i + 1) / rows.length) * 100)); continue; }

      const tel = dados.telefone.replace(/\D/g, '');
      const existente = telefonesMap[tel];

      try {
        if (existente) {
          if (resolucaoEscolhida === 'atualizar') {
            await base44.entities.Cliente.update(existente.id, dados);
            atualizados++;
          } else {
            ignorados++;
          }
        } else {
          await base44.entities.Cliente.create(dados);
          ok++;
        }
      } catch { erros++; }

      setProgresso(Math.round(((i + 1) / rows.length) * 100));
    }

    setResultados({ ok, atualizados, ignorados, erros, total: rows.length });
    setEtapa('resultado');
    if (ok > 0 || atualizados > 0) onImportado();
  };

  const confirmarImportacao = async (resolucaoEscolhida) => {
    setResolucao(resolucaoEscolhida);
    await executarImportacao(resolucaoEscolhida, duplicatas);
  };

  const baixarModelo = () => {
    const ws = XLSX.utils.aoa_to_sheet([
      ['nome', 'telefone', 'email', 'cpf_cnpj', 'data_nascimento', 'endereco'],
      ['João Silva', '31999998888', 'joao@email.com', '123.456.789-00', '15/06/1985', 'Rua das Flores, 100'],
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Clientes');
    XLSX.writeFile(wb, 'modelo_importacao_clientes.xlsx');
  };

  return (
    <Dialog open onOpenChange={etapa === 'upload' || etapa === 'confirmar' ? onClose : undefined}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-green-600" />
            Importar Clientes em Massa
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">

          {/* ETAPA: UPLOAD */}
          {etapa === 'upload' && (
            <>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-700">
                <p className="font-medium mb-1">Colunas aceitas na planilha:</p>
                <p><strong>nome</strong>, <strong>telefone</strong> (obrigatórios), email, cpf_cnpj, data_nascimento (dd/MM/AAAA), endereco</p>
                <Button size="sm" variant="ghost" className="mt-2 text-blue-700 text-xs px-0" onClick={baixarModelo}>
                  <Download className="w-3 h-3 mr-1" /> Baixar planilha modelo
                </Button>
              </div>

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

              <div className="flex gap-3">
                <Button variant="outline" onClick={onClose} className="flex-1">Cancelar</Button>
                <Button onClick={verificarDuplicatas} disabled={!arquivo || verificando} className="flex-1 bg-orange-500 hover:bg-orange-600">
                  {verificando ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                  {verificando ? 'Verificando...' : `Importar (${rows.length} linhas)`}
                </Button>
              </div>
            </>
          )}

          {/* ETAPA: CONFIRMAR DUPLICATAS */}
          {etapa === 'confirmar' && (
            <>
              <div className="flex items-start gap-2 bg-amber-50 border border-amber-300 rounded-lg p-3">
                <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-amber-800 text-sm">{duplicatas.length} cadastro(s) duplicado(s) encontrado(s)</p>
                  <p className="text-xs text-amber-700 mt-0.5">Clientes com o mesmo telefone já existem no sistema. O que deseja fazer?</p>
                </div>
              </div>

              <div className="border rounded-lg overflow-hidden max-h-48 overflow-y-auto">
                <div className="bg-slate-50 px-3 py-1.5 border-b text-xs font-medium text-slate-500">Duplicatas encontradas</div>
                {duplicatas.map((d, i) => (
                  <div key={i} className="flex items-center justify-between px-3 py-2 border-b last:border-0 text-sm">
                    <div>
                      <p className="font-medium text-slate-800">{d.dados.nome}</p>
                      <p className="text-xs text-slate-500">{d.dados.telefone}</p>
                    </div>
                    <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">já cadastrado</span>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Button
                  onClick={() => confirmarImportacao('atualizar')}
                  className="bg-blue-600 hover:bg-blue-700 flex-col h-auto py-3 gap-1"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span className="text-xs">Atualizar duplicados</span>
                </Button>
                <Button
                  onClick={() => confirmarImportacao('ignorar')}
                  variant="outline"
                  className="flex-col h-auto py-3 gap-1"
                >
                  <SkipForward className="w-4 h-4" />
                  <span className="text-xs">Ignorar duplicados</span>
                </Button>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setEtapa('upload')} className="w-full text-slate-500">
                Voltar
              </Button>
            </>
          )}

          {/* ETAPA: IMPORTANDO */}
          {etapa === 'importando' && (
            <div className="space-y-3 py-4">
              <div className="flex justify-between text-sm text-slate-600">
                <span className="flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> Importando...</span>
                <span>{progresso}%</span>
              </div>
              <Progress value={progresso} className="h-3" />
            </div>
          )}

          {/* ETAPA: RESULTADO */}
          {etapa === 'resultado' && resultados && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                {resultados.ok > 0 && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
                    <CheckCircle2 className="w-6 h-6 text-green-600 mx-auto mb-1" />
                    <p className="text-2xl font-bold text-green-600">{resultados.ok}</p>
                    <p className="text-xs text-green-700">Novos</p>
                  </div>
                )}
                {resultados.atualizados > 0 && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-center">
                    <RefreshCw className="w-6 h-6 text-blue-600 mx-auto mb-1" />
                    <p className="text-2xl font-bold text-blue-600">{resultados.atualizados}</p>
                    <p className="text-xs text-blue-700">Atualizados</p>
                  </div>
                )}
                {resultados.ignorados > 0 && (
                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-center">
                    <SkipForward className="w-6 h-6 text-slate-400 mx-auto mb-1" />
                    <p className="text-2xl font-bold text-slate-500">{resultados.ignorados}</p>
                    <p className="text-xs text-slate-500">Ignorados</p>
                  </div>
                )}
                {resultados.erros > 0 && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-center">
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