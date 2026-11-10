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

// Sugere o produto cadastrado correspondente a um item de nota de compra:
// primeiro pelo código; depois pela descrição, escolhendo o cadastro mais próximo.
export function encontrarProdutoPorItem(produtos, item = {}) {
  const lista = produtos || [];
  const codigo = codigoNumerico(item.codigo || '');
  if (codigo) {
    const porCodigo = lista.find((p) => codigoNumerico(p.codigo) === codigo);
    if (porCodigo) return porCodigo;
  }

  const descricao = normalizar(item.descricao || item.nome || '');
  const palavras = descricao
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length >= 4 && !VAZIAS.includes(t) && !/^\d+$/.test(t));

  if (palavras.length === 0) return null;

  const candidatos = lista.filter((p) => palavras.some((t) => normalizar(p?.nome).includes(t)));
  if (candidatos.length === 0) return null;

  const avaliar = (p) => {
    const nome = normalizar(p?.nome);
    const cobertura = palavras.filter((t) => nome.includes(t)).length / palavras.length;
    const diferenca = Math.abs(nome.length - descricao.length);
    return { cobertura, diferenca };
  };

  let melhor = null;
  for (const p of candidatos) {
    const nota = avaliar(p);
    if (nota.cobertura < 0.5) continue;
    if (
      !melhor ||
      nota.cobertura > melhor.nota.cobertura + 0.001 ||
      (Math.abs(nota.cobertura - melhor.nota.cobertura) <= 0.001 && nota.diferenca < melhor.nota.diferenca)
    ) {
      melhor = { produto: p, nota };
    }
  }

  return melhor?.produto || null;
}