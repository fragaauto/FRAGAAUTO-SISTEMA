// Busca multi-termo de produtos/serviços.
// Divide o termo digitado em palavras e retorna true quando TODAS aparecem
// em algum dos campos indexados (nome, código, descrição, categoria ou
// modelos compatíveis). Assim "reparo gol" encontra itens com ambos os termos.

export function matchProduto(p, termo) {
  const termos = String(termo || '').trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (termos.length === 0) return true;

  const campos = [
    p?.nome,
    p?.codigo,
    p?.descricao,
    p?.categoria,
    ...(p?.modelos_compativeis || []).map((m) => String(m || '')),
  ].map((c) => String(c || '').toLowerCase());

  return termos.every((t) => campos.some((c) => c.includes(t)));
}

export function filtrarProdutos(produtos, termo) {
  return (produtos || []).filter((p) => matchProduto(p, termo));
}