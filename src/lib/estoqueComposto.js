import { base44 } from '@/api/base44Client';

// Verifica se o produto é composto (possui composição com itens)
export const isComposto = (produto) =>
  Array.isArray(produto?.composicao) && produto.composicao.length > 0;

// Retorna a composição efetiva: se houver variação com composição própria, usa a dela; senão a do produto.
function getComposicaoEfetiva(produto, variacaoId) {
  if (variacaoId && produto?.variacoes?.length > 0) {
    const variacao = produto.variacoes.find(v => v.id === variacaoId);
    if (variacao?.composicao?.length > 0) return variacao.composicao;
  }
  return produto?.composicao;
}

// Baixa `quantidade` unidades de um produto do estoque.
// Se o produto (ou sua variação) for composto (kit/pacote), a baixa é feita em cada componente
// (multiplicado pela quantidade). Caso contrário, baixa do próprio produto.
// Não lança erros — apenas ignora produtos inexistentes/não controlados.
export async function baixarEstoque(produtoId, quantidade, variacaoId = null) {
  const produto = await base44.entities.Produto.get(produtoId).catch(() => null);
  if (!produto) return;
  const qtd = Number(quantidade) || 1;
  const composicao = getComposicaoEfetiva(produto, variacaoId);
  if (Array.isArray(composicao) && composicao.length > 0) {
    for (const comp of composicao) {
      if (!comp.produto_id) continue;
      const compProd = await base44.entities.Produto.get(comp.produto_id).catch(() => null);
      const qtdBaixa = (Number(comp.quantidade) || 1) * qtd;
      if (compProd?.controla_estoque) {
        const novo = Math.max(0, (compProd.estoque_atual || 0) - qtdBaixa);
        await base44.entities.Produto.update(comp.produto_id, { estoque_atual: novo });
      }
    }
    return;
  }
  if (produto.controla_estoque) {
    const novo = Math.max(0, (produto.estoque_atual || 0) - qtd);
    await base44.entities.Produto.update(produtoId, { estoque_atual: novo });
  }
}

// Estorna (devolve) `quantidade` unidades de um produto ao estoque.
// Se o produto (ou sua variação) for composto, devolve aos componentes.
export async function estornarEstoque(produtoId, quantidade, variacaoId = null) {
  const produto = await base44.entities.Produto.get(produtoId).catch(() => null);
  if (!produto) return;
  const qtd = Number(quantidade) || 1;
  const composicao = getComposicaoEfetiva(produto, variacaoId);
  if (Array.isArray(composicao) && composicao.length > 0) {
    for (const comp of composicao) {
      if (!comp.produto_id) continue;
      const compProd = await base44.entities.Produto.get(comp.produto_id).catch(() => null);
      const qtdDevolve = (Number(comp.quantidade) || 1) * qtd;
      if (compProd?.controla_estoque) {
        await base44.entities.Produto.update(comp.produto_id, {
          estoque_atual: (compProd.estoque_atual || 0) + qtdDevolve,
        });
      }
    }
    return;
  }
  if (produto.controla_estoque) {
    await base44.entities.Produto.update(produtoId, {
      estoque_atual: (produto.estoque_atual || 0) + qtd,
    });
  }
}