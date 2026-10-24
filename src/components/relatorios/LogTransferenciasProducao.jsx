import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowRightLeft } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function LogTransferenciasProducao({ transferencias = [] }) {
  const total = transferencias.reduce((s, t) => s + (Number(t.valor) || 0), 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between gap-2 flex-wrap">
          <span className="flex items-center gap-2">
            <ArrowRightLeft className="w-5 h-5 text-red-600" />
            Log de Transferências de Produção
          </span>
          <Badge variant="outline" className="font-normal">
            {transferencias.length} registro(s) · R$ {total.toFixed(2)}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {transferencias.length === 0 ? (
          <p className="py-10 text-center text-sm text-slate-500">
            Nenhuma transferência de produção registrada no período.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200">
                  {['Data / Hora', 'OS Retorno', 'OS Origem', 'Serviço', 'Técnico Origem (perde)', 'Técnico Destino (recebe)', 'Valor', 'Usuário'].map((h) => (
                    <th key={h} className="text-left p-3 text-sm font-semibold text-slate-600 whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {transferencias.map((t) => (
                  <tr key={t.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="p-3 text-sm whitespace-nowrap">
                      {t.data_transferencia ? format(new Date(t.data_transferencia), 'dd/MM/yyyy HH:mm', { locale: ptBR }) : '—'}
                    </td>
                    <td className="p-3 text-sm font-mono text-red-700">
                      #{String(t.numero_os || '').padStart(6, '0')}
                    </td>
                    <td className="p-3 text-sm font-mono text-slate-600">
                      {t.atendimento_origem_numero ? `#${String(t.atendimento_origem_numero).padStart(6, '0')}` : '—'}
                    </td>
                    <td className="p-3 text-sm">{t.servico_nome || '—'}</td>
                    <td className="p-3 text-sm text-slate-700">
                      <span className="text-red-600 font-medium">{t.tecnico_origem_nome || '—'}</span>
                    </td>
                    <td className="p-3 text-sm">
                      <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700">
                        {t.tecnico_destino_nome || '—'}
                      </span>
                    </td>
                    <td className="p-3 text-sm text-right font-semibold whitespace-nowrap">
                      R$ {(Number(t.valor) || 0).toFixed(2)}
                    </td>
                    <td className="p-3 text-sm text-slate-500">{t.usuario_nome || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}