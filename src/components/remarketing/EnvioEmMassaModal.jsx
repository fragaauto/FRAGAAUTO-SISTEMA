import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Send, Loader2, CheckCircle2, XCircle, AlertTriangle, Clock, X } from 'lucide-react';
import { addDays, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { base44 } from '@/api/base44Client';

function gerarMensagem(item, config) {
  const diasValidade = config.dias_validade_oferta || 7;
  const oferta = config.oferta_padrao_remarketing || '';
  const condicao = config.condicao_pagamento_remarketing || '';
  const dataValidade = format(addDays(new Date(), diasValidade), "dd/MM/yyyy", { locale: ptBR });
  const listaServicos = (item.servicosPendentes || [])
    .map(s => `• ${s.nome} - R$ ${(s.valor_total || 0).toFixed(2)}`).join('\n');
  const total = (item.valorTotalPendentes || 0).toFixed(2);

  let msg = config.mensagem_remarketing
    ? config.mensagem_remarketing
    : `Olá {nome} 👋\n\nNa sua última visita identificamos que no seu {veiculo} ficou pendente:\n\n{lista_servicos}\n\nTotal: R$ {total}\n\nTenho uma condição especial pra você!\n\n{oferta}\nCondição: {condicao}\n\nConsigo manter até {data_validade}.\n\nPosso agendar para você?`;

  return msg
    .replace('{nome}', item.clienteNome || 'Cliente')
    .replace('{veiculo}', `${item.placa} - ${item.modelo}`)
    .replace('{lista_servicos}', listaServicos)
    .replace('{total}', total)
    .replace('{oferta}', oferta || '⭐ Condição especial disponível')
    .replace('{condicao}', condicao || 'A combinar')
    .replace('{data_validade}', dataValidade)
    .replace('{nome_empresa}', config.nome_empresa || 'nossa empresa');
}

export default function EnvioEmMassaModal({ itens, config, onClose, onEnviado }) {
  const [intervalo, setIntervalo] = useState(15); // segundos
  const [rodando, setRodando] = useState(false);
  const [cancelado, setCancelado] = useState(false);
  const [resultados, setResultados] = useState([]); // { id, nome, ok, semWhatsapp, erro }
  const [indiceAtual, setIndiceAtual] = useState(-1);

  const progresso = itens.length > 0 ? Math.round((resultados.length / itens.length) * 100) : 0;
  const finalizado = resultados.length === itens.length && itens.length > 0;

  const sleep = (ms) => new Promise(res => setTimeout(res, ms));

  const iniciarEnvio = async () => {
    setRodando(true);
    setCancelado(false);
    setResultados([]);
    const cancelRef = { value: false };

    for (let i = 0; i < itens.length; i++) {
      if (cancelRef.value) break;
      const item = itens[i];
      setIndiceAtual(i);

      const tel = (item.clienteTelefone || '').replace(/\D/g, '');
      if (!tel) {
        setResultados(prev => [...prev, { id: item.id, nome: item.clienteNome, ok: false, erro: 'Telefone inválido' }]);
        continue;
      }

      const mensagem = gerarMensagem(item, config);

      try {
        const res = await base44.functions.invoke('enviarMensagemWhatsApp', { telefone: tel, mensagem });
        if (res.data?.ok) {
          setResultados(prev => [...prev, { id: item.id, nome: item.clienteNome, ok: true }]);
          onEnviado(item.id);
        } else {
          const errMsg = res.data?.error || 'Erro desconhecido';
          const semWhatsapp = errMsg.includes('exists":false') || errMsg.toLowerCase().includes('not registered');
          setResultados(prev => [...prev, { id: item.id, nome: item.clienteNome, ok: false, semWhatsapp, erro: semWhatsapp ? 'Sem WhatsApp' : errMsg }]);
        }
      } catch (e) {
        setResultados(prev => [...prev, { id: item.id, nome: item.clienteNome, ok: false, erro: e.message }]);
      }

      // Aguardar intervalo entre envios (exceto o último)
      if (i < itens.length - 1 && !cancelRef.value) {
        for (let s = 0; s < intervalo; s++) {
          if (cancelRef.value) break;
          await sleep(1000);
        }
      }
    }

    setRodando(false);
    setIndiceAtual(-1);
  };

  const cancelarEnvio = () => {
    setCancelado(true);
    setRodando(false);
    toast.info('Envio interrompido.');
  };

  const sucessos = resultados.filter(r => r.ok).length;
  const erros = resultados.filter(r => !r.ok).length;

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
                <Label className="text-amber-700 font-medium">Intervalo entre envios</Label>
              </div>
              <div className="flex items-center gap-3">
                <Input
                  type="number"
                  min={5}
                  max={300}
                  value={intervalo}
                  onChange={e => setIntervalo(Number(e.target.value))}
                  className="w-24"
                />
                <span className="text-sm text-amber-700">segundos entre cada mensagem</span>
              </div>
              <p className="text-xs text-amber-600 mt-2">
                ⚠️ Recomendamos mínimo 10s para evitar bloqueios do WhatsApp. Tempo total estimado: ~{Math.ceil(itens.length * intervalo / 60)} min.
              </p>
            </div>
          )}

          {/* Barra de progresso */}
          {(rodando || finalizado || resultados.length > 0) && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-slate-600">
                <span>{resultados.length} de {itens.length} enviados</span>
                <span>{progresso}%</span>
              </div>
              <Progress value={progresso} className="h-3" />
              {rodando && indiceAtual >= 0 && (
                <p className="text-xs text-slate-500 flex items-center gap-1">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Enviando para: {itens[indiceAtual]?.clienteNome}
                </p>
              )}
            </div>
          )}

          {/* Resultado resumo */}
          {resultados.length > 0 && (
            <div className="flex gap-3">
              <div className="flex items-center gap-1 text-sm text-green-700 bg-green-50 rounded px-2 py-1">
                <CheckCircle2 className="w-4 h-4" /> {sucessos} enviados
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
                  ) : r.semWhatsapp ? (
                    <AlertTriangle className="w-4 h-4 text-yellow-500 flex-shrink-0" />
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
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}