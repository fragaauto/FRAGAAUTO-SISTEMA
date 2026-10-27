import React from 'react';
import { Card, CardContent } from '@/components/ui/card';

const formatar = (valor) =>
  Number(valor || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function TabelaVendasCategoria({ linhas = [] }) {
  if (linhas.length === 0) {
    return (
      <Card className="border border-dashed border-slate-300">
        <CardContent className="p-6 text-center text-sm text-slate-500">
          Nenhuma venda registrada por categoria neste mês.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border border-slate-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Categoria</th>
              <th className="px-4 py-3 text-right">Vendido</th>
              <th className="px-4 py-3 text-right">Meta</th>
              <th className="px-4 py-3 text-right">Falta</th>
              <th className="px-4 py-3 text-right">%</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {linhas.map((linha) => {
              const percentual = linha.meta > 0 ? (linha.vendido / linha.meta) * 100 : 0;
              const atingida = linha.meta > 0 && percentual >= 100;
              return (
                <tr key={linha.categoria} className={atingida ? 'bg-green-50/60' : 'bg-white'}>
                  <td className="px-4 py-3 font-medium text-slate-800">{linha.categoria}</td>
                  <td className="px-4 py-3 text-right text-slate-700">R$ {formatar(linha.vendido)}</td>
                  <td className="px-4 py-3 text-right text-slate-500">
                    {linha.meta > 0 ? `R$ ${formatar(linha.meta)}` : '—'}
                  </td>
                  <td className="px-4 py-3 text-right text-slate-500">
                    {linha.meta > 0 ? `R$ ${formatar(Math.max(linha.meta - linha.vendido, 0))}` : '—'}
                  </td>
                  <td
                    className={`px-4 py-3 text-right font-bold ${
                      atingida ? 'text-green-600' : 'text-slate-600'
                    }`}
                  >
                    {linha.meta > 0 ? `${percentual.toFixed(0)}%` : '—'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}