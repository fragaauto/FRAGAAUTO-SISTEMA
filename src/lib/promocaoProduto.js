import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { promocaoEncerrada, dataBr } from '@/lib/promocao';

/**
 * Monta o índice de ofertas a partir das promoções vigentes.
 * Chave: "id:<produto_id>" e "cod:<codigo>".
 * Quando o mesmo produto está em mais de uma promoção, vale o menor preço.
 */
export async function carregarOfertasPromocao() {
  const page = await base44.entities.Promocao.filter({ ativa: true }, { sort: '-created_date', limit: 200 });
  const promocoes = page?.items || (Array.isArray(page) ? page : []);
  const ofertas = {};

  promocoes.forEach((promocao) => {
    if (promocaoEncerrada(promocao)) return;
    (promocao.produtos || []).forEach((prod) => {
      const valorPromocional = Number(prod.valor_promocional || 0);
      if (!valorPromocional) return;
      const oferta = {
        promocao_id: promocao.id,
        promocao_titulo: promocao.titulo || '',
        validade: promocao.data_fim || '',
        valor_original: Number(prod.valor_original || 0),
        valor_promocional: valorPromocional,
      };
      const chaves = [];
      if (prod.produto_id) chaves.push(`id:${prod.produto_id}`);
      if (prod.codigo) chaves.push(`cod:${prod.codigo}`);
      chaves.forEach((chave) => {
        const atual = ofertas[chave];
        if (!atual || oferta.valor_promocional < atual.valor_promocional) {
          ofertas[chave] = oferta;
        }
      });
    });
  });

  return ofertas;
}

export function useOfertasPromocao() {
  return useQuery({
    queryKey: ['ofertas-promocao-ativas'],
    queryFn: carregarOfertasPromocao,
    staleTime: 2 * 60 * 1000,
  });
}

export function buscarOferta(ofertas, item) {
  if (!ofertas || !item) return null;
  if (item.produto_id && ofertas[`id:${item.produto_id}`]) return ofertas[`id:${item.produto_id}`];
  if (item.id && ofertas[`id:${item.id}`]) return ofertas[`id:${item.id}`];
  if (item.codigo_produto && ofertas[`cod:${item.codigo_produto}`]) return ofertas[`cod:${item.codigo_produto}`];
  return null;
}

/** Preço unitário efetivo: usa o valor customizado salvo ou o cadastro do produto */
export function precoAtualItem(item, produtoCadastro) {
  const custom = Number(item?.valor_customizado);
  if (Number.isFinite(custom) && custom > 0) return custom;
  return Number(item?.valor_unitario ?? produtoCadastro?.valor ?? 0);
}

function totalItem(item, valorUnitario) {
  const qtd = Number(item.quantidade) || 0;
  const desconto = Number(item.desconto_item) || 0;
  return Math.max(0, qtd * valorUnitario - desconto);
}

/**
 * Desconto por unidade concedido pela campanha (preço de referência da campanha - preço promocional).
 * O preço unitário do item é preservado; o valor entra como desconto na linha.
 */
export function descontoUnitarioPromocao(item, oferta) {
  const base = Number(oferta?.valor_original) || Number(item?.valor_unitario ?? item?.valor_customizado ?? 0) || 0;
  const promo = Number(oferta?.valor_promocional) || 0;
  return Math.max(0, base - promo);
}

export function aplicarDescontoPromocao(item, oferta) {
  const quantidade = Number(item.quantidade) || 1;
  const valorUnitario = Number(item.valor_unitario ?? item.valor_customizado ?? 0) || 0;
  const descontoItem = Number((descontoUnitarioPromocao(item, oferta) * quantidade).toFixed(2));
  const atualizado = {
    ...item,
    aplicar_promocao: true,
    promocao_id: oferta.promocao_id,
    promocao_titulo: oferta.promocao_titulo,
    promocao_validade: oferta.validade,
    valor_promocao_original: valorUnitario,
    desconto_item_anterior: Number(item.desconto_item) || 0,
    desconto_item: descontoItem,
  };
  if ('valor_total' in item || 'valor_unitario' in item) {
    return { ...atualizado, valor_total: Math.max(0, quantidade * valorUnitario - descontoItem) };
  }
  return atualizado;
}

export function removerDescontoPromocao(item) {
  const valorUnitario = Number(item.valor_unitario ?? item.valor_customizado ?? 0) || 0;
  const descontoAnterior = Number(item.desconto_item_anterior) || 0;
  const atualizado = {
    ...item,
    aplicar_promocao: false,
    promocao_id: '',
    promocao_titulo: '',
    promocao_validade: '',
    valor_promocao_original: 0,
    desconto_item: descontoAnterior,
    desconto_item_anterior: 0,
  };
  if ('valor_total' in item || 'valor_unitario' in item) {
    return { ...atualizado, valor_total: totalItem(atualizado, valorUnitario) };
  }
  return atualizado;
}

/** Texto usado no WhatsApp/PDF: PRODUTO EM PROMOÇÃO VALIDO ATÉ 30/11/2026 */
export function rotuloPromocaoItem(item) {
  if (!item?.aplicar_promocao) return '';
  return item.promocao_validade
    ? `PRODUTO EM PROMOÇÃO VALIDO ATÉ ${dataBr(item.promocao_validade)}`
    : 'PRODUTO EM PROMOÇÃO';
}