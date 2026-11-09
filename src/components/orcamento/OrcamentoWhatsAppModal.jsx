import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { MessageCircle, Copy, CheckCheck, Loader2, Image as ImageIcon, Send } from 'lucide-react';
import { toast } from 'sonner';

function gerarTextoOrcamento(atendimento, config) {
  const nomeEmpresa = config?.nome_empresa || 'Oficina';
  const nomeCliente = atendimento.cliente_nome || 'Cliente';
  const veiculo = [atendimento.modelo, atendimento.placa, atendimento.ano].filter(Boolean).join(' · ');
  const osNum = atendimento.numero_os ? `OS #${String(atendimento.numero_os).padStart(6, '0')}` : '';

  const itensQueixa = atendimento.itens_queixa || [];
  const itensChecklist = atendimento.itens_orcamento || [];
  const todosItens = [...itensQueixa.map(i => ({ ...i, _origem: 'queixa' })), ...itensChecklist.map(i => ({ ...i, _origem: 'checklist' }))];

  const aprovados = todosItens.filter(i => i.status_aprovacao === 'aprovado');
  const reprovados = todosItens.filter(i => i.status_aprovacao === 'reprovado');
  const pendentes = todosItens.filter(i => !i.status_aprovacao || i.status_aprovacao === 'pendente');

  const formatarItem = (item) => {
    const bruto = (Number(item.quantidade || 0)) * (Number(item.valor_unitario || 0));
    const desc = Number(item.desconto_item || 0);
    const total = Number(item.valor_total || 0);
    let precoStr;
    if (desc > 0) {
      precoStr = `R$ ${bruto.toFixed(2)} - com desconto: *R$ ${total.toFixed(2)}*`;
    } else {
      precoStr = `*R$ ${total.toFixed(2)}*`;
    }
    let linha = `• ${item.nome} — ${item.quantidade}x R$ ${Number(item.valor_unitario || 0).toFixed(2)} = ${precoStr}`;
    if (item.observacao_item) linha += `\n  _📝 ${item.observacao_item}_`;
    return linha;
  };

  let linhas = [];

  // Cabeçalho
  linhas.push(`🔧 *ORÇAMENTO — ${nomeEmpresa.toUpperCase()}*`);
  if (osNum) linhas.push(`📋 ${osNum}`);
  linhas.push(`👤 Cliente: *${nomeCliente}*`);
  if (veiculo) linhas.push(`🚗 Veículo: *${veiculo}*`);
  if (atendimento.queixa_inicial) {
    linhas.push('');
    linhas.push(`📌 *Queixa relatada:* ${atendimento.queixa_inicial}`);
  }
  linhas.push('');
  linhas.push('━━━━━━━━━━━━━━━━━━━━━━');

  // Itens da queixa inicial (separados)
  const itensQueixaExibir = itensQueixa.filter(i => i.status_aprovacao !== 'reprovado');
  if (itensQueixa.length > 0) {
    linhas.push('');
    linhas.push('🔵 *ORÇAMENTO DA QUEIXA INICIAL*');
    linhas.push('_(Serviços solicitados pelo cliente)_');
    linhas.push('');
    itensQueixa.forEach(item => {
      const statusEmoji = item.status_aprovacao === 'aprovado' ? '✅' : item.status_aprovacao === 'reprovado' ? '❌' : '⏳';
      const bruto = Number(item.quantidade || 0) * Number(item.valor_unitario || 0);
      const desc = Number(item.desconto_item || 0);
      const total = Number(item.valor_total || 0);
      const precoStr = desc > 0 ? `R$ ${bruto.toFixed(2)} - com desconto: *R$ ${total.toFixed(2)}*` : `*R$ ${total.toFixed(2)}*`;
      let linha = `${statusEmoji} ${item.nome} — ${item.quantidade}x R$ ${Number(item.valor_unitario || 0).toFixed(2)} = ${precoStr}`;
      if (item.observacao_item) linha += `\n  _📝 ${item.observacao_item}_`;
      linhas.push(linha);
    });
    const subtotalQueixa = itensQueixa.reduce((a, i) => a + Number(i.valor_total || 0), 0);
    if (subtotalQueixa > 0) {
      linhas.push('');
      linhas.push(`   Subtotal queixa: *R$ ${subtotalQueixa.toFixed(2)}*`);
    }
  }

  // Itens do checklist
  if (itensChecklist.length > 0) {
    linhas.push('');
    linhas.push('🔍 *DIAGNÓSTICO TÉCNICO*');
    linhas.push('_(Serviços e peças identificados na inspeção)_');
    linhas.push('');
    itensChecklist.forEach(item => {
      const statusEmoji = item.status_aprovacao === 'aprovado' ? '✅' : item.status_aprovacao === 'reprovado' ? '❌' : '⏳';
      const bruto = Number(item.quantidade || 0) * Number(item.valor_unitario || 0);
      const desc = Number(item.desconto_item || 0);
      const total = Number(item.valor_total || 0);
      const precoStr = desc > 0 ? `R$ ${bruto.toFixed(2)} - com desconto: *R$ ${total.toFixed(2)}*` : `*R$ ${total.toFixed(2)}*`;
      let linha = `${statusEmoji} ${item.nome} — ${item.quantidade}x R$ ${Number(item.valor_unitario || 0).toFixed(2)} = ${precoStr}`;
      if (item.observacao_item) linha += `\n  _📝 ${item.observacao_item}_`;
      const fotoUrl = item.foto_url || (atendimento.checklist || []).find(c => c.item === item.item_checklist || c.item === item.nome)?.foto_url;
      if (fotoUrl) linha += `\n  📸 *Ver foto:* ${fotoUrl}`;
      linhas.push(linha);
    });
    const subtotalChecklist = itensChecklist.reduce((a, i) => a + Number(i.valor_total || 0), 0);
    if (subtotalChecklist > 0) {
      linhas.push('');
      linhas.push(`   Subtotal diagnóstico: *R$ ${subtotalChecklist.toFixed(2)}*`);
    }
  }

  linhas.push('');
  linhas.push('━━━━━━━━━━━━━━━━━━━━━━');

  // Resumo de aprovações (só se houver decisões)
  const temDecisoes = todosItens.some(i => i.status_aprovacao === 'aprovado' || i.status_aprovacao === 'reprovado');
  if (temDecisoes) {
    linhas.push('');
    linhas.push('📊 *RESUMO DAS DECISÕES*');
    linhas.push('');
    if (aprovados.length > 0) {
      const totalAprov = aprovados.reduce((a, i) => a + Number(i.valor_total || 0), 0);
      linhas.push(`✅ *Autorizado pelo cliente:* R$ ${totalAprov.toFixed(2)}`);
      aprovados.forEach(i => linhas.push(`   • ${i.nome}`));
    }
    if (reprovados.length > 0) {
      linhas.push('');
      const totalReprov = reprovados.reduce((a, i) => a + Number(i.valor_total || 0), 0);
      linhas.push(`❌ *Não autorizado pelo cliente:* R$ ${totalReprov.toFixed(2)}`);
      reprovados.forEach(i => linhas.push(`   • ${i.nome}`));
    }
    if (pendentes.length > 0) {
      linhas.push('');
      linhas.push(`⏳ *Aguardando decisão:*`);
      pendentes.forEach(i => linhas.push(`   • ${i.nome}`));
    }
    linhas.push('');
    linhas.push('━━━━━━━━━━━━━━━━━━━━━━');
  }

  // Totais — valor_total de cada item já inclui desconto_item
  const totalGeral = todosItens.reduce((a, i) => a + Number(i.valor_total || 0), 0);
  const descontoGlobal = Number(atendimento.desconto || 0);
  const valorFinal = Math.max(0, totalGeral - descontoGlobal);
  linhas.push('');
  if (descontoGlobal > 0) {
    linhas.push(`💰 Subtotal: R$ ${totalGeral.toFixed(2)}`);
    linhas.push(`🎁 Desconto adicional: - R$ ${descontoGlobal.toFixed(2)}`);
  }
  linhas.push(`💵 *TOTAL GERAL: R$ ${valorFinal.toFixed(2)}*`);
  if (temDecisoes) {
    const totalAprov = aprovados.reduce((a, i) => a + Number(i.valor_total || 0), 0);
    linhas.push(`✅ *Total autorizado: R$ ${totalAprov.toFixed(2)}*`);
  }

  // Rodapé
  if (config?.whatsapp_atendimento || config?.instagram || config?.site) {
    linhas.push('');
    linhas.push('━━━━━━━━━━━━━━━━━━━━━━');
    linhas.push(`📍 *${nomeEmpresa}*`);
    if (config?.whatsapp_atendimento) linhas.push(`📱 WhatsApp: ${config.whatsapp_atendimento}`);
    if (config?.instagram) linhas.push(`📸 Instagram: ${config.instagram}`);
    if (config?.site) linhas.push(`🌐 ${config.site}`);
  }

  return linhas.join('\n');
}

