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
import { Textarea } from "@/components/ui/textarea";
import { Copy, MessageCircle, Printer, X } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';

export default function ImpressaoQueixa({ atendimento, config, onClose }) {
  if (!atendimento) return null;

  const nomeEmpresa = config?.nome_empresa || 'FRAGA AUTO PORTAS';
  const logoUrl = config?.logo_url || null;

  const sep = '================================';
  const sepFino = '--------------------------------';

  // Cada linha da queixa vira um "bloco" separado
  const linhasQueixa = (atendimento.queixa_inicial || '')
    .split('\n')
    .map(l => l.trim())
    .filter(l => l.length > 0);

  const itensQueixa = atendimento.itens_queixa || [];

  const gerarTexto = () => {
    const hoje = format(new Date(), 'dd/MM/yyyy HH:mm');
    let t = '';
    t += `${sep}\n`;
    t += `🔧 *QUEIXA DO CLIENTE* 🔧\n`;
    t += `${sep}\n`;
    t += `📅 *Data:* ${hoje}\n`;
    t += `${sepFino}\n`;
    t += `🚗 *VEÍCULO*\n`;
    t += `Placa: *${atendimento.placa}*\n`;
    t += `Modelo: *${atendimento.modelo}*\n`;
    if (atendimento.ano) t += `Ano: ${atendimento.ano}\n`;
    if (atendimento.km_atual) t += `KM: ${atendimento.km_atual}\n`;
    t += `${sepFino}\n`;
    t += `👤 *CLIENTE*\n`;
    t += `Nome: *${(atendimento.cliente_nome || '-').toUpperCase()}*\n`;
    t += `Tel: ${atendimento.cliente_telefone || '-'}\n`;
    if (atendimento.cliente_cpf || atendimento.cliente_cpf_cnpj) t += `CPF/CNPJ: ${atendimento.cliente_cpf || atendimento.cliente_cpf_cnpj}\n`;
    if (atendimento.cliente_endereco) t += `Endereço: ${atendimento.cliente_endereco}\n`;
    t += `${sep}\n`;

    if (linhasQueixa.length > 0) {
      t += `💬 *DESCRIÇÃO DA QUEIXA*\n`;
      t += `${sep}\n`;
      linhasQueixa.forEach((linha, idx) => {
        t += `\n[${idx + 1}] *${linha}*\n`;
        t += `${sepFino}\n`;
      });
    }

    if (itensQueixa.length > 0) {
      t += `\n${sep}\n`;
      t += `🔩 *ITENS LANÇADOS: ${itensQueixa.length}*\n`;
      t += `${sep}\n`;
      itensQueixa.forEach((item, idx) => {
        t += `\n*${idx + 1}. ${item.nome}*`;
        if (item.quantidade > 1) t += ` _(x${item.quantidade})_`;
        t += `\n`;
        if (item.observacao_item) t += `   📝 _${item.observacao_item}_\n`;
        t += `${sepFino}\n`;
      });
    }

    t += `\n${sep}\n`;
    t += `✍ Técnico: ______________________\n`;
    t += `${sep}\n`;
    t += `_${nomeEmpresa}_`;
    return t;
  };

  const textoQueixa = gerarTexto();

  const handleCopiar = () => {
    navigator.clipboard.writeText(textoQueixa);
    toast.success('Texto copiado para área de transferência!');
  };

  const handleWhatsApp = () => {
    window.open(`https://wa.me/?text=${encodeURIComponent(textoQueixa)}`, '_blank');
  };

  const handleImprimir = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const hoje = format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });

    const linhasHtml = linhasQueixa.map((linha, idx) => `
      <div class="bloco-queixa">
        <div class="bloco-num">[${idx + 1}]</div>
        <div class="bloco-texto">${linha}</div>
      </div>
    `).join('');

    const itensHtml = itensQueixa.map((item, idx) => `
      <div class="item-box">
        <div class="item-nome">${idx + 1}. ${item.nome}${item.quantidade > 1 ? ` <span class="item-qtd">(x${item.quantidade})</span>` : ''}</div>
        ${item.observacao_item ? `<div class="item-obs">📝 <em>${item.observacao_item}</em></div>` : ''}
      </div>
    `).join('');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html lang="pt-BR">
        <head>
          <meta charset="UTF-8">
          <title>Queixa - ${atendimento.placa}</title>
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
            .section-title { font-weight: bold; font-size: 13px; margin: 6px 0 3px; text-decoration: underline; }
            .info-row { margin: 3px 0; }
            .info-label { font-weight: bold; }
            .bloco-queixa {
              border: 2px solid #000;
              margin: 6px 0;
              padding: 5px 6px;
              page-break-inside: avoid;
            }
            .bloco-num { font-weight: bold; font-size: 11px; margin-bottom: 2px; color: #555; }
            .bloco-texto { font-size: 13px; font-weight: bold; }
            .item-box { border: 1px dashed #000; margin: 5px 0; padding: 4px 6px; }
            .item-nome { font-weight: bold; font-size: 12px; }
            .item-qtd { font-size: 11px; font-style: italic; font-weight: normal; }
            .item-obs { font-size: 11px; margin-top: 2px; font-style: italic; }
            .assinatura { margin-top: 8px; }
            .footer { text-align: center; font-size: 11px; margin-top: 8px; font-style: italic; border-top: 1px solid #000; padding-top: 4px; }
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
          <button class="print-button" onclick="window.print()">🖨️ Imprimir</button>

          ${logoUrl ? `<div class="logo"><img src="${logoUrl}" alt="Logo" /></div>` : ''}
          <div class="empresa">${nomeEmpresa}</div>

          <hr class="sep-duplo"/>
          <div class="title">QUEIXA DO CLIENTE</div>
          <div class="subtitle">— ÁREA TÉCNICA —</div>
          <hr class="sep-duplo"/>

          <div class="info-row">📅 <span class="info-label">Data:</span> ${hoje}</div>
          <hr class="sep"/>
          <div class="section-title">🚗 VEÍCULO</div>
          <div class="info-row"><span class="info-label">Placa:</span> <strong>${atendimento.placa}</strong></div>
          <div class="info-row"><span class="info-label">Modelo:</span> <strong>${atendimento.modelo}</strong></div>
          ${atendimento.ano ? `<div class="info-row"><span class="info-label">Ano:</span> ${atendimento.ano}</div>` : ''}
          ${atendimento.km_atual ? `<div class="info-row"><span class="info-label">KM:</span> ${atendimento.km_atual}</div>` : ''}

          <hr class="sep"/>
          <div class="section-title">👤 CLIENTE</div>
          <div class="info-row"><span class="info-label">Nome:</span> <strong>${(atendimento.cliente_nome || '-').toUpperCase()}</strong></div>
          <div class="info-row"><span class="info-label">Tel:</span> ${atendimento.cliente_telefone || '-'}</div>
          ${(atendimento.cliente_cpf || atendimento.cliente_cpf_cnpj) ? `<div class="info-row"><span class="info-label">CPF/CNPJ:</span> ${atendimento.cliente_cpf || atendimento.cliente_cpf_cnpj}</div>` : ''}
          ${atendimento.cliente_endereco ? `<div class="info-row"><span class="info-label">Endereço:</span> ${atendimento.cliente_endereco}</div>` : ''}

          ${linhasQueixa.length > 0 ? `
            <hr class="sep-duplo"/>
            <div class="section-title">💬 DESCRIÇÃO DA QUEIXA</div>
            <hr class="sep"/>
            ${linhasHtml}
          ` : ''}

          ${itensQueixa.length > 0 ? `
            <hr class="sep-duplo"/>
            <div class="section-title">🔩 ITENS LANÇADOS: ${itensQueixa.length}</div>
            <hr class="sep"/>
            ${itensHtml}
          ` : ''}

          <hr class="sep-duplo"/>
          <div class="assinatura">✍ <span class="info-label">Técnico:</span> ______________________</div>
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
            <span>Impressão da Queixa</span>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </DialogTitle>
          <DialogDescription>
            Queixa do cliente para impressão na impressora térmica 80mm
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <h3 className="font-semibold mb-2 text-sm flex items-center gap-2">
              <span>Queixa - Texto</span>
              <Badge className="bg-blue-700">Área Técnica</Badge>
            </h3>
            <Textarea
              value={textoQueixa}
              readOnly
              className="font-mono text-xs min-h-[400px] bg-slate-50"
            />
          </div>

          <div className="grid grid-cols-3 gap-2">
            <Button onClick={handleCopiar} variant="outline" className="w-full">
              <Copy className="w-4 h-4 mr-2" />
              Copiar
            </Button>
            <Button onClick={handleWhatsApp} className="w-full bg-green-600 hover:bg-green-700">
              <MessageCircle className="w-4 h-4 mr-2" />
              WhatsApp
            </Button>
            <Button onClick={handleImprimir} className="w-full bg-blue-600 hover:bg-blue-700">
              <Printer className="w-4 h-4 mr-2" />
              Imprimir
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}