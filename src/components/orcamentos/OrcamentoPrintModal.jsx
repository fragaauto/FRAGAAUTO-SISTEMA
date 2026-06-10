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

  const gerarPDFA4 = () => {
    const doc = new jsPDF();
    const o = orcamento;

    // Cabeçalho com logo e contato
    doc.setFontSize(18);
    doc.setFont(undefined, 'bold');
    doc.text(empresa, 14, 18);

    doc.setFontSize(9);
    doc.setFont(undefined, 'normal');
    if (enderecoEmpresa) doc.text(enderecoEmpresa, 14, 24);
    if (telefoneEmpresa) doc.text(`Fone: ${telefoneEmpresa}`, 14, 29);
    
    // Informações de contato
    doc.setFontSize(8);
    doc.text(`📱 WhatsApp: (31) 3808-8840`, 14, 33);
    doc.text(`📷 Instagram: @fragaautoportasoficial`, 14, 37);
    doc.text(`🌐 Site: fragaauto.com.br`, 14, 41);

    // Título
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.text(`ORÇAMENTO Nº ${String(o.numero || '').padStart(4, '0')}`, 14, 46);
    doc.setFontSize(9);
    doc.setFont(undefined, 'normal');
    doc.text(`Data: ${format(new Date(o.created_date), 'dd/MM/yyyy', { locale: ptBR })}`, 14, 52);
    if (dataValidade) doc.text(`Válido até: ${dataValidade}`, 70, 52);

    // Linha divisória
    doc.setDrawColor(200, 200, 200);
    doc.line(14, 55, 196, 55);

    // Cliente
    doc.setFontSize(10);
    doc.setFont(undefined, 'bold');
    doc.text('DADOS DO CLIENTE', 14, 62);
    doc.setFont(undefined, 'normal');
    doc.setFontSize(9);
    doc.text(`Cliente: ${o.cliente_nome}`, 14, 68);
    if (o.cliente_telefone) doc.text(`Telefone: ${o.cliente_telefone}`, 14, 73);
    if (o.cliente_cpf) doc.text(`CPF/CNPJ: ${o.cliente_cpf}`, 100, 73);

    let y = 79;
    if (o.veiculo_placa || o.veiculo_modelo) {
      doc.setFont(undefined, 'bold');
      doc.text('VEÍCULO', 14, y);
      y += 6;
      doc.setFont(undefined, 'normal');
      const vInfo = [o.veiculo_placa, o.veiculo_modelo, o.veiculo_ano, o.veiculo_km ? `${o.veiculo_km} km` : ''].filter(Boolean).join(' · ');
      doc.text(vInfo, 14, y);
      y += 8;
    }

    // Itens
    doc.autoTable({
      startY: y,
      head: [['Descrição', 'Qtd', 'Valor Unit.', 'Total']],
      body: (o.itens || []).map(i => [
        i.observacao ? `${i.nome}\n${i.observacao}` : i.nome,
        i.quantidade,
        `R$ ${(i.valor_unitario || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        `R$ ${(i.valor_total || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      ]),
      styles: { fontSize: 8.5, cellPadding: 2 },
      headStyles: { fillColor: [249, 115, 22], textColor: 255, fontStyle: 'bold' },
      columnStyles: { 1: { halign: 'center' }, 2: { halign: 'right' }, 3: { halign: 'right' } },
      margin: { left: 14, right: 14 },
    });

    let finalY = doc.lastAutoTable.finalY + 5;

    // Totais
    doc.setFontSize(9);
    doc.text(`Subtotal: R$ ${(o.subtotal || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 130, finalY, { align: 'left' });
    finalY += 5;
    if (o.desconto > 0) {
      doc.setTextColor(200, 0, 0);
      doc.text(`Desconto: - R$ ${(o.desconto || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 130, finalY);
      finalY += 5;
      doc.setTextColor(0, 0, 0);
    }
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text(`TOTAL: R$ ${(o.total || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 130, finalY + 2);
    doc.setFont(undefined, 'normal');
    finalY += 12;

    if (o.observacoes) {
      doc.setFontSize(8.5);
      doc.setFont(undefined, 'italic');
      doc.text(`Obs: ${o.observacoes}`, 14, finalY);
      finalY += 10;
    }

    // Assinatura
    finalY += 10;
    doc.setFontSize(9);
    doc.setFont(undefined, 'normal');
    doc.line(14, finalY, 90, finalY);
    doc.line(110, finalY, 196, finalY);
    finalY += 4;
    doc.text('Assinatura do Cliente', 14, finalY);
    doc.text('Responsável pela Empresa', 110, finalY);

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