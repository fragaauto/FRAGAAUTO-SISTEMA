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

// Palavras de ligação: não podem ser exigidas de todos os campos, senão a busca
// perde peças boas (ex: "borracha de porta celta" deixava de achar o produto
// cujo nome é "BORRACHA PORTA TRIB CORSA/CELTA/PRISMA").
const CONECTORES = [
  'de', 'da', 'do', 'das', 'dos', 'e', 'em', 'no', 'na', 'nos', 'nas',
  'para', 'pra', 'por', 'com', 'sem', 'ao', 'aos', 'um', 'uma',
];

// Palavras que realmente identificam o produto no termo digitado.
const termosDaBusca = (termo) => {
  const todos = normalizar(termo)
    .split(/\s+/)
    .filter((t) => t && !VAZIAS.includes(t));
  const significativos = todos.filter((t) => !CONECTORES.includes(t));
  return significativos.length > 0 ? significativos : todos;
};

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
  const termos = termosDaBusca(termo);

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

// Modelos compatíveis do produto que casaram com o termo digitado.
// Serve para explicar na busca o motivo da recomendação
// (ex: "Compatível com Renault Sandero").
export function compatibilidadesEncontradas(produto, termo) {
  const termos = termosDaBusca(termo);
  if (termos.length === 0) return [];

  const modelos = (Array.isArray(produto?.modelos_compativeis) ? produto.modelos_compativeis : [])
    // Um cadastro pode ter vários modelos no mesmo texto ("celta;prisma;astra")
    .flatMap((m) => String(m || '').split(/[;,\/|]+/))
    .map((m) => m.trim())
    .filter(Boolean)
    .filter((m) => {
      const alvo = normalizar(m);
      return termos.some((t) => alvo.includes(t));
    })
    .map((m) => m.charAt(0).toUpperCase() + m.slice(1));

  // Remove repetidos que só diferem em maiúsculas/minúsculas
  const vistos = new Set();
  return modelos.filter((m) => {
    const chave = normalizar(m);
    if (vistos.has(chave)) return false;
    vistos.add(chave);
    return true;
  });
}

// Todas as palavras significativas de um texto (ignora acentos, pontuação e
// palavras de ligação; mantém números, que diferenciam peças parecidas).
const palavrasChave = (valor) =>
  normalizar(valor)
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((t) => t && !VAZIAS.includes(t));

// Descrição da nota e nome do cadastro descrevem exatamente a mesma peça?
const mesmaDescricao = (nomeProduto, descricaoItem) => {
  const a = [...new Set(palavrasChave(nomeProduto))];
  const b = [...new Set(palavrasChave(descricaoItem))];
  if (a.length === 0 || a.length !== b.length) return false;
  return a.every((t) => b.includes(t));
};

// Sugere o produto cadastrado correspondente a um item de nota de compra.
// Critério 1: código do fornecedor cadastrado no produto.
// Critério 2: descrição da peça igual ao nome do produto.
// Sem correspondência segura devolve null — a relação fica para o usuário.
export function encontrarProdutoPorItem(produtos, item = {}) {
  const lista = produtos || [];

  const porCodigoFornecedor = encontrarProdutoPorCodigoFornecedor(lista, item.codigo, item.fornecedor);
  if (porCodigoFornecedor) return porCodigoFornecedor;

  const descricao = item.descricao || item.nome || '';
  if (!palavrasChave(descricao).length) return null;

  return lista.find((p) => mesmaDescricao(p?.nome, descricao)) || null;
}