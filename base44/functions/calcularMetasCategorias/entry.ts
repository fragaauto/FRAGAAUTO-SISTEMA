import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';

const UNIDADE_AUTO_PORTAS_ID = '69ea76b72f920804f5d68eab';

// Percorre todas as páginas de uma consulta (o filtro retorna no máximo 500 por página)
async function listarTudo(entity, query, options) {
  const todos = [];
  let cursor = null;
  for (let i = 0; i < 40; i += 1) {
    const pagina = await entity.filter(query, { ...options, limit: 500, cursor });
    todos.push(...(pagina.items || []));
    if (!pagina.has_more || !pagina.next_cursor) break;
    cursor = pagina.next_cursor;
  }
  return todos;
}

function filtroUnidade(query, unidadeId) {
  if (!unidadeId) return query;
  if (unidadeId === UNIDADE_AUTO_PORTAS_ID) {
    return { ...query, $or: [{ unidade_id: UNIDADE_AUTO_PORTAS_ID }, { unidade_id: null }, { unidade_id: '' }] };
  }
  return { ...query, unidade_id: unidadeId };
}

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch((e) => (e.status === 401 ? null : Promise.reject(e)));
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { unidade_id, inicio, fim } = body || {};
    if (!inicio || !fim) {
      return Response.json({ error: 'Período (inicio e fim) é obrigatório' }, { status: 400 });
    }

    // Faturamento do período — mesma regra usada no card de metas da Home
    const queryFaturamento = filtroUnidade(
      { tipo: 'entrada', estornado: false, data_lancamento: { $gte: inicio, $lte: fim } },
      unidade_id
    );
    const agregado = await base44.entities.LancamentoFinanceiro.aggregate({
      query: queryFaturamento,
      groupBy: 'tipo',
      sum: 'valor',
    });
    const faturamento_mes = Number(agregado?.rows?.[0]?.sum_valor) || 0;

    // Vendas por categoria — itens dos atendimentos pagos no período
    const queryAtendimentos = filtroUnidade({ data_pagamento: { $gte: inicio, $lte: fim } }, unidade_id);
    const atendimentos = await listarTudo(base44.entities.Atendimento, queryAtendimentos, {
      fields: ['id', 'itens_queixa', 'itens_orcamento'],
    });

    const idsProdutos = new Set();
    atendimentos.forEach((a) => {
      [...(a.itens_queixa || []), ...(a.itens_orcamento || [])].forEach((item) => {
        if (item?.produto_id) idsProdutos.add(item.produto_id);
      });
    });

    const listaIds = Array.from(idsProdutos);
    const categoriaPorProduto = {};
    for (let i = 0; i < listaIds.length; i += 100) {
      const pagina = await base44.entities.Produto.filter(
        { id: { $in: listaIds.slice(i, i + 100) } },
        { fields: ['id', 'categoria'], limit: 100 }
      );
      (pagina.items || []).forEach((p) => {
        categoriaPorProduto[p.id] = p.categoria || 'Sem categoria';
      });
    }

    const porCategoria = {};
    atendimentos.forEach((a) => {
      [...(a.itens_queixa || []), ...(a.itens_orcamento || [])].forEach((item) => {
        if (!item || item.status_aprovacao === 'reprovado') return;
        const categoria = categoriaPorProduto[item.produto_id] || 'Sem categoria';
        porCategoria[categoria] = (porCategoria[categoria] || 0) + (Number(item.valor_total) || 0);
      });
    });

    const categorias = Object.entries(porCategoria)
      .map(([categoria, valor]) => ({ categoria, valor: Math.round(valor * 100) / 100 }))
      .sort((a, b) => b.valor - a.valor);

    return Response.json({ faturamento_mes, categorias });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}