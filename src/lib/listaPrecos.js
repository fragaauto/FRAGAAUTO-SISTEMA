// Calcula o preço de um produto com base em uma lista de preços
// Retorna null se a lista não se aplica ao produto
export function calcularPrecoLista(produto, lista) {
  if (!lista || !produto) return null;

  if (lista.tipo === 'selecionados') {
    const item = (lista.itens || []).find(i => i.produto_id === produto.id);
    if (!item) return null;
    return Number(item.preco_customizado) || 0;
  }

  // geral: verifica exceção por produto primeiro
  const override = (lista.itens || []).find(i => i.produto_id === produto.id);
  if (override && override.preco_customizado != null) {
    return Number(override.preco_customizado) || 0;
  }
  // senão aplica ajuste geral
  const precoOriginal = produto.usar_faixa_preco
    ? (produto.valor_minimo ?? produto.valor)
    : produto.valor;
  if (lista.ajuste_tipo === 'percentual') {
    return parseFloat((precoOriginal * (1 + (lista.ajuste_valor || 0) / 100)).toFixed(2));
  }
  return parseFloat((precoOriginal + (lista.ajuste_valor || 0)).toFixed(2));
}

// Filtra listas que se aplicam a um produto (ativas e que cobrem o produto)
export function listasAplicaveisProduto(listas, produto) {
  if (!listas || !produto) return [];
  return listas.filter(lista => {
    if (!lista.ativa) return false;
    if (lista.tipo === 'geral') return true;
    if (lista.tipo === 'selecionados') {
      return (lista.itens || []).some(i => i.produto_id === produto.id);
    }
    return false;
  });
}