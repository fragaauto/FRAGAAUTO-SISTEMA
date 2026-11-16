import React from 'react';
import SeloPromocao from './SeloPromocao';
import { brl, dataBr } from '@/lib/promocao';

/**
 * Faixa que aparece no card do produto quando ele está em uma promoção vigente.
 * Mostra o selo, o preço promocional e a caixa "aplicar desconto da promoção ao item?".
 */
export default function BoxPromocaoItem({ oferta, aplicado, valorAtual, readOnly = false, onToggle }) {
  if (!oferta) return null;

  const precoOriginal = Number(oferta.valor_original || valorAtual || 0);
  const precoPromo = Number(oferta.valor_promocional || 0);

  return (
    <div className="mt-1 rounded-xl border-2 border-[#EBC75C] bg-[#FFF9E6] p-2.5">
      <div className="flex items-center gap-2 flex-wrap">
        <SeloPromocao />
        <div className="text-xs text-[#15333E] leading-snug">
          <span className="font-semibold">{oferta.promocao_titulo}</span>
          <span className="mx-1">·</span>
          {precoOriginal > 0 && (
            <span className="line-through text-slate-500 mr-1">{brl(precoOriginal)}</span>
          )}
          <span className="font-bold text-[#0f7a3d]">{brl(precoPromo)}</span>
          {oferta.validade && <span className="text-slate-600"> até {dataBr(oferta.validade)}</span>}
        </div>
      </div>

      {!readOnly && (
        <label className="mt-2 flex items-center gap-2 cursor-pointer w-fit">
          <input
            type="checkbox"
            checked={!!aplicado}
            onChange={(e) => onToggle?.(e.target.checked)}
            className="w-4 h-4 accent-[#15333E]"
          />
          <span className="text-xs font-semibold text-[#15333E]">
            Aplicar desconto da promoção ao item?
          </span>
        </label>
      )}

      {readOnly && aplicado && (
        <p className="mt-1 text-[11px] font-bold uppercase text-[#15333E]">
          Desconto da promoção aplicado
        </p>
      )}
    </div>
  );
}