import React from 'react';

const formatar = (valor) =>
  Number(valor || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function BarraMeta({ label, atual, meta, cor }) {
  const pct = meta > 0 ? Math.min((atual / meta) * 100, 100) : 0;
  const atingida = pct >= 100;

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide">{label}</span>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">
            R$ {formatar(atual)} / R$ {formatar(meta)}
          </span>
          {atingida && <span className="text-xs font-bold text-green-600">✓ Atingida!</span>}
        </div>
      </div>
      <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${atingida ? 'bg-green-500' : cor}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="mt-0.5 text-right">
        <span className={`text-xs font-bold ${atingida ? 'text-green-600' : 'text-slate-500'}`}>
          {pct.toFixed(0)}%
        </span>
      </div>
    </div>
  );
}