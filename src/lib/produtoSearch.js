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

// Código do fornecedor cadastrado no produto (lista de fornecedores do cadastro)
export function codigosIguais(a, b) {
  const ca = codigoNumerico(a);
  const cb = codigoNumerico(b);
  return !!ca && ca === cb;
}

const codigosFornecedorDoProduto = (p) =>
  (Array.isArray(p?.fornecedores) ? p.fornecedores : [])
    .map((f) => ({ codigo: codigoNumerico(f?.codigo_fornecedor), fornecedor: normalizar(f?.fornecedor_nome) }))
    .filter((f) => f.codigo);

// Procura o produto pelo código que o fornecedor usa (cadastrado em Fornecedores do produto)
export function encontrarProdutoPorCodigoFornecedor(produtos, codigo, fornecedor) {
  const alvo = codigoNumerico(codigo || '');
  if (!alvo) return null;

  const encontrados = (produtos || []).filter((p) =>
    codigosFornecedorDoProduto(p).some((f) => f.codigo === alvo)
  );
  if (encontrados.length === 0) return null;

  const nomeFornecedor = normalizar(fornecedor || '');
  const palavra = nomeFornecedor.split(/\s+/).find((t) => t.length >= 4);
  if (palavra) {
    const preferido = encontrados.find((p) =>
      codigosFornecedorDoProduto(p).some((f) => f.codigo === alvo && f.fornecedor.includes(palavra))
    );
    if (preferido) return preferido;
  }
  return encontrados[0];
}

// Localiza o cadastro do fornecedor pelo nome que aparece na nota
export function encontrarFornecedorPorNome(fornecedores, nome) {
  const alvo = normalizar(nome || '');
  if (!alvo) return null;
  return (
    (fornecedores || []).find((f) => {
      const n = normalizar(f?.nome || '');
      return !!n && (n === alvo || n.includes(alvo) || alvo.includes(n));
    }) || null
  );
}

// Insere ou atualiza o fornecedor na lista de fornecedores do produto,
// guardando o código usado por ele e o último preço de compra.
export function mesclarFornecedorProduto(
  fornecedores = [],
  { fornecedor_id, fornecedor_nome, codigo_fornecedor, preco_compra } = {}
) {
  const lista = (Array.isArray(fornecedores) ? fornecedores : []).map((f) => ({ ...f }));
  const nome = normalizar(fornecedor_nome || '');
  const codigo = String(codigo_fornecedor || '').trim();

  const indice = lista.findIndex((f) => {
    if (fornecedor_id && f?.fornecedor_id === fornecedor_id) return true;
    const nomeLista = normalizar(f?.fornecedor_nome || '');
    if (!nome || !nomeLista) return false;
    return nomeLista === nome || nomeLista.includes(nome) || nome.includes(nomeLista);
  });

  const dados = {};
  if (fornecedor_id) dados.fornecedor_id = fornecedor_id;
  if (fornecedor_nome) dados.fornecedor_nome = fornecedor_nome;
  if (codigo) dados.codigo_fornecedor = codigo;
  if (Number(preco_compra) > 0) dados.preco_compra = Number(preco_compra);

  if (indice >= 0) {
    lista[indice] = { ...lista[indice], ...dados };
  } else {
    lista.push({ ...dados, principal: lista.length === 0 });
  }

  return lista;
}

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
// primeiro pelo código do fornecedor (critério principal); depois pelo código
// interno; por último pela descrição, escolhendo o cadastro mais próximo.
export function encontrarProdutoPorItem(produtos, item = {}) {
  const lista = produtos || [];
  const codigo = codigoNumerico(item.codigo || '');

  // 1) código do fornecedor já cadastrado no produto (prioridade)
  const porCodigoFornecedor = encontrarProdutoPorCodigoFornecedor(lista, item.codigo, item.fornecedor);
  if (porCodigoFornecedor) return porCodigoFornecedor;

  // 2) código interno do produto igual ao código da nota
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