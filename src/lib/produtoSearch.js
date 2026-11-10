// Busca multi-termo de produtos/serviços.
// Divide o termo digitado em palavras e retorna true quando TODAS aparecem
// em algum dos campos indexados (nome, código, descrição, categoria ou
// modelos compatíveis). Ignora acentos, maiúsculas e zeros à esquerda do
// código, e descarta palavras de ligação como "cod" / "código".

const normalizar = (valor) =>
  String(valor ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

const VAZIAS = ['cod', 'codigo', 'cód', 'código', 'ref', 'referencia', 'referência'];

// Compara códigos sem zeros à esquerda e sem separadores ("0327" ~ "327")
const codigoNumerico = (valor) => normalizar(valor).replace(/^0+/, '').replace(/[\s.\-_/]/g, '');

export function matchProduto(p, termo) {
  const termos = normalizar(termo)
    .split(/\s+/)
    .filter((t) => t && !VAZIAS.includes(t));

  if (termos.length === 0) return true;

  const campos = [
    p?.nome,
    p?.codigo,
    p?.descricao,
    p?.categoria,
    ...(p?.modelos_compativeis || []),
  ]
    .map(normalizar)
    .filter(Boolean);

  const codigoLimpo = codigoNumerico(p?.codigo);

  return termos.every(
    (t) => campos.some((c) => c.includes(t)) || (codigoLimpo && codigoLimpo === codigoNumerico(t))
  );
}

export function filtrarProdutos(produtos, termo) {
  return (produtos || []).filter((p) => matchProduto(p, termo));
}