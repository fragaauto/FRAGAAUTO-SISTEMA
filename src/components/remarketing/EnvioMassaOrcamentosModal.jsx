import React, { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { Send, Loader2, CheckCircle2, XCircle, AlertTriangle, X, Clock, Pause, SkipForward } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useUnidade } from '@/lib/UnidadeContext';
import { addDays, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

function gerarMensagem(orc, config) {
  const nomeEmpresa = config.nome_empresa || 'nossa empresa';
  const listaItens = (orc.itens || [])
    .map(i => `• ${i.nome} - R$ ${(i.valor_total || 0).toFixed(2)}`)
    .join('\n');
  const total = (orc.total || 0).toFixed(2);

  let msg = config.mensagem_orcamento
    ? config.mensagem_orcamento
    : `Olá {nome} 👋\n\nPassando para saber se deseja dar andamento no seu orçamento:\n\n{lista_itens}\n\nTotal: R$ {total}\n\nQualquer dúvida, estou à disposição! 😊\n\n{nome_empresa}`;

  return msg
    .replace(/\{nome\}/g, orc.cliente_nome || 'Cliente')
    .replace(/\{lista_itens\}/g, listaItens)
    .replace(/\{lista_servicos\}/g, listaItens)
    .replace(/\{total\}/g, `R$ ${total}`)
    .replace(/\{nome_empresa\}/g, nomeEmpresa)
    .replace(/\{numero\}/g, orc.numero ? `#${orc.numero}` : '')
    .replace(/\{oferta\}/g, '')
    .replace(/\{condicao\}/g, '')
    .replace(/\{data_validade\}/g, '');
}

export default function EnvioMassaOrcamentosModal({ orcamentos, config, onClose }) {
  const { unidadeAtual } = useUnidade();
  const [intervaloMin, setIntervaloMin] = useState(15);
  const [intervaloMax, setIntervaloMax] = useState(25);
  const [enviando, setEnviando] = useState(false);
  const [pausado, setPausado] = useState(false);
  const [resultados, setResultados] = useState([]);
  const [indiceAtual, setIndiceAtual] = useState(-1);
  const [contagemRegressiva, setContagemRegressiva] = useState(0);
  const pausadoRef = useRef(false);
  const canceladoRef = useRef(false);

  const sleep = (ms) => new Promise(res => setTimeout(res, ms));

  const progresso = orcamentos.length > 0 ? Math.round((resultados.length / orcamentos.length) * 100) : 0;
  const finalizado = orcamentos.length > 0 && resultados.length === orcamentos.length;
  const sucessos = resultados.filter(r => r.ok).length;
  const erros = resultados.filter(r => !r.ok).length;

  const togglePausa = () => {
    if (pausadoRef.current) {
      pausadoRef.current = false;
      setPausado(false);
      toast.success('Retomando envios...');
    } else {
      pausadoRef.current = true;
      setPausado(true);
      toast.info('Envio pausado. Clique em Retomar para continuar.');
    }
  };

  const iniciarEnvio = async () => {
    setEnviando(true);
    setResultados([]);
    canceladoRef.current = false;
    pausadoRef.current = false;

    for (let i = 0; i < orcamentos.length; i++) {
      if (canceladoRef.current) break;
      while (pausadoRef.current && !canceladoRef.current) await sleep(500);
      if (canceladoRef.current) break;

      const orc = orcamentos[i];
      setIndiceAtual(i);
      const tel = (orc.cliente_telefone || '').replace(/\D/g, '');

      if (!tel) {
        setResultados(prev => [...prev, { nome: orc.cliente_nome, ok: false, erro: 'Telefone inválido' }]);
        continue;
      }

      const msg = gerarMensagem(orc, config);
      try {
        const res = await base44.functions.invoke('enviarMensagemWhatsApp', {
          telefone: tel,
          mensagem: msg,
          unidade_id: unidadeAtual?.id || null,
        });
        if (res.data?.ok) {
          setResultados(prev => [...prev, { nome: orc.cliente_nome, ok: true }]);
        } else {
          const errMsg = res.data?.error || 'Erro desconhecido';
          const semWhatsapp = errMsg.includes('exists":false') || errMsg.toLowerCase().includes('not registered');
          setResultados(prev => [...prev, { nome: orc.cliente_nome, ok: false, semWhatsapp, erro: semWhatsapp ? 'Sem WhatsApp' : errMsg }]);
        }
      } catch (e) {
        setResultados(prev => [...prev, { nome: orc.cliente_nome, ok: false, erro: e.message }]);
      }

      const ehUltimo = i === orcamentos.length - 1;
      if (!ehUltimo && !canceladoRef.current) {
        const min = Math.min(intervaloMin, intervaloMax);
        const max = Math.max(intervaloMin, intervaloMax);
        const segundos = min + Math.floor(Math.random() * (max - min + 1));
        for (let s = 0; s < segundos; s++) {
          if (canceladoRef.current) break;
          while (pausadoRef.current && !canceladoRef.current) await sleep(500);
          await sleep(1000);
        }
      }
    }

    setEnviando(false);
    pausadoRef.current = false;
    setPausado(false);
    setIndiceAtual(-1);
  };

  return (
    <Dialog open onOpenChange={!enviando ? onClose : undefined}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="w-5 h-5 text-blue-600" />
            Envio em Massa — Orçamentos ({orcamentos.length})
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {!enviando && !finalizado && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 space-y-2">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-600" />
                <Label className="text-amber-700 font-medium text-sm">Intervalo entre envios (segundos)</Label>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-amber-700">De</span>
                <Input type="number" min={5} max={300} value={intervaloMin} onChange={e => setIntervaloMin(Number(e.target.value))} className="w-20" />
                <span className="text-sm text-amber-700">até</span>
                <Input type="number" min={5} max={300} value={intervaloMax} onChange={e => setIntervaloMax(Number(e.target.value))} className="w-20" />
                <span className="text-sm text-amber-700">seg</span>
              </div>
              <p className="text-xs text-amber-600">⚠️ Estimado: ~{Math.ceil(orcamentos.length * ((intervaloMin + intervaloMax) / 2) / 60)} min para {orcamentos.length} envios.</p>
            </div>
          )}

          {(enviando || resultados.length > 0) && (
            <div className="space-y-3">
              <div className="flex justify-between text-sm text-slate-600">
                <span>{resultados.length} de {orcamentos.length} enviados</span>
                <span>{progresso}%</span>
              </div>
              <Progress value={progresso} className="h-3" />
              {enviando && !pausado && indiceAtual >= 0 && (
                <p className="text-xs text-slate-500 flex items-center gap-1">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Enviando para: {orcamentos[indiceAtual]?.cliente_nome}
                </p>
              )}
              {enviando && pausado && (
                <div className="flex items-center gap-2 bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2">
                  <Pause className="w-4 h-4 text-yellow-600" />
                  <p className="text-xs text-yellow-700">Envio pausado manualmente.</p>
                </div>
              )}
              {resultados.length > 0 && (
                <div className="flex gap-3">
                  <div className="flex items-center gap-1 text-sm text-green-700 bg-green-50 rounded px-2 py-1">
                    <CheckCircle2 className="w-4 h-4" /> {sucessos} ok
                  </div>
                  <div className="flex items-center gap-1 text-sm text-red-700 bg-red-50 rounded px-2 py-1">
                    <XCircle className="w-4 h-4" /> {erros} erros
                  </div>
                </div>
              )}
              <div className="max-h-36 overflow-y-auto border rounded-lg divide-y">
                {resultados.map((r, i) => (
                  <div key={i} className="flex items-center gap-2 px-3 py-1.5 text-sm">
                    {r.ok ? <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" /> : r.semWhatsapp ? <AlertTriangle className="w-4 h-4 text-yellow-500 flex-shrink-0" /> : <XCircle className="w-4 h-4 text-red-500 flex-shrink-0" />}
                    <span className="flex-1 font-medium text-slate-700 truncate">{r.nome}</span>
                    {!r.ok && <span className="text-xs text-slate-400">{r.erro}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-3 flex-wrap">
            <Button variant="outline" onClick={onClose} disabled={enviando} className="flex-1">Cancelar</Button>
            {!enviando && !finalizado && (
              <Button onClick={iniciarEnvio} className="flex-1 bg-blue-600 hover:bg-blue-700">
                <Send className="w-4 h-4 mr-2" /> Enviar Todos ({orcamentos.length})
              </Button>
            )}
            {enviando && (
              <>
                <Button variant="outline" onClick={togglePausa} className="flex-1 border-yellow-400 text-yellow-700 hover:bg-yellow-50">
                  {pausado ? <><SkipForward className="w-4 h-4 mr-2" /> Retomar</> : <><Pause className="w-4 h-4 mr-2" /> Pausar</>}
                </Button>
                <Button variant="destructive" onClick={() => { canceladoRef.current = true; }} className="flex-1">
                  <X className="w-4 h-4 mr-2" /> Interromper
                </Button>
              </>
            )}
            {finalizado && (
              <Button onClick={onClose} className="flex-1 bg-green-600 hover:bg-green-700">
                <CheckCircle2 className="w-4 h-4 mr-2" /> Concluído
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}