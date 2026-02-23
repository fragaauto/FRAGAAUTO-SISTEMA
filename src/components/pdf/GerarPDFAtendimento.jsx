import { format } from 'date-fns';

export function gerarPDFAtendimento(atendimento, setIsGeneratingPDF, toast) {
  setIsGeneratingPDF(true);
  
  try {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error('Permita pop-ups para gerar o PDF');
      setIsGeneratingPDF(false);
      return;
    }

    const hoje = format(new Date(), "dd 'de' MMMM 'de' yyyy");
    const defeitosEncontrados = atendimento.checklist?.filter(item => item.status === 'com_defeito') || [];

    printWindow.document.write(`
      <!DOCTYPE html>
      <html lang="pt-BR">
        <head>
          <meta charset="UTF-8">
          <title>Orçamento - ${atendimento.placa}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: Arial, sans-serif; padding: 30px; max-width: 800px; margin: 0 auto; background: white; }
            .header { border-bottom: 4px solid #f97316; padding-bottom: 20px; margin-bottom: 30px; display: flex; justify-content: space-between; align-items: start; }
            .header-left h1 { font-size: 28px; color: #1e293b; margin-bottom: 5px; }
            .header-left p { color: #64748b; font-size: 14px; }
            .header-right { text-align: right; font-size: 12px; color: #64748b; }
            .title-box { background: #1e293b; color: white; text-align: center; padding: 15px; border-radius: 8px; margin-bottom: 20px; }
            .title-box h2 { font-size: 20px; }
            .info-row { display: flex; justify-content: space-between; margin-bottom: 20px; font-size: 14px; }
            .section { background: #f8fafc; border-radius: 8px; padding: 20px; margin-bottom: 20px; }
            .section h3 { font-size: 16px; color: #1e293b; margin-bottom: 15px; padding-bottom: 10px; border-bottom: 2px solid #e2e8f0; }
            .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; font-size: 14px; }
            .grid-item strong { color: #1e293b; display: block; margin-bottom: 3px; }
            .defect-item { background: #fef2f2; padding: 10px; margin-bottom: 8px; border-radius: 6px; border-left: 3px solid #ef4444; font-size: 14px; }
            .defect-item strong { color: #1e293b; display: block; margin-bottom: 3px; }
            .defect-item span { color: #64748b; }
            .diagnostico { background: #fefce8; border-left: 4px solid #eab308; padding: 15px; margin-bottom: 20px; border-radius: 4px; }
            .diagnostico h3 { color: #1e293b; margin-bottom: 10px; font-size: 16px; }
            .diagnostico p { color: #64748b; font-size: 14px; line-height: 1.6; white-space: pre-wrap; }
            table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 14px; }
            th, td { padding: 12px; text-align: left; border: 1px solid #e2e8f0; }
            th { background: #f1f5f9; font-weight: 600; color: #1e293b; }
            tbody tr:nth-child(even) { background: #f8fafc; }
            .totals { background: #1e293b; color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
            .total-row { display: flex; justify-content: space-between; margin-bottom: 10px; font-size: 14px; }
            .total-final { border-top: 2px solid rgba(255,255,255,0.2); padding-top: 15px; margin-top: 15px; display: flex; justify-content: space-between; font-size: 20px; font-weight: bold; }
            .total-final .value { color: #fb923c; }
            .footer { border-top: 2px solid #e2e8f0; padding-top: 20px; margin-top: 30px; }
            .footer-note { text-align: center; color: #64748b; font-size: 12px; margin-bottom: 30px; }
            .signatures { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-top: 40px; }
            .signature { text-align: center; }
            .signature-line { border-top: 1px solid #94a3b8; padding-top: 10px; margin-top: 50px; }
            .signature p { font-size: 14px; font-weight: 600; color: #1e293b; }
            .signature small { font-size: 12px; color: #64748b; }
            .validity { text-align: center; color: #94a3b8; font-size: 11px; margin-top: 20px; }
            .print-button { position: fixed; top: 20px; right: 20px; background: #f97316; color: white; border: none; padding: 12px 24px; border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
            @media print { body { print-color-adjust: exact; -webkit-print-color-adjust: exact; } .print-button { display: none; } }
          </style>
        </head>
        <body>
          <button class="print-button" onclick="window.print()">🖨️ Imprimir / Salvar PDF</button>
          <div class="header">
            <div class="header-left"><h1>FRAGA AUTO PORTAS</h1><p>Especialista em Manutenção de Portas e Acessórios Automotivos</p></div>
            <div class="header-right"><p>📍 Endereço da oficina</p><p>📞 (XX) XXXXX-XXXX</p><p>📧 contato@fragaauto.com.br</p></div>
          </div>
          <div class="title-box"><h2>PRÉ-ORÇAMENTO</h2></div>
          <div class="info-row"><span><strong>Data:</strong> ${hoje}</span><span><strong>Nº:</strong> ${atendimento.id?.slice(-8).toUpperCase()}</span></div>
          <div class="section"><h3>DADOS DO CLIENTE</h3><div class="grid"><div class="grid-item"><strong>Nome:</strong>${atendimento.cliente_nome || '-'}</div><div class="grid-item"><strong>Telefone:</strong>${atendimento.cliente_telefone || '-'}</div></div></div>
          <div class="section"><h3>DADOS DO VEÍCULO</h3><div class="grid">
            <div class="grid-item"><strong>Placa:</strong>${atendimento.placa}</div>
            <div class="grid-item"><strong>Modelo:</strong>${atendimento.modelo}</div>
            <div class="grid-item"><strong>Marca:</strong>${atendimento.marca || '-'}</div>
            <div class="grid-item"><strong>Ano:</strong>${atendimento.ano || '-'}</div>
            <div class="grid-item"><strong>KM Atual:</strong>${atendimento.km_atual || '-'}</div>
            <div class="grid-item"><strong>Data Entrada:</strong>${atendimento.data_entrada ? format(new Date(atendimento.data_entrada), 'dd/MM/yyyy') : '-'}</div>
          </div></div>
          ${atendimento.queixa_inicial ? `<div style="margin-bottom:20px;"><h3 style="color:#1e293b;font-size:16px;margin-bottom:15px;padding-bottom:10px;border-bottom:2px solid #3b82f6;">QUEIXA INICIAL</h3><div style="background:#eff6ff;padding:15px;border-radius:8px;border-left:4px solid #3b82f6;"><p style="color:#1e3a8a;font-size:14px;line-height:1.6;white-space:pre-wrap;">${atendimento.queixa_inicial}</p></div></div>` : ''}
          ${atendimento.itens_queixa?.length > 0 ? `<div style="margin-bottom:20px;"><h3 style="color:#1e293b;font-size:16px;margin-bottom:15px;padding-bottom:10px;border-bottom:2px solid #3b82f6;">ORÇAMENTO DA QUEIXA</h3><table><thead><tr><th>Item</th><th style="text-align:center;width:80px;">Qtd</th><th style="text-align:right;width:120px;">Valor Unit.</th><th style="text-align:right;width:120px;">Total</th></tr></thead><tbody>${atendimento.itens_queixa.map(item => `<tr><td>${item.nome}${item.vantagens ? `<div style="margin-top:6px;padding:8px;background:#f0fdf4;border-left:3px solid #22c55e;border-radius:4px;"><strong style="font-size:11px;color:#166534;">✓ Benefícios:</strong><p style="font-size:11px;color:#15803d;margin:4px 0 0 0;">${item.vantagens}</p></div>` : ''}${item.desvantagens ? `<div style="margin-top:6px;padding:8px;background:#fef2f2;border-left:3px solid #f59e0b;border-radius:4px;"><strong style="font-size:11px;color:#92400e;">⚠️ Riscos:</strong><p style="font-size:11px;color:#78350f;margin:4px 0 0 0;">${item.desvantagens}</p></div>` : ''}</td><td style="text-align:center;">${item.quantidade}</td><td style="text-align:right;">R$ ${item.valor_unitario?.toFixed(2)}</td><td style="text-align:right;font-weight:600;">R$ ${item.valor_total?.toFixed(2)}</td></tr>`).join('')}</tbody></table><div style="text-align:right;margin-top:10px;padding:10px;background:#dbeafe;border-radius:6px;"><strong style="color:#1e40af;font-size:15px;">Subtotal da Queixa: R$ ${atendimento.subtotal_queixa?.toFixed(2) || '0.00'}</strong></div></div>` : ''}
          ${defeitosEncontrados.length > 0 ? `<div style="margin-bottom:20px;"><h3 style="color:#1e293b;font-size:16px;margin-bottom:15px;padding-bottom:10px;border-bottom:2px solid #f97316;">ITENS COM DEFEITO</h3>${defeitosEncontrados.map(item => `<div class="defect-item"><strong>✗ ${item.item}</strong>${item.comentario ? `<span>${item.comentario}</span>` : ''}</div>`).join('')}</div>` : ''}
          ${atendimento.pre_diagnostico ? `<div class="diagnostico"><h3>PRÉ-DIAGNÓSTICO</h3><p>${atendimento.pre_diagnostico}</p></div>` : ''}
          ${(() => {
            const idsQueixa = new Set(atendimento.itens_queixa?.map(i => i.produto_id) || []);
            const checklistItens = atendimento.itens_orcamento?.filter(i => !idsQueixa.has(i.produto_id)) || [];
            return checklistItens.length > 0 ? `<div style="margin-bottom:20px;"><h3 style="color:#1e293b;font-size:16px;margin-bottom:15px;padding-bottom:10px;border-bottom:2px solid #f97316;">ITENS DO CHECKLIST</h3><table><thead><tr><th>Item</th><th style="text-align:center;width:80px;">Qtd</th><th style="text-align:right;width:120px;">Valor Unit.</th><th style="text-align:right;width:120px;">Total</th></tr></thead><tbody>${checklistItens.map(item => `<tr><td>${item.nome}</td><td style="text-align:center;">${item.quantidade}</td><td style="text-align:right;">R$ ${item.valor_unitario?.toFixed(2)}</td><td style="text-align:right;font-weight:600;">R$ ${item.valor_total?.toFixed(2)}</td></tr>`).join('')}</tbody></table><div style="text-align:right;margin-top:10px;padding:10px;background:#fed7aa;border-radius:6px;"><strong style="color:#92400e;font-size:15px;">Subtotal do Checklist: R$ ${atendimento.subtotal_checklist?.toFixed(2) || '0.00'}</strong></div></div>` : '';
          })()}
          <div class="totals">
            <div class="total-row"><span>Subtotal:</span><span>R$ ${atendimento.subtotal?.toFixed(2) || '0.00'}</span></div>
            ${atendimento.desconto > 0 ? `<div class="total-row" style="color:#86efac;"><span>Desconto:</span><span>- R$ ${atendimento.desconto?.toFixed(2)}</span></div>` : ''}
            <div class="total-final"><span>VALOR TOTAL:</span><span class="value">R$ ${atendimento.valor_final?.toFixed(2) || '0.00'}</span></div>
          </div>
          ${atendimento.observacoes ? `<div style="background:#f8fafc;border-radius:8px;padding:15px;margin-bottom:20px;"><h3 style="color:#1e293b;margin-bottom:10px;font-size:16px;">OBSERVAÇÕES</h3><p style="color:#64748b;font-size:14px;line-height:1.6;white-space:pre-wrap;">${atendimento.observacoes}</p></div>` : ''}
          <div class="footer">
            <p class="footer-note">Este é um pré-orçamento e os valores podem sofrer alterações após diagnóstico completo.</p>
            <div class="signatures">
              <div class="signature"><div class="signature-line"><p>Técnico Responsável</p><small>${atendimento.tecnico || 'Fraga Auto Portas'}</small></div></div>
              <div class="signature"><div class="signature-line"><p>Cliente</p><small>${atendimento.cliente_nome || ''}</small></div></div>
            </div>
            <p class="validity">Orçamento válido por 7 dias • Fraga Auto Portas © ${new Date().getFullYear()}</p>
          </div>
        </body>
      </html>
    `);
    
    printWindow.document.close();
    setTimeout(() => {
      setIsGeneratingPDF(false);
      toast.success('PDF aberto! Clique no botão para imprimir');
    }, 500);
  } catch (error) {
    toast.error('Erro ao gerar PDF');
    console.error(error);
    setIsGeneratingPDF(false);
  }
}