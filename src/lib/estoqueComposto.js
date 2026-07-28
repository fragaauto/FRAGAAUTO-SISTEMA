import { base44 } from '@/api/base44Client';

// Verifica se o produto é composto (possui composição com itens)
export const isComposto = (produto) =>
  Array.isArray(produto?.composicao) && produto.composicao.length > 0;

// Baixa `quantidade` unidades de um produto do estoque.
// Se o produto for composto (kit/pacote), a baixa é feita em cada componente
// (multiplicado pela quantidade). Caso contrário, baixa do próprio produto.
// Não lança erros — apenas ignora produtos inexistentes/não controlados.
export async function baixarEstoque(produtoId, quantidade) {
  const produto = await base44.entities.Produto.get(produtoId).catch(() => null);
  if (!produto) return;
  const qtd = Number(quantidade) || 1;
  if (isComposto(produto)) {
    for (const comp of produto.composicao) {
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
// Se o produto for composto, devolve aos componentes.
export async function estornarEstoque(produtoId, quantidade) {
  const produto = await base44.entities.Produto.get(produtoId).catch(() => null);
  if (!produto) return;
  const qtd = Number(quantidade) || 1;
  if (isComposto(produto)) {
    for (const comp of produto.composicao) {
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