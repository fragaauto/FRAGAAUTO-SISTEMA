import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function FluxoCaixaChart({ lancamentos }) {
  // Agrupar por dia
  const byDay = {};
  lancamentos.forEach(l => {
    const day = l.data_lancamento?.substring(0, 10) || new Date().toISOString().substring(0, 10);
    if (!byDay[day]) byDay[day] = { entradas: 0, saidas: 0 };
    if (l.tipo === 'entrada') byDay[day].entradas += l.valor || 0;
    else byDay[day].saidas += l.valor || 0;
  });

  const data = Object.entries(byDay)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([day, vals]) => ({
      name: format(new Date(day + 'T12:00:00'), 'dd/MM', { locale: ptBR }),
      Entradas: vals.entradas,
      Saídas: vals.saidas,
    }));

  if (data.length === 0) return (
    <div className="flex items-center justify-center h-40 text-slate-400 text-sm">
      Nenhum dado no período
    </div>
  );

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey="name" tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `R$${v >= 1000 ? (v/1000).toFixed(1)+'k' : v}`} />
        <Tooltip formatter={(v) => `R$ ${v.toFixed(2)}`} />
        <Legend />
        <Bar dataKey="Entradas" fill="#22c55e" radius={[4,4,0,0]} />
        <Bar dataKey="Saídas" fill="#ef4444" radius={[4,4,0,0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}