// Utilitários de retorno de serviço / transferência de produção

export function normalizarTecnicos(lista) {
  return (lista || [])
    .map((t) => (typeof t === 'string' ? { id: t, nome: t } : { id: t?.id || t?.nome, nome: t?.nome }))
    .filter((t) => t.nome);
}

// Técnicos que realizaram o serviço originalmente.
// Prioriza os técnicos gravados no próprio serviço de garantia; se não houver,
// usa os técnicos responsáveis da OS de origem.
export function tecnicosDaGarantia(garantia, origem) {
  const doItem = normalizarTecnicos(garantia?.tecnicos);
  if (doItem.length > 0) return doItem;
  if (!origem) return [];
  const responsaveis = normalizarTecnicos(origem.tecnicos_responsaveis);
  if (responsaveis.length > 0) return responsaveis;
  if (origem.tecnico) {
    return String(origem.tecnico)
      .split(',')
      .map((n) => n.trim())
      .filter(Boolean)
      .map((n) => ({ id: n, nome: n }));
  }
  return [];
}

export function valorGarantia(garantia) {
  return Number(garantia?.valor_total) || 0;
}

// Serviços que deram garantia neste retorno.
// Usa os serviços vinculados na própria OS de retorno; se não houver nenhum,
// considera todos os serviços da OS de origem (retornos criados antes do vínculo).
// A chave segue o padrão da OS de origem: queixa-<índice> / orcamento-<índice>.
export function garantiasDoRetorno(atendimento, origem) {
  const doOrigem = !origem
    ? []
    : [
        ...(origem.itens_queixa || []).map((item, index) => ({ ...item, key: `queixa-${index}` })),
        ...(origem.itens_orcamento || []).map((item, index) => ({ ...item, key: `orcamento-${index}` })),
      ].filter((item) => item.nome);

  const salvas = (atendimento?.servicos_garantia || []).filter((g) => g && g.nome);
  if (salvas.length === 0) return doOrigem;

  // Enriquece os serviços vinculados com a descrição/especificação cadastradas na OS de origem
  return salvas.map((g) => {
    const item = doOrigem.find((i) => i.key === g.key);
    if (!item) return g;
    return {
      ...item,
      ...g,
      tecnicos: normalizarTecnicos(g.tecnicos).length > 0 ? g.tecnicos : item.tecnicos,
    };
  });
}

// Agrupa as transferências existentes por serviço de garantia
export function transferenciasPorServico(transferencias = []) {
  const mapa = {};
  transferencias.forEach((t) => {
    if (!t?.servico_key) return;
    if (!mapa[t.servico_key]) mapa[t.servico_key] = [];
    mapa[t.servico_key].push(t);
  });
  return mapa;
}