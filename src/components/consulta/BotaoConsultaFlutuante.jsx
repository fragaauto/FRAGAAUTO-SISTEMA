import React, { useState, useRef, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Search, X, Loader2, ChevronLeft, FileSpreadsheet, AlertCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { csvToObjects } from '@/lib/csvParser';

export default function BotaoConsultaFlutuante() {
  const [aberto, setAberto] = useState(false);
  const [consultaSelecionada, setConsultaSelecionada] = useState(null);
  const [termo, setTermo] = useState('');
  const [resultados, setResultados] = useState([]);
  const [buscando, setBuscando] = useState(false);
  const [erro, setErro] = useState(null);
  const cacheRef = useRef({});
  const debounceRef = useRef(null);

  const { data: configs = [] } = useQuery({
    queryKey: ['configuracoes'],
    queryFn: () => base44.entities.Configuracao.list(),
    staleTime: 5 * 60 * 1000,
  });

  const consultas = (configs[0]?.consultas_rapidas || []).filter(c => c.ativo);

  // Busca no CSV quando o termo muda (com debounce)
  useEffect(() => {
    if (!consultaSelecionada || !termo.trim()) {
      setResultados([]);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setBuscando(true);
      setErro(null);
      try {
        let dados = cacheRef.current[consultaSelecionada.id];
        if (!dados) {
          const res = await fetch(consultaSelecionada.link_csv);
          if (!res.ok) throw new Error('Falha ao buscar planilha');
          const text = await res.text();
          dados = csvToObjects(text);
          cacheRef.current[consultaSelecionada.id] = dados;
        }
        const tokens = termo.trim().toLowerCase().split(/\s+/).filter(Boolean);
        const filtrados = dados.filter(row => {
          const linhaStr = Object.values(row).map(v => String(v || '').toLowerCase()).join(' ');
          return tokens.every(tok => linhaStr.includes(tok));
        });
        setResultados(filtrados);
      } catch (e) {
        setErro(e.message || 'Erro ao buscar dados da planilha');
        setResultados([]);
      } finally {
        setBuscando(false);
      }
    }, 400);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [termo, consultaSelecionada]);

  const fechar = () => {
    setAberto(false);
    setConsultaSelecionada(null);
    setTermo('');
    setResultados([]);
    setErro(null);
  };

  const voltar = () => {
    setConsultaSelecionada(null);
    setTermo('');
    setResultados([]);
    setErro(null);
  };

  if (consultas.length === 0) return null;

  const headers = resultados.length > 0 ? Object.keys(resultados[0]) : [];
  const plural = resultados.length !== 1;

  return (
    <>
      {/* Botão flutuante */}
      {!aberto && (
        <button
          onClick={() => setAberto(true)}
          className="fixed bottom-5 right-5 z-50 w-14 h-14 rounded-full bg-orange-500 hover:bg-orange-600 text-white shadow-lg hover:shadow-xl flex items-center justify-center transition-all hover:scale-105 active:scale-95"
          title="Consultas Rápidas"
        >
          <Search className="w-6 h-6" />
        </button>
      )}

      {/* Painel de consulta */}
      {aberto && (
        <div className="fixed bottom-5 right-5 z-50 w-[calc(100vw-2.5rem)] max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden"
          style={{ maxHeight: '80vh' }}>
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-orange-500 text-white flex-shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              {consultaSelecionada && (
                <button onClick={voltar} className="hover:bg-orange-600 rounded-lg p-1 -ml-1 flex-shrink-0">
                  <ChevronLeft className="w-5 h-5" />
                </button>
              )}
              <div className="min-w-0">
                <p className="font-semibold text-sm truncate">
                  {consultaSelecionada ? consultaSelecionada.titulo : 'Consultas Rápidas'}
                </p>
                {!consultaSelecionada && (
                  <p className="text-xs text-orange-100">Selecione uma consulta</p>
                )}
              </div>
            </div>
            <button onClick={fechar} className="hover:bg-orange-600 rounded-lg p-1 flex-shrink-0">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Conteúdo */}
          <div className="flex-1 overflow-y-auto">
            {/* Lista de consultas */}
            {!consultaSelecionada && (
              <div className="p-3 space-y-2">
                {consultas.map(c => (
                  <button
                    key={c.id}
                    onClick={() => setConsultaSelecionada(c)}
                    className="w-full flex items-center gap-3 p-3 rounded-xl border border-slate-200 hover:border-orange-400 hover:bg-orange-50 transition-colors text-left"
                  >
                    <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center flex-shrink-0">
                      <FileSpreadsheet className="w-5 h-5 text-green-600" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-slate-800 text-sm truncate">{c.titulo}</p>
                      <p className="text-xs text-slate-400 truncate">Clique para pesquisar</p>
                    </div>
                    <Search className="w-4 h-4 text-slate-300 flex-shrink-0" />
                  </button>
                ))}
              </div>
            )}

            {/* Tela de busca dentro da consulta */}
            {consultaSelecionada && (
              <div className="flex flex-col">
                {/* Barra de pesquisa */}
                <div className="p-3 border-b border-slate-100 flex-shrink-0">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                      autoFocus
                      value={termo}
                      onChange={e => setTermo(e.target.value)}
                      placeholder="Digite o termo para buscar..."
                      className="pl-9"
                    />
                  </div>
                  {resultados.length > 0 && (
                    <p className="text-xs text-slate-500 mt-2 px-1">
                      {resultados.length} resultado{plural ? 's' : ''} encontrado{plural ? 's' : ''}
                    </p>
                  )}
                </div>

                {/* Resultados */}
                <div className="overflow-x-auto">
                  {buscando && (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin text-orange-500" />
                    </div>
                  )}

                  {erro && !buscando && (
                    <div className="p-4 text-center text-red-500 text-sm flex flex-col items-center gap-2">
                      <AlertCircle className="w-6 h-6" />
                      <p>{erro}</p>
                      <p className="text-xs text-slate-400">Verifique se o link CSV está correto e público.</p>
                    </div>
                  )}

                  {!buscando && !erro && termo.trim() && resultados.length === 0 && (
                    <div className="p-8 text-center text-slate-400 text-sm">
                      Nenhum resultado para "{termo}"
                    </div>
                  )}

                  {!buscando && !erro && !termo.trim() && (
                    <div className="p-8 text-center text-slate-400 text-sm">
                      <Search className="w-8 h-8 mx-auto mb-2 opacity-40" />
                      Digite acima para buscar nos dados da planilha
                    </div>
                  )}

                  {!buscando && !erro && resultados.length > 0 && (
                    <div className="p-2">
                      {resultados.map((row, idx) => (
                        <div key={idx} className="mb-2 p-3 rounded-lg border border-slate-200 hover:border-orange-300 bg-white">
                          {headers.map((h) => {
                            const val = row[h];
                            if (!val) return null;
                            const valLower = String(val).toLowerCase();
                            const tokens = termo.trim().toLowerCase().split(/\s+/).filter(Boolean);
                            const isMatch = tokens.some(tok => valLower.includes(tok));
                            return (
                              <div key={h} className="flex flex-col py-0.5 text-sm border-b border-slate-50 last:border-0">
                                <span className="text-xs text-slate-400 font-medium">{h}</span>
                                <span className={`text-slate-800 ${isMatch ? 'bg-yellow-100 rounded px-1 -mx-1 font-medium' : ''}`}>
                                  {val}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}