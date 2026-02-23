/**
 * Calcula os subtotais do atendimento, evitando dupla contagem entre queixa e checklist.
 * Itens do checklist (itens_orcamento) que já estão na queixa (itens_queixa) são filtrados.
 */
export function calcularSubtotais(itensQueixa = [], itensOrcamento = [], desconto = 0) {
  const idsNaQueixa = new Set(itensQueixa.map(i => i.produto_id).filter(Boolean));

  const subtotal_queixa = itensQueixa.reduce((acc, item) => acc + (Number(item.valor_total) || 0), 0);
  const subtotal_checklist = itensOrcamento
    .filter(item => !idsNaQueixa.has(item.produto_id))
    .reduce((acc, item) => acc + (Number(item.valor_total) || 0), 0);

  const subtotal = subtotal_queixa + subtotal_checklist;
  const valor_final = subtotal - (Number(desconto) || 0);

  return { subtotal_queixa, subtotal_checklist, subtotal, valor_final };
}