export default function OrcamentoWhatsAppModal({ atendimento, config, onClose }) {
  const [copiado, setCopiado] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [fotoSelecionadaId, setFotoSelecionadaId] = useState(null);

  const texto = useMemo(() => gerarTextoOrcamento(atendimento, config), [atendimento, config]);

  const { data: fotos = [] } = useQuery({
    queryKey: ['fotos_orcamento', atendimento?.id],
    queryFn: () => base44.entities.FotoOrcamento.filter({ atendimento_id: atendimento.id }),
    enabled: !!atendimento?.id,
  });

  const foto = fotos.find(f => f.id === fotoSelecionadaId) || fotos[0] || null;

  const enviarComFoto = async () => {
    if (!foto) return;
    if (!(atendimento.cliente_telefone || '').replace(/\D/g, '')) {
      toast.error('Cliente sem telefone cadastrado');
      return;
    }
    setEnviando(true);
    try {
      const res = await base44.functions.invoke('enviarMensagemWhatsApp', {
        telefone: atendimento.cliente_telefone,
        mensagem: texto,
        midiaUrl: foto.url,
        midiaTipo: 'imagem',
        unidade_id: atendimento.unidade_id,
      });
      if (res?.data?.ok === false) throw new Error(res.data.error || 'Falha no envio');
      toast.success('Orçamento enviado com a foto!');
      onClose?.();
    } catch (err) {
      toast.error(err?.message || 'Não foi possível enviar pelo WhatsApp');
    } finally {
      setEnviando(false);
    }
  };

  const copiar = () => {
    navigator.clipboard.writeText(texto);
    setCopiado(true);
    toast.success('Texto copiado!');
    setTimeout(() => setCopiado(false), 3000);
  };

  const abrirWhatsApp = () => {
    const tel = (atendimento.cliente_telefone || '').replace(/\D/g, '');
    const url = tel
      ? `https://wa.me/55${tel}?text=${encodeURIComponent(texto)}`
      : `https://wa.me/?text=${encodeURIComponent(texto)}`;
    window.open(url, '_blank');
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-green-600" />
            Orçamento para WhatsApp
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-3">
          {fotos.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
                <ImageIcon className="w-3.5 h-3.5 text-green-600" />
                Foto que vai junto com o orçamento (como legenda)
              </p>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {fotos.map(f => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setFotoSelecionadaId(f.id)}
                    className={`shrink-0 rounded-lg border-2 overflow-hidden transition-all ${
                      foto?.id === f.id ? 'border-green-600 ring-2 ring-green-200' : 'border-slate-200 hover:border-green-300'
                    }`}
                  >
                    <img src={f.url} alt={f.descricao || 'Foto do orçamento'} className="h-16 w-20 object-cover" />
                  </button>
                ))}
              </div>
            </div>
          )}

          <pre className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-xs text-slate-700 whitespace-pre-wrap font-mono leading-relaxed">
            {texto}
          </pre>
        </div>

        <div className="flex gap-2 pt-4 border-t flex-shrink-0">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Fechar
          </Button>
          <Button variant="outline" onClick={copiar} className="flex-1">
            {copiado ? <CheckCheck className="w-4 h-4 mr-2 text-green-600" /> : <Copy className="w-4 h-4 mr-2" />}
            {copiado ? 'Copiado!' : 'Copiar Texto'}
          </Button>
          <Button onClick={abrirWhatsApp} className="flex-1 bg-green-600 hover:bg-green-700">
            <MessageCircle className="w-4 h-4 mr-2" />
            Abrir WhatsApp
          </Button>
        </div>

        {foto && (
          <Button
            onClick={enviarComFoto}
            disabled={enviando}
            className="w-full bg-green-700 hover:bg-green-800 flex-shrink-0"
          >
            {enviando ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Send className="w-4 h-4 mr-2" />
            )}
            {enviando ? 'Enviando...' : 'Enviar foto + orçamento pelo WhatsApp'}
          </Button>
        )}
      </DialogContent>
    </Dialog>
  );
}