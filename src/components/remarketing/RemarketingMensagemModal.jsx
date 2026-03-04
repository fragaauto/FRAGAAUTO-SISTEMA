import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { MessageCircle, Send, Edit2, Loader2 } from 'lucide-react';
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
    try {
      const res = await base44.functions.invoke('enviarMensagemWhatsApp', {
        telefone: tel,
        mensagem,
      });
      if (res.data?.ok) {
        onEnviado(item.id);
        toast.success('Mensagem enviada via WhatsApp!');
        onClose();
      } else {
        toast.error(res.data?.error || 'Erro ao enviar mensagem.');
      }
    } catch (e) {
      toast.error('Erro ao enviar: ' + e.message);
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
              <Button onClick={enviarViaEvolution} disabled={enviando} className="flex-1 bg-green-600 hover:bg-green-700">
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