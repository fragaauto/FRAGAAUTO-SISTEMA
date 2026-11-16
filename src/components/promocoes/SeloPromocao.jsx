import React from 'react';

/**
 * Selo "PRODUTO EM PROMOÇÃO" — escudo verde-petróleo com faixa dourada.
 * Usa apenas SVG/CSS para funcionar também no PDF e na impressão.
 */
export default function SeloPromocao({ className = '', compacto = false }) {
  if (compacto) {
    return (
      <span className={`inline-flex items-center gap-1 rounded-[3px] border-2 border-[#15333E] bg-[#EBC75C] px-1.5 py-0.5 text-[10px] font-extrabold uppercase leading-none tracking-wide text-[#0f0e0e] shadow-sm ${className}`}>
        Promoção
      </span>
    );
  }

  return (
    <span className={`inline-flex items-center gap-1.5 select-none ${className}`} aria-label="Produto em promoção">
      <svg width="22" height="26" viewBox="0 0 22 26" aria-hidden="true" className="shrink-0">
        <path d="M11 0.8 20.5 4.4v9.2c0 5.2-4 9.2-9.5 11.6C5.5 22.8 1.5 18.8 1.5 13.6V4.4L11 0.8Z" fill="#15333E" />
        <path d="M11 2.6 18.8 5.6v8c0 4.3-3.3 7.7-7.8 9.8C6.5 21.3 3.2 17.9 3.2 13.6v-8L11 2.6Z" fill="none" stroke="#EBC75C" strokeWidth="1.2" />
        <path d="M11 7.2l1.3 2.7 3 .4-2.2 2.1.5 3-2.6-1.4-2.6 1.4.5-3-2.2-2.1 3-.4L11 7.2Z" fill="#EBC75C" />
      </svg>
      <span className="inline-block -rotate-2 rounded-[3px] border-2 border-[#15333E] bg-[#EBC75C] px-2 py-1 text-[11px] font-extrabold uppercase leading-none tracking-wide text-[#0f0e0e] shadow-sm">
        Produto em promoção
      </span>
    </span>
  );
}