import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Undo2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function RelatorioRetornosTabela({ linhas = [] }) {
  if (linhas.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-slate-500 text-sm">
          Nenhum retorno de serviço no período selecionado.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Undo2 className="w-5 h-5 text-red-600" />
          Retornos de Serviço ({linhas.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200">
                {['OS Retorno', 'Data', 'OS Origem', 'Cliente', 'Placa', 'Serviços em Garantia', 'Valor', 'Téc. Origem', 'Téc. que Refez'].map((h) => (
                  <th key={h} className="text-left p-3 text-sm font-semibold text-slate-600 whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {linhas.map((linha) => (
                <tr key={linha.atendimento.id} className="border-b border-slate-100 hover:bg-red-50/40 align-top">
                  <td className="p-3 text-sm font-mono font-semibold text-red-700">
                    #{String(linha.atendimento.numero_os || '').padStart(6, '0')}
                  </td>
                  <td className="p-3 text-sm whitespace-nowrap">
                    {format(new Date(linha.atendimento.data_entrada || linha.atendimento.created_date), 'dd/MM/yyyy', { locale: ptBR })}
                  </td>
                  <td className="p-3 text-sm font-mono text-slate-600">
                    {linha.atendimento.atendimento_origem_numero
                      ? `#${String(linha.atendimento.atendimento_origem_numero).padStart(6, '0')}`
                      : '—'}
                  </td>
                  <td className="p-3 text-sm">{linha.atendimento.cliente_nome || '—'}</td>
                  <td className="p-3 text-sm font-medium">{linha.atendimento.placa || '—'}</td>
                  <td className="p-3 text-sm text-slate-600">
                    {linha.garantias.length > 0
                      ? linha.garantias.map((g) => g.nome).join(', ')
                      : 'Todos os serviços da OS de origem'}
                  </td>
                  <td className="p-3 text-sm font-semibold text-right whitespace-nowrap">
                    R$ {linha.valor.toFixed(2)}
                  </td>
                  <td className="p-3 text-sm text-slate-600">{linha.tecnicosOrigem.join(', ') || '—'}</td>
                  <td className="p-3 text-sm">
                    {linha.tecnicosDestino.length > 0 ? (
                      <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-red-600 text-white">
                        {linha.tecnicosDestino.join(', ')}
                      </span>
                    ) : (
                      <span className="text-xs text-slate-400">Não transferido</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}