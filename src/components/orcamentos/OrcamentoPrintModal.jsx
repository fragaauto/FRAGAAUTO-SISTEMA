import React, { useRef, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

export default function OrcamentoPrintModal({ orcamento, config, onClose }) {
  const [modo, setModo] = useState('a4'); // 'a4' ou 'cupom'
  const printRef = useRef();

  const empresa = config?.nome_empresa || 'Empresa';
  const telefoneEmpresa = config?.telefone || '';
  const enderecoEmpresa = config?.endereco || '';
  const dataValidade = orcamento.validade_dias
    ? format(
        new Date(new Date(orcamento.created_date).getTime() + orcamento.validade_dias * 86400000),
        'dd/MM/yyyy', { locale: ptBR }
      )
    : null;

  const carregarLogoBase64 = async (url) => {
    if (!url) return null;
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      return await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(blob);
      });
    } catch {
      return null;
    }
  };

  const gerarPDFA4 = async () => {
    const doc = new jsPDF();
    const o = orcamento;
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();

    // ── FAIXA DE CABEÇALHO ──────────────────────────────────────────
    doc.setFillColor(249, 115, 22); // laranja
    doc.rect(0, 0, pageW, 38, 'F');

    // Faixa escura inferior do header
    doc.setFillColor(234, 88, 12);
    doc.rect(0, 32, pageW, 6, 'F');

    // Logo da empresa (se existir)
    const logoBase64 = await carregarLogoBase64(config?.logo_url);
    const nomeEmpresaX = logoBase64 ? 44 : 14;
    if (logoBase64) {
      try {
        const fmt = logoBase64.includes('image/png') ? 'PNG' : 'JPEG';
        doc.addImage(logoBase64, fmt, 14, 6, 24, 24);
      } catch {
        // ignora se não conseguir adicionar a imagem
      }
    }

    // Nome da empresa
    doc.setFont(undefined, 'bold');
    doc.setFontSize(20);
    doc.setTextColor(255, 255, 255);
    doc.text(empresa, nomeEmpresaX, 16);

    // Subtítulo / contato no header
    doc.setFontSize(8);
    doc.setFont(undefined, 'normal');
    const contatoItems = [];
    if (enderecoEmpresa) contatoItems.push(enderecoEmpresa);
    if (config?.telefone) contatoItems.push(`Tel: ${config.telefone}`);
    if (config?.whatsapp_atendimento) contatoItems.push(`WhatsApp: ${config.whatsapp_atendimento}`);
    if (config?.instagram) contatoItems.push(`@${config.instagram.replace('@','')}`);
    if (config?.site) contatoItems.push(config.site);
    doc.text(contatoItems.join('   |   '), 14, 28);

    // Badge "ORÇAMENTO" no lado direito do header
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(pageW - 70, 6, 56, 22, 3, 3, 'F');
    doc.setFont(undefined, 'bold');
    doc.setFontSize(9);
    doc.setTextColor(249, 115, 22);
    doc.text('ORÇAMENTO', pageW - 42, 14, { align: 'center' });
    doc.setFontSize(13);
    doc.text(`Nº ${String(o.numero || '').padStart(4, '0')}`, pageW - 42, 23, { align: 'center' });

    // ── DATAS ────────────────────────────────────────────────────────
    let y = 48;
    doc.setFont(undefined, 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(100, 116, 139);
    doc.text(`Emissão: ${format(new Date(o.created_date), 'dd/MM/yyyy', { locale: ptBR })}`, 14, y);
    if (dataValidade) {
      doc.text(`Validade: ${dataValidade}`, 70, y);
    }
    if (o.usuario_nome) doc.text(`Emitido por: ${o.usuario_nome}`, 130, y);

    // ── SEÇÃO CLIENTE + VEÍCULO (duas colunas) ───────────────────────
    y += 10;
    const colW = (pageW - 28) / 2;

    // Box Cliente
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(14, y, colW, 30, 2, 2, 'FD');

    doc.setFont(undefined, 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(249, 115, 22);
    doc.text('CLIENTE', 18, y + 7);

    doc.setFont(undefined, 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(30, 41, 59);
    doc.text(o.cliente_nome || '—', 18, y + 14);

    doc.setFont(undefined, 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105);
    const clienteInfo = [
      o.cliente_telefone ? `Tel: ${o.cliente_telefone}` : '',
      o.cliente_cpf ? `CPF: ${o.cliente_cpf}` : '',
    ].filter(Boolean).join('   ');
    if (clienteInfo) doc.text(clienteInfo, 18, y + 21);

    // Box Veículo
    const x2 = 14 + colW + 4;
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(x2, y, colW, 30, 2, 2, 'FD');

    doc.setFont(undefined, 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(249, 115, 22);
    doc.text('VEÍCULO', x2 + 4, y + 7);

    if (o.veiculo_placa || o.veiculo_modelo) {
      doc.setFont(undefined, 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(30, 41, 59);
      const modeloStr = [o.veiculo_modelo, o.veiculo_ano].filter(Boolean).join(' ');
      doc.text(modeloStr || '—', x2 + 4, y + 14);

      doc.setFont(undefined, 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(71, 85, 105);
      const vInfo = [
        o.veiculo_placa ? `Placa: ${o.veiculo_placa}` : '',
        o.veiculo_km ? `KM: ${o.veiculo_km}` : '',
      ].filter(Boolean).join('   ');
      if (vInfo) doc.text(vInfo, x2 + 4, y + 21);
    } else {
      doc.setFont(undefined, 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(148, 163, 184);
      doc.text('Não informado', x2 + 4, y + 14);
    }

    y += 38;

    // ── TABELA DE ITENS ──────────────────────────────────────────────
    doc.autoTable({
      startY: y,
      head: [['#', 'Descrição', 'Qtd', 'Valor Unit.', 'Total']],
      body: (o.itens || []).map((i, idx) => [
        idx + 1,
        i.observacao ? `${i.nome}\n${i.observacao}` : i.nome,
        i.quantidade,
        `R$ ${(i.valor_unitario || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        `R$ ${(i.valor_total || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      ]),
      styles: {
        fontSize: 8.5,
        cellPadding: { top: 4, bottom: 4, left: 4, right: 4 },
        textColor: [30, 41, 59],
      },
      headStyles: {
        fillColor: [30, 41, 59],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 8,
      },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      columnStyles: {
        0: { halign: 'center', cellWidth: 8 },
        2: { halign: 'center', cellWidth: 14 },
        3: { halign: 'right', cellWidth: 28 },
        4: { halign: 'right', cellWidth: 28, fontStyle: 'bold' },
      },
      margin: { left: 14, right: 14 },
    });

    let finalY = doc.lastAutoTable.finalY + 6;

    // ── TOTAIS ───────────────────────────────────────────────────────
    const totaisX = pageW - 14 - 70;

    // Subtotal
    doc.setFont(undefined, 'normal');
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text('Subtotal:', totaisX, finalY);
    doc.text(`R$ ${(o.subtotal || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, pageW - 14, finalY, { align: 'right' });
    finalY += 6;

    if (o.desconto > 0) {
      doc.setTextColor(220, 38, 38);
      doc.text('Desconto:', totaisX, finalY);
      doc.text(`- R$ ${(o.desconto || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, pageW - 14, finalY, { align: 'right' });
      finalY += 6;
    }

    // Linha separadora dos totais
    doc.setDrawColor(226, 232, 240);
    doc.line(totaisX, finalY, pageW - 14, finalY);
    finalY += 5;

    // TOTAL — caixa destacada
    doc.setFillColor(249, 115, 22);
    doc.roundedRect(totaisX - 4, finalY - 4, pageW - 14 - totaisX + 8, 12, 2, 2, 'F');
    doc.setFont(undefined, 'bold');
    doc.setFontSize(11);
    doc.setTextColor(255, 255, 255);
    doc.text('TOTAL:', totaisX, finalY + 4);
    doc.text(`R$ ${(o.total || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, pageW - 18, finalY + 4, { align: 'right' });
    finalY += 16;

    // ── OBSERVAÇÕES ──────────────────────────────────────────────────
    if (o.observacoes) {
      doc.setFillColor(254, 252, 232);
      doc.setDrawColor(253, 224, 71);
      doc.roundedRect(14, finalY, pageW - 28, 14, 2, 2, 'FD');
      doc.setFont(undefined, 'italic');
      doc.setFontSize(8.5);
      doc.setTextColor(113, 63, 18);
      const obsLines = doc.splitTextToSize(`Obs: ${o.observacoes}`, pageW - 36);
      doc.text(obsLines, 18, finalY + 6);
      finalY += 18;
    }

    // ── ASSINATURAS ──────────────────────────────────────────────────
    finalY += 14;
    if (finalY > pageH - 40) { doc.addPage(); finalY = 20; }

    doc.setDrawColor(203, 213, 225);
    doc.setTextColor(100, 116, 139);
    doc.setFont(undefined, 'normal');
    doc.setFontSize(8.5);

    // Linha cliente
    doc.line(14, finalY, 90, finalY);
    doc.text('Assinatura do Cliente', 52, finalY + 5, { align: 'center' });
    doc.text(o.cliente_nome || '', 52, finalY + 10, { align: 'center' });

    // Linha empresa
    doc.line(110, finalY, pageW - 14, finalY);
    doc.text(`Responsável — ${empresa}`, (110 + pageW - 14) / 2, finalY + 5, { align: 'center' });

    // ── RODAPÉ ───────────────────────────────────────────────────────
    doc.setFillColor(30, 41, 59);
    doc.rect(0, pageH - 14, pageW, 14, 'F');
    doc.setFont(undefined, 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    doc.text(`${empresa}  ·  Documento gerado em ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, pageW / 2, pageH - 6, { align: 'center' });

    doc.save(`orcamento-${String(o.numero || o.id.slice(0, 6)).padStart(4, '0')}.pdf`);
  };

  const imprimirCupom = () => {
    const o = orcamento;
    const win = window.open('', '_blank', 'width=320,height=600');
    const linhaDiv = `<div style="border-top:1px dashed #333;margin:4px 0;"></div>`;

    const itensHtml = (o.itens || []).map(i => `
      <div style="margin:2px 0;">
        <div>${i.nome}</div>
        <div style="display:flex;justify-content:space-between;">
          <span>${i.quantidade}x R$ ${(i.valor_unitario || 0).toFixed(2)}</span>
          <span><b>R$ ${(i.valor_total || 0).toFixed(2)}</b></span>
        </div>
        ${i.observacao ? `<div style="font-size:9px;color:#555;">${i.observacao}</div>` : ''}
      </div>
    `).join('');

    win.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          @page { margin: 0; size: 80mm auto; }
          body { font-family: 'Courier New', monospace; font-size: 11px; width: 72mm; margin: 4mm auto; color: #000; }
          .center { text-align: center; }
          .bold { font-weight: bold; }
          .right { text-align: right; }
          .small { font-size: 9px; }
          @media print { button { display:none; } }
        </style>
      </head>
      <body>
        ${config?.logo_url ? `<div class="center" style="margin-bottom:4px;"><img src="${config.logo_url}" style="max-height:50px;max-width:180px;object-fit:contain;" /></div>` : ''}
        <div class="center bold" style="font-size:14px;">${empresa}</div>
        ${enderecoEmpresa ? `<div class="center small">${enderecoEmpresa}</div>` : ''}
        ${telefoneEmpresa ? `<div class="center small">Tel: ${telefoneEmpresa}</div>` : ''}
        <div class="center small">📱 (31) 3808-8840</div>
        <div class="center small">📷 @fragaautoportasoficial</div>
        <div class="center small">🌐 fragaauto.com.br</div>
        ${linhaDiv}
        <div class="center bold" style="font-size:13px;">ORÇAMENTO Nº ${String(o.numero || '').padStart(4, '0')}</div>
        <div class="center small">Data: ${format(new Date(o.created_date), 'dd/MM/yyyy HH:mm', { locale: ptBR })}</div>
        ${dataValidade ? `<div class="center small">Válido até: ${dataValidade}</div>` : ''}
        ${linhaDiv}
        <div><b>Cliente:</b> ${o.cliente_nome}</div>
        ${o.cliente_telefone ? `<div class="small">Tel: ${o.cliente_telefone}</div>` : ''}
        ${o.veiculo_placa ? `<div class="small">Placa: ${o.veiculo_placa} ${o.veiculo_modelo ? '· ' + o.veiculo_modelo : ''}</div>` : ''}
        ${linhaDiv}
        <div class="bold small">ITENS</div>
        ${itensHtml}
        ${linhaDiv}
        <div style="display:flex;justify-content:space-between;" class="small"><span>Subtotal:</span><span>R$ ${(o.subtotal || 0).toFixed(2)}</span></div>
        ${o.desconto > 0 ? `<div style="display:flex;justify-content:space-between;" class="small"><span>Desconto:</span><span>- R$ ${(o.desconto || 0).toFixed(2)}</span></div>` : ''}
        <div style="display:flex;justify-content:space-between;" class="bold"><span>TOTAL:</span><span>R$ ${(o.total || 0).toFixed(2)}</span></div>
        ${linhaDiv}
        ${o.observacoes ? `<div class="small" style="font-style:italic;">${o.observacoes}</div>${linhaDiv}` : ''}
        <div class="center small" style="margin-top:8px;">Obrigado pela preferência!</div>
        <div style="margin-top:16px;">
          <div style="border-top:1px solid #000;margin-top:20px;padding-top:2px;" class="center small">Assinatura do Cliente</div>
        </div>
        <script>window.onload = () => { window.print(); }</script>
      </body>
      </html>
    `);
    win.document.close();
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Imprimir Orçamento</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 pt-2">
          <p className="text-sm text-slate-600">Escolha o formato de impressão:</p>
          <Button className="w-full gap-2 bg-orange-500 hover:bg-orange-600" onClick={gerarPDFA4}>
            <FileText className="w-4 h-4" /> Gerar PDF (A4)
          </Button>
          <Button variant="outline" className="w-full gap-2" onClick={imprimirCupom}>
            <Printer className="w-4 h-4" /> Imprimir Cupom (80mm)
          </Button>
          <Button variant="ghost" className="w-full text-slate-500" onClick={onClose}>Fechar</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}