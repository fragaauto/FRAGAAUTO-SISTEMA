import { base44 } from '@/api/base44Client';

export const UNIDADE_AUTO_PORTAS_ID = '69ea76b72f920804f5d68eab';

export const CATEGORIAS = [
  { valor: 'aluguel', label: 'Aluguel' },
  { valor: 'energia', label: 'Energia' },
  { valor: 'agua', label: 'Água' },
  { valor: 'internet', label: 'Internet' },
  { valor: 'telefone', label: 'Telefone' },
  { valor: 'folha_pagamento', label: 'Folha de pagamento' },
  { valor: 'impostos', label: 'Impostos' },
  { valor: 'contador', label: 'Contador' },
  { valor: 'sistema', label: 'Sistema' },
  { valor: 'seguros', label: 'Seguros' },
  { valor: 'manutencao', label: 'Manutenção' },
  { valor: 'fornecedor_pecas', label: 'Fornecedor / Peças' },
  { valor: 'marketing', label: 'Marketing' },
  { valor: 'financeiro', label: 'Financeiro' },
  { valor: 'outros', label: 'Outros' },
];

export const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
export const MESES_TODOS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

export const TELEFONE_PADRAO = '31998684197';
export const NOME_RELATORIO = 'Filipe Fraga';

export const labelCategoria = (valor) => CATEGORIAS.find((c) => c.valor === valor)?.label || 'Outros';

export const fmtMoeda = (v) =>
  (Number(v) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const dataCurta = (iso) => {
  if (!iso) return '--';
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
};

export function competenciaDe(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

export function labelCompetencia(comp) {
  const [ano, mes] = comp.split('-');
  return `${mes}/${ano}`;
}

export function mudarCompetencia(comp, delta) {
  const [ano, mes] = comp.split('-').map(Number);
  const d = new Date(ano, mes - 1 + delta, 1);
  return competenciaDe(d);
}

export function intervaloCompetencia(comp) {
  const [ano, mes] = comp.split('-').map(Number);
  return { inicio: new Date(ano, mes - 1, 1), fim: new Date(ano, mes, 0, 23, 59, 59) };
}

export function mesesDaConta(conta) {
  const meses = Array.isArray(conta?.meses_cobranca) ? conta.meses_cobranca : [];
  return meses.length ? meses : MESES_TODOS;
}

// Uma conta pertence ao mês pela competência (geradas pelo planejamento)
// ou, para lançamentos antigos, pelo mês do vencimento.
export function contaNoMes(conta, comp) {
  if (conta.competencia) return conta.competencia === comp;
  if (!conta.data_vencimento) return false;
  return competenciaDe(new Date(conta.data_vencimento)) === comp;
}

export function filtrarPorUnidade(lista, unidadeAtual) {
  if (!unidadeAtual) return lista;
  return lista.filter((item) => {
    if (item.unidade_id) return item.unidade_id === unidadeAtual.id;
    return unidadeAtual.id === UNIDADE_AUTO_PORTAS_ID;
  });
}

export async function gerarContasDoMes({ contasPrevistas, competencia, unidadeId }) {
  const [ano, mes] = competencia.split('-').map(Number);
  const existentes = await base44.entities.ContaPagar.filter({ competencia });
  const jaGeradas = new Set((existentes || []).map((c) => c.conta_prevista_id).filter(Boolean));

  const faltando = (contasPrevistas || []).filter(
    (p) => p.ativo !== false && mesesDaConta(p).includes(mes) && !jaGeradas.has(p.id)
  );
  if (!faltando.length) return 0;

  const ultimoDia = new Date(ano, mes, 0).getDate();
  const registros = faltando.map((p) => {
    const dia = Math.min(Math.max(Number(p.dia_vencimento) || 5, 1), ultimoDia);
    return {
      unidade_id: p.unidade_id || unidadeId || null,
      fornecedor: p.nome,
      categoria: p.categoria || 'outros',
      descricao: p.nome,
      valor: Number(p.valor_previsto) || 0,
      data_vencimento: new Date(ano, mes - 1, dia, 12).toISOString(),
      status: 'pendente',
      conta_prevista_id: p.id,
      competencia,
      observacoes: p.observacoes || '',
    };
  });

  await base44.entities.ContaPagar.bulkCreate(registros);
  return registros.length;
}

export function textoRelatorio({ competencia, contas, empresa }) {
  const emAberto = (contas || []).filter((c) => c.status !== 'pago' && c.status !== 'cancelado');
  const pagas = (contas || []).filter((c) => c.status === 'pago');
  const hoje = new Date();
  const vencidas = emAberto.filter((c) => c.data_vencimento && new Date(c.data_vencimento) < hoje);
  const soma = (lista) => lista.reduce((s, c) => s + (Number(c.valor) || 0), 0);

  const ordenadas = [...emAberto].sort(
    (a, b) => new Date(a.data_vencimento || 0) - new Date(b.data_vencimento || 0)
  );
  const linhas = ordenadas
    .slice(0, 40)
    .map((c) => `• ${dataCurta(c.data_vencimento)} — ${c.descricao} — R$ ${fmtMoeda(c.valor)}`);

  const agora = new Date();
  const enviadoEm = `${dataCurta(agora)} às ${String(agora.getHours()).padStart(2, '0')}:${String(
    agora.getMinutes()
  ).padStart(2, '0')}`;

  return [
    `*CONTAS A PAGAR — ${labelCompetencia(competencia)}*`,
    empresa ? empresa : null,
    '',
    '*Resumo*',
    `Previsto no mês: R$ ${fmtMoeda(soma(contas || []))}`,
    `Pago: R$ ${fmtMoeda(soma(pagas))}`,
    `Em aberto: R$ ${fmtMoeda(soma(emAberto))}`,
    `Vencidas: ${vencidas.length}`,
    '',
    `*Em aberto (${emAberto.length})*`,
    linhas.length ? linhas.join('\n') : 'Nenhuma conta em aberto.',
    emAberto.length > 40 ? `_...e mais ${emAberto.length - 40} conta(s)_` : null,
    '',
    `_Enviado em ${enviadoEm}_`,
  ]
    .filter((l) => l !== null && l !== undefined)
    .join('\n');
}