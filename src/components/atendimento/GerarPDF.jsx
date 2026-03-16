import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function gerarPDF(atendimento, configs, setIsGeneratingPDF, toast) {
  setIsGeneratingPDF(true);

  try {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error('Permita pop-ups para gerar o PDF');
      setIsGeneratingPDF(false);
      return;
    }

    const hoje = format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
    const defeitosEncontrados = atendimento.checklist?.filter(item => item.status === 'com_defeito') || [];

    // Consolida técnicos de todas as fontes
    const tecnicosMap = new Map();
    (atendimento.tecnicos_responsaveis || []).forEach(t => t?.id && tecnicosMap.set(t.id, t.nome));
    [...(atendimento.itens_queixa || []), ...(atendimento.itens_orcamento || [])].forEach(item => {
      (item.tecnicos || []).forEach(t => t?.id && tecnicosMap.set(t.id, t.nome));
    });
    if (atendimento.tecnico && tecnicosMap.size === 0) tecnicosMap.set('legado', atendimento.tecnico);
    const todosTecnicos = Array.from(tecnicosMap.values());
    const tecnicosLabel = todosTecnicos.length > 0 ? todosTecnicos.join(', ') : (atendimento.tecnico || 'Fraga Auto Portas');

    const produtosNaQueixa = new Set(
      atendimento.itens_queixa?.map(item => item.produto_id) || []
    );
    const itensChecklistFiltrados = (atendimento.itens_orcamento || []).filter(
      item => !produtosNaQueixa.has(item.produto_id)
    );

    printWindow.document.write(`
      <!DOCTYPE html>
      <html lang="pt-BR">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
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
            table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 14px; }
            th, td { padding: 12px; text-align: left; border: 1px solid #e2e8f0; }
            th { background: #f1f5f9; font-weight: 600; color: #1e293b; }
            tbody tr:nth-child(even) { background: #f8fafc; }
            .totals { background: #1e293b; color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
            .total-row { display: flex; justify-content: space-between; margin-bottom: 10px; font-size: 14px; }
            .total-final { border-top: 2px solid rgba(255,255,255,0.2); padding-top: 15px; margin-top: 15px; display: flex; justify-content: space-between; font-size: 20px; font-weight: bold; }
            .total-final .value { color: #fb923c; }
            .signatures { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-top: 40px; }
            .signature { text-align: center; }
            .signature-line { border-top: 1px solid #94a3b8; padding-top: 10px; margin-top: 50px; }
            .signature p { font-size: 14px; font-weight: 600; color: #1e293b; }
            .signature small { font-size: 12px; color: #64748b; }
            .print-button { position: fixed; top: 20px; right: 20px; background: #f97316; color: white; border: none; padding: 12px 24px; border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer; }
            @media print { .print-button { display: none; } body { print-color-adjust: exact; -webkit-print-color-adjust: exact; } }
          </style>
        </head>
        <body>
          <button class="print-button" onclick="window.print()">🖨️ Imprimir / Salvar PDF</button>
          
          <div class="header">
            <div class="header-left">
              <h1>FRAGA AUTO PORTAS</h1>
              <p>Especialista em Manutenção de Portas e Acessórios Automotivos</p>
            </div>
            <div class="header-right">
              <p>📍 Endereço da oficina</p>
              <p>📞 (XX) XXXXX-XXXX</p>
              <p>📧 contato@fragaauto.com.br</p>
            </div>
          </div>

          <div class="title-box"><h2>PRÉ-ORÇAMENTO</h2></div>

          <div class="info-row">
            <span><strong>Data:</strong> ${hoje}</span>
            <span><strong>OS Nº:</strong> ${atendimento.numero_os ? String(atendimento.numero_os).padStart(6, '0') : atendimento.id?.slice(-8).toUpperCase()}</span>
          </div>

          <div class="section">
            <h3>DADOS DO CLIENTE</h3>
            <div class="grid">
              <div class="grid-item"><strong>Nome:</strong>${atendimento.cliente_nome || '-'}</div>
              <div class="grid-item"><strong>Telefone:</strong>${atendimento.cliente_telefone || '-'}</div>
              ${(atendimento.cliente_cpf || atendimento.cliente_cpf_cnpj) ? `<div class="grid-item"><strong>CPF/CNPJ:</strong>${atendimento.cliente_cpf || atendimento.cliente_cpf_cnpj}</div>` : ''}
              ${atendimento.cliente_endereco ? `<div class="grid-item" style="grid-column:span 2"><strong>Endereço:</strong>${atendimento.cliente_endereco}</div>` : ''}
            </div>
          </div>

          <div class="section">
            <h3>DADOS DO VEÍCULO</h3>
            <div class="grid">
              <div class="grid-item"><strong>Placa:</strong>${atendimento.placa}</div>
              <div class="grid-item"><strong>Modelo:</strong>${atendimento.modelo}</div>
              <div class="grid-item"><strong>Marca:</strong>${atendimento.marca || '-'}</div>
              <div class="grid-item"><strong>Ano:</strong>${atendimento.ano || '-'}</div>
              <div class="grid-item"><strong>KM Atual:</strong>${atendimento.km_atual || '-'}</div>
              <div class="grid-item"><strong>Data Entrada:</strong>${atendimento.data_entrada ? format(new Date(atendimento.data_entrada), 'dd/MM/yyyy') : '-'}</div>
            </div>
          </div>

          ${atendimento.queixa_inicial ? `
            <div style="margin-bottom:20px">
              <h3 style="color:#1e293b;font-size:16px;margin-bottom:15px;padding-bottom:10px;border-bottom:2px solid #3b82f6">QUEIXA INICIAL DO CLIENTE</h3>
              <div style="background:#eff6ff;padding:15px;border-radius:8px;border-left:4px solid #3b82f6">
                <p style="color:#1e3a8a;font-size:14px;line-height:1.6;white-space:pre-wrap">${atendimento.queixa_inicial}</p>
              </div>
            </div>
          ` : ''}

          ${atendimento.itens_queixa?.length > 0 ? `
            <div style="margin-bottom:20px">
              <h3 style="color:#1e293b;font-size:16px;margin-bottom:15px;padding-bottom:10px;border-bottom:2px solid #3b82f6">ORÇAMENTO DA QUEIXA INICIAL</h3>
              <table>
                <thead><tr><th>Item</th><th style="text-align:center;width:80px">Qtd</th><th style="text-align:right;width:120px">Valor Unit.</th><th style="text-align:right;width:120px">Total</th><th style="text-align:center;width:110px">Status</th></tr></thead>
                <tbody>
                  ${atendimento.itens_queixa.map(item => {
                    const aprovacao = item.status_aprovacao;
                    const statusStyle = aprovacao === 'aprovado'
                      ? 'background:#dcfce7;color:#166534;border:1px solid #86efac'
                      : aprovacao === 'reprovado'
                        ? 'background:#fef2f2;color:#991b1b;border:1px solid #fca5a5'
                        : 'background:#f1f5f9;color:#64748b;border:1px solid #cbd5e1';
                    const statusLabel = aprovacao === 'aprovado' ? '✓ APROVADO' : aprovacao === 'reprovado' ? '✗ REPROVADO' : '— PENDENTE';
                    return `
                    <tr>
                      <td>${item.nome}
                        ${item.observacao_item ? `<div style="margin-top:6px;padding:8px;background:#eff6ff;border-left:3px solid #3b82f6;border-radius:4px"><strong style="font-size:11px;color:#1e40af">📝 Observações:</strong><p style="font-size:11px;color:#1e3a8a;margin:4px 0 0">${item.observacao_item}</p></div>` : ''}
                        ${item.vantagens ? `<div style="margin-top:6px;padding:8px;background:#f0fdf4;border-left:3px solid #22c55e;border-radius:4px"><strong style="font-size:11px;color:#166534">✓ Benefícios:</strong><p style="font-size:11px;color:#15803d;margin:4px 0 0">${item.vantagens}</p></div>` : ''}
                        ${item.desvantagens ? `<div style="margin-top:6px;padding:8px;background:#fef2f2;border-left:3px solid #f59e0b;border-radius:4px"><strong style="font-size:11px;color:#92400e">⚠️ Riscos:</strong><p style="font-size:11px;color:#78350f;margin:4px 0 0">${item.desvantagens}</p></div>` : ''}
                      </td>
                      <td style="text-align:center">${item.quantidade}</td>
                      <td style="text-align:right">R$ ${Number(item.valor_unitario || 0).toFixed(2)}</td>
                      <td style="text-align:right;font-weight:600">R$ ${Number(item.valor_total || 0).toFixed(2)}</td>
                      <td style="text-align:center"><span style="padding:3px 8px;border-radius:12px;font-size:11px;font-weight:700;${statusStyle}">${statusLabel}</span></td>
                    </tr>`;
                  }).join('')}
                </tbody>
              </table>
              <div style="text-align:right;margin-top:10px;padding:10px;background:#dbeafe;border-radius:6px">
                <strong style="color:#1e40af;font-size:15px">Subtotal da Queixa: R$ ${Number(atendimento.subtotal_queixa || 0).toFixed(2)}</strong>
              </div>
            </div>
          ` : ''}

          ${defeitosEncontrados.length > 0 ? `
            <div style="margin-bottom:20px">
              <h3 style="color:#1e293b;font-size:16px;margin-bottom:15px;padding-bottom:10px;border-bottom:2px solid #f97316">ITENS COM DEFEITO IDENTIFICADOS</h3>
              ${defeitosEncontrados.map(item => `
                <div class="defect-item"><strong>✗ ${item.item}</strong>${item.comentario ? `<span>${item.comentario}</span>` : ''}</div>
              `).join('')}
            </div>
          ` : ''}

          ${atendimento.pre_diagnostico ? `
            <div style="background:#fefce8;border-left:4px solid #eab308;padding:15px;margin-bottom:20px;border-radius:4px">
              <h3 style="color:#1e293b;margin-bottom:10px;font-size:16px">PRÉ-DIAGNÓSTICO</h3>
              <p style="color:#64748b;font-size:14px;line-height:1.6;white-space:pre-wrap">${atendimento.pre_diagnostico}</p>
            </div>
          ` : ''}

          ${itensChecklistFiltrados.length > 0 ? `
            <div style="margin-bottom:20px">
              <h3 style="color:#1e293b;font-size:16px;margin-bottom:15px;padding-bottom:10px;border-bottom:2px solid #f97316">ITENS DO CHECKLIST</h3>
              <table>
                <thead><tr><th>Item</th><th style="text-align:center;width:80px">Qtd</th><th style="text-align:right;width:120px">Valor Unit.</th><th style="text-align:right;width:120px">Total</th><th style="text-align:center;width:110px">Status</th></tr></thead>
                <tbody>
                  ${itensChecklistFiltrados.map(item => {
                    const aprovacao = item.status_aprovacao;
                    const statusStyle = aprovacao === 'aprovado'
                      ? 'background:#dcfce7;color:#166534;border:1px solid #86efac'
                      : aprovacao === 'reprovado'
                        ? 'background:#fef2f2;color:#991b1b;border:1px solid #fca5a5'
                        : 'background:#f1f5f9;color:#64748b;border:1px solid #cbd5e1';
                    const statusLabel = aprovacao === 'aprovado' ? '✓ APROVADO' : aprovacao === 'reprovado' ? '✗ REPROVADO' : '— PENDENTE';
                    return `
                    <tr>
                      <td>${item.nome}
                        ${item.observacao_item ? `<div style="margin-top:6px;padding:8px;background:#eff6ff;border-left:3px solid #3b82f6;border-radius:4px"><strong style="font-size:11px;color:#1e40af">📝 Observações:</strong><p style="font-size:11px;color:#1e3a8a;margin:4px 0 0">${item.observacao_item}</p></div>` : ''}
                        ${item.vantagens ? `<div style="margin-top:6px;padding:8px;background:#f0fdf4;border-left:3px solid #22c55e;border-radius:4px"><strong style="font-size:11px;color:#166534">✓ Benefícios:</strong><p style="font-size:11px;color:#15803d;margin:4px 0 0">${item.vantagens}</p></div>` : ''}
                        ${item.desvantagens ? `<div style="margin-top:6px;padding:8px;background:#fef2f2;border-left:3px solid #f59e0b;border-radius:4px"><strong style="font-size:11px;color:#92400e">⚠️ Riscos:</strong><p style="font-size:11px;color:#78350f;margin:4px 0 0">${item.desvantagens}</p></div>` : ''}
                      </td>
                      <td style="text-align:center">${item.quantidade}</td>
                      <td style="text-align:right">R$ ${Number(item.valor_unitario || 0).toFixed(2)}</td>
                      <td style="text-align:right;font-weight:600">R$ ${Number(item.valor_total || 0).toFixed(2)}</td>
                      <td style="text-align:center"><span style="padding:3px 8px;border-radius:12px;font-size:11px;font-weight:700;${statusStyle}">${statusLabel}</span></td>
                    </tr>`;
                  }).join('')}
                </tbody>
              </table>
              <div style="text-align:right;margin-top:10px;padding:10px;background:#fed7aa;border-radius:6px">
                <strong style="color:#92400e;font-size:15px">Subtotal do Checklist: R$ ${Number(atendimento.subtotal_checklist || 0).toFixed(2)}</strong>
              </div>
            </div>
          ` : ''}

          <div class="totals">
            <div class="total-row"><span>Subtotal:</span><span>R$ ${Number(atendimento.subtotal || 0).toFixed(2)}</span></div>
            ${atendimento.desconto > 0 ? `<div class="total-row" style="color:#86efac"><span>Desconto:</span><span>- R$ ${Number(atendimento.desconto).toFixed(2)}</span></div>` : ''}
            <div class="total-final"><span>VALOR TOTAL:</span><span class="value">R$ ${Number(atendimento.valor_final || 0).toFixed(2)}</span></div>
          </div>

          ${atendimento.observacoes ? `<div style="background:#f8fafc;border-radius:8px;padding:15px;margin-bottom:20px"><h3 style="color:#1e293b;margin-bottom:10px;font-size:16px">OBSERVAÇÕES</h3><p style="color:#64748b;font-size:14px;line-height:1.6;white-space:pre-wrap">${atendimento.observacoes}</p></div>` : ''}

          <div style="border-top:2px solid #e2e8f0;padding-top:20px;margin-top:30px">
            <p style="text-align:center;color:#64748b;font-size:12px;margin-bottom:30px">Este é um pré-orçamento e os valores podem sofrer alterações após diagnóstico completo.</p>
            ${atendimento.assinatura_cliente_queixa || atendimento.assinatura_cliente_checklist ? `
              <div style="margin-top:30px">
                <h3 style="color:#1e293b;font-size:16px;margin-bottom:20px">Assinaturas do Cliente</h3>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:30px">
                  ${atendimento.assinatura_cliente_queixa ? `<div><p style="font-size:14px;font-weight:600;color:#1e293b;margin-bottom:10px">Aprovação da Queixa</p><img src="${atendimento.assinatura_cliente_queixa}" alt="Assinatura Queixa" style="border:1px solid #e2e8f0;border-radius:8px;max-width:100%;height:auto" /></div>` : ''}
                  ${atendimento.assinatura_cliente_checklist ? `<div><p style="font-size:14px;font-weight:600;color:#1e293b;margin-bottom:10px">Aprovação do Checklist</p><img src="${atendimento.assinatura_cliente_checklist}" alt="Assinatura Checklist" style="border:1px solid #e2e8f0;border-radius:8px;max-width:100%;height:auto" /></div>` : ''}
                </div>
              </div>
            ` : ''}
            <div class="signatures">
              <div class="signature"><div class="signature-line"><p>Técnico Responsável</p><small>${atendimento.tecnico || 'Fraga Auto Portas'}</small></div></div>
              <div class="signature"><div class="signature-line"><p>Cliente</p><small>${atendimento.cliente_nome || ''}</small></div></div>
            </div>
            <p style="text-align:center;color:#94a3b8;font-size:11px;margin-top:20px">Orçamento válido por 7 dias • Fraga Auto Portas © ${new Date().getFullYear()}</p>
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