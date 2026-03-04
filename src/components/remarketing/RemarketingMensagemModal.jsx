import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { MessageCircle, Send, Edit2, Loader2, AlertTriangle, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { addDays, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { base44 } from '@/api/base44Client';

function gerarMensagem(item, config) {
  const nomeEmpresa = config.nome_empresa || 'nossa empresa';
  const diasValidade = config.dias_validade_oferta || 7;
  const oferta = config.oferta_padrao_remarketing || '';
  const condicao = config.condicao_pagamento_remarketing || '';
  const dataValidade = format(addDays(new Date(), diasValidade), "dd/MM/yyyy", { locale: ptBR });

  const listaServicos = (item.servicosPendentes || [])
    .map(s => `• ${s.nome} - R$ ${(s.valor_total || 0).toFixed(2)}`)
    .join('\n');

  const total = (item.valorTotalPendentes || 0).toFixed(2);

  let msg = config.mensagem_remarketing
    ? config.mensagem_remarketing
    : `Olá {nome} 👋\n\nNa sua última visita identificamos que no seu {veiculo} ficou pendente:\n\n{lista_servicos}\n\nTotal do serviço: R$ {total}\n\nTenho uma condição especial pra você!\n\n{oferta}\nCondição: {condicao}\n\nConsigo manter essa condição até {data_validade}.\n\nPosso agendar para você?`;

  return msg
    .replace('{nome}', item.clienteNome || 'Cliente')
    .replace('{veiculo}', `${item.placa} - ${item.modelo}` || 'seu veículo')
    .replace('{lista_servicos}', listaServicos)
    .replace('{total}', total)
    .replace('{oferta}', oferta || '⭐ Condição especial disponível')
    .replace('{condicao}', condicao || 'A combinar')
    .replace('{data_validade}', dataValidade)
    .replace('{nome_empresa}', nomeEmpresa);
}

export default function RemarketingMensagemModal({ item, config, onClose, onEnviado }) {
  const [mensagem, setMensagem] = useState('');
  const [editando, setEditando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [resultado, setResultado] = useState(null); // { ok, erro }

  const evolutionConfigurado = config?.evolution_api_url && config?.evolution_api_key && config?.evolution_instance;

  useEffect(() => {
    if (item && config) {
      setMensagem(gerarMensagem(item, config));
    }
  }, [item, config]);

  const enviarViaEvolution = async () => {
    const tel = (item.clienteTelefone || '').replace(/\D/g, '');
    if (!tel) { toast.error('Telefone inválido'); return; }

    setEnviando(true);
    setResultado(null);
    try {
      const res = await base44.functions.invoke('enviarMensagemWhatsApp', {
        telefone: tel,
        mensagem,
      });
      if (res.data?.ok) {
        setResultado({ ok: true });
        onEnviado(item.id);
        toast.success('Mensagem enviada com sucesso!');
        setTimeout(() => onClose(), 1500);
      } else {
        const errMsg = res.data?.error || 'Erro ao enviar mensagem.';
        const semWhatsapp = errMsg.includes('exists":false') || errMsg.toLowerCase().includes('not registered');
        setResultado({ ok: false, semWhatsapp, erro: semWhatsapp ? 'Este número não possui WhatsApp ativo.' : errMsg });
      }
    } catch (e) {
      setResultado({ ok: false, erro: 'Erro ao enviar: ' + e.message });
    }
    setEnviando(false);
  };

  const enviarViaLink = () => {
    const tel = (item.clienteTelefone || '').replace(/\D/g, '');
    if (!tel) { toast.error('Telefone inválido'); return; }
    const numero = tel.length === 11 ? `55${tel}` : tel;
    window.open(`https://wa.me/${numero}?text=${encodeURIComponent(mensagem)}`, '_blank');
    onEnviado(item.id);
    toast.success('Abrindo WhatsApp...');
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-green-600" />
            Enviar Mensagem de Remarketing
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-slate-50 rounded-lg p-3 text-sm">
            <p className="font-semibold text-slate-700">{item.clienteNome}</p>
            <p className="text-slate-500">{item.placa} - {item.modelo}</p>
            <p className="text-slate-500">{item.clienteTelefone}</p>
          </div>

          {/* Barra de progresso */}
          {enviando && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <Loader2 className="w-4 h-4 animate-spin text-green-600" />
                Enviando mensagem...
              </div>
              <Progress value={undefined} className="h-2 animate-pulse" />
            </div>
          )}

          {/* Resultado */}
          {resultado && !enviando && (
            <div className={`rounded-lg p-3 flex items-start gap-3 ${resultado.ok ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
              {resultado.ok ? (
                <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
              ) : resultado.semWhatsapp ? (
                <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
              ) : (
                <XCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
              )}
              <div>
                <p className={`text-sm font-medium ${resultado.ok ? 'text-green-700' : resultado.semWhatsapp ? 'text-yellow-700' : 'text-red-700'}`}>
                  {resultado.ok ? 'Mensagem enviada com sucesso!' : resultado.erro}
                </p>
                {resultado.semWhatsapp && (
                  <p className="text-xs text-yellow-600 mt-1">
                    Verifique o número do cliente ou tente contato por outro meio.
                  </p>
                )}
              </div>
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>Mensagem</Label>
              <Button size="sm" variant="ghost" onClick={() => setEditando(!editando)}>
                <Edit2 className="w-3 h-3 mr-1" />
                {editando ? 'Pré-visualizar' : 'Editar'}
              </Button>
            </div>
            {editando ? (
              <Textarea
                value={mensagem}
                onChange={(e) => setMensagem(e.target.value)}
                className="min-h-[200px] font-mono text-sm"
              />
            ) : (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 whitespace-pre-wrap text-sm text-slate-700 max-h-64 overflow-y-auto">
                {mensagem}
              </div>
            )}
          </div>

          <div className="flex gap-3">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Cancelar
            </Button>
            {evolutionConfigurado ? (
              <Button onClick={enviarViaEvolution} disabled={enviando || resultado?.ok} className="flex-1 bg-green-600 hover:bg-green-700">
                {enviando ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                {enviando ? 'Enviando...' : 'Enviar pelo WhatsApp'}
              </Button>
            ) : (
              <Button onClick={enviarViaLink} className="flex-1 bg-green-600 hover:bg-green-700">
                <Send className="w-4 h-4 mr-2" />
                Abrir WhatsApp
              </Button>
            )}
          </div>
          {!evolutionConfigurado && (
            <p className="text-xs text-center text-slate-400">
              Configure a Evolution API nas Configurações para envio automático.
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}