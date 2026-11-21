const normalizar = (v) => String(v ?? '').trim().toLowerCase().replace(/\s+/g, ' ');

const itensAtendimento = (atendimento) => [
  ...(atendimento?.itens_queixa || []),
  ...(atendimento?.itens_orcamento || []),
];

// A OS precisa estar finalizada e paga para a encomenda aparecer no controle
export function osFinalizadaEPaga(atendimento) {
  return atendimento?.status === 'concluido' && atendimento?.status_pagamento === 'pago';
}

export function encomendaVisivel(encomenda, atendimento) {
  if (!encomenda?.atendimento_id) return true; // encomenda manual
  if (!atendimento) return true; // OS não encontrada: mantém visível
  return osFinalizadaEPaga(atendimento);
}

// Observações digitadas no item da queixa ou do orçamento + observação da própria encomenda
export function observacoesDaEncomenda(encomenda, atendimento) {
  const textos = [];
  const alvo = normalizar(encomenda?.peca);
  if (alvo && atendimento) {
    const itens = itensAtendimento(atendimento);
    const porDescricao = itens.filter(i => normalizar(i.descricao_peca_encomenda) === alvo);
    const encontrados = porDescricao.length ? porDescricao : itens.filter(i => normalizar(i.nome) === alvo);
    encontrados.forEach(i => {
      if (i.observacao_item) textos.push(i.observacao_item.trim());
    });
  }
  if (encomenda?.observacoes) textos.push(encomenda.observacoes.trim());
  return [...new Set(textos.filter(Boolean))];
}