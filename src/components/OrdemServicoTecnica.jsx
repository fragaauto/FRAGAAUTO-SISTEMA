import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Copy, MessageCircle, Printer, X } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';

export default function OrdemServicoTecnica({ atendimento, config, onClose }) {
  if (!atendimento) return null;

  const nomeEmpresa = config?.nome_empresa || 'FRAGA AUTO PORTAS';
  const logoUrl = config?.logo_url || null;

  // Filtrar apenas itens aprovados (deduplicar por produto_id)
  const idsQueixa = new Set((atendimento.itens_queixa || []).filter(i => i.status_aprovacao === 'aprovado').map(i => i.produto_id));
  const itensAprovados = [
    ...(atendimento.itens_queixa?.filter(item => item.status_aprovacao === 'aprovado') || []),
    ...(atendimento.itens_orcamento?.filter(item => item.status_aprovacao === 'aprovado' && !idsQueixa.has(item.produto_id)) || [])
  ];

  const sep = '================================';
  const sepFino = '--------------------------------';

  const gerarTextoOS = () => {
    const hoje = format(new Date(), 'dd/MM/yyyy');
    let t = '';
    t += `${sep}\n`;
    t += `🔧 *ORDEM DE SERVIÇO TÉCNICA* 🔧\n`;
    t += `${sep}\n`;
    t += `📋 *OS:* ${atendimento.id?.slice(-8).toUpperCase()}\n`;
    t += `📅 *Data:* ${hoje}\n`;
    t += `${sepFino}\n`;
    t += `🚗 *VEÍCULO*\n`;
    t += `Placa: *${atendimento.placa}*\n`;
    t += `Modelo: *${atendimento.modelo}*\n`;
    if (atendimento.ano) t += `Ano: ${atendimento.ano}\n`;
    t += `${sepFino}\n`;
    t += `👤 *CLIENTE*\n`;
    t += `Nome: *${(atendimento.cliente_nome || '-').toUpperCase()}*\n`;
    t += `Tel: ${atendimento.cliente_telefone || '-'}\n`;
    t += `${sep}\n`;
    t += `✅ *SERVIÇOS APROVADOS: ${itensAprovados.length}*\n`;
    t += `${sep}\n`;
    if (itensAprovados.length === 0) {
      t += `⚠️ Nenhum serviço aprovado ainda.\n`;
    } else {
      itensAprovados.forEach((item, idx) => {
        t += `\n*${idx + 1}. ${item.nome}*`;
        if (item.quantidade > 1) t += ` _(x${item.quantidade})_`;
        t += `\n`;
        if (item.observacao_item) t += `   📝 _${item.observacao_item}_\n`;
        t += `   📍 Local/Porta: _________________\n`;
        t += `   ◻ Pendente  ◻ Em Andamento  ◻ Concluído\n`;
      });
    }
    t += `\n${sepFino}\n`;
    t += `☑ *CHECKLIST FINAL*\n`;
    t += `◻ Teste de funcionamento\n`;
    t += `◻ Limpeza realizada\n`;
    t += `◻ Ferramentas recolhidas\n`;
    t += `${sep}\n`;
    t += `✍ Técnico: ______________________\n`;
    t += `📅 Conclusão: ____/____/____\n`;
    t += `${sep}\n`;
    t += `_${nomeEmpresa}_`;
    return t;
  };

  const textoOS = gerarTextoOS();

  const handleCopiar = () => {
    navigator.clipboard.writeText(textoOS);
    toast.success('Texto da OS copiado para área de transferência!');
  };

  const handleWhatsApp = () => {
    const mensagem = encodeURIComponent(textoOS);
    window.open(`https://wa.me/?text=${mensagem}`, '_blank');
  };

  const handleImprimir = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const hoje = format(new Date(), 'dd/MM/yyyy');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html lang="pt-BR">
        <head>
          <meta charset="UTF-8">
          <title>OS - ${atendimento.placa}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
              font-family: 'Courier New', monospace;
              font-size: 13px;
              width: 80mm;
              margin: 0 auto;
              padding: 4mm;
              background: white;
              color: #000;
            }
            .logo { text-align: center; margin-bottom: 6px; }
            .logo img { max-width: 40mm; max-height: 20mm; object-fit: contain; }
            .empresa { text-align: center; font-weight: bold; font-size: 15px; margin-bottom: 4px; letter-spacing: 1px; }
            .sep-duplo { border: none; border-top: 3px double #000; margin: 7px 0; }
            .sep { border: none; border-top: 1px dashed #000; margin: 6px 0; }
            .title { text-align: center; font-weight: bold; font-size: 15px; letter-spacing: 2px; text-decoration: underline; margin: 4px 0; }
            .subtitle { text-align: center; font-size: 11px; margin-bottom: 2px; }
            .section-title { font-weight: bold; font-size: 13px; margin: 6px 0 3px; text-decoration: underline; display: flex; align-items: center; gap: 4px; }
            .info-row { margin: 3px 0; }
            .info-label { font-weight: bold; }
            .item-box { border: 1px solid #000; margin: 6px 0; padding: 4px 6px; }
            .item-nome { font-weight: bold; font-size: 13px; }
            .item-qtd { font-size: 11px; font-style: italic; }
            .item-obs { font-size: 11px; margin: 2px 0 2px 4px; font-style: italic; }
            .item-campo { margin: 3px 0; font-size: 12px; }
            .item-status { display: flex; gap: 8px; font-size: 11px; margin-top: 3px; }
            .checklist-item { margin: 4px 0; font-size: 13px; }
            .footer { text-align: center; font-size: 11px; margin-top: 8px; font-style: italic; border-top: 1px solid #000; padding-top: 4px; }
            .os-num { font-weight: bold; font-size: 14px; }
            @media print {
              body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
              .no-print { display: none; }
            }
            .print-button {
              position: fixed; top: 10px; right: 10px;
              background: #f97316; color: white; border: none;
              padding: 8px 16px; border-radius: 4px; font-size: 12px;
              font-weight: bold; cursor: pointer;
            }
            @media print { .print-button { display: none; } }
          </style>
        </head>
        <body>
          <button class="print-button no-print" onclick="window.print()">🖨️ Imprimir</button>

          ${logoUrl ? `<div class="logo"><img src="${logoUrl}" alt="Logo" /></div>` : ''}
          <div class="empresa">🔧 ${nomeEmpresa}</div>

          <hr class="sep-duplo"/>
          <div class="title">ORDEM DE SERVIÇO</div>
          <div class="subtitle">— ÁREA TÉCNICA —</div>
          <hr class="sep-duplo"/>

          <div class="info-row">📋 <span class="info-label">OS:</span> <span class="os-num">${atendimento.id?.slice(-8).toUpperCase()}</span></div>
          <div class="info-row">📅 <span class="info-label">Data:</span> ${hoje}</div>

          <hr class="sep"/>
          <div class="section-title">🚗 VEÍCULO</div>
          <div class="info-row"><span class="info-label">Placa:</span> <strong>${atendimento.placa}</strong></div>
          <div class="info-row"><span class="info-label">Modelo:</span> <strong>${atendimento.modelo}</strong></div>
          ${atendimento.ano ? `<div class="info-row"><span class="info-label">Ano:</span> ${atendimento.ano}</div>` : ''}

          <hr class="sep"/>
          <div class="section-title">👤 CLIENTE</div>
          <div class="info-row"><span class="info-label">Nome:</span> <strong>${(atendimento.cliente_nome || '-').toUpperCase()}</strong></div>
          <div class="info-row"><span class="info-label">Tel:</span> ${atendimento.cliente_telefone || '-'}</div>

          <hr class="sep-duplo"/>
          <div class="section-title">✅ SERVIÇOS APROVADOS: ${itensAprovados.length}</div>
          <hr class="sep"/>

          ${itensAprovados.length === 0
            ? '<div>⚠️ Nenhum serviço aprovado ainda.</div>'
            : itensAprovados.map((item, idx) => `
              <div class="item-box">
                <div class="item-nome">${idx + 1}. ${item.nome} ${item.quantidade > 1 ? `<span class="item-qtd">(x${item.quantidade})</span>` : ''}</div>
                ${item.observacao_item ? `<div class="item-obs">📝 <em>${item.observacao_item}</em></div>` : ''}
                <div class="item-campo">📍 Local/Porta: _________________</div>
                <div class="item-status">◻ Pendente &nbsp; ◻ Em Andamento &nbsp; ◻ Concluído</div>
              </div>
            `).join('')}

          <hr class="sep"/>
          <div class="section-title">☑ CHECKLIST FINAL</div>
          <div class="checklist-item">◻ Teste de funcionamento</div>
          <div class="checklist-item">◻ Limpeza realizada</div>
          <div class="checklist-item">◻ Ferramentas recolhidas</div>

          <hr class="sep-duplo"/>
          <div class="info-row">✍ <span class="info-label">Técnico:</span> ______________________</div>
          <div class="info-row">📅 <span class="info-label">Conclusão:</span> ____/____/____</div>
          <hr class="sep"/>
          <div class="footer">${nomeEmpresa}</div>
        </body>
      </html>
    `);

    printWindow.document.close();
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Ordem de Serviço - Área Técnica</span>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </DialogTitle>
          <DialogDescription>
            Documentação técnica dos serviços aprovados pelo cliente
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Preview do Texto */}
          <div>
            <h3 className="font-semibold mb-2 text-sm flex items-center gap-2">
              <span>Ordem de Serviço - Texto</span>
              <Badge className="bg-slate-700">Área Técnica</Badge>
            </h3>
            <Textarea
              value={textoOS}
              readOnly
              className="font-mono text-xs min-h-[400px] bg-slate-50"
            />
          </div>

          {/* Botões de Ação */}
          <div className="grid grid-cols-3 gap-2">
            <Button onClick={handleCopiar} variant="outline" className="w-full">
              <Copy className="w-4 h-4 mr-2" />
              Copiar
            </Button>
            <Button onClick={handleWhatsApp} className="w-full bg-green-600 hover:bg-green-700">
              <MessageCircle className="w-4 h-4 mr-2" />
              WhatsApp
            </Button>
            <Button onClick={handleImprimir} className="w-full bg-orange-600 hover:bg-orange-700">
              <Printer className="w-4 h-4 mr-2" />
              Imprimir
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}