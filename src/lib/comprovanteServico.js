export const FORMA_LABEL = {
  dinheiro: 'Dinheiro',
  pix: 'PIX',
  cartao_credito: 'Cartão de Crédito',
  cartao_debito: 'Cartão de Débito',
  transferencia: 'Transferência',
  boleto: 'Boleto',
  faturado: 'Faturado',
};

export function fmtData(val) {
  if (!val) return '-';
  return new Date(val).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function fmtMoeda(val) {
  return `R$ ${Number(val || 0).toFixed(2)}`;
}

const limpo = (v) => String(v ?? '').trim();

const esc = (v) =>
  String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

/** Consolida tudo o que o comprovante precisa exibir (tela, impressão e WhatsApp). */
export function montarDadosComprovante(atendimento, config, descricoesPorProduto = {}) {
  const todosItens = [...(atendimento.itens_queixa || []), ...(atendimento.itens_orcamento || [])];
  const aprovados = todosItens.filter((i) => i.status_aprovacao === 'aprovado');
  // Sem nenhum item aprovado (ex: venda direta), considera todos os itens cobrados não reprovados
  const cobrados = aprovados.length > 0
    ? aprovados
    : todosItens.filter((i) => i.status_aprovacao !== 'reprovado' && Number(i.valor_total || 0) > 0);

  const vistos = new Set();
  const itens = [];
  cobrados.forEach((item) => {
    if (item.produto_id) {
      if (vistos.has(item.produto_id)) return;
      vistos.add(item.produto_id);
    }
    const quantidade = Number(item.quantidade || 1);
    const valorUnitario = Number(item.valor_unitario || 0);
    const valorTotal = Number(item.valor_total ?? quantidade * valorUnitario);
    const descricaoProduto = limpo(descricoesPorProduto[item.produto_id]);
    const descricao = limpo(item.descricao_peca_encomenda) || descricaoProduto;
    const observacao = limpo(item.observacao_item);

    itens.push({
      nome: limpo(item.nome) || 'Item',
      quantidade,
      valorUnitario,
      valorTotal,
      variacao: limpo(item.variacao_nome),
      descricao: descricao && descricao.toLowerCase() !== limpo(item.nome).toLowerCase() ? descricao : '',
      observacao: observacao && observacao !== descricao ? observacao : '',
      obsCliente: limpo(item.observacao_cliente),
      tecnicos: (item.tecnicos || []).map((t) => t.nome).filter(Boolean).join(', '),
    });
  });

  const tecnicosMap = new Map();
  (atendimento.tecnicos_responsaveis || []).forEach((t) => t?.id && tecnicosMap.set(t.id, t.nome));
  [...(atendimento.itens_queixa || []), ...(atendimento.itens_orcamento || [])].forEach((item) => {
    (item.tecnicos || []).forEach((t) => t?.id && tecnicosMap.set(t.id, t.nome));
  });
  if (atendimento.tecnico && tecnicosMap.size === 0) tecnicosMap.set('legado', atendimento.tecnico);
  const tecnicos = Array.from(tecnicosMap.values()).filter(Boolean);

  const dataServico = atendimento.data_pagamento || atendimento.data_entrada || atendimento.created_date;
  const marcaModelo = [atendimento.marca, atendimento.modelo].filter(Boolean).join(' ');
  const veiculo = `${marcaModelo || '-'}${atendimento.ano ? ` (${atendimento.ano})` : ''}`;

  const valorFinal = Number(atendimento.valor_final_pago ?? atendimento.valor_final ?? 0);
  const brutoItens = itens.reduce((acc, i) => acc + i.quantidade * i.valorUnitario, 0);
  const totalItens = itens.reduce((acc, i) => acc + i.valorTotal, 0);
  const descontoItens = Math.max(0, brutoItens - totalItens);
  const desconto = Number(atendimento.desconto_pagamento ?? atendimento.desconto ?? 0) + descontoItens;
  const formas = (atendimento.formas_pagamento_lancamento || []).map((f) => ({
    label: FORMA_LABEL[f.forma] || f.forma,
    valor: Number(f.valor || 0),
  }));
  const formaUnica = atendimento.forma_pagamento_lancamento
    ? FORMA_LABEL[atendimento.forma_pagamento_lancamento] || atendimento.forma_pagamento_lancamento
    : '';

  return {
    nomeEmpresa: config?.nome_empresa || 'FRAGA AUTO',
    logoUrl: config?.logo_url || '',
    cnpj: limpo(config?.cnpj),
    endereco: limpo(config?.endereco),
    telefone: limpo(config?.telefone),
    whatsapp: limpo(config?.whatsapp_atendimento),
    instagram: limpo(config?.instagram),
    site: limpo(config?.site),
    osNum: atendimento.numero_os ? `OS #${String(atendimento.numero_os).padStart(6, '0')}` : '',
    data: fmtData(dataServico),
    clienteNome: limpo(atendimento.cliente_nome) || '-',
    clienteTelefone: limpo(atendimento.cliente_telefone),
    clienteCpf: limpo(atendimento.cliente_cpf),
    placa: limpo(atendimento.placa) || '-',
    veiculo,
    km: limpo(atendimento.km_atual),
    itens,
    brutoItens,
    subtotalItens: totalItens,
    desconto,
    valorFinal,
    formas,
    formaUnica,
    tecnicos,
    obsCliente: limpo(atendimento.obs_externa),
    obsInterna: limpo(atendimento.obs_interna),
  };
}

const linhaDivisoria = '━━━━━━━━━━━━━━━━━━━━━━';

/** Texto formatado igual ao orçamento enviado por WhatsApp. */
export function gerarTextoComprovanteWhatsApp(d) {
  const linhas = [];
  linhas.push(`🧾 *COMPROVANTE DE SERVIÇO*`);
  linhas.push(`*${d.nomeEmpresa}*`);
  if (d.cnpj) linhas.push(`CNPJ: ${d.cnpj}`);
  if (d.endereco) linhas.push(`📍 ${d.endereco}`);
  if (d.telefone) linhas.push(`📞 Tel: ${d.telefone}`);
  linhas.push('');
  linhas.push(linhaDivisoria);

  if (d.osNum) linhas.push(`📋 *${d.osNum}*`);
  linhas.push(`📅 *Data:* ${d.data}`);
  linhas.push('');
  linhas.push(`👤 *CLIENTE*`);
  linhas.push(`Nome: *${d.clienteNome}*`);
  if (d.clienteTelefone) linhas.push(`Telefone: ${d.clienteTelefone}`);
  if (d.clienteCpf) linhas.push(`CPF/CNPJ: ${d.clienteCpf}`);
  linhas.push('');
  linhas.push(`🚗 *VEÍCULO*`);
  linhas.push(`Placa: *${d.placa}*`);
  linhas.push(`Modelo: *${d.veiculo}*`);
  if (d.km) linhas.push(`KM: ${d.km}`);

  if (d.itens.length > 0) {
    linhas.push('');
    linhas.push(linhaDivisoria);
    linhas.push(`🔧 *SERVIÇOS REALIZADOS*`);
    linhas.push('');
    d.itens.forEach((item) => {
      linhas.push(
        `✅ *${item.nome}*${item.variacao ? ` (${item.variacao})` : ''} — ${item.quantidade}x ${fmtMoeda(item.valorUnitario)} = *${fmtMoeda(item.valorTotal)}*`
      );
      if (item.descricao) linhas.push(`   _📝 ${item.descricao}_`);
      if (item.observacao) linhas.push(`   _📝 ${item.observacao}_`);
      if (item.obsCliente) linhas.push(`   _👤 Obs. cliente: ${item.obsCliente}_`);
      if (item.tecnicos) linhas.push(`   🔧 Téc: ${item.tecnicos}`);
    });
  }

  linhas.push('');
  linhas.push(linhaDivisoria);
  if (d.desconto > 0) {
    linhas.push(`💰 Subtotal: ${fmtMoeda(d.brutoItens)}`);
    linhas.push(`🎁 Desconto: - ${fmtMoeda(d.desconto)}`);
  }
  linhas.push(`💵 *TOTAL: ${fmtMoeda(d.valorFinal)}*`);

  if (d.formas.length > 0) {
    linhas.push('');
    linhas.push(`💳 *PAGAMENTO*`);
    d.formas.forEach((f) => linhas.push(`• ${f.label}: ${fmtMoeda(f.valor)}`));
  } else if (d.formaUnica) {
    linhas.push('');
    linhas.push(`💳 *Pagamento:* ${d.formaUnica}`);
  }

  if (d.tecnicos.length > 0) {
    linhas.push('');
    linhas.push(`🔧 *Técnico(s):* ${d.tecnicos.join(', ')}`);
  }

  if (d.obsCliente) {
    linhas.push('');
    linhas.push(`📝 *Observações:*`);
    linhas.push(d.obsCliente);
  }
  if (d.obsInterna) {
    linhas.push('');
    linhas.push(`🔧 *Obs. Técnica:*`);
    linhas.push(d.obsInterna);
  }

  if (d.whatsapp || d.instagram || d.site) {
    linhas.push('');
    linhas.push(linhaDivisoria);
    linhas.push(`📍 *${d.nomeEmpresa}*`);
    if (d.whatsapp) linhas.push(`📱 WhatsApp: ${d.whatsapp}`);
    if (d.instagram) linhas.push(`📸 Instagram: ${d.instagram}`);
    if (d.site) linhas.push(`🌐 ${d.site}`);
  }

  linhas.push('');
  linhas.push('✅ Obrigado pela preferência!');
  return linhas.join('\n');
}

/** Documento de impressão: alto contraste, preto puro, hierarquia clara. */
export function gerarHtmlComprovante(d) {
  const itensHtml = d.itens.length
    ? `<table class="itens">
        <thead>
          <tr>
            <th class="col-desc">Descrição do serviço / produto</th>
            <th class="col-qtd">Qtd</th>
            <th class="col-val">Valor</th>
          </tr>
        </thead>
        <tbody>
          ${d.itens
            .map(
              (item) => `<tr>
                <td class="col-desc">
                  <div class="item-nome">${esc(item.nome)}${item.variacao ? ` — ${esc(item.variacao)}` : ''}</div>
                  ${item.descricao ? `<div class="item-desc">${esc(item.descricao)}</div>` : ''}
                  ${item.observacao ? `<div class="item-desc">Obs.: ${esc(item.observacao)}</div>` : ''}
                  ${item.obsCliente ? `<div class="item-desc">Obs. cliente: ${esc(item.obsCliente)}</div>` : ''}
                  ${item.tecnicos ? `<div class="item-tec">Técnico: ${esc(item.tecnicos)}</div>` : ''}
                </td>
                <td class="col-qtd">${item.quantidade}x</td>
                <td class="col-val">
                  <div class="item-total">${fmtMoeda(item.valorTotal)}</div>
                  <div class="item-unit">${fmtMoeda(item.valorUnitario)} un.</div>
                </td>
              </tr>`
            )
            .join('')}
        </tbody>
      </table>`
    : '';

  const descontoHtml =
    d.desconto > 0
      ? `<tr><td>Subtotal</td><td class="r">${fmtMoeda(d.brutoItens)}</td></tr>
         <tr><td>Desconto</td><td class="r">- ${fmtMoeda(d.desconto)}</td></tr>`
      : '';

  const pagamentoHtml =
    d.formas.length > 0
      ? `<div class="bloco">
           <div class="rotulo">Forma de pagamento</div>
           ${d.formas
             .map((f) => `<div class="linha"><span>${esc(f.label)}</span><span>${fmtMoeda(f.valor)}</span></div>`)
             .join('')}
         </div>`
      : d.formaUnica
        ? `<div class="bloco">
             <div class="rotulo">Forma de pagamento</div>
             <div class="linha"><span>${esc(d.formaUnica)}</span><span>${fmtMoeda(d.valorFinal)}</span></div>
           </div>`
        : '';

  const tecnicosHtml = d.tecnicos.length
    ? `<div class="bloco"><div class="rotulo">Técnico(s) responsável(is)</div><div>${esc(d.tecnicos.join(', '))}</div></div>`
    : '';

  const obsHtml =
    d.obsCliente || d.obsInterna
      ? `<div class="bloco">
           ${d.obsCliente ? `<div class="rotulo">Observações / Garantia</div><div class="texto">${esc(d.obsCliente)}</div>` : ''}
           ${d.obsInterna ? `<div class="rotulo" style="margin-top:6px">Observação técnica</div><div class="texto">${esc(d.obsInterna)}</div>` : ''}
         </div>`
      : '';

  return `<!DOCTYPE html>
  <html lang="pt-BR"><head><meta charset="utf-8" />
  <title>Comprovante ${esc(d.osNum)}</title>
  <style>
    @page { size: A4; margin: 14mm; }
    * { -webkit-print-color-adjust: exact; print-color-adjust: exact; box-sizing: border-box; }
    body { font-family: Arial, Helvetica, "Segoe UI", sans-serif; color: #000; background: #fff; margin: 0; font-size: 13px; line-height: 1.45; }
    .doc { max-width: 720px; margin: 0 auto; }
    .topo { display: table; width: 100%; }
    .topo-logo, .topo-info { display: table-cell; vertical-align: middle; }
    .topo-logo { width: 130px; }
    .topo-logo img { max-height: 70px; max-width: 120px; object-fit: contain; }
    .empresa { font-size: 18px; font-weight: bold; text-transform: uppercase; letter-spacing: .5px; }
    .empresa-info { font-size: 11.5px; color: #222; margin-top: 1px; }
    .titulo { text-align: center; font-size: 13px; font-weight: bold; letter-spacing: 2px; text-transform: uppercase; margin: 14px 0 10px; padding: 6px 0; border-top: 2px solid #000; border-bottom: 1px solid #000; }
    .boxes { display: table; width: 100%; border-spacing: 0; margin-bottom: 12px; }
    .box { display: table-cell; width: 50%; border: 1px solid #999; padding: 8px 10px; vertical-align: top; }
    .box + .box { border-left: 0; }
    .box-rotulo { font-size: 10px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; color: #444; margin-bottom: 3px; }
    .box-linha { font-size: 12.5px; }
    .box-linha b { font-weight: bold; }
    table.itens { width: 100%; border-collapse: collapse; margin-top: 4px; }
    table.itens th { text-align: left; font-size: 10.5px; text-transform: uppercase; letter-spacing: .8px; color: #333; border-bottom: 1.5px solid #000; padding: 5px 4px; }
    table.itens td { border-bottom: 1px solid #d4d4d4; padding: 7px 4px; vertical-align: top; font-size: 12.5px; }
    .col-desc { width: 68%; }
    .col-qtd { width: 10%; text-align: center; white-space: nowrap; }
    .col-val { width: 22%; text-align: right; white-space: nowrap; }
    .item-nome { font-weight: bold; font-size: 13px; }
    .item-desc { font-size: 11.5px; color: #222; margin-top: 2px; line-height: 1.35; }
    .item-tec { font-size: 11px; color: #444; margin-top: 2px; }
    .item-total { font-weight: bold; }
    .item-unit { font-size: 10.5px; color: #555; }
    .totais { width: 100%; border-collapse: collapse; margin-top: 10px; }
    .totais td { padding: 3px 0; font-size: 13px; }
    .totais .r { text-align: right; }
    .totais tr.total td { font-size: 16px; font-weight: bold; border-top: 2px solid #000; padding-top: 7px; }
    .bloco { margin-top: 12px; padding-top: 8px; border-top: 1px solid #d4d4d4; }
    .rotulo { font-size: 10px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; color: #333; }
    .texto { font-size: 12.5px; margin-top: 2px; }
    .linha { display: flex; justify-content: space-between; font-size: 12.5px; }
    .assinaturas { display: table; width: 100%; margin-top: 34px; }
    .ass { display: table-cell; width: 50%; padding: 0 18px; text-align: center; }
    .ass-linha { border-top: 1px solid #000; padding-top: 4px; font-size: 11px; color: #333; }
    .rodape { margin-top: 22px; padding-top: 8px; border-top: 1px solid #d4d4d4; text-align: center; font-size: 11px; color: #444; }
  </style></head>
  <body><div class="doc">
    <div class="topo">
      <div class="topo-logo">${d.logoUrl ? `<img src="${esc(d.logoUrl)}" alt="Logo" />` : ''}</div>
      <div class="topo-info">
        <div class="empresa">${esc(d.nomeEmpresa)}</div>
        ${d.cnpj ? `<div class="empresa-info">CNPJ: ${esc(d.cnpj)}</div>` : ''}
        ${d.endereco ? `<div class="empresa-info">${esc(d.endereco)}</div>` : ''}
        ${d.telefone ? `<div class="empresa-info">Tel: ${esc(d.telefone)}</div>` : ''}
      </div>
    </div>

    <div class="titulo">Comprovante de Serviço</div>

    <div class="boxes">
      <div class="box">
        <div class="box-rotulo">Cliente</div>
        <div class="box-linha">Nome: <b>${esc(d.clienteNome)}</b></div>
        ${d.clienteTelefone ? `<div class="box-linha">Telefone: ${esc(d.clienteTelefone)}</div>` : ''}
        ${d.clienteCpf ? `<div class="box-linha">CPF/CNPJ: ${esc(d.clienteCpf)}</div>` : ''}
      </div>
      <div class="box">
        <div class="box-rotulo">Veículo</div>
        <div class="box-linha">Placa: <b>${esc(d.placa)}</b></div>
        <div class="box-linha">Modelo: ${esc(d.veiculo)}</div>
        ${d.km ? `<div class="box-linha">KM: ${esc(d.km)}</div>` : ''}
      </div>
    </div>

    <div class="linha" style="font-size:12.5px">
      <span><b>${esc(d.osNum || 'Ordem de serviço')}</b></span>
      <span><b>Data:</b> ${esc(d.data)}</span>
    </div>

    ${itensHtml}

    <table class="totais">
      ${descontoHtml}
      <tr class="total"><td>TOTAL</td><td class="r">${fmtMoeda(d.valorFinal)}</td></tr>
    </table>

    ${pagamentoHtml}
    ${tecnicosHtml}
    ${obsHtml}

    <div class="assinaturas">
      <div class="ass"><div class="ass-linha">Assinatura do Cliente</div></div>
      <div class="ass"><div class="ass-linha">Responsável pela Empresa</div></div>
    </div>

    <div class="rodape">Obrigado pela preferência!${d.telefone ? ` · Tel: ${esc(d.telefone)}` : ''}</div>
  </div>
  </body></html>`;
}