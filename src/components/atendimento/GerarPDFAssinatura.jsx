import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

/**
 * Gera um PDF (via janela de impressão) do documento de atendimento assinado pelo cliente.
 * Espelha o conteúdo da página pública AssinarAtendimento, incluindo a assinatura digital do cliente.
 */
export function gerarPDFAssinatura(atendimento, configs, setIsGenerating, toast) {
  if (!atendimento?.assinatura_cliente_atendimento) {
    toast.error('Este atendimento ainda não foi assinado pelo cliente');
    return;
  }

  setIsGenerating(true);

  try {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error('Permita pop-ups para gerar o PDF');
      setIsGenerating(false);
      return;
    }

    const fmtDataHora = (iso) => {
      if (!iso) return '-';
      try { return format(new Date(iso), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }); }
      catch { return '-'; }
    };
    const fmtData = (iso) => {
      if (!iso) return '-';
      try { return format(new Date(iso), 'dd/MM/yyyy', { locale: ptBR }); }
      catch { return '-'; }
    };

    const fotos = atendimento.fotos || [];
    const itensQueixa = atendimento.itens_queixa || [];
    const itensOrcamento = atendimento.itens_orcamento || [];

    const secaoItens = (itens, titulo, cor) => {
      if (!itens.length) return '';
      return `
        <div style="margin-bottom:20px">
          <h3 style="color:#1e293b;font-size:16px;margin-bottom:15px;padding-bottom:10px;border-bottom:2px solid ${cor}">${titulo}</h3>
          <table>
            <thead><tr><th>Item</th><th style="text-align:center;width:80px">Qtd</th><th style="text-align:right;width:120px">Valor Unit.</th><th style="text-align:right;width:120px">Total</th></tr></thead>
            <tbody>
              ${itens.map(item => `
                <tr>
                  <td>${item.nome || '-'}
                    ${item.observacao_item ? `<div style="margin-top:6px;padding:8px;background:#eff6ff;border-left:3px solid #3b82f6;border-radius:4px"><p style="font-size:11px;color:#1e3a8a;margin:0">${item.observacao_item}</p></div>` : ''}
                  </td>
                  <td style="text-align:center">${item.quantidade || 0}</td>
                  <td style="text-align:right">R$ ${Number(item.valor_unitario || 0).toFixed(2)}</td>
                  <td style="text-align:right;font-weight:600">R$ ${Number(item.valor_total || 0).toFixed(2)}</td>
                </tr>`).join('')}
            </tbody>
          </table>
        </div>`;
    };

    printWindow.document.write(`
      <!DOCTYPE html>
      <html lang="pt-BR">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Atendimento Assinado - OS ${atendimento.numero_os || ''}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: Arial, sans-serif; padding: 30px; max-width: 800px; margin: 0 auto; background: white; }
            .header { border-bottom: 4px solid #f97316; padding-bottom: 20px; margin-bottom: 25px; display: flex; justify-content: space-between; align-items: start; }
            .header-left h1 { font-size: 26px; color: #1e293b; margin-bottom: 5px; }
            .header-left p { color: #64748b; font-size: 13px; }
            .header-right { text-align: right; font-size: 12px; color: #64748b; }
            .title-box { background: #16a34a; color: white; text-align: center; padding: 14px; border-radius: 8px; margin-bottom: 20px; }
            .title-box h2 { font-size: 18px; }
            .title-box small { font-size: 12px; opacity: 0.9; }
            .info-row { display: flex; justify-content: space-between; margin-bottom: 20px; font-size: 14px; }
            .section { background: #f8fafc; border-radius: 8px; padding: 18px; margin-bottom: 18px; }
            .section h3 { font-size: 15px; color: #1e293b; margin-bottom: 12px; padding-bottom: 8px; border-bottom: 2px solid #e2e8f0; }
            .grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; font-size: 13px; }
            .grid-item strong { color: #1e293b; display: block; margin-bottom: 3px; font-size: 11px; text-transform: uppercase; color: #64748b; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 13px; }
            th, td { padding: 10px; text-align: left; border: 1px solid #e2e8f0; vertical-align: top; }
            th { background: #f1f5f9; font-weight: 600; color: #1e293b; }
            tbody tr:nth-child(even) { background: #f8fafc; }
            .totals { background: #1e293b; color: white; padding: 18px; border-radius: 8px; margin-bottom: 20px; }
            .total-row { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 14px; }
            .total-final { border-top: 2px solid rgba(255,255,255,0.2); padding-top: 12px; margin-top: 12px; display: flex; justify-content: space-between; font-size: 19px; font-weight: bold; }
            .total-final .value { color: #fb923c; }
            .assinatura-box { border: 2px solid #16a34a; border-radius: 10px; padding: 20px; margin-top: 25px; background: #f0fdf4; page-break-inside: avoid; }
            .assinatura-box h3 { color: #166534; font-size: 16px; margin-bottom: 12px; }
            .assinatura-img { max-width: 100%; max-height: 180px; display: block; margin: 0 auto; background: white; border-radius: 6px; }
            .print-button { position: fixed; top: 20px; right: 20px; background: #f97316; color: white; border: none; padding: 12px 24px; border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer; }
            @media print { .print-button { display: none; } body { print-color-adjust: exact; -webkit-print-color-adjust: exact; } }
          </style>
        </head>
        <body>
          <button class="print-button" onclick="window.print()">🖨️ Imprimir / Salvar PDF</button>

          <div class="header">
            <div class="header-left">
              ${configs?.logo_url ? `<img src="${configs.logo_url}" alt="Logo" style="max-height:70px;max-width:220px;object-fit:contain;margin-bottom:8px" />` : ''}
              <h1>${configs?.nome_empresa || 'FRAGA AUTO PORTAS'}</h1>
              <p>Confirmação de Atendimento Assinado pelo Cliente</p>
            </div>
            <div class="header-right">
              ${configs?.endereco ? `<p>📍 ${configs.endereco}</p>` : ''}
              ${configs?.telefone ? `<p>📞 ${configs.telefone}</p>` : ''}
              ${configs?.email ? `<p>📧 ${configs.email}</p>` : ''}
            </div>
          </div>

          <div class="title-box">
            <h2>DOCUMENTO ASSINADO PELO CLIENTE</h2>
            <small>Assinado digitalmente em ${fmtDataHora(atendimento.data_assinatura_atendimento)}</small>
          </div>

          <div class="info-row">
            <span><strong>OS Nº:</strong> ${atendimento.numero_os ? String(atendimento.numero_os).padStart(6, '0') : '-'}</span>
            <span><strong>Entrada:</strong> ${fmtData(atendimento.data_entrada)}</span>
          </div>

          <div class="section">
            <h3>DADOS DO CLIENTE</h3>
            <div class="grid">
              <div class="grid-item"><strong>Nome</strong>${atendimento.cliente_nome || '-'}</div>
              <div class="grid-item"><strong>Telefone</strong>${atendimento.cliente_telefone || '-'}</div>
              <div class="grid-item"><strong>CPF/CNPJ</strong>${atendimento.cliente_cpf || '-'}</div>
            </div>
          </div>

          <div class="section">
            <h3>DADOS DO VEÍCULO</h3>
            <div class="grid">
              <div class="grid-item"><strong>Placa</strong>${(atendimento.placa || '-').toUpperCase()}</div>
              <div class="grid-item"><strong>Modelo</strong>${atendimento.modelo || '-'}</div>
              <div class="grid-item"><strong>Marca</strong>${atendimento.marca || '-'}</div>
              <div class="grid-item"><strong>Ano</strong>${atendimento.ano || '-'}</div>
              <div class="grid-item"><strong>KM Atual</strong>${atendimento.km_atual || '-'}</div>
              <div class="grid-item"><strong>Observações</strong>${atendimento.observacoes_veiculo || '-'}</div>
            </div>
          </div>

          ${atendimento.queixa_inicial ? `
            <div style="margin-bottom:18px">
              <h3 style="color:#1e293b;font-size:15px;margin-bottom:12px;padding-bottom:8px;border-bottom:2px solid #3b82f6">QUEIXA INICIAL DO CLIENTE</h3>
              <div style="background:#eff6ff;padding:14px;border-radius:8px;border-left:4px solid #3b82f6">
                <p style="color:#1e3a8a;font-size:13px;line-height:1.6;white-space:pre-wrap">${atendimento.queixa_inicial}</p>
              </div>
            </div>
          ` : ''}

          ${secaoItens(itensQueixa, 'ITENS DA QUEIXA INICIAL', '#3b82f6')}
          ${secaoItens(itensOrcamento, 'ITENS DO ORÇAMENTO', '#f97316')}

          <div class="totals">
            <div class="total-row"><span>Subtotal:</span><span>R$ ${Number(atendimento.subtotal || 0).toFixed(2)}</span></div>
            ${atendimento.desconto > 0 ? `<div class="total-row" style="color:#86efac"><span>Desconto:</span><span>- R$ ${Number(atendimento.desconto).toFixed(2)}</span></div>` : ''}
            <div class="total-final"><span>VALOR TOTAL:</span><span class="value">R$ ${Number(atendimento.valor_final || 0).toFixed(2)}</span></div>
          </div>

          ${atendimento.observacoes ? `
            <div class="section">
              <h3>OBSERVAÇÕES</h3>
              <p style="color:#475569;font-size:13px;line-height:1.6;white-space:pre-wrap">${atendimento.observacoes}</p>
            </div>
          ` : ''}

          ${fotos.length > 0 ? `
            <div style="margin-bottom:20px;page-break-inside:avoid">
              <h3 style="color:#1e293b;font-size:15px;margin-bottom:12px;padding-bottom:8px;border-bottom:2px solid #3b82f6">FOTOS DO ATENDIMENTO (${fotos.length})</h3>
              <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:10px">
                ${fotos.map((foto, idx) => `
                  <div style="border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;page-break-inside:avoid">
                    <img src="${foto.url}" alt="${foto.descricao || 'Foto ' + (idx + 1)}" style="width:100%;height:180px;object-fit:cover;display:block" />
                    <div style="padding:7px 9px;background:#f8fafc">
                      <p style="font-size:11px;color:#475569;font-weight:600;margin:0">${foto.descricao || 'Foto ' + (idx + 1)}</p>
                      ${foto.usuario ? `<p style="font-size:10px;color:#94a3b8;margin:2px 0 0">Por: ${foto.usuario}</p>` : ''}
                      ${foto.data_upload ? `<p style="font-size:10px;color:#94a3b8;margin:1px 0 0">📅 ${format(new Date(foto.data_upload), 'dd/MM/yyyy HH:mm', { locale: ptBR })}</p>` : ''}
                    </div>
                  </div>`).join('')}
              </div>
            </div>
          ` : ''}

          <div class="assinatura-box">
            <h3>✍️ ASSINATURA DIGITAL DO CLIENTE</h3>
            <p style="font-size:13px;color:#166534;margin-bottom:12px">
              <strong>Cliente:</strong> ${atendimento.cliente_nome || '-'} &nbsp;|&nbsp;
              <strong>Data da Assinatura:</strong> ${fmtDataHora(atendimento.data_assinatura_atendimento)}
            </p>
            <img src="${atendimento.assinatura_cliente_atendimento}" alt="Assinatura do cliente" class="assinatura-img" />
            <p style="text-align:center;font-size:11px;color:#64748b;margin-top:12px;border-top:1px solid #bbf7d0;padding-top:8px">
              Documento confirmado e assinado digitalmente pelo cliente via link público.
            </p>
          </div>

          <p style="text-align:center;color:#94a3b8;font-size:11px;margin-top:20px">
            ${configs?.nome_empresa || 'Fraga Auto Portas'} © ${new Date().getFullYear()}
          </p>
        </body>
      </html>
    `);

    printWindow.document.close();
    setTimeout(() => {
      setIsGenerating(false);
      toast.success('PDF assinado aberto! Clique no botão para imprimir/salvar');
    }, 500);
  } catch (error) {
    console.error(error);
    toast.error('Erro ao gerar PDF assinado');
    setIsGenerating(false);
  }
}