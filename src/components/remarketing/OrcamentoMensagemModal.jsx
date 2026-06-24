import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { MessageCircle, Send, Edit2, Loader2, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useUnidade } from '@/lib/UnidadeContext';

function gerarMensagemOrcamento(orc, config) {
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

export default function OrcamentoMensagemModal({ orc, config, onClose }) {
  const { unidadeAtual } = useUnidade();
  const [mensagem, setMensagem] = useState('');
  const [editando, setEditando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [resultado, setResultado] = useState(null);

  const evolutionConfigurado = config?.evolution_api_url && config?.evolution_api_key && config?.evolution_instance;

  useEffect(() => {
    if (orc && config) {
      setMensagem(gerarMensagemOrcamento(orc, config));
    }
  }, [orc, config]);

  const enviarViaEvolution = async () => {
    const tel = (orc.cliente_telefone || '').replace(/\D/g, '');
    if (!tel) { toast.error('Telefone inválido'); return; }
    setEnviando(true);
    setResultado(null);
    try {
      const res = await base44.functions.invoke('enviarMensagemWhatsApp', {
        telefone: tel,
        mensagem,
        unidade_id: unidadeAtual?.id || null,
      });
      if (res.data?.ok) {
        setResultado({ ok: true });
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
    const tel = (orc.cliente_telefone || '').replace(/\D/g, '');
    if (!tel) { toast.error('Telefone inválido'); return; }
    const numero = tel.length === 11 ? `55${tel}` : tel;
    window.open(`https://wa.me/${numero}?text=${encodeURIComponent(mensagem)}`, '_blank');
    onClose();
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-blue-600" />
            Enviar Mensagem de Orçamento
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="bg-slate-50 rounded-lg p-3 text-sm">
            <p className="font-semibold text-slate-700">{orc.cliente_nome}</p>
            {orc.numero && <p className="text-slate-500">Orçamento #{orc.numero}</p>}
            <p className="text-slate-500">{orc.cliente_telefone}</p>
          </div>

          {enviando && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                Enviando mensagem...
              </div>
              <Progress value={undefined} className="h-2 animate-pulse" />
            </div>
          )}

          {resultado && !enviando && (
            <div className={`rounded-lg p-3 flex items-start gap-3 ${resultado.ok ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
              {resultado.ok ? (
                <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
              ) : resultado.semWhatsapp ? (
                <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
              ) : (
                <XCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
              )}
              <p className={`text-sm font-medium ${resultado.ok ? 'text-green-700' : resultado.semWhatsapp ? 'text-yellow-700' : 'text-red-700'}`}>
                {resultado.ok ? 'Mensagem enviada com sucesso!' : resultado.erro}
              </p>
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
              <Textarea value={mensagem} onChange={e => setMensagem(e.target.value)} className="min-h-[200px] font-mono text-sm" />
            ) : (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 whitespace-pre-wrap text-sm text-slate-700 max-h-64 overflow-y-auto">
                {mensagem}
              </div>
            )}
          </div>

          <div className="flex gap-3">
            <Button variant="outline" onClick={onClose} className="flex-1">Cancelar</Button>
            {evolutionConfigurado ? (
              <Button onClick={enviarViaEvolution} disabled={enviando || resultado?.ok} className="flex-1 bg-blue-600 hover:bg-blue-700">
                {enviando ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                {enviando ? 'Enviando...' : 'Enviar pelo WhatsApp'}
              </Button>
            ) : (
              <Button onClick={enviarViaLink} className="flex-1 bg-blue-600 hover:bg-blue-700">
                <Send className="w-4 h-4 mr-2" /> Abrir WhatsApp
              </Button>
            )}
          </div>
          {!evolutionConfigurado && (
            <p className="text-xs text-center text-slate-400">Configure a Evolution API nas Configurações para envio automático.</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}