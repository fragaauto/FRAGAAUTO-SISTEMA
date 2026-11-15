import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MessageCircle, User } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { brl } from '@/lib/promocao';

const STATUS_COR = {
  novo: 'bg-blue-100 text-blue-800',
  em_contato: 'bg-yellow-100 text-yellow-800',
  convertido: 'bg-green-100 text-green-800',
  descartado: 'bg-slate-100 text-slate-600',
};

const STATUS_LABEL = {
  novo: 'Novo',
  em_contato: 'Em contato',
  convertido: 'Convertido',
  descartado: 'Descartado',
};

export default function InteressesPromocao({ interesses, onStatus, onExcluir }) {
  if (interesses.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-slate-500">
          <User className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          Nenhum cliente marcou interesse ainda.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {interesses.map((i) => (
        <Card key={i.id}>
          <CardContent className="pt-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold text-slate-800">{i.cliente_nome}</p>
                  <Badge className={STATUS_COR[i.status] || STATUS_COR.novo}>
                    {STATUS_LABEL[i.status] || i.status}
                  </Badge>
                  <span className="text-xs text-slate-400">
                    {i.created_date ? format(new Date(i.created_date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }) : ''}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Promoção: {i.promocao_titulo || '—'} {i.cliente_telefone ? `• ${i.cliente_telefone}` : ''}
                </p>
                <div className="mt-2 space-y-1">
                  {(i.produtos || []).map((p, idx) => (
                    <div key={idx} className="flex justify-between text-sm bg-orange-50 rounded px-2 py-1">
                      <span className="text-slate-700">{p.nome}</span>
                      <span className="font-medium text-orange-600">{brl(p.valor_promocional)}</span>
                    </div>
                  ))}
                </div>
                {i.observacao && <p className="text-xs text-slate-500 mt-1">📝 {i.observacao}</p>}
              </div>
              <div className="flex flex-col gap-1 flex-shrink-0">
                {i.cliente_telefone && (
                  <Button
                    size="sm"
                    className="bg-green-600 hover:bg-green-700"
                    onClick={() => window.open(`https://wa.me/${String(i.cliente_telefone).replace(/\D/g, '')}`, '_blank')}
                  >
                    <MessageCircle className="w-3 h-3 mr-1" /> WhatsApp
                  </Button>
                )}
                {i.status !== 'convertido' && (
                  <Button size="sm" variant="outline" onClick={() => onStatus(i, 'convertido')}>
                    Convertido
                  </Button>
                )}
                <Button size="sm" variant="ghost" className="text-red-500" onClick={() => onExcluir(i)}>
                  Excluir
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}