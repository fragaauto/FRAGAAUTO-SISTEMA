import React from 'react';

// Exibe a descrição/especificação do item cadastradas na OS de origem.
// Retorna null quando o item não possui nenhuma informação complementar.
export default function DescricaoItemGarantia({ item }) {
  if (!item) return null;

  const linhas = [
    ['Especificação', item.variacao_nome],
    ['Descrição do item', item.observacao_item],
    ['Peça encomendada', item.descricao_peca_encomenda],
    ['Vantagens', item.vantagens],
    ['Desvantagens', item.desvantagens],
    ['Observação do cliente', item.observacao_cliente],
  ].filter(([, valor]) => valor);

  if (linhas.length === 0) return null;

  return (
    <dl className="mt-1.5 space-y-0.5">
      {linhas.map(([label, valor]) => (
        <div key={label} className="text-[11px] leading-snug text-slate-600">
          <dt className="inline font-semibold text-slate-500">{label}: </dt>
          <dd className="inline whitespace-pre-wrap">{valor}</dd>
        </div>
      ))}
    </dl>
  );
}