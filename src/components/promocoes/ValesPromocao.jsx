import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Ticket, Check, Ban, Trash2 } from 'lucide-react';
import { brl, dataBr } from '@/lib/promocao';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const STATUS_COR = {
  disponivel: 'bg-green-100 text-green-800',
  utilizado: 'bg-blue-100 text-blue-800',
  cancelado: 'bg-slate-100 text-slate-600',
};

const STATUS_LABEL = {
  disponivel: 'Disponível',
  utilizado: 'Utilizado',
  cancelado: 'Cancelado',
};

const descrever = (vale) =>
  vale.tipo === 'fixo' ? brl(vale.valor) : `${Number(vale.valor) || 0}%`;

export default function ValesPromocao({ vales, onStatus, onExcluir }) {
  if (vales.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-slate-500">
          <Ticket className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          Nenhum vale emitido ainda. Ative o vale desconto na campanha para gerar vales nas reservas.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-2">
      {vales.map((v) => (
        <Card key={v.id}>
          <CardContent className="pt-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono font-bold text-slate-800">{v.codigo}</span>
                  <Badge className="bg-amber-100 text-amber-800">{descrever(v)} de desconto</Badge>
                  <Badge className={STATUS_COR[v.status] || STATUS_COR.disponivel}>
                    {STATUS_LABEL[v.status] || v.status}
                  </Badge>
                </div>
                <p className="text-sm text-slate-700 mt-1">{v.cliente_nome}</p>
                <p className="text-xs text-slate-500">
                  {v.promocao_titulo || '—'}
                  {v.cliente_telefone ? ` • ${v.cliente_telefone}` : ''}
                  {v.validade ? ` • válido até ${dataBr(v.validade)}` : ''}
                  {v.created_date
                    ? ` • emitido em ${format(new Date(v.created_date), 'dd/MM/yyyy', { locale: ptBR })}`
                    : ''}
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-1 flex-shrink-0">
                {v.status !== 'utilizado' && (
                  <Button size="sm" variant="outline" onClick={() => onStatus(v, 'utilizado')}>
                    <Check className="w-3 h-3 mr-1" /> Usado
                  </Button>
                )}
                {v.status !== 'cancelado' && (
                  <Button size="sm" variant="ghost" onClick={() => onStatus(v, 'cancelado')}>
                    <Ban className="w-3 h-3 mr-1" /> Cancelar
                  </Button>
                )}
                <Button size="sm" variant="ghost" className="text-red-500" onClick={() => onExcluir(v)}>
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}