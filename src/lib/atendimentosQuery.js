export const ATENDIMENTOS_POR_PAGINA = 20;
export const ATENDIMENTOS_LIST_FIELDS = [
  'numero_os', 'venda_direta', 'cliente_nome', 'cliente_telefone',
  'placa', 'modelo', 'marca', 'ano', 'data_entrada', 'created_date',
  'status', 'status_pagamento', 'valor_final', 'valor_final_pago',
  'data_pagamento', 'unidade_id', 'tecnicos_responsaveis', 'tecnico',
];
const UNIDADE_LEGADA = '69ea76b72f920804f5d68eab';
const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const accentPattern = (value) => {
  const accents = { a: 'aáàâãä', e: 'eéèêë', i: 'iíìîï', o: 'oóòôõö', u: 'uúùûü', c: 'cç', n: 'nñ' };
  return Array.from(value.normalize('NFD').replace(/[\u0300-\u036f]/g, ''))
    .map((char) => accents[char.toLowerCase()] ? `[${accents[char.toLowerCase()]}]` : escapeRegex(char)).join('');
};

export function buildAtendimentosQuery({ unidadeId, search = '', produtoFilter = '', statusFilter = 'all', dataInicio = '', dataFim = '', vendaDiretaFilter = false, dataRecente }) {
  const conditions = [];
  if (unidadeId === UNIDADE_LEGADA) {
    conditions.push({ $or: [{ unidade_id: unidadeId }, { unidade_id: { $exists: false } }, { unidade_id: null }, { unidade_id: '' }] });
  } else if (unidadeId) conditions.push({ unidade_id: unidadeId });
  if (vendaDiretaFilter) conditions.push({ venda_direta: true });
  if (statusFilter !== 'all') conditions.push({ status: statusFilter });
  const term = search.trim();
  if (term) {
    const digits = term.replace(/\D/g, '');
    const textPattern = { $regex: accentPattern(term), $options: 'i' };
    const platePattern = { $regex: escapeRegex(term.replace(/[\s-]/g, '')), $options: 'i' };
    const orConditions = [
      { cliente_nome: textPattern },
      { modelo: textPattern },
      { placa: platePattern },
    ];
    if (digits && /^\d+$/.test(digits)) orConditions.push({ numero_os: Number(digits) });
    conditions.push({ $or: orConditions });
  }
  if (produtoFilter.trim().length >= 2) {
    const pattern = { $regex: accentPattern(produtoFilter.trim()), $options: 'i' };
    conditions.push({ $or: [{ 'itens_queixa.nome': pattern }, { 'itens_orcamento.nome': pattern }] });
  }
  const range = {};
  if (dataInicio) range.$gte = new Date(`${dataInicio}T00:00:00`).toISOString();
  if (dataFim) {
    const nextDay = new Date(`${dataFim}T00:00:00`);
    nextDay.setDate(nextDay.getDate() + 1);
    range.$lt = nextDay.toISOString();
  }
  if (!dataInicio && !dataFim && !term && produtoFilter.trim().length < 2) range.$gte = dataRecente;
  if (Object.keys(range).length) conditions.push({ data_entrada: range });
  return conditions.length ? { $and: conditions } : {};
}