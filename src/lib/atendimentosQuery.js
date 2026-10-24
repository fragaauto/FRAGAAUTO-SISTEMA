import { accentPattern, buildAtendimentoSearchQuery } from '@/lib/atendimentoSearchQuery';

export const ATENDIMENTOS_POR_PAGINA = 20;
export const ATENDIMENTOS_LIST_FIELDS = [
  'numero_os', 'venda_direta', 'cliente_nome', 'cliente_telefone',
  'placa', 'modelo', 'marca', 'ano', 'data_entrada', 'created_date',
  'status', 'status_pagamento', 'valor_final', 'valor_final_pago',
  'data_pagamento', 'unidade_id', 'tecnicos_responsaveis', 'tecnico',
  'retorno_servico', 'atendimento_origem_numero',
];
const UNIDADE_LEGADA = '69ea76b72f920804f5d68eab';


export function buildAtendimentosQuery({ unidadeId, search = '', produtoFilter = '', statusFilter = 'all', dataInicio = '', dataFim = '', vendaDiretaFilter = false, apenasRetornos = false, dataRecente }) {
  const conditions = [];
  if (unidadeId === UNIDADE_LEGADA) {
    conditions.push({ $or: [{ unidade_id: unidadeId }, { unidade_id: { $exists: false } }, { unidade_id: null }, { unidade_id: '' }] });
  } else if (unidadeId) conditions.push({ unidade_id: unidadeId });
  if (vendaDiretaFilter) conditions.push({ venda_direta: true });
  if (apenasRetornos) conditions.push({ retorno_servico: true });
  if (statusFilter !== 'all') conditions.push({ status: statusFilter });
  const term = search.trim();
  if (term) conditions.push(buildAtendimentoSearchQuery(term));
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
  if (!dataInicio && !dataFim && !term && produtoFilter.trim().length < 2 && !apenasRetornos) range.$gte = dataRecente;
  if (Object.keys(range).length) conditions.push({ data_entrada: range });
  const query = Object.assign({}, ...conditions.filter((condition) => !condition.$or));
  const alternatives = conditions.filter((condition) => condition.$or);
  if (alternatives.length === 1) Object.assign(query, alternatives[0]);
  if (alternatives.length > 1) query.$and = alternatives;
  return query;
}