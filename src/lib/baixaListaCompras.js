import { base44 } from '@/api/base44Client';

/**
 * Planeja a baixa dos itens comprados nas listas de compras abertas.
 * itensComprados: [{ produto_id, quantidade }]
 */
export function planejarBaixa(listas, itensComprados) {
  const disponivel = {};
  (itensComprados || []).forEach((i) => {
    const qtd = Number(i.quantidade) || 0;
    if (!i.produto_id || qtd <= 0) return;
    disponivel[i.produto_id] = (disponivel[i.produto_id] || 0) + qtd;
  });

  return (listas || []).reduce((planos, lista) => {
    const restantes = [];
    let baixados = 0;

    (lista.itens || []).forEach((it) => {
      const disp = disponivel[it.produto_id] || 0;
      const qtd = Number(it.quantidade) || 0;
      if (disp <= 0 || qtd <= 0) {
        restantes.push(it);
        return;
      }
      const baixar = Math.min(qtd, disp);
      disponivel[it.produto_id] = disp - baixar;
      baixados += 1;
      if (qtd - baixar > 0) restantes.push({ ...it, quantidade: qtd - baixar });
    });

    if (!baixados) return planos;
    planos.push({
      lista,
      itens: restantes,
      itens_baixados: baixados,
      concluir: restantes.length === 0 && (lista.itens_livres || []).length === 0,
    });
    return planos;
  }, []);
}

export async function aplicarBaixaListaCompras(planos) {
  for (const plano of planos || []) {
    const dados = { itens: plano.itens };
    if (plano.concluir) dados.status = 'concluida';
    await base44.entities.ListaCompras.update(plano.lista.id, dados);
  }
  return {
    listas: (planos || []).length,
    itens: (planos || []).reduce((s, p) => s + p.itens_baixados, 0),
  };
}