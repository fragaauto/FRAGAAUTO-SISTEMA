import { base44 } from '@/api/base44Client';

export const brl = (v) =>
  Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

// Monta o item do aviso a partir de um produto e do novo preço
export function itemAviso(produto, precoNovo) {
  if (!produto) return null;
  return {
    produto_id: produto.id,
    codigo: produto.codigo || '',
    nome: produto.nome || '',
    preco_antigo: Number(produto.valor) || 0,
    preco_novo: Number(precoNovo) || 0,
  };
}

// Registra o anúncio de alteração de preço que será exibido a todos os usuários
export async function registrarAvisoPreco(itens, { origem = '' } = {}) {
  const lista = (itens || []).filter(
    (i) => i && i.nome && Number(i.preco_novo) > 0 && Number(i.preco_antigo) !== Number(i.preco_novo)
  );
  if (lista.length === 0) return null;

  let usuarioNome = '';
  try {
    const me = await base44.auth.me();
    usuarioNome = me?.full_name || me?.email || '';
  } catch {
    usuarioNome = '';
  }

  return base44.entities.AvisoPreco.create({
    titulo: 'Houve alteração de preço nos produtos',
    origem,
    usuario_nome: usuarioNome,
    itens: lista,
  });
}