import React, { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { MessageCircle, Copy, CheckCheck } from 'lucide-react';
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
    let linha = `• ${item.nome} — ${item.quantidade}x R$ ${Number(item.valor_unitario || 0).toFixed(2)} = *R$ ${Number(item.valor_total || 0).toFixed(2)}*`;
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
      let linha = `${statusEmoji} ${item.nome} — ${item.quantidade}x R$ ${Number(item.valor_unitario || 0).toFixed(2)} = *R$ ${Number(item.valor_total || 0).toFixed(2)}*`;
      if (item.observacao_item) linha += `\n  _📝 ${item.observacao_item}_`;
      linhas.push(linha);
    });
    if (atendimento.subtotal_queixa > 0) {
      linhas.push('');
      linhas.push(`   Subtotal queixa: *R$ ${Number(atendimento.subtotal_queixa).toFixed(2)}*`);
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
      let linha = `${statusEmoji} ${item.nome} — ${item.quantidade}x R$ ${Number(item.valor_unitario || 0).toFixed(2)} = *R$ ${Number(item.valor_total || 0).toFixed(2)}*`;
      if (item.observacao_item) linha += `\n  _📝 ${item.observacao_item}_`;
      if (item.foto_url) linha += `\n  📸 *Ver foto:* ${item.foto_url}`;
      linhas.push(linha);
    });
    if (atendimento.subtotal_checklist > 0) {
      linhas.push('');
      linhas.push(`   Subtotal diagnóstico: *R$ ${Number(atendimento.subtotal_checklist).toFixed(2)}*`);
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

  // Totais
  linhas.push('');
  if (atendimento.desconto > 0) {
    linhas.push(`💰 Subtotal: R$ ${Number(atendimento.subtotal || 0).toFixed(2)}`);
    linhas.push(`🎁 Desconto: - R$ ${Number(atendimento.desconto).toFixed(2)}`);
  }
  linhas.push(`💵 *TOTAL GERAL: R$ ${Number(atendimento.valor_final || 0).toFixed(2)}*`);
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

  const texto = useMemo(() => gerarTextoOrcamento(atendimento, config), [atendimento, config]);

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

        <div className="flex-1 overflow-y-auto">
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
      </DialogContent>
    </Dialog>
  );
}