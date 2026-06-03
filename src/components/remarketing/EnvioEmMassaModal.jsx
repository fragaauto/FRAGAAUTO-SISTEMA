import React, { useState, useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { Send, Loader2, CheckCircle2, XCircle, AlertTriangle, Clock, X } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function EnvioEmMassaModal({ itens, config, onClose, onEnviado }) {
  const [intervaloMin, setIntervaloMin] = useState(15);
  const [intervaloMax, setIntervaloMax] = useState(25);
  const [rodando, setRodando] = useState(false);
  const [cancelado, setCancelado] = useState(false);
  const [resultados, setResultados] = useState([]);
  const [enviados, setEnviados] = useState(0);
  const [erros, setErros] = useState(0);
  const [statusMsg, setStatusMsg] = useState('');
  const cancelRef = useRef(false);

  // IDs ainda pendentes (começa com todos, vai sendo reduzido conforme lotes são enviados)
  const idsPendentesRef = useRef(itens.map(i => i.id));
  const totalRef = useRef(itens.length);

  const progresso = totalRef.current > 0
    ? Math.round(((enviados + erros) / totalRef.current) * 100)
    : 0;
  const finalizado = !rodando && (enviados + erros) >= totalRef.current && totalRef.current > 0;

  // Estima tempo: 5 contatos por lote com média de intervalos
  const tempoEstimado = Math.ceil(itens.length * ((intervaloMin + intervaloMax) / 2) / 60);

  const dispararLote = async () => {
    if (cancelRef.current) return;
    if (idsPendentesRef.current.length === 0) {
      setRodando(false);
      return;
    }

    const pendentes = idsPendentesRef.current;
    setStatusMsg(`Enviando lote (${pendentes.length} restantes)...`);

    try {
      const res = await base44.functions.invoke('dispararEnvioMassaRemarketingLote', {
        ids: pendentes,
        intervaloMin,
        intervaloMax,
      });

      const data = res.data;

      if (!data?.ok) {
        const errMsg = data?.error || 'Erro ao enviar lote';
        toast.error(errMsg);
        setStatusMsg('Erro: ' + errMsg);
        setRodando(false);
        return;
      }

      // Atualiza contadores
      setEnviados(prev => prev + (data.enviados || 0));
      setErros(prev => prev + (data.erros || 0));

      // Registra resultados individuais
      if (data.resultados?.length) {
        setResultados(prev => [...prev, ...data.resultados]);

        // Notifica os enviados com sucesso
        data.resultados.filter(r => r.ok).forEach(r => onEnviado(r.id));
      }

      // Remove os IDs que foram processados neste lote
      const processadosIds = new Set((data.resultados || []).map(r => r.id));
      idsPendentesRef.current = idsPendentesRef.current.filter(id => !processadosIds.has(id));

      if (cancelRef.current) {
        setRodando(false);
        setStatusMsg('');
        return;
      }

      if (idsPendentesRef.current.length > 0) {
        // Aguarda 3s e dispara próximo lote (intervalo principal já foi feito no backend)
        setTimeout(() => dispararLote(), 3000);
      } else {
        setRodando(false);
        setStatusMsg('');
        toast.success('Envio em massa concluído!');
      }

    } catch (e) {
      toast.error('Erro na comunicação: ' + e.message);
      setRodando(false);
    }
  };

  const iniciarEnvio = () => {
    idsPendentesRef.current = itens.map(i => i.id);
    totalRef.current = itens.length;
    cancelRef.current = false;
    setCancelado(false);
    setResultados([]);
    setEnviados(0);
    setErros(0);
    setRodando(true);
    dispararLote();
  };

  const cancelarEnvio = () => {
    cancelRef.current = true;
    setCancelado(true);
    setRodando(false);
    setStatusMsg('');
    toast.info('Envio interrompido.');
  };

  return (
    <Dialog open onOpenChange={!rodando ? onClose : undefined}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="w-5 h-5 text-green-600" />
            Envio em Massa — {itens.length} cliente(s)
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Configuração de intervalo */}
          {!rodando && !finalizado && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-4 h-4 text-amber-600" />
                <Label className="text-amber-700 font-medium">Intervalo aleatório entre envios</Label>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm text-amber-700">De</span>
                <Input type="number" min={5} max={300} value={intervaloMin} onChange={e => setIntervaloMin(Number(e.target.value))} className="w-20" />
                <span className="text-sm text-amber-700">até</span>
                <Input type="number" min={5} max={300} value={intervaloMax} onChange={e => setIntervaloMax(Number(e.target.value))} className="w-20" />
                <span className="text-sm text-amber-700">segundos</span>
              </div>
              <p className="text-xs text-amber-600 mt-2">
                ⚠️ Intervalo aleatório para parecer mais humano e evitar bloqueios. Tempo estimado: ~{tempoEstimado} min.
              </p>
              <p className="text-xs text-green-700 mt-1 font-medium">
                ✅ O envio roda no servidor — você pode fechar esta tela sem interromper.
              </p>
            </div>
          )}

          {/* Barra de progresso */}
          {(rodando || finalizado || resultados.length > 0) && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-slate-600">
                <span>{enviados + erros} de {totalRef.current} processados</span>
                <span>{progresso}%</span>
              </div>
              <Progress value={progresso} className="h-3" />
              {rodando && statusMsg && (
                <p className="text-xs text-slate-500 flex items-center gap-1">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  {statusMsg}
                </p>
              )}
            </div>
          )}

          {/* Resultado resumo */}
          {(enviados > 0 || erros > 0) && (
            <div className="flex gap-3">
              <div className="flex items-center gap-1 text-sm text-green-700 bg-green-50 rounded px-2 py-1">
                <CheckCircle2 className="w-4 h-4" /> {enviados} enviados
              </div>
              <div className="flex items-center gap-1 text-sm text-red-700 bg-red-50 rounded px-2 py-1">
                <XCircle className="w-4 h-4" /> {erros} com erro
              </div>
            </div>
          )}

          {/* Log de resultados */}
          {resultados.length > 0 && (
            <div className="max-h-48 overflow-y-auto border rounded-lg divide-y">
              {resultados.map((r, i) => (
                <div key={i} className="flex items-center gap-2 px-3 py-2 text-sm">
                  {r.ok ? (
                    <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
                  ) : (
                    <XCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                  )}
                  <span className="flex-1 font-medium text-slate-700 truncate">{r.nome}</span>
                  {!r.ok && <span className="text-xs text-slate-400 truncate">{r.erro}</span>}
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-3">
            {!rodando && !finalizado && (
              <>
                <Button variant="outline" onClick={onClose} className="flex-1">Cancelar</Button>
                <Button onClick={iniciarEnvio} className="flex-1 bg-green-600 hover:bg-green-700">
                  <Send className="w-4 h-4 mr-2" />
                  Iniciar Envio
                </Button>
              </>
            )}
            {rodando && (
              <Button variant="destructive" onClick={cancelarEnvio} className="flex-1">
                <X className="w-4 h-4 mr-2" /> Interromper Envio
              </Button>
            )}
            {finalizado && (
              <Button onClick={onClose} className="flex-1 bg-green-600 hover:bg-green-700">
                <CheckCircle2 className="w-4 h-4 mr-2" /> Concluído
              </Button>
            )}
            {cancelado && (
              <Button variant="outline" onClick={onClose} className="flex-1">Fechar</Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